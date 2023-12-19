// ==UserScript==
// @name         stashlist userscript
// @namespace    feederbox
// @version      2.0.0
// @description  Flag scenes in stashbox as ignore or wishlist, and show matches from local stashdb instance if available.
// @match        https://stashdb.org/*
// @connect      http://localhost:9999
// @grant        GM_addStyle
// @run-at       document-idle
// @author       feederbox826
// @updateURL    https://github.com/feederbox826/stashlist/raw/main/client/stashlist.user.js
// @downloadURL  https://github.com/feederbox826/stashlist/raw/main/client/stashlist.user.js
// @require      https://raw.githubusercontent.com/feederbox826/stashlist/main/server/src/static/assets/apis.js
// ==/UserScript==
"use strict";

const mongoApi = {
  apikey: "xxxx",
  host: "",
};
const localStash = {
  apikey: "",
  host: "http://localhost:9999",
};

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
.stashlist.ignore, .stashlist.history img {
  opacity: 0.25;
}
.stashlist.wish {
  border-color: yellow;
}
.stashlist.history {
  border-color: plum;
}
.stashlist-buttonct {
  margin-left: 10px;
  display: flex;
  flex-direction: row;
  cursor: pointer;
  right: 0px;
  top: 10px;
  align-self: center;
}
.SearchPage-scene .stashlist-btnct {
  position: absolute;
}
.scene-info .stashlist-btnct {
  display: unset;
}
.stashlist-btnct div {
  padding: 0;
  border: none;
  font-size: 20px;
  display: inherit;
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

function setupPage() {
  paginationObserved = false;
  isSearch = location.href.includes("/search/");
  isScene = location.href.includes("/scenes/");
  selector = chooseSelector();
}

// wait for visible key elements
function wfke(selector, callback) {
  let el = document.querySelector(selector);
  if (el) return callback();
  setTimeout(wfke, 100, selector, callback);
}

function queryLocal(sceneId) {
  const query = `query find($stash_id: String!) {
  findScenes(scene_filter: {
    stash_id: {
    value: $stash_id modifier: EQUALS
  }})
  { scenes { id } }}`;
  const variables = { stash_id: sceneId };
  return gqlClient(localStash, query, variables)
    .then(data => data.findScenes.scenes);
}

function applyBulkMark(sceneIDs, type) {
  sceneIDs.forEach((id) => {
    const scene = document.querySelector(`[data-stash-id="${id}"]`);
    if (!scene) return;
    scene.classList.add(type);
    addRemoveButton(scene);
  });
}

function queryLocalScenes(sceneIDs) {
  const otherClasses = ["ignore", "wish", "history"];
  sceneIDs.forEach(async (id) => {
    const localScenes = await queryLocal(id);
    if (localScenes.length == 0) return;
    const scene = document.querySelector(`[data-stash-id="${id}"]`);
    addMatch(scene, localScenes[0].id);
    scene.classList.add("match");
    if (otherClasses.some((elem) => scene.classList.contains(elem))) {
      await stashlist.modify(id, "history");
      console.log("removing classes")
      scene.classList.remove(otherClasses);
    }
  });
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
  });
  // query API for results
  if (stashids.length === 0) return;
  stashlist.findBulk(stashids).then((results) => {
    applyBulkMark(results.ignore, "ignore");
    applyBulkMark(results.wish, "wish");
    applyBulkMark(results.history, "history")
  });
  // query individual scenes
  queryLocalScenes(stashids);
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
    });
  removeDefaultButtons(scene);
  addButton(scene, "remove", "🗑️", removeID);
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
