import * as https from "https";
import * as fs from "fs";

import * as Constants from "./../shared/Constants";
import * as Util from "./../shared/Utilities";

import { AuthStorage } from "./../storage/AuthStorage";

export class TrelloAPI {
	private static readonly TOKEN_PATH: string = Constants.TOKEN_DIR + "trello-auth.json";
	private static readonly TOKEN_S3_KEY: string = "trello-auth";
	private static readonly TRELLO_HOST: string = "api.trello.com";
	private static readonly TRELLO_API_VER: string = "/1";
	private static readonly TRELLO_URI: string = `https://${TrelloAPI.TRELLO_HOST}${TrelloAPI.TRELLO_API_VER}`;

	public constructor(private _authStore: AuthStorage) {}

	public getBoards(callback) {
		this.getRequest("/member/me/boards", {}, callback);
	}

	public getListsAndCardsOnBoard(boardId: string, params, callback) {
		this.getRequest(`/boards/${boardId}/lists`, params, callback);
	}

	public updateList(listId: string, newName: string, pos: string) {
		if (!(newName || pos)) {
			throw new Error("Updating list with no new data.");
		}
		let data = {};
		if (newName) {
			data["name"] = encodeURIComponent(newName);
		}
		if (pos) {
			data["pos"] = pos;
		}
		this.putRequest(`${TrelloAPI.TRELLO_API_VER}/lists/${listId}`, data);
	}

	public createCard(listId: string, cardName: string, cardDesc: string) {
		let data = {
			"idList": listId, // required
			"name": encodeURIComponent(cardName),
			"desc": encodeURIComponent(cardDesc),
		};
		// apparently parameters have to be submitted through query string
		// instead of request body
		this.postRequest(`${TrelloAPI.TRELLO_API_VER}/cards`, data, null, null);
	}

	public deleteCard(cardId: string) {
		this.deleteRequest(`${TrelloAPI.TRELLO_API_VER}/cards/${cardId}`, {});
	}

	public updateCard(cardId: string, cardName: string, cardDesc: string) {
		let data = {
			"name": encodeURIComponent(cardName),
			"desc": encodeURIComponent(cardDesc),
		};
		this.putRequest(`${TrelloAPI.TRELLO_API_VER}/cards/${cardId}`, data);
	}

	public updateCardPos(cardId: string, pos: string) {
		let data = {
			"value": pos
		};
		this.putRequest(`${TrelloAPI.TRELLO_API_VER}/cards/${cardId}/pos`, data);
	}

	public storeToken() {
		this.readLocalToken((token) => {
			this._authStore.storeEncryptedAuth(TrelloAPI.TOKEN_S3_KEY, token);
		});
	}

	private getRequest(path: string, queryParams: any, callback) {
		this.getTokenToRun((token) => {
			let queryString = Util.constructQueryString(Object.assign({}, token, queryParams));
			let url = TrelloAPI.TRELLO_URI + path + queryString;
			https.get(url, (response) => {
				const { statusCode } = response;

				if (statusCode !== 200) {
					response.resume();
					throw new Error(`Trello GET request failed. Status code: ${statusCode}`);
				}

				response.setEncoding("utf8");
				let rawData = "";
				response.on("data", (chunk) => { rawData += chunk; });
				response.on("end", () => {
					let parsedData = JSON.parse(rawData);
					callback(parsedData);
				});
			});
		});
	}

	private postRequest(path: string, queryParams: any, postData: any, callback) {
		this.sendRequest("POST", path, queryParams, postData, callback);
	}

	private deleteRequest(path: string, queryParams: any) {
		this.sendRequest("DELETE", path, queryParams);
	}

	private putRequest(path: string, queryParams: any) {
		this.sendRequest("PUT", path, queryParams);
	}

	private sendRequest(method: string, path: string, queryParams: any, data?: any, callback?) {
		this.getTokenToRun((token) => {
			let queryString = Util.constructQueryString(Object.assign({}, token, queryParams));
			let postDataString = (data) ? JSON.stringify(data) : "";
			const options = {
				hostname: TrelloAPI.TRELLO_HOST,
				path: path + queryString,
				method: method,
				headers: {
					"Content-Length": Buffer.byteLength(postDataString)
				}
			};
			const request = https.request(options, (response) => {
				const { statusCode } = response;

				if (statusCode !== 200) {
					response.resume();
					throw new Error(`Trello ${method} request to ${path} failed. Status code: ${statusCode}`);
				}

				console.log(`Trello ${method} request to ${path} success`);

				if (callback) {
					let rawData = "";
					response.on("data", (chunk) => { rawData += chunk });
					response.on("end", () => {
						let parsedData = JSON.parse(rawData);
						callback(parsedData);
					})
				}
			});

			request.on("error", (err) => {
				throw new Error(`Request error. ${err}`);
			});
			request.write(postDataString);
			request.end();
		});
	}

	private getTokenToRun(callback) {
		this._authStore.getEncryptedAuth(TrelloAPI.TOKEN_S3_KEY, callback);
	}

	private readLocalToken(callback) {
		fs.readFile(TrelloAPI.TOKEN_PATH, (err, content) => {
			if (err) {
				throw new Error("Error loading Trello token. " + err);
			}

			let token = JSON.parse(content.toString("utf8"));
			callback(token);
		});
	}

}











