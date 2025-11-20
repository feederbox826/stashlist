import { validateApiKey } from "./dbUser";
import { unauthorized } from "@hapi/boom";
import { Request, ResponseToolkit, ReqRefDefaults } from "@hapi/hapi";
import Joi from "joi";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function hapiValidateUser(server: object, options: ReqRefDefaults) {
  return {
    async authenticate(request: Request, h: ResponseToolkit) {
      const { apikey } = request.headers;
      // preflight check
      if (!apikey) throw unauthorized("Missing ApiKey header");
      // check if valid type
      try {
        if (typeof apikey !== "string")
          throw new Error("Invalid ApiKey Format");
        Joi.assert(apikey, Joi.string().guid({ version: 'uuidv4', seperator: '-'}).required());
      } catch (e) {
        throw unauthorized("Invalid ApiKey Format");
      }
      // validate
      const userid = await validateApiKey(apikey);
      if (userid) {
        return h.authenticated({ credentials: { userid } });
      } else {
        throw unauthorized("Unknown ApiKey");
      }
    },
  };
}
