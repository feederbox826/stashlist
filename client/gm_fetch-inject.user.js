// ==UserScript==
// @name         gm_fetch-inject
// @description  global gm_fetch injector
// @namespace    feederbox
// @version      1.0
// @match        https://stashdb.org/*
// @match        https://list.feederbox.cc/*
// @require      https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM.xmlHttpRequest
// ==/UserScript==

// TM space injection
window.GM_fetch = GM_fetch
// global injection
unsafeWindow.GM_fetch = GM_fetch
unsafeWindow.GM = {
    xmlHttpRequest: GM.xmlHttpRequest,
}
console.log("injected")