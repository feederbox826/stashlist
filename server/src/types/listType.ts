// type validation
export enum listTypeEnum {
  wish = 1,
  history = 2,
  ignore = 3,
  ignorePerformer = 4,
  ignoreStudio = 5
}
export type listTypeKeys = keyof typeof listTypeEnum;
export const listTypeKeyArr: listTypeKeys[] = ["wish", "history", "ignore", "ignorePerformer", "ignoreStudio"];
export const listTypeValueArr = [1, 2, 3, 4, 5];
export type stashid = string;
export interface listEntry {
  userid: number;
  stashid: stashid;
  listtype: listTypeEnum;
}
