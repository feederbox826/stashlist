// ==UserScript==
// @name         stashlist userscript
// @namespace    feederbox
// @version      2.3.2
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
// @licence      MIT
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

// configuration
const stashlist_server = GM_getValue("stashlist_server", {
  apikey: "xxxx",
  host: "https://list.feederbox.cc",
});
const localStash = GM_getValue("localStash", {
  apikey: "",
  host: "http://localhost:9999",
});
GM_setValue("example_key", { apikey: "xxxx", host: "" });

// styling
GM_addStyle(`
.stashlist {
  border: 5px solid transparent;
  border-radius: 5px;
}
.stashlist.match {
  border-color: green !important;
  opacity: 1 !important;
}
.stashlist.ignore {
  border-color: red;
}
.stashlist.filter {
  border-color: grey;
  &.performer.studio {
    border-style: double;
  }
  &.studio {
    border-style: dotted;

    .text-muted>a, h6>a {
      color: red;
    }
  }
  &.performer {
    border-style: dashed;
  }
}
.stashlist.ignore img, .stashlist.history img, .stashlist.filter {
  opacity: 0.3;
}
.stashlist.wish {
  border-color: yellow;
}
.stashlist.history {
  border-color: plum;
}
.scene-info.card a.scene-performer.filter {
  color: red;
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
let isPerformer = location.href.includes("/performers/");
let isStudio = location.href.includes("/studios/");
let selector = selectorObj.default;
let ignorePerformers = false;
let ignoreStudios = false;

// helper functions
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

// wait for visible key elements
function wfke(selector, callback) {
  let el = document.querySelector(selector);
  if (el) return callback();
  setTimeout(wfke, 100, selector, callback);
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

// page setup
function setupPage() {
  paginationObserved = false;
  isSearch = location.href.includes("/search/");
  isScene = location.href.includes("/scenes/");
  isPerformer = location.href.includes("/performers/");
  isStudio = location.href.includes("/studios/");
  selector = chooseSelector();
  if (isPerformer || isStudio) addIgnoreButton();
}

// fetching functions
async function queryLocalScenes(sceneIDs) {
  const otherClasses = ["ignore", "wish", "history", "filter"];
  const localIDs = await idbKeyval.getMany(sceneIDs);
  zip(sceneIDs, localIDs)
    .filter((i) => i[1])
    .map((i) => {
      const scene = document.querySelector(`[data-stash-id="${i[0]}"]`);
      addMatch(scene, i[1]);
      scene.classList.add("match");
      if (otherClasses.some((elem) => scene.classList.contains(elem))) {
        stashlist.modify(i[0], "history");
        scene.classList.remove(...otherClasses);
      }
    });
}

async function cacheLocal() {
  const query = `
      query FindScenes {
      findScenes( scene_filter: {
          stash_id_endpoint: { modifier: NOT_NULL }
      } filter: { per_page: -1 }
      ) { scenes { id stash_ids { stash_id }
  }}}`;
  const idLocal = await gqlClient(localStash, query, {}).then(
    (data) => data.findScenes.scenes,
  );
  const idMap = idLocal.map((scene) => [scene.stash_ids[0].stash_id, scene.id]);
  // sync to stashlist
  // clear
  await idbKeyval.clear();
  // add in bulk
  idbKeyval.setMany(idMap);
  console.log("syncing with local");
}

function applyBulkMark(sceneIDs, type) {
  sceneIDs.forEach((id) => {
    const scene = document.querySelector(`[data-stash-id="${id}"]`);
    if (!scene) return;
    scene.classList.add(type);
    addRemoveButton(scene);
  });
}

// event running and listeners
gqlListener.addEventListener("response", async (e) => {
  if (!ignorePerformers || !ignoreStudios) await setupStashlist();
  if (e.detail.data.queryScenes) {
    console.log("queryScenes received");
    const scenes = e.detail.data.queryScenes.scenes;
    wfke(".SceneCard.stashlist", () => scanGqlFilter(scenes));
  } else if (e.detail.data.findScene) {
    console.log("findScene received");
    const scene = e.detail.data.findScene;
    // check if studio or performers are ignored
    wfke(".scene-info.card", () => {
      scanGqlFilter([scene]);
      markSingleCard(scene);
    });
  }
});

function scanGqlFilter(scenes) {
  for (const scene of scenes) {
    const perfMatch = scene.performers.some((p) =>
      ignorePerformers.includes(p.performer.id),
    );
    const studioMatch = ignoreStudios.includes(scene.studio.id);
    if (perfMatch || studioMatch) {
      const sceneCard = document.querySelector(`[data-stash-id="${scene.id}"]`);
      sceneCard.classList.add("filter");
      if (perfMatch) sceneCard.classList.add("performer");
      if (studioMatch) sceneCard.classList.add("studio");
    }
  }
}

function markSingleCard(scene) {
  // mark ignored studio and performers in red
  // iterate over matched performers
  scene.performers
    .filter((p) => ignorePerformers.includes(p.performer.id))
    .forEach(
      (perf) =>
        (document.querySelector(
          `a.scene-performer[href="/performers/${perf.performer.id}"]`,
        ).classList.add("filter")
    ));
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
  stashlist
    .findBulk(stashids)
    .then((results) => {
      applyBulkMark(results.ignore, "ignore");
      applyBulkMark(results.wish, "wish");
      applyBulkMark(results.history, "history");
    })
    .then(() => queryLocalScenes(stashids));
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

function ignoreStudioPerformer(e) {
  let id = location.pathname.split("/").pop();
  let type = isPerformer ? "ignorePerformer" : "ignoreStudio";
  console.log(`ignoring ${type} ${id}`);
  stashlist.add(id, type);
  e.target.textContent = "Ignored";
  e.target.disabled = true;
}

function clearStudioPerformer(e) {
  let id = location.pathname.split("/").pop();
  console.log(`clearing ${id}`);
  stashlist.remove(id);
  e.target.textContent = "Cleared";
  e.target.disabled = true;
}

function addIgnoreButton() {
  const parent = document.querySelector("div:has(>.ms-2)");
  if (!parent) return;
  const ignoreButton = document.createElement("button");
  ignoreButton.className = "btn btn-outline-danger ms-2";
  ignoreButton.id = "ignoreButton";
  ignoreButton.onclick = ignoreStudioPerformer;
  ignoreButton.textContent = "Ignore";
  const clearButton = document.createElement("button");
  clearButton.className = "btn btn-outline-danger ms-2";
  clearButton.id = "clearButton";
  clearButton.onclick = clearStudioPerformer;
  clearButton.textContent = "Clear";
  clearButton.style.display = "none";
  if (!document.querySelector("#ignoreButton")) parent.prepend(ignoreButton);
  if (!document.querySelector("#clearButton")) parent.prepend(clearButton);
  // check if ignored
  let id = location.pathname.split("/").pop();
  stashlist.find(id).then((data) => {
    if (data.type == "ignorePerformer" || data.type == "ignoreStudio") {
      ignoreButton.textContent = "Ignored";
      ignoreButton.disabled = true;
      clearButton.style.display = "ineline-block";
    }
  });
}

function runPage() {
  console.log("runpage");
  setupPage();
  cacheLocal();
  wfke(selector.cards, markScenes);
  wfke("ul.pagination", observePerformers);
}
async function setupStashlist() {
  ignorePerformers = await stashlist.getlist("ignorePerformer");
  ignoreStudios = await stashlist.getlist("ignoreStudio");
  console.log("synced to stashlist");
}
// navigation observer
new MutationObserver(() => runPage()).observe(document.querySelector("title"), {
  childList: true,
});
runPage();
setupStashlist();
