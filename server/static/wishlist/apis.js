function gqlClient(instance, query, variables) {
    const options = {
        method: "GET",
        cache: "force-cache",
        headers: { "ApiKey": instance.apikey },
    }
    const params = new URLSearchParams({ query: query.replace(/\++/, '+'), variables: JSON.stringify(variables) });
    return fetch(`${instance.host}?${params}`, options)
        .then((response) => response.json())
        .then((data) => data.data);
}
function mongoApiDelete(sceneID) {
    const url = `${mongoApi.host}?auth=${mongoApi.apikey}&id=${sceneID}`;
    const options = { method: "DELETE" };
    return fetch(url, options);
}
function getWishList() {
    return fetch(`${mongoApi.host}/wishlist?auth=${mongoApi.apikey}`)
        .then((response) => response.json())
        .then((data) => data.wishlist);
}