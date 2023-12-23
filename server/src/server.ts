// modules
import Hapi, { Server } from "@hapi/hapi";
// hapi plugins
import Inert from "@hapi/inert";
import Vision from "@hapi/vision";
import HapiSwagger from "hapi-swagger";
import { hapiValidateUser } from "./utils/authenticateUser";
// routes
import { userRoutes } from "./routes/userRoute";
import { listRoutes } from "./routes/listRoute";

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
        relativeTo: "./static",
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
  // static paths
  server.route({
    method: "GET",
    path: "/{filename*}",
    handler: {
      directory: {
        path: ".",
        redirectToSlash: true,
      },
    },
    options: {
      auth: false,
    },
  });
  // /user/*
  server.route(userRoutes);
  // /list/*
  server.route(listRoutes);
  await server.start();
  // eslint-disable-next-line no-console
  console.log(`Server running on ${server.info.uri}`);
};
