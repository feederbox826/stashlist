import {
  listTypeValueArr,
  listTypeEnum,
  listEntry,
  stashid,
  listTypeKeys,
} from "../types/listType";
import sql from "./db";
import { v4 as uuidv4 } from "uuid";

// validate apikey
export const validateApiKey = async (apikey: string) => {
  const result = await sql`SELECT id FROM users WHERE apikey = ${apikey}`;
  if (result.length === 0) {
    return false;
  }
  return result[0].id;
};

// create new user
export const createUser = async (): Promise<string> => {
  const uuid = uuidv4();
  await sql`INSERT INTO users (apikey) VALUES ( ${uuid} )`;
  return uuid;
};

// delete user
export const deleteUser = async (userid: string): Promise<void> => {
  await sql`DELETE FROM users WHERE userid = ${String(userid)}`;
  await sql`DELETE FROM lists WHERE userid = ${String(userid)}`;
};

// get list of type []
export const getList = async (userid: number, listtype: listTypeEnum) =>
  sql`SELECT stashid FROM stashlist WHERE userid = ${String(
    userid,
  )} AND listtype = ${listtype}`;

// get all lists
export const getAllLists = async (
  userid: number,
): Promise<Record<listTypeKeys, string[]>> => {
  const lists: Record<listTypeKeys, string[]> = {
    wish: [],
    ignore: [],
    history: [],
  };
  for (const type of listTypeValueArr) {
    const listName = listTypeEnum[type];
    lists[listName] = await getList(userid, type);
  }
  return lists;
};

// add to list
export const addToList = async ({
  userid,
  stashid,
  listtype,
}: listEntry): Promise<void> => {
  await sql`INSERT INTO stashlist (userid, stashid, listtype) VALUES (${String(
    userid,
  )}, ${stashid}, ${listtype})`;
};

// add to list (bulk)
export const addToListBulk = async (
  userid: number,
  stashids: stashid[],
  listtype: listTypeEnum,
) => {
  const addArray = stashids.map((stashid) => [
    String(userid),
    stashid,
    listtype,
  ]);
  await sql`INSERT INTO stashlist ${sql(addArray)}`;
};
