// ==UserScript==
// @name         stashlist userscript
// @namespace    feederbox
// @version      2.2.2
// @description  Flag scenes in stashbox as ignore or wishlist, and show matches from local stashdb instance if available.
// @match        https://stashdb.org/*
// @connect      localhost:9999
// @connect      list.feederbox.cc
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @author       feederbox826
// @updateURL    https://github.com/feederbox826/stashlist/raw/main/client/stashlist.user.js
// @downloadURL  https://github.com/feederbox826/stashlist/raw/main/client/stashlist.user.js
// @require      https://raw.githubusercontent.com/feederbox826/userscripts/main/requires/gql-intercept.js
// @require      https://raw.githubusercontent.com/feederbox826/stashlist/main/server/static/assets/apis.js
// @require      https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js
// @require      https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// ==/UserScript==
"use strict";

// force polyfill
fetch = GM_fetch;

const stashlist_server = GM_getValue("stashlist_server", {
  apikey: "xxxx",
  host: "https://list.feederbox.cc",
});
const localStash = GM_getValue("localStash", {
  apikey: "",
  host: "http://localhost:9999",
});
GM_setValue("example_key", { apikey: "xxxx", host: "" });

GM_addStyle(`
.stashlist {
  border: 5px solid transparent;
  border-radius: 5px;
}
.stashlist.match {
  border-color: green;
}
.stashlist.ignore {
  border-color: red;
}
.stashlist.filter {
  border-color: grey;
}
.stashlist.ignore img, .stashlist.history img, .stashlist.filter {
  opacity: 0.25;
}
.stashlist.wish {
  border-color: yellow;
}
.stashlist.history {
  border-color: plum;
}
`);

// initial setup
const selectorObj = {
  default: {
    button: ".d-flex",
    cards: ".SceneCard.card",
  },
  scene: {
    button: ".float-end",
    cards: ".card",
  },
  search: {
    button: "h5",
    cards: ".SearchPage-scene .card",
  },
};

let paginationObserved = false;
let isSearch = location.href.includes("/search/");
let isScene = location.href.includes("/scenes/");
let selector = selectorObj.default;

const zip = (a, b) => a.map((k, i) => [k, b[i]]);

function setupPage() {
  paginationObserved = false;
  isSearch = location.href.includes("/search/");
  isScene = location.href.includes("/scenes/");
  selector = chooseSelector();
  // add sync
  const newSync = document.createElement("a");
  newSync.onclick = cacheLocal;
  newSync.textContent = "Sync";
  newSync.classList = "nav-link";
  newSync.id = "sync";
  if (document.querySelector(".navbar-nav #sync")) return;
  document.querySelector(".navbar-nav").append(newSync);
}

// wait for visible key elements
function wfke(selector, callback) {
  let el = document.querySelector(selector);
  if (el) return callback();
  setTimeout(wfke, 100, selector, callback);
}

function applyBulkMark(sceneIDs, type) {
  sceneIDs.forEach((id) => {
    const scene = document.querySelector(`[data-stash-id="${id}"]`);
    if (!scene) return;
    scene.classList.add(type);
    addRemoveButton(scene);
  });
}

async function queryLocalScenes(sceneIDs) {
    const otherClasses = ["ignore", "wish", "history", "filter"];
    const localIDs = await idbKeyval.getMany(sceneIDs)
    zip(sceneIDs, localIDs)
        .filter(i => i[1])
        .map(i => {
            const scene = document.querySelector(`[data-stash-id="${i[0]}"]`)
            addMatch(scene, i[1])
            scene.classList.add("match")
            if (otherClasses.some(elem => scene.classList.contains(elem))) {
                stashlist.modify(i[0], "history")
                scene.classList.remove(...otherClasses)
            }
        })
}

async function fetchLocal() {
  const query = `
      query FindScenes {
      findScenes( scene_filter: {
          stash_id_endpoint: { modifier: NOT_NULL }
      } filter: { per_page: -1 }
      ) { scenes { id stash_ids { stash_id }
  }}}`;
  const idMap = []
  const idLocal = await gqlClient(localStash, query, {})
      .then(data => data.findScenes.scenes)
  idLocal.forEach(scene => idMap.push([scene.stash_ids[0].stash_id, scene.id]))
  // sync to stashlist
  return idMap
}

async function cacheLocal() {
  const idMap = await fetchLocal()
  //clear
  await idbKeyval.clear()
  // add in bulk
  idbKeyval.setMany(idMap)
  console.log("syncing with local")
  alert(`Synced ${idMap.length} scenes from local stashapp`)
}

const chooseSelector = () =>
  isSearch
    ? selectorObj.search
    : isScene
      ? selectorObj.scene
      : selectorObj.default;

