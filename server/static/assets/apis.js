// polyfill with GM_fetch if available
let proxyFetch = window?.GM_fetch ?? window?.fetch;
console.log(`[api] Using ${ window?.GM_fetch ? "GM_fetch ✅" : "window.fetch ❌" } for proxy requests`);

function gqlClient(instance, query, variables) {
    const options = {
        method: "POST",
        headers: { "ApiKey": instance.apikey, "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables })
    };
    return proxyFetch(`${instance.host}/graphql`, options)
        .then(response => response.json())
        .then(data => data.data);
}
function gqlClientCache(instance, query, variables) {
  const options = {
      method: "GET",
      headers: { "ApiKey": instance.apikey },
  };
  const params = new URLSearchParams({ query: query.replace(/\++/, "+"), variables: JSON.stringify(variables) })
  return proxyFetch(`${instance.host}?${params}`, options)
      .then(response => response.json())
      .then(data => data.data);
}

const stashlistClient = (method = "GET", path, overrides) => {
    const params = new URLSearchParams(overrides?.params ?? {});
    return proxyFetch(`${stashlist_server.host}${path}?${params}`, {
      method,
      headers: { "ApiKey": stashlist_server.apikey, "Content-Type": "application/json" },
      ...overrides
    });
};

const stashlist = {
    addbulk: (ids, list) => stashlistClient("POST", "/api/list/add/bulk", {
        body: JSON.stringify({ stashids: ids, type: list })
    }),
    add: (id, list) => stashlistClient("POST", `/api/list/add/${list}`, {
        params: { stashid: id }
    }),
    modify: (id, list) => stashlistClient("POST", `/api/list/add/${list}`, {
        params: { stashid: id }
    }),
    findBulk: (ids) => stashlistClient("POST", "/api/list/find/bulk", {
        body: JSON.stringify({ stashids: ids })
    })
      .then(res => res.json()),
    find: (id) => stashlistClient("GET", `/api/list/find/${id}`)
      .then(res => res.json()),
    getlist: (list) => stashlistClient("GET", `/api/list/${list}`)
      .then(res => res.json()),
};

function queryLocal(sceneId) {
  const query = `query find($stash_id: String!) {
  findScenes(scene_filter: {
    stash_id_endpoint: {
    stash_id: $stash_id modifier: EQUALS
  }})
  { scenes { id } }}`;
  const variables = { stash_id: sceneId };
  return gqlClient(localStash, query, variables)
    .then(data => data.findScenes.scenes);
}