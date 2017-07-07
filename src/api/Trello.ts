import * as https from "https";
import * as fs from "fs";

import * as Constants from "./../shared/Constants";
import * as Util from "./../shared/Utilities";


const TOKEN_PATH = Constants.TOKEN_DIR + "trello-auth.json";
const TRELLO_URI = 'https://api.trello.com/1';

let getTokenToRun = (callback) => {
	fs.readFile(TOKEN_PATH, (err, content) => {
		if (err) {
			console.error("Error loading Trello token. " + err);
			return;
		}

		let token = JSON.parse(content.toString("utf8"));
		callback(token);
	});
}

export let getBoards = (callback) => {
	getTokenToRun((token) => {
		let queryString = Util.constructQueryString(token);
		let url = TRELLO_URI + "/member/me/boards" + queryString;

		https.get(url, (response) => {
			const { statusCode } = response;

			if (statusCode !== 200) {
				console.error("Trello get boards request failed. Status code: %s", statusCode);
				response.resume();
				return;
			}

			response.setEncoding("utf8");
			let rawData = "";
			response.on("data", (chunk) => { rawData += chunk; });
			response.on("end", () => {
				try {
					let parsedData = JSON.parse(rawData);
					callback(parsedData);
				} catch (err) {
					console.error(err.message);
				}
			});
		});
	});
}