const getID = (scene) =>
  isSearch
    ? scene.parentNode.href.split("/").pop()
    : isScene
      ? new URL(location.href).pathname.split("/").pop()
      : scene.querySelector(".d-flex a.text-truncate").href.split("/").pop();

gqlListener.addEventListener("response", async (e) => {
  if (e.detail.data.queryScenes) {
    console.log("queryScenes received");
    const scenes = e.detail.data.queryScenes.scenes;
    const ignorePerformers = await stashlist.getlist("ignorePerformer")
    const ignoreStudios = await stashlist.getlist("ignoreStudio")
    scanGqlFilter(scenes, ignorePerformers, ignoreStudios);
  }
})

function scanGqlFilter(scenes, ignorePerformers, ignoreStudios) {
  for (const scene of scenes) {
    if (scene.performers.some(p => ignorePerformers.includes(p.performer.id)) || ignoreStudios.includes(scene.studio.id)) {
      const sceneCard = document.querySelector(`[data-stash-id="${scene.id}"]`);
      sceneCard.classList.add("filter");
    }
  }
}

function markScenes() {
  console.log("run");
  const selectors = chooseSelector();
  const sceneCards = document.querySelectorAll(selectors.cards);
  const stashids = [];
  sceneCards.forEach((scene) => {
    const sceneId = getID(scene);
    scene.setAttribute("data-stash-id", sceneId);
    scene.classList.add("stashlist");
    stashids.push(sceneId);
    // add default buttons
    addIgnore(scene);
    addWishlist(scene);
    addHistoryButton(scene);
  });
  // query API for results
  if (stashids.length === 0) return;
  stashlist.findBulk(stashids).then((results) => {
    applyBulkMark(results.ignore, "ignore");
    applyBulkMark(results.wish, "wish");
    applyBulkMark(results.history, "history")
  }).then(() => queryLocalScenes(stashids))
}

function addButton(scene, type, text, onclick) {
  // check for existing button
  const existing = scene.querySelector(`.stashlist-btn-${type}`);
  if (existing) return;
  const button = document.createElement("div");
  button.classList = `stashlist-btn-${type}`;
  button.onclick = onclick;
  button.textContent = text;
  const buttonCt = document.createElement("div");
  buttonCt.classList = "stashlist-btnct";
  buttonCt.append(button);
  // check for button container
  const buttonContainer = scene.querySelector(".stashlist-btnct");
  if (buttonContainer) {
    buttonContainer.append(button);
  } else {
    const buttonParent = scene.querySelector(selector.button);
    buttonParent.append(buttonCt);
  }
}

function addMatch(scene, id) {
  const goToScene = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.open(`${localStash.host}/scenes/${id}`);
  };
  removeDefaultButtons(scene);
  addButton(scene, "match", "📂", goToScene);
}

const handleClick = async (e, type) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  const card = e.target.closest("[data-stash-id]");
  const stashid = card.getAttribute("data-stash-id");
  await stashlist.modify(stashid, type);
  card.classList.add(type);
  addRemoveButton(card);
  return card;
};

function addIgnore(scene) {
  const ignoreID = (e) => handleClick(e, "ignore");
  addButton(scene, "ignore", "🚫", ignoreID);
}
function addWishlist(scene) {
  const wishlistID = (e) => handleClick(e, "wish");
  addButton(scene, "wish", "🌟", wishlistID);
}
function addRemoveButton(scene) {
  const removeID = (e) =>
    handleClick(e, "remove").then((card) => {
      card.classList.remove("ignore", "wish", "history");
      removeDefaultButtons(card);
      addWishlist(card);
      addIgnore(card);
      addHistoryButton(card);
    });
  removeDefaultButtons(scene);
  addButton(scene, "remove", "🗑️", removeID);
  addHistoryButton(scene);
}
function addHistoryButton(scene) {
  if (scene.classList.contains("history")) return;
  const historyID = (e) => handleClick(e, "history");
  addButton(scene, "history", "📜", historyID);
}
function removeDefaultButtons(scene) {
  const buttonContainer = scene.querySelector(".stashlist-btnct");
  if (buttonContainer) buttonContainer.remove();
}

function observePerformers() {
  if (paginationObserved) return;
  // pagination observer
  new MutationObserver(() => runPage()).observe(
    document.querySelector("ul.pagination"),
    { attributes: true, subtree: true },
  );
  paginationObserved = true;
}

function runPage() {
  console.log("runpage");
  setupPage();
  wfke(selector.cards, markScenes);
  wfke("ul.pagination", observePerformers);
}
// navigation observer
new MutationObserver(() => runPage()).observe(document.querySelector("title"), {
  childList: true,
});
runPage();
