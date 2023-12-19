const stashdb_host = localStorage.getItem("stashdb_host");
const stashlist_server = {
    apikey: localStorage.getItem("stashlist_apikey"),
    host: localStorage.getItem("stashlist_host")
};
const localStash = {
    apikey: localStorage.getItem("localstash_apikey"),
    host: localStorage.getItem("localstash_host")
};
const query = `
    query FindScenes($endpoint: String!) {
    findScenes( scene_filter: {
        stash_id_endpoint: { endpoint: $endpoint modifier: NOT_NULL }
    } filter: { per_page: -1 }
    ) { scenes { stash_ids { stash_id }
}}}`;
const variables = { endpoint: stashdb_host };
function log(msg) {
    const log = document.querySelector("#output");
    const li = document.createElement("li");
    li.textContent = msg;
    log.appendChild(li);
}
async function sync() {
    // disable button
    const button = document.querySelector("#sync-button");
    button.disabled = true;
    const idlist = await gqlClient(localStash, query, variables)
        .then(data => data.findScenes.scenes)
        .then(scenes => scenes.map(scene => scene.stash_ids[0].stash_id));
    // sync to stashlist
    const saniList = [...new Set(idlist)];
    // add to log
    log(`Syncing ${saniList.length} scenes to stashlist`);
    await stashlist.addbulk(saniList, "history")
        .then(() => {
            log("Sync complete");
            localStorage.setItem("lastSync", new Date().toLocaleString());
            log(`Last Sync: ${localStorage.getItem("lastSync")}`);
        });
}
const lastSync = localStorage.getItem("lastSync") ?? "Never";
log(`Last Sync: ${lastSync}`);