// Description: Fetches wishlist from mongo and stashdb, and displays it on the page.
const stashDB = {
    apikey: localStorage.getItem("stashdb_apikey"),
    host: localStorage.getItem("stashdb_host")
};
const stashlist_server = {
    apikey: localStorage.getItem("stashlist_apikey"),
    host: localStorage.getItem("stashlist_host")
};
const jackettUrl = localStorage.getItem("jackett_host");
const localStash = {
    apikey: localStorage.getItem("localstash_apikey"),
    host: localStorage.getItem("localstash_host")
};
// sync
async function sync() {
    const query = `
        query FindScenes {
        findScenes( scene_filter: {
            stash_id_endpoint: { value: "" modifier: NOT_NULL }
        } filter: { per_page: -1 }
        ) { scenes { stash_ids { stash_id }
    }}}`;
    const idlist = await gqlClient(localStash, query, {})
        .then(data => data.findScenes.scenes)
        .then(scenes => scenes.map(scene => scene.stash_ids[0].stash_id));
    // sync to stashlist
    const saniList = [...new Set(idlist)];
    // add to log
    Toastify({ text: `Syncing ${saniList.length} scenes to stashlist`, duration: 3000, position: "right" }).showToast();
    await stashlist.addbulk(saniList, "history")
        .then(() => Toastify({ text: `Synced`, duration: 3000, position: "right" }).showToast());
}

function fetchStashDB(id) {
    const query = `query Scene($id: ID!) {
        findScene(id: $id) {
            id title details release_date
            images { url }
            studio { id name }
            performers { performer { name id }}
    }}`;
    return gqlClient(stashDB, query, { id })
        .then(data => data.findScene);
}
const handleButton = async (e, prompt, type) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const card = e.target.closest("[data-stash-id]");
    const stashid = card.getAttribute("data-stash-id");
    if (confirm(prompt) == false) return;
    await stashlist.modify(stashid, type);
    card.remove();
};
const handleDelete = (e) => handleButton(e, "Confirm delete?", "remove");
const handleHistory = (e) => handleButton(e, "Confirm add to History?", "history");
const handleIgnore = (e) => handleButton(e, "Confirm add to Ignore?", "ignore");
function createDiv(item) {
    const template = document.querySelector("#card-template");
    const clone = template.cloneNode(true);
    clone.id = "";
    clone.setAttribute("data-stash-id", item.id);
    clone.querySelector(".title").textContent = item.title;
    clone.querySelector(".title-link").href = `https://stashdb.org/scenes/${item.id}`;
    clone.querySelector(".studio").textContent = item.studio.name;
    clone.querySelector(".studio").href = `https://stashdb.org/studios/${item.studio.id}`;
    clone.querySelector(".release-date").textContent = item.release_date;
    clone.querySelector(".Image-image").src = item.images[0].url;
    clone.querySelector(".description").textContent = item.details ?? "No description available";
    // add performers
    item.performers.forEach(performer => {
        const performerLink = document.createElement("a");
        performerLink.classList.add("scene-performer");
        performerLink.textContent = performer.performer.name;
        performerLink.href = `https://stashdb.org/performers/${performer.performer.id}`;
        clone.querySelector(".scene-performers").appendChild(performerLink);
    });
    // add buttons
    const searchQuery = `${item.studio.name} ${item.title}`;
    clone.querySelector(".jackett-search").href = `${jackettUrl}#search=${searchQuery.replace(" ", "+")}`;
    clone.querySelector(".stashlist-btn-remove")
        .addEventListener("click", handleDelete);
    clone.querySelector(".stashlist-btn-ignore")
        .addEventListener("click", handleIgnore);
    clone.querySelector(".stashlist-btn-history")
        .addEventListener("click", handleHistory);
    clone.querySelector(".stashlist-btn-copy")
        .addEventListener("click", () => navigator.clipboard.writeText(searchQuery));
    clone.querySelector(".stashlist-btn-hide")
        .addEventListener("click", (e) => e.target.closest("[data-stash-id]").classList.toggle("hidden"));
    document.getElementById("fav-list")
        .appendChild(clone);
}
function queryLocal(sceneId) {
    const query = `query find($stash_id: String!) {
        findScenes(scene_filter:
            { stash_id_endpoint:
                { value: $stash_id modifier: EQUALS }
        })
        { scenes { id } }
    }`;
    return gqlClient(localStash, query, { stash_id: sceneId })
        .then(data => data.findScenes.scenes);
}
function queryLocalMultiple(sceneIDs) {
    sceneIDs.forEach(async (id) => {
        const localScenes = await queryLocal(id);
        if (localScenes.length == 0) return;
        await stashlist.modify(id, "history");
        document.querySelector(`[data-stash-id="${id}"]`).remove();
    });
}
const fetchWishlist = async () => {
    const wishIds = await stashlist.getlist("wish");
    await Promise.all(wishIds.map(id => fetchStashDB(id).then(createDiv)));
    queryLocalMultiple(wishIds);
};
async function testApis() {
    fetchWishlist();
    const fetchTest = (url, headers) => fetch(url, { headers }).then(response => response.ok).catch(e => false);
    const stashlistOK = await fetchTest(`${stashlist_server.host}/user/test`, { ApiKey: stashlist_server.apikey });
    const stashOK = await fetchTest(`${stashDB.host}?query=query Me { me { id } }`, { ApiKey: stashDB.apikey });
    const localStashOK = await fetchTest(`${localStash.host}?query=query Version { version { version } }`, { ApiKey: localStash.apikey });
    const placeholder = document.getElementById("placeholder");
    function addWarning(name, status) {
        const warning = document.createElement("p");
        warning.textContent = `${name}: ${status ? "OK" : "Error"}`;
        placeholder.appendChild(warning);
    }
    if (stashlistOK && stashOK && localStashOK) {
        placeholder.remove();
    } else {
        addWarning("StashDB", stashOK);
        addWarning("Local Stash", localStashOK);
        addWarning("stashlist", stashlistOK);
    }
}
testApis();