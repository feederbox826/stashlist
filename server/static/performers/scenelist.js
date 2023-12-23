const path = window.location.pathname;
const pathArray = path.split("/");
const [ type, id ] = pathArray.slice(2);

const sceneQuery = `query QueryScenes($page: Int!, $performers: [ID!], $studios: [ID!]) {
    queryScenes(input: {
        performers: { value: $performers modifier: INCLUDES }
        studios: { modifier: INCLUDES, value: $studios }
        sort: DATE direction: DESC page: $page per_page: 50
    }) { count scenes {
        details release_date updated id title
        images { url }
        studio { id name }
        performers { performer { id name }}
}}}`;

if (type == "studios") {
    //
} else if (type == "performers") {
    //
}