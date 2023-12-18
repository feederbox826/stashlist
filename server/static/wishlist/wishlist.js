// Description: Fetches wishlist from mongo and stashdb, and displays it on the page.
const stashDB = {
    apikey: localStorage.getItem("stashdb_apikey"),
    host: localStorage.getItem("stashdb_host"),
};
const mongoApi = {
    apikey: localStorage.getItem("mongo_apikey"),
    host: localStorage.getItem("mongo_host"),
};
const jackettUrl = localStorage.getItem("jackett_host")
const localStash = {
    apikey: localStorage.getItem("local_apikey"),
    host: localStorage.getItem("local_host"),
};

function fetchStashDB(id) {
    const query = `query Scene($id: ID!) {
        findScene(id: $id) {
            id title details release_date
            images { url }
            studio { id name }
            performers { performer { name id }}
    }}`
    return gqlClient(stashDB, query, { id })
        .then(data => data.findScene)
};
const handleDelete = async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const card = e.target.closest("[data-stash-id]");
    const stashid = card.getAttribute("data-stash-id");
    if (confirm("Confirm delete?") == false) return;
    await mongoApiDelete(stashid);
    card.remove()
};
function createDiv(item) {
    const template = document.querySelector("#card-template");
    const clone = template.cloneNode(true);
    clone.setAttribute("data-stash-id", item.id);
    clone.id = "";
    clone.querySelector(".title").textContent = item.title;
    clone.querySelector(".title-link").href = `https://stashdb.org/scenes/${item.id}`;
    clone.querySelector(".studio").textContent = item.studio.name;
    clone.querySelector(".studio").href = `https://stashdb.org/studios/${item.studio.id}`;
    clone.querySelector(".release-date").textContent = item.release_date;
    clone.querySelector(".Image-image").src = item.images[0].url;
    clone.querySelector(".description").textContent = item.details ?? "No description available";
    // add performers
    for (const performer of item.performers) {
        const performerLink = document.createElement("a");
        performerLink.classList.add("scene-performer");
        performerLink.textContent = performer.performer.name;
        performerLink.href = `https://stashdb.org/performers/${performer.performer.id}`;
        clone.querySelector(".scene-performers").appendChild(performerLink);
    }
    // add jackett search
    const searchQuery = `${item.studio.name} ${item.title}`.replace(" ", "+");
    clone.querySelector(".jackett-search").href = `${jackettUrl}#search=${searchQuery}`
    // add remove button
    const removeButton = clone.querySelector(".stashlist-btn-remove");
    removeButton.addEventListener("click", handleDelete)
    const list = document.getElementById("fav-list");
    list.appendChild(clone);
}
function fetchWishlist() {
    getWishList().then(data => {
        data.forEach(item =>
            fetchStashDB(item)
                .then(dbItem => createDiv(dbItem))
        )
        queryLocalMultiple(data);
        })
}
function queryLocal(sceneId) {
    const query = `query find($stash_id: String!) {
        findScenes(scene_filter:
            { stash_id:
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
        await mongoApiDelete(id);
        const scene = document.querySelector(`[data-stash-id="${id}"]`);
        scene.remove()
    });
}
async function testApis() {
    const mongoOK = await fetch(`${mongoApi.host}/api/stash?auth=${mongoApi.apikey}`)
        .then(response => response.ok)
        .catch(error => false);
    const stashOK = await fetch(`${stashDB.host}?query=query Me { me { id } }`, { headers: { ApiKey: stashDB.apikey } })
        .then(response => response.ok)
        .catch(error => false);
    const localStashOK = await fetch(`${localStash.host}?query=query Version { version { version } }`, { headers: { ApiKey: localStash.apikey } })
        .then(response => response.ok)
        .catch(error => false);
    const placeholder = document.getElementById("placeholder");
    function addWarning(name, status) {
        const warning = document.createElement("p");
        warning.textContent = `${name}: ${status ? "OK" : "Error"}`;
        placeholder.appendChild(warning);
    }
    if (mongoOK && stashOK && localStashOK) {
        placeholder.remove();
        fetchWishlist();
    } else {
        addWarning("StashDB", stashOK);
        addWarning("Local Stash", localStashOK);
        addWarning("Mongo API", mongoOK);
    }
}
testApis();