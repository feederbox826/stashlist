import {
  listTypeValueArr,
  listTypeEnum,
  listEntry,
  stashid,
  listTypeKeys,
} from "../types/listType";
import sql from "./db";

// get list of type
export const getList = async (
  userid: number,
  listtype: listTypeEnum,
): Promise<string[]> => {
  const arr = await sql`SELECT stashid FROM lists WHERE userid = ${String(
    userid,
  )} AND listtype = ${listtype}`;
  return arr.map((item) => item.stashid);
};

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
  await sql`INSERT INTO stashids (id) VALUES (${stashid}) ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO lists (userid, stashid, listtype) VALUES (${String(
    userid,
  )}, ${stashid}, ${listtype})
    ON CONFLICT (userid, stashid) DO UPDATE SET listtype = ${listtype}`;
};

// add to list (bulk)
export const addToListBulk = async (
  userid: number,
  stashids: stashid[],
  listtype: listTypeEnum,
) => {
  const addArray = stashids.map((stashid) => ({
    userid: String(userid),
    stashid,
    listtype,
  }));
  const stashIdArray = stashids.map((stashid) => ({ id: stashid }));
  await sql`INSERT INTO stashids ${sql(stashIdArray)} ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO lists ${sql(
    addArray,
  )} ON CONFLICT (userid, stashid) DO UPDATE SET listtype = ${listtype}`;
};

// find item
export const findItem = async (userid: number, stashid: stashid) => {
  const result = await sql`SELECT listtype FROM lists WHERE userid = ${String(
    userid,
  )} AND stashid = ${stashid}`;
  if (result.length === 0) {
    return false;
  }
  return result[0].listtype;
};

// find items(bulk)
export const findItems = async (
  userid: number,
  stashids: stashid[],
): Promise<boolean | Record<listTypeKeys, stashid[]>> => {
  const dbResult =
    await sql`SELECT stashid, listtype FROM lists WHERE userid = ${String(
      userid,
    )} AND stashid in ${sql(stashids)}`;
  if (dbResult.length === 0) {
    return false;
  }
  const results = {
    wish: [],
    ignore: [],
    history: [],
  };
  for (const item of dbResult) {
    const typeString = listTypeEnum[item.listtype];
    results[typeString].push(item.stashid);
  }
  return results;
};
