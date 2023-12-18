require("dotenv").config();
const path = require('node:path')
const Fastify = require("fastify");
const fastify = Fastify();
fastify.register(require("@fastify/mongodb"), {
  // force to close the mongodb connection when app stopped
  forceClose: true,
  url: process.env.MONGO_AUTH
});

fastify.register(require("@fastify/cors"), {
  origin: "*",
  methods: ["GET", "POST", "DELETE"],
});

fastify.register(require("./stashlist.js"), { prefix: "/api/stash" });
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'static'),
  prefix: '/'
})
fastify.get('/', (req, reply) => {
  reply.redirect('/wishlist/')
})

fastify.listen({ port: process.env.PORT });
console.log(`server started on port ${process.env.PORT}`);