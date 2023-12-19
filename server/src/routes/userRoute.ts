// types
import { createUser } from "../utils/dbUser";
import { Request, ResponseToolkit } from "@hapi/hapi";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createHandler(req: Request, h: ResponseToolkit) {
  const registerToken = req.query.token;
  if (
    !registerToken ||
    (process.env.registration != "OPEN" &&
      registerToken != process.env.registration)
  ) {
    return h.response({ error: "Registration not open" }).code(401);
  }
  const userid = await createUser();
  return userid;
}

export async function testHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid) {
    return h.response({ error: "Missing ApiKey header" }).code(401);
  }
  return "OK";
}
