import * as https from "https";
import * as fs from "fs";

import * as Constants from "./../shared/Constants";
import * as Util from "./../shared/Utilities";


const TOKEN_PATH = Constants.TOKEN_DIR + "trello-auth.json";
const TRELLO_URI = 'https://api.trello.com/1';
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

let getRequest = (path: string, queryParams: any, callback) => {
	getTokenToRun((token) => {
		let queryString = Util.constructQueryString(Object.assign({}, token, queryParams));
		let url = TRELLO_URI + path + queryString;
		https.get(url, (response) => {
			const { statusCode } = response;

			if (statusCode !== 200) {
				console.error("Trello GET request failed. Status code: %s", statusCode);
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












