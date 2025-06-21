// ==UserScript==
// @name         stashlist userscript
// @namespace    feederbox
// @version      3.0.0
// @description  Flag scenes in stashbox as ignore or wishlist, and show matches from local stashdb instance if available.
// @match        https://stashdb.org/*
// @connect      localhost:9999
// @connect      list.feederbox.cc
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// @author       feederbox826
// @licence      MIT
// @require      https://feederbox.cc/uscript/requires/gm_fetch-shim.js
// @require      https://feederbox.cc/uscript/requires/gql-intercept.js
// @require      https://feederbox.cc/uscript/requires/wfke.js
// @require      https://cdn.jsdelivr.net/gh/feederbox826/stashlist/server/static/assets/apis.js
// @require      https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js
// ==/UserScript==
"use strict";

console.log(`[stashlist] Using ${ window?.GM_fetch ? "GM_fetch ✅" : "window.fetch ❌" } for proxy requests`);

// configuration
const stashlist_server = GM_getValue("stashlist_server", {
  apikey: "xxxx",
  host: "https://list.feederbox.cc",
});
const local_stashes = GM_getValue("localstashes",
  [{
    apikey: "xxxx",
    host: "http://localhost:9999",
  }]
);
// const localStash = GM_getValue("localStash", {
//   apikey: "",
//   host: "http://localhost:9999",
// });

// styling
GM_addStyle(`
:root {
  --stashlist-ignore: red;
  --stashlist-filter: grey;
  --stashlist-wish: yellow;
  --stashlist-history: plum;
  --stashlist-match: green;
  --stashlist-ignore-opacity: 0.3;
  --stashlist-male: #89cff0;
  --stashlist-female: #f38cac;
  --stashlist-non_binary: #c8a2c8;
  --stashlist-transgender_female: #c8a2c8;
  --stashlist-transgender_male: #c8a2c8;
}
.stashlist {
  border: 5px solid transparent;
  border-radius: 5px;
}
.stashlist.match {
  border-color: var(--stashlist-match) !important;
}
.stashlist.ignore {
  border-color: var(--stashlist-ignore);
}

.stashlist.match img {
  opacity: 1 !important;
}
.stashlist.ignore img, .stashlist.history img, .stashlist.filter img {
  opacity: var(--stashlist-ignore-opacity);
}
.stashlist.wish {
  border-color: var(--stashlist-wish) !important;
}
.stashlist.history {
  border-color: var(--stashlist-history) !important;
}
.scene-info.card a.scene-performer.filter {
  color: var(--stashlist-ignore);
}
.stashlist.filter {
  border-color: var(--stashlist-filter);
  &.performer.studio {
    border-style: double;
  }
  &.studio {
    border-style: dotted;

    .text-muted>a, h6>a {
      color: var(--stashlist-ignore);
    }
  }
  &.performer {
    border-style: dashed;
  }
}
`);

// set up custom idbkeyval
const localStashStore = idbKeyval.createStore("stashlist", "localstash")

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
let ignorePerformers = localStorage.getItem("ignorePerformer")
let ignoreStudios = localStorage.getItem("ignoreStudio")

