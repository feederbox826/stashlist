// types
import { createUser } from "../utils/dbUser";
import { Request, ResponseToolkit } from "@hapi/hapi";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createHandler(req: Request, h: ResponseToolkit) {
  const userid = await createUser();
  return userid;
}

export async function testHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid) {
    return h.response("Missing ApiKey header").code(401);
  }
  return "OK";
}
