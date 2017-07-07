import * as https from "https";
import * as fs from "fs";

import * as Constants from "./../shared/Constants";
import * as Util from "./../shared/Utilities";


const TOKEN_PATH = Constants.TOKEN_DIR + "trello-auth.json";
const TRELLO_HOST = "api.trello.com";
const TRELLO_API_VER = "/1";
const TRELLO_URI = `https://${TRELLO_HOST}${TRELLO_API_VER}`;
const WEEKLY_PLANNER_BOARDID = "59387c00db4e82fa3c3825b3";
const TEST_BOARDID = "595fcd34efd0be9149f39649";

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
	getRequest("/member/me/boards", {}, callback);
}

export let getWeekList = (callback) => {
	let params = {
		"cards": "open",
		"card_fields": "name",
		"fields": "name"
	};
	getRequest(`/boards/${TEST_BOARDID}/lists`, params, (allTheLists) => {
		let listsWeWant = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
		let outputList = {};
		for (let list of allTheLists) {
			if (listsWeWant.includes(list.name)) {
				outputList[list.name] = list;
			}
		}
		callback(outputList);
	});
}

export let createCard = (listId: string, cardName: string) => {
	let data = {
		"idList": listId, // required
		"name": encodeURIComponent(cardName)
	}
	// apparently parameters have to be submitted through query string
	// instead of request body
	postRequest(`${TRELLO_API_VER}/cards`, data, null, null);
}

let getRequest = (path: string, queryParams: any, callback) => {
	getTokenToRun((token) => {
		let queryString = Util.constructQueryString(Object.assign({}, token, queryParams));
		let url = TRELLO_URI + path + queryString;
		https.get(url, (response) => {
			const { statusCode } = response;

			if (statusCode !== 200) {
				console.error(`Trello GET request failed. Status code: ${statusCode}`);
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

let postRequest = (path: string, queryParams: any, postData: any, callback) => {
	getTokenToRun((token) => {
		let queryString = Util.constructQueryString(Object.assign({}, token, queryParams));
		let postDataString = JSON.stringify(postData);
		const options = {
			hostname: TRELLO_HOST,
			path: path + queryString,
			method: "POST",
			headers: {
				"Content-Length": Buffer.byteLength(postDataString)
			}
		};
		const request = https.request(options, (response) => {
			const { statusCode } = response;

			if (statusCode !== 200) {
				console.error(`Trello POST request failed. Status code: ${statusCode}`);
				response.resume();
				return;
			}

			console.log("Trello POST request success");

			if (callback) {
				let rawData = "";
				response.on("data", (chunk) => { rawData += chunk });
				response.on("end", () => {
					try {
						let parsedData = JSON.parse(rawData);
						callback(parsedData);
					} catch (err) {
						console.error(err.message);
					}
				})
			}
		});

		request.on("error", (err) => {
			console.error(`Request error. ${err}`);
		});

		request.write(postDataString);
		request.end();
	});
}











