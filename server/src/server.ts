// modules
import Hapi, { Server } from "@hapi/hapi";
import { join } from "path";
// hapi plugins
import Inert from "@hapi/inert";
import Vision from "@hapi/vision";
import HapiSwagger from "hapi-swagger";
import { hapiValidateUser } from "./utils/authenticateUser";
// routes
import { createHandler, testHandler } from "./routes/userRoute";
import * as listRoutes from "./routes/listRoute";

export let server: Server;

const swaggerOptions = {
  info: {
    title: "stashlist-api",
  },
};

export const init = async function () {
  server = Hapi.server({
    port: process.env.PORT || 4000,
    host: "0.0.0.0",
    routes: {
      cors: {
        origin: ["*"],
        headers: ["Content-Type", "ApiKey"],
      },
      files: {
        relativeTo: join(__dirname, "static"),
      },
    },
  });
  server.auth.scheme("header-apikey", hapiValidateUser);
  server.auth.strategy("header-apikey", "header-apikey");
  server.auth.default("header-apikey");
  // modules
  await server.register(Inert);
  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions,
    },
  ]);
  // static paths
  server.route({
    method: "GET",
    path: "/",
    handler: (req, h) => {
      return h.redirect("wishlist/");
    },
    options: {
      auth: false,
    },
  });
  // wishlist
  server.route({
    method: "GET",
    path: "/wishlist/{filename*}",
    handler: {
      directory: {
        path: "wishlist",
        index: ["index.html"],
      },
    },
    options: {
      auth: false,
    },
  });
  server.route({
    method: "GET",
    path: "/wishlist",
    handler: (req, h) => {
      return h.redirect("wishlist/");
    },
    options: {
      auth: false,
    },
  });
  // setup
  server.route({
    method: "GET",
    path: "/setup/{filename*}",
    handler: {
      directory: {
        path: "setup",
        index: ["index.html"],
      },
    },
    options: {
      auth: false,
    },
  });
  server.route({
    method: "GET",
    path: "/setup",
    handler: (req, h) => {
      return h.redirect("setup/");
    },
    options: {
      auth: false,
    },
  });
  // /user/create
  server.route({
    method: "GET",
    path: "/api/user/create",
    handler: createHandler,
    options: {
      auth: false,
      tags: ["api"],
    },
  });
  // /user/test
  server.route({
    method: "GET",
    path: "/api/user/test",
    handler: testHandler,
    options: {
      auth: {
        mode: "required",
      },
      tags: ["api"],
    },
  });
  // /list/all
  server.route({
    method: "GET",
    path: "/api/list/all",
    handler: listRoutes.getAllHandler,
    options: {
      auth: {
        mode: "required",
      },
      tags: ["api"],
    },
  });
  // /list/add/bulk
  server.route({
    method: "POST",
    path: "/api/list/add/bulk",
    handler: listRoutes.postAddBulkHandler,
    options: {
      auth: {
        mode: "required",
      },
      validate: listRoutes.postAddBulkValidate,
      tags: ["api"],
    },
  });
  // /list/add/{type}
  server.route({
    method: "POST",
    path: "/api/list/add/{type}",
    handler: listRoutes.postAddHandler,
    options: {
      auth: {
        mode: "required",
      },
      validate: listRoutes.postAddValidate,
      tags: ["api"],
    },
  });
  // /list/find/bulk
  server.route({
    method: "POST",
    path: "/api/list/find/bulk",
    handler: listRoutes.postFindBulkHandler,
    options: {
      auth: {
        mode: "required",
      },
      validate: listRoutes.postFindBulkValidate,
      tags: ["api"],
    },
  });
  // /list/find/{id}
  server.route({
    method: "GET",
    path: "/api/list/find/{id}",
    handler: listRoutes.getFindHandler,
    options: {
      auth: {
        mode: "required",
      },
      validate: listRoutes.getFindValidate,
      tags: ["api"],
    },
  });
  // /list/{type}
  server.route({
    method: "GET",
    path: "/api/list/{type}",
    handler: listRoutes.getListHandler,
    options: {
      auth: {
        mode: "required",
      },
      validate: listRoutes.getListValidate,
      tags: ["api"],
    },
  });
  await server.start();
  // eslint-disable-next-line no-console
  console.log(`Server running on ${server.info.uri}`);
};
