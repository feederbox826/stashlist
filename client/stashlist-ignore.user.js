// ==UserScript==
// @name         stashlist-ignore userscript
// @namespace    feederbox
// @version      1.0.0
// @description  stashlist studio/ performer ignore button
// @match        https://stashdb.org/*
// @connect      localhost:9999
// @connect      list.feederbox.cc
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @author       feederbox826
// @updateURL    https://github.com/feederbox826/stashlist/raw/main/client/stashlist-ignore.user.js
// @downloadURL  https://github.com/feederbox826/stashlist/raw/main/client/stashlist-ignore.user.js
// @require      https://raw.githubusercontent.com/feederbox826/stashlist/main/server/static/assets/apis.js
// ==/UserScript==
"use strict";

const stashlist_server = GM_getValue("stashlist_server", {
  apikey: "xxxx",
  host: "https://list.feederbox.cc",
});
GM_setValue("example_key", { apikey: "xxxx", host: "" });

// initial setup
let isPerformer = location.href.includes("/performers/");
let isStudio = location.href.includes("/studios/");

function ignore(e) {
    let id = location.pathname.split("/").pop();
    let type = isPerformer ? "ignorePerformer" : "ignoreStudio";
    console.log(`ignoring ${type} ${id}`);
    stashlist.add(id, type);
    e.target.textContent = "Ignored";
    e.target.disabled = true;
}

function setupPage() {
    isPerformer = location.href.includes("/performers/");
    isStudio = location.href.includes("/studios/");
    if (!isPerformer && !isStudio) return;
    // add ignore button
    const parent = document.querySelector("div:has(>.ms-2)");
    if (!parent) return;
    const ignoreButton = document.createElement("button")
    ignoreButton.className = "btn btn-outline-danger ms-2"
    ignoreButton.id = "ignoreButton"
    ignoreButton.onclick = ignore
    ignoreButton.textContent = "Ignore"
    if (document.querySelector("#ignoreButton")) return;
    parent.prepend(ignoreButton)
    // check if ignored
    let id = location.pathname.split("/").pop();
    stashlist.find(id).then(data => {
      if (data.type == "ignorePerformer" || data.type == "ignoreStudio") {
        ignoreButton.textContent = "Ignored";
        ignoreButton.disabled = true;
      }
    })
}

function runPage() {
  console.log("runpage");
  setupPage();
}
// navigation observer
new MutationObserver(() => runPage()).observe(document.querySelector("title"), {
  childList: true,
});
runPage();
