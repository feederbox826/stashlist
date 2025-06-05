// ==UserScript==
// @name         stashlist-progress userscript
// @namespace    feederbox
// @version      1.1.0
// @description  Add progress bar for stashlist scenes
// @match        https://stashdb.org/*
// @connect      http://localhost:9999
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @author       feederbox826
// @licence      MIT
// @require      https://cdn.jsdelivr.net/gh/feederbox826/stashlist/server/static/assets/apis.js
// ==/UserScript==
"use strict";

const stashlist_server = GM_getValue("stashlist_server", {
  apikey: "xxxx",
  host: "",
});
const localStash = GM_getValue("localStash", {
  apikey: "",
  host: "http://localhost:9999/graphql",
});
const stashdb = GM_getValue("stashdb", {
  apikey: "",
  host: "https://stashdb.org/graphql",
});
GM_setValue("example_key", { apikey: "xxxx", host: "" });

GM_addStyle(`
.progress {
  display: flex;
  height: 1rem;
  overflow: hidden;
  font-size: 0.75rem;
  border-radius: 0.375rem;
}
.progress-bar {
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  background-color: #6c757d;
  transition: width 0.6s ease;
}
.progress-bar.match {
  background-color: green;
}
.progress-bar.ignore {
  background-color: red;
}
.progress-bar.wish {
  background-color: yellow;
  color: #000;
}
.progress-bar.history {
  background-color: plum;
}
`)

// wait for visible key elements
function wfke(selector, callback) {
  let el = document.querySelector(selector);
  if (el) return callback();
  setTimeout(wfke, 100, selector, callback);
}

const sceneQuery = `query QueryScenes($page: Int!, $performers: [ID!], $studios: [ID!]) {
  queryScenes(input: {
      performers: { value: $performers modifier: INCLUDES }
      studios: { modifier: INCLUDES, value: $studios }
      sort: DATE direction: DESC page: $page per_page: 50
  }) { count scenes { id }}}`;

const queryScene = (page, performers, studios) => gqlClient(stashdb, sceneQuery, { page, performers, studios })
  .then(data => data.queryScenes.scenes.map(scene => scene.id));

const getDifference = (a, b) => a.filter(e => !b.includes(e));

const setBar = (bar, list, total) => {
  const count = list.length;
  console.log(count, bar)
  bar.style.width = `${(count / total) * 100}%`;
  bar.textContent = count
}

function run() {
  console.log("running")
  // inject progress bars
  const progress = document.createElement("div");
  progress.classList.add("progress");
  const copyBar = document.createElement("div");
  copyBar.classList.add("progress-bar");
  const ignoreBar = copyBar.cloneNode(true);
  ignoreBar.classList.add("ignore");
  const historyBar = copyBar.cloneNode(true);
  historyBar.classList.add("history");
  const matchBar = copyBar.cloneNode(true);
  matchBar.classList.add("match");
  const wishBar = copyBar.cloneNode(true);
  wishBar.classList.add("wish");
  const remainBar = copyBar.cloneNode(true)
  progress.append(copyBar, ignoreBar, historyBar, matchBar, wishBar, remainBar);
  // add hr if does not exist
  if (!document.querySelector("hr.my-2")) {
    const hr = document.createElement("hr");
    hr.classList.add("my-2");
    document.querySelector(".NarrowPage").insertBefore(hr, document.querySelector(".nav.nav-tabs"))
  }
  document.querySelector("hr.my-2").append(progress)

  async function fetchQuery(performers, studios) {
    let count = 0;
    let ids = [];
    await gqlClient(stashdb, sceneQuery, { page: 1, performers, studios })
      .then(data => {
        count = data.queryScenes.count
        ids.push(...data.queryScenes.scenes.map(scene => scene.id))
      });
    // calculate page
    const pages = Math.ceil(count / 50);
    for (let i = 2; i <= pages; i++) {
      await queryScene(i, performers, studios)
        .then(data => ids.push(...data));
    }
    return { count, ids }
  }

  async function bulkQuery(performers, studios) {
    // get count
    let { count, ids } = await fetchQuery(performers, studios)
    console.log("final ids", ids)
    // get stashlist from server
    console.log("final ids length", ids.length)
    const stashList = await stashlist.findBulk(ids)
    const ignoreList = [...stashList.ignore, stashList.wish]
    let historyList = stashList.history;
    const queryList = getDifference(ids, ignoreList)
    // set ignore and wish since we already know it
    setBar(ignoreBar, stashList.ignore, count)
    setBar(wishBar, stashList.wish, count)
    const matchList = [];
    // query local
    for (const id of queryList) {
      const localScenes = await queryLocal(id)
      if (localScenes.length == 0) continue;
      // add to list, set bar
      matchList.push(id);
    }
    historyList = getDifference(historyList, matchList);
    setBar(historyBar, historyList, count);
    setBar(matchBar, matchList, count);
    const remainList = getDifference(getDifference(queryList, historyList), matchList)
    // set remaining
    setBar(remainBar,remainList,count)
  }

  // get performer ID
  const path = window.location.pathname;
  const pathArray = path.split("/");
  const type = pathArray[1]
  const id = pathArray[2]

  if (type == "performers") {
    bulkQuery([id], [])
  } else if (type == "studios") {
    bulkQuery([], [id]) 
  }
}
wfke(".nav.nav-tabs", run)
