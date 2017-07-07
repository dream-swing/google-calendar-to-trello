import * as fs from "fs";
import * as readline from "readline";
import * as googleAuth from "google-auth-library";
import * as process from "process";

import * as Constants from "./../shared/Constants";

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];
const TOKEN_PATH:string = Constants.TOKEN_DIR + "google-auth.json";
const CLIENT_SECRETS: string = "secrets/client_secret.json";

export let processClientSecrets = (callback) => {
	fs.readFile(CLIENT_SECRETS, (err, content) => {
		if (err) {
			console.error("Error loading Google client secret file. " + err);
			return;
		}

		authorize(JSON.parse(content.toString("utf8")), callback);
	});
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
let authorize = (credentials, callback) => {
	let clientSecret = credentials.installed.client_secret;
	let clientId = credentials.installed.client_id;
	let redirectUrl = credentials.installed.redirect_uris[0];
	let auth = new googleAuth();
	let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			oauth2Client.credentials = JSON.parse(token.toString("utf8"));
			callback(oauth2Client);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
let getNewToken = (oauth2Client, callback) => {
	let authUrl = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: SCOPES
	});
	console.log("Authorize this app by visiting this url: ", authUrl);
	let rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question("Enter the code from that page here: ", (code) => {
		rl.close();
		oauth2Client.getToken(code, (err, token) => {
			if (err) {
				console.error("Error while trying to retrieve access token", err);
				return;
			}
			oauth2Client.credentials = token;
			storeToken(token);
			callback(oauth2Client);
		});
	});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
let storeToken = (token) => {
	try {
		fs.mkdirSync(Constants.TOKEN_DIR);
	} catch (err) {
		if (err.code != "EEXIST") {
			throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log("Token stored to " + TOKEN_PATH);
}









