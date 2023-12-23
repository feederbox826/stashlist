// types
import { createUser } from "../utils/dbUser";
import { Request, ResponseToolkit, ServerRoute } from "@hapi/hapi";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createHandler(req: Request, h: ResponseToolkit) {
  const registerToken = req.query.token;
  if (
    !registerToken ||
    (process.env.REGISTRATION != "OPEN" &&
      registerToken != process.env.REGISTRATION)
  ) {
    return h.response({ error: "Registration not open" }).code(401);
  }
  const userid = await createUser();
  return userid;
}

async function testHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid) {
    return h.response({ error: "Missing ApiKey header" }).code(401);
  }
  return "OK";
}

export const userRoutes: ServerRoute[] = [{
  method: "GET",
  path: "/api/user/create",
  handler: createHandler,
  options: {
    auth: false,
    tags: ["api"],
  },
}, {
  method: "GET",
  path: "/api/user/test",
  handler: testHandler,
  options: {
    auth: {
      mode: "required",
    },
    tags: ["api"],
  },
}];