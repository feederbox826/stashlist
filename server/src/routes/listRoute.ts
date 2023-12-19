// types
import { listTypeEnum, listTypeKeys, listTypeKeyArr } from "../types/listType";
import { Request, ResponseToolkit } from "@hapi/hapi";
import Joi from "joi";
import * as list from "../utils/dbList";

// /all - get all lists
export function getAllHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid)
    return h.response("Missing ApiKey header").code(401);
  const userid = Number.parseInt(req.auth.credentials.userid as string);
  const lists = list.getAllLists(userid);
  return lists;
}
// /add/bulk - add to list (bulk)
export function postAddBulkHandler(req: Request, h: ResponseToolkit) {
  // preparse
  if (!req.auth.credentials.userid)
    return h.response("Missing ApiKey header").code(401);
  const userid = Number.parseInt(req.auth.credentials.userid as string);
  const payload = req.payload as { stashids: string[]; type: string };
  const stashids: string[] = payload.stashids;
  const listtype: listTypeEnum = listTypeEnum[payload.type];
  // run
  list.addToListBulk(userid, stashids, listtype);
  return { message: `added ${stashids.length} items to ${payload.type} list` };
}
export const postAddBulkValidate = {
  payload: Joi.object({
    stashids: Joi.array()
      .items(Joi.string().guid({ version: "uuidv4" }).required())
      .required(),
    type: Joi.string()
      .valid(...listTypeKeyArr)
      .required(),
  }),
};
// /add/:type - add to list
export function postAddHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid)
    return h.response("Missing ApiKey header").code(401);
  const userid = Number.parseInt(req.auth.credentials.userid as string);
  const stashid = req.query.stashid;
  if (req.params.type === "remove") {
    list.removeFromList(userid, stashid);
    return { message: `removed ${stashid} from all lists` };
  }
  const listtype: listTypeEnum = listTypeEnum[req.params.type as string];
  list.addToList({ userid, stashid, listtype });
  return { message: `added ${stashid} to ${req.params.type} list` };
}
export const postAddValidate = {
  query: Joi.object({
    stashid: Joi.string().guid({ version: "uuidv4" }).required(),
  }),
  params: Joi.object({
    type: Joi.string()
      .valid(...listTypeKeyArr, "remove")
      .required(),
  }),
};
// /find/bulk - find items from body
export async function postFindBulkHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid)
    return h.response("Missing ApiKey header").code(401);
  const userid = Number.parseInt(req.auth.credentials.userid as string);
  const payload = req.payload as { stashids: string[] };
  const stashids: string[] = payload.stashids;
  const result = await list.findItems(userid, stashids);
  return result;
}
export const postFindBulkValidate = {
  payload: Joi.object({
    stashids: Joi.array()
      .items(Joi.string().guid({ version: "uuidv4" }).required())
      .required(),
  }),
};
// /find - find item
export async function getFindHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid)
    return h.response("Missing ApiKey header").code(401);
  const userid = Number.parseInt(req.auth.credentials.userid as string);
  const stashid = req.params.id;
  const listType = await list.findItem(userid, stashid);
  if (!listType) return h.response({ type: undefined }).code(404);
  const typeString = listTypeEnum[listType as listTypeKeys];
  return { type: typeString };
}
export const getFindValidate = {
  params: Joi.object({
    id: Joi.string().guid({ version: "uuidv4" }).required(),
  }),
};
// /:listtype - get list of type
export async function getListHandler(req: Request, h: ResponseToolkit) {
  if (!req.auth.credentials.userid)
    return h.response("Missing ApiKey header").code(401);
  const userid = Number.parseInt(req.auth.credentials.userid as string);
  const listtype: listTypeEnum = listTypeEnum[req.params.type as string];
  const result = await list.getList(userid, listtype);
  return result;
}
export const getListValidate = {
  params: Joi.object({
    type: Joi.string()
      .valid(...listTypeKeyArr)
      .required(),
  }),
};
