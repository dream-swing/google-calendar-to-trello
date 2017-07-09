import * as https from "https";
import * as fs from "fs";

import * as Constants from "./../shared/Constants";
import * as Util from "./../shared/Utilities";


const TOKEN_PATH = Constants.TOKEN_DIR + "trello-auth.json";
const TRELLO_HOST = "api.trello.com";
const TRELLO_API_VER = "/1";
const TRELLO_URI = `https://${TRELLO_HOST}${TRELLO_API_VER}`;

export let getBoards = (callback) => {
	getRequest("/member/me/boards", {}, callback);
}

export let getListsAndCardsOnBoard = (boardId: string, params, callback) => {
	getRequest(`/boards/${boardId}/lists`, params, callback);
}

export let createCard = (listId: string, cardName: string, cardDesc: string) => {
	let data = {
		"idList": listId, // required
		"name": encodeURIComponent(cardName),
		"desc": encodeURIComponent(cardDesc),
	};
	// apparently parameters have to be submitted through query string
	// instead of request body
	postRequest(`${TRELLO_API_VER}/cards`, data, null, null);
}

export let deleteCard = (cardId: string) => {
	deleteRequest(`${TRELLO_API_VER}/cards/${cardId}`, {});
}

export let updateCard = (cardId: string, cardName: string, cardDesc: string) => {
	let data = {
		"name": encodeURIComponent(cardName),
		"desc": encodeURIComponent(cardDesc),
	};
	putRequest(`${TRELLO_API_VER}/cards/${cardId}`, data);
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
	sendRequest("POST", path, queryParams, postData, callback);
}

let deleteRequest = (path: string, queryParams: any) => {
	sendRequest("DELETE", path, queryParams, null, null);
}

let putRequest = (path: string, queryParams: any) => {
	sendRequest("PUT", path, queryParams, null, null);
}

let sendRequest = (method: string, path: string, queryParams: any, data: any, callback) => {
	getTokenToRun((token) => {
		let queryString = Util.constructQueryString(Object.assign({}, token, queryParams));
		let postDataString = JSON.stringify(data);
		const options = {
			hostname: TRELLO_HOST,
			path: path + queryString,
			method: method,
			headers: {
				"Content-Length": Buffer.byteLength(postDataString)
			}
		};
		const request = https.request(options, (response) => {
			const { statusCode } = response;

			if (statusCode !== 200) {
				console.error(`Trello ${method} request to ${path} failed. Status code: ${statusCode}`);
				response.resume();
				return;
			}

			console.log(`Trello ${method} request to ${path} success`);

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











