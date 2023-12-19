// type validation
export enum listTypeEnum {
  wish = 1,
  history = 2,
  ignore = 3,
}
export type listTypeKeys = keyof typeof listTypeEnum;
export const listTypeKeyArr: listTypeKeys[] = ["wish", "history", "ignore"];
export const listTypeValueArr = [1, 2, 3];
export type stashid = string;
export interface listEntry {
  userid: number;
  stashid: stashid;
  listtype: listTypeEnum;
}
