function gqlClient(instance, query, variables) {
    const options = {
        method: "POST",
        headers: { "ApiKey": instance.apikey, "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables })
    };
    return fetch(`${instance.host}`, options)
        .then(response => response.json())
        .then(data => data.data);
}

const stashlistClient = (method = "GET", path, overrides) => {
    const params = new URLSearchParams(overrides?.params ?? {});
    return fetch(`${stashlist_server.host}${path}?${params}`, {
      method,
      headers: { "ApiKey": stashlist_server.apikey, "Content-Type": "application/json" },
      ...overrides
    });
};

const stashlist = {
    addbulk: (ids, list) => stashlistClient("POST", "/list/add/bulk", {
        body: JSON.stringify({ stashids: ids, type: list })
    }),
    modify: (id, list) => stashlistClient("POST", `/list/add/${list}`, {
        params: { stashid: id }
    }),
    findBulk: (ids) => stashlistClient("POST", "/list/find/bulk", {
        body: JSON.stringify({ stashids: ids })
    })
      .then(res => res.json()),
    find: (id) => stashlistClient("GET", `/list/find/${id}`)
      .then(res => res.json()),
    getlist: (list) => stashlistClient("GET", `/list/${list}`)
      .then(res => res.json()),
};