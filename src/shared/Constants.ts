import * as process from "process";

export const TOKEN_DIR: string = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + "/.credentials/";

export const TIMEZONE: string = "America/New_York";

export const DEBUG: boolean = process.env["useTestTrelloBoard"] == "true";