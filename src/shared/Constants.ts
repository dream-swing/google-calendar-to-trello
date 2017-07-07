import * as process from "process";

export const TOKEN_DIR: string = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + "/.credentials/";