// event running and listeners
unsafeWindow.fbox826.gqlListener.addEventListener("response", async (e) => {
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

// helper functions
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

const forceQuery = async (stashid) =>
  fetch("/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query ($id: ID!) {
      findScene(id: $id) {
        id
        performers { performer {
          id gender }}
        studio { id }}}`,
      variables: { id: stashid },
    })
  })
  .then(response => response.json())
  .then(data => data.data.findScene);

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
  const localIDs = await idbKeyval.getMany(sceneIDs, localStashStore);
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

async function cacheLocalScenes(force=false) {
  // check if already cached
  const lastCache = localStorage.getItem("lastLocalCache");
  // cache for 1h
  if (!force && lastCache && Date.now() - lastCache < 1000 * 60 * 60) return;
  const query = `
      query FindScenes {
      findScenes( scene_filter: {
          stash_id_endpoint: { modifier: NOT_NULL }
      } filter: { per_page: -1 }
      ) { scenes { id stash_ids { stash_id }
  }}}`;
  let idMap = [];
  for (const localStash of local_stashes) {
    console.log(`syncing with: ${localStash.host}`);
    const newIDs = await gqlClient(localStash, query, {}).then(
      (data) => data.findScenes.scenes,
    ).then(scenes => scenes.map((scene) => [scene.stash_ids[0].stash_id, { id: scene.id, host: localStash.host }]));
    idMap = [...idMap, ...newIDs];
  }
  // clear
  await idbKeyval.clear(localStashStore);
  // add in bulk
  idbKeyval.setMany(idMap, localStashStore);
  localStorage.setItem("lastLocalCache", Date.now());
}

function applyBulkMark(sceneIDs, type) {
  sceneIDs.forEach((id) => {
    const scene = document.querySelector(`[data-stash-id="${id}"]`);
    if (!scene) return;
    scene.classList.add(type);
    addRemoveButton(scene);
  });
}

function borderColor(genderMatches) {
  const emptyArr = new Array(4).fill("var(--stashlist-filter)");
  // genderMatches array
  const colorArr = genderMatches.map(gender => `var(--stashlist-${gender.toLowerCase()})`);
  // fill empty array with colorArr
  const filledArr = [...colorArr, ...emptyArr].slice(0, 4);
  return filledArr.join(" ");
}

function scanGqlFilter(scenes) {
  for (const scene of scenes) {
    let perfMatches = false
    let genderMatches = []
    const studioMatch = ignoreStudios.includes(scene.studio.id);
    for (const performer of scene.performers) {
      if (ignorePerformers.includes(performer.performer.id)) {
        perfMatches = true;
        genderMatches.push(performer.performer.gender)
      }
    }
    const sceneCard = document.querySelector(`[data-stash-id="${scene.id}"]`);
    if (perfMatches || studioMatch) {
      sceneCard.classList.add("filter");
      if (perfMatches) {
          sceneCard.classList.add("performer");
          sceneCard.style.borderColor = borderColor(genderMatches);
      }
      if (studioMatch) sceneCard.classList.add("studio");
    }
    sceneCard.classList.add("scanned")
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
  // check for non-matches
  const nonMatches = [...document.querySelectorAll(`${selectors.cards}:not(.scanned)`)]
    .map((card) => card.attributes["data-stash-id"].value)
    .map(id => parseNonMatch(id))
  Promise.allSettled(nonMatches)
}

const parseNonMatch = (id) => forceQuery(id)
  .then(scene => {
    scanGqlFilter([scene]);
    markSingleCard(scene);
  })


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

function addMatch(scene, match) {
  const goToScene = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.open(`${match.host}/scenes/${match.id}`);
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
  setupStashlist(true);
}

function clearStudioPerformer(e) {
  let id = location.pathname.split("/").pop();
  console.log(`clearing ${id}`);
  stashlist.add(id, "remove");
  e.target.textContent = "Cleared";
  e.target.disabled = true;
  setupStashlist(true);
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
  if (ignorePerformers.includes(id) || ignoreStudios.includes(id)) {
      ignoreButton.textContent = "Ignored";
      ignoreButton.disabled = true;
      clearButton.style.display = "inline-block";
  }
}

const keyListener = (e) => {
  if (e.key === "V" && e.shiftKey && !e.repeat) {
    const opacityKey = "--stashlist-ignore-opacity";
    const root = document.querySelector(":root")
    const current = root.style.getPropertyValue(opacityKey);
    const newOpacity = current == 1 ? 0.3 : 1;
    root.style.setProperty(opacityKey, newOpacity);
  }
}

function runPage() {
  console.log("runpage");
  setupPage();
  cacheLocalScenes();
  wfke(selector.cards, markScenes);
  wfke("ul.pagination", observePerformers);
}
async function setupStashlist(force=false) {
  const lastCache = localStorage.getItem("lastStashlistCache");
  // cache for 1h
  if (!force && lastCache && Date.now() - lastCache < 1000 * 60 * 60) return;
  const newIgnorePerformers = await stashlist.getlist("ignorePerformer")
  localStorage.setItem("ignorePerformer", newIgnorePerformers);
  ignorePerformers = newIgnorePerformers;
  const newIgnoreStudios = await stashlist.getlist("ignoreStudio");
  localStorage.setItem("ignoreStudio", newIgnoreStudios);
  ignoreStudios = newIgnoreStudios;
  localStorage.setItem("lastStashlistCache", Date.now());
  console.log("synced to stashlist");
}
// navigation observer
new MutationObserver(() => runPage()).observe(document.querySelector("title"), {
  childList: true,
});
runPage();
setupStashlist();
// listen for `v` keypress to toggle visibility
document.addEventListener("keydown", keyListener);