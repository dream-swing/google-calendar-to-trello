import * as fs from "fs";
import * as readline from "readline";
import * as googleAuth from "google-auth-library";
import * as process from "process";

import * as Constants from "./../shared/Constants";
import { AuthStorage } from "./../storage/AuthStorage";

export class GoogleAuthAPI {
	private static readonly SCOPES = ["https://www.googleapis.com/auth/calendar"];
	private static readonly TOKEN_PATH:string = Constants.TOKEN_DIR + "google-auth.json";
	private static readonly CLIENT_SECRETS: string = "secrets/client_secret.json";
	private static readonly GOOGLE_AUTH_S3_KEY: string = "google-auth";
	private static readonly GOOGLE_CLIENT_SECRET_S3_KEY: string = "google-client-secret";

	constructor(private _authStore: AuthStorage) {}

	public processClientSecrets(callback) {
		this._authStore.getEncryptedAuth(GoogleAuthAPI.GOOGLE_CLIENT_SECRET_S3_KEY, (clientSecret) => {
			this.authorize(clientSecret, callback);
		});
	}

	public storeSecretsToS3() {
		fs.readFile(GoogleAuthAPI.CLIENT_SECRETS, (err, content) => {
			if (err) {
				throw new Error("Error loading Google client secret file. " + err);
			} else {
				this._authStore.storeEncryptedAuth(GoogleAuthAPI.GOOGLE_CLIENT_SECRET_S3_KEY, JSON.parse(content.toString("utf8")));			
			}
		});

		fs.readFile(GoogleAuthAPI.TOKEN_PATH, (err, token) => {
			if (err) {
				throw new Error("Error loading Google credentials. " + err);
			} else {
				this._authStore.storeEncryptedAuth(GoogleAuthAPI.GOOGLE_AUTH_S3_KEY, JSON.parse(token.toString("utf8")));
			}
		});
	}

	/**
	 * Creates an OAuth2 client by retrieving client secret, and prompts user
	 * for authorization. The authorized token is stored both on disk and on S3
	 */
	public promptForNewToken() {
		this._authStore.getEncryptedAuth(GoogleAuthAPI.GOOGLE_CLIENT_SECRET_S3_KEY, (clientSecret) => {
			let oauth2Client = this.createOauth2Client(clientSecret);
			this.getNewToken(oauth2Client);
		});
	}

	/**
	 * Create an OAuth2 client with the given credentials, and then execute the
	 * given callback function.
	 *
	 * @param {Object} credentials The authorization client credentials.
	 * @param {function} callback The callback to call with the authorized client.
	 */
	private authorize = (credentials, callback) => {
		let oauth2Client = this.createOauth2Client(credentials);

		this._authStore.getEncryptedAuth(GoogleAuthAPI.GOOGLE_AUTH_S3_KEY, (token) => {
			oauth2Client.credentials = token;
			callback(oauth2Client);
		});
	}

	/**
	 * Get and store new token after prompting for user authorization
	 *
	 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
	 */
	private getNewToken(oauth2Client) {
		let authUrl = oauth2Client.generateAuthUrl({
			access_type: "offline",
			scope: GoogleAuthAPI.SCOPES
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
					throw new Error("Error while trying to retrieve access token " + err);
				}
				this.storeToken(token);
			});
		});
	}

	/**
	 * Store token to disk be used in later program executions.
	 *
	 * @param {Object} token The token to store to disk.
	 */
	private storeToken(token) {
		try {
			fs.mkdirSync(Constants.TOKEN_DIR);
		} catch (err) {
			if (err.code != "EEXIST") {
				throw err;
			}
		}
		fs.writeFile(GoogleAuthAPI.TOKEN_PATH, JSON.stringify(token));
		console.log("Token stored to " + GoogleAuthAPI.TOKEN_PATH);

		this._authStore.storeEncryptedAuth(GoogleAuthAPI.GOOGLE_AUTH_S3_KEY, token);
	}

	private createOauth2Client(credentials) {
		let clientSecret = credentials.installed.client_secret;
		let clientId = credentials.installed.client_id;
		let redirectUrl = credentials.installed.redirect_uris[0];
		let auth = new googleAuth();
		let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
		return oauth2Client;
	}

}









