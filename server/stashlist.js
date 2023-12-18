require("dotenv").config();
async function routes(fastify, options) {
  const AUTH = process.env.STASHLIST_AUTH;
  // prehook
  fastify.addHook("preValidation", (req, reply, done) => {
    if (req.query.auth !== AUTH) {
      reply.code(403);
      done(new Error("Not authorized"));
    }
    if (!["ignore", "wishlist", undefined].includes(req.query?.type)) {
      reply.code(400)
      done(new Error("Invalid type"));
    }
    done();
  });
  fastify.get("/test", async function (req, reply) {
    return reply.status(200).send("test passed");
  });
  // search
  fastify.get("/single", async function (req, reply) {
    const { id } = req.query;
    const stashlist = this.mongo.db.collection("stashlist");
    const found = await stashlist.findOne({ stashid: id });
    if (!found) return reply.status(404).send();
    return reply.status(200).send(found);
  });
  // get all
  fastify.get("/wishlist", async function (req, reply) {
    const stashlist = this.mongo.db.collection("stashlist");
    const wishArr = await stashlist
      .find({ type: "wishlist" })
      .toArray()
    const wishlist = wishArr
      .map(r => r.stashid)
    reply.send({
      wishlist: wishlist ?? []
    });
  });
  // get matches
  fastify.post("/multi", async function (req, reply) {
    const stashlist = this.mongo.db.collection("stashlist");
    const ids = req.body.ids;
    const ignoreArr = await stashlist
      .find({ stashid: { $in: ids}, type: "ignore" })
      .toArray()
    const ignore = ignoreArr
      .map(r => r.stashid)
    const wishArr = await stashlist
      .find({ stashid: { $in: ids }, type: "wishlist" })
      .toArray()
    const wishlist = wishArr
      .map(r => r.stashid)
    reply.send({
      ignore: ignore ?? [],
      wishlist: wishlist ?? []
    });
  });
  // put
  fastify.post("/", async function (req, reply) {
    const { id, type } = req.query;
    if (!id || !type) return reply.status(400).send("missing id or type");
    const stashlist = this.mongo.db.collection("stashlist");
    await stashlist.updateOne(
      { stashid: id },
      { $set: { type }},
      { upsert: true });
    return reply.status(201).send("added");
  });
  // put
  fastify.delete("/", async function (req, reply) {
    const id = req.query.id;
    const stashlist = this.mongo.db.collection("stashlist");
    await stashlist.deleteOne({ stashid: id });
    return reply.status(200).send("removed");
  });
}

module.exports = routes;