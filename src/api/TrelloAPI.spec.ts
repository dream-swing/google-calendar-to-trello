import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as https from "https";
import { PassThrough } from "stream";

import { TrelloAPI } from "./TrelloAPI";
import { FakeAuthStorage } from "./../storage/AuthStorage";

let expect = chai.expect;

const TRELLO_HOST: string = "api.trello.com";
const TRELLO_API_VER: string = "/1";

describe("Trello API", function() {
	beforeEach(function() {
		let fakeAuthStore = new FakeAuthStorage();
		this.trelloAPI = new TrelloAPI(fakeAuthStore);

		this.stubbedHttpsGet = sinon.stub(https, "get");
		this.stubbedHttpsRequest = sinon.stub(https, "request");
	});

	afterEach(function() {
		this.stubbedHttpsGet.restore();
		this.stubbedHttpsRequest.restore();
	});

	describe("#getBoards()", function() {
		it("should pass boards to callback", function(done) {
			let expectedData = [
				{ "name": "board1", "id": "123" },
				{ "name": "board2", "id": "234"}
			];
			stubHttpsResponse(this.stubbedHttpsGet, 200, expectedData);

			this.trelloAPI.getBoards((data) => {
				expect(data).to.eql(expectedData);
				done();
			});
		});
	});

	describe("#getListsAndCardsOnBoard()", function() {
		it("should throw if boardId is invalid", function() {
			// Trello response: 400, "invalid id"
			let callback = sinon.spy();
			let testFunc = () => {
				this.trelloAPI.getListsAndCardsOnBoard("12345", {}, callback);
			}

			stubHttpsResponse(this.stubbedHttpsGet, 400, "invalid id");

			// TODO: This test might have synchronization issues where callback
			// could be called but test still passes
			expect(testFunc).to.throw("request failed");
			expect(callback.called).to.be.false;
		});

		it("should pass all lists and cards to callback", function(done) {
			let expectedData = [
				{ "name": "list1" },
				{ "name": "list2" }
			];

			stubHttpsResponse(this.stubbedHttpsGet, 200, expectedData);

			this.trelloAPI.getListsAndCardsOnBoard("12345", {}, (data) => {
				expect(data, "Data passed to callback should be same as https call result").to.eql(expectedData);
				done();
			});
		});
	});

	describe("#updateList()", function() {
		let listId = "54321";
		let newName = "new name";
		let encodedNewName = encodeURIComponent(newName);
		let tests = [
			{
				description: "should include all data in URL",
				newName: newName,
				newPos: "23",
				expectedQuery: `name=${encodedNewName}&pos=23`
			},
			{
				description: "should only send name if newPos is empty string",
				newName: newName,
				newPos: "",
				expectedQuery: `name=${encodedNewName}`
			},
			{
				description: "should only send name if newPos is null",
				newName: newName,
				newPos: null,
				expectedQuery: `name=${encodedNewName}`
			},
			{
				description: "should only send pos if newName is empty string",
				newName: "",
				newPos: "23",
				expectedQuery: `pos=23`
			},
			{
				description: "should only send pos if newName is null",
				newName: null,
				newPos: "23",
				expectedQuery: `pos=23`
			}
		];

		tests.forEach(function(test) {
			it(test.description, function() {
				stubHttpsSimpleResponse(this.stubbedHttpsRequest);

				this.trelloAPI.updateList(listId, test.newName, test.newPos);

				let expectedOption = createRequestOption(
					`${TRELLO_API_VER}/lists/${listId}?${test.expectedQuery}`,
					"PUT"
				);
				expect(this.stubbedHttpsRequest.calledWith(expectedOption)).to.be.true;
			});
		});

		it("should throw if both new name and pos are null", function() {
			let testFunc = () => {
				this.trelloAPI.updateList(listId, null, null);
			};
			expect(testFunc).to.throw("no new data");
		});

		it("should throw if both new name and pos are empty string", function() {
			let testFunc = () => {
				this.trelloAPI.updateList(listId, "", "");
			};
			expect(testFunc).to.throw("no new data");
		});
	});

	describe("#createCard()", function() {
		let listId = "23456";
		let cardName = "card name goes here";
		let encodedCardName = encodeURIComponent(cardName);
		let cardDesc = "some description <that seems relevant>! @someone-awesome";
		let encodedCardDesc = encodeURIComponent(cardDesc);

		let tests = [
			{
				description: "should send all data through query param",
				cardName: cardName,
				cardDesc: cardDesc,
				expectedQuery: `idList=${listId}&name=${encodedCardName}&desc=${encodedCardDesc}`
			},
			{
				description: "should still create card if cardName is null",
				cardName: null,
				cardDesc: cardDesc,
				expectedQuery: `idList=${listId}&desc=${encodedCardDesc}`
			},
			{
				description: "should still create card if cardName is empty string",
				cardName: "",
				cardDesc: cardDesc,
				expectedQuery: `idList=${listId}&desc=${encodedCardDesc}`
			},
			{
				description: "should still create card if cardDesc is null",
				cardName: cardName,
				cardDesc: null,
				expectedQuery: `idList=${listId}&name=${encodedCardName}`
			},
			{
				description: "should still create card if cardDesc is empty string",
				cardName: cardName,
				cardDesc: "",
				expectedQuery: `idList=${listId}&name=${encodedCardName}`
			},
			{
				description: "should still create card if both cardName and cardDesc are null",
				cardName: null,
				cardDesc: null,
				expectedQuery: `idList=${listId}`
			}
		];

		tests.forEach(function(test) {
			it(test.description, function() {
				stubHttpsSimpleResponse(this.stubbedHttpsRequest);

				this.trelloAPI.createCard(listId, test.cardName, test.cardDesc);

				let expectedOptions = createRequestOption(
					`${TRELLO_API_VER}/cards?${test.expectedQuery}`,
					"POST"
				);
				expect(this.stubbedHttpsRequest.calledWith(expectedOptions)).to.be.true;
			});
		});

		it("should throw if listId is empty string", function() {
			let testFunc = () => {
				this.trelloAPI.createCard("", cardName, cardDesc);
			};
			expect(testFunc).to.throw("list id required");
		});

		it("should throw if listId is null", function() {
			let testFunc = () => {
				this.trelloAPI.createCard(null, cardName, cardDesc);
			};
			expect(testFunc).to.throw("list id required");
		});
	});

	describe("#deleteCard()", function() {

	});

	describe("#updateCard()", function() {

	});

	describe("#updateCardPos()", function() {

	});

	describe("#storeToken()", function() {

	});
});

let createRequestOption = (path: string, method: string, headerContentLength?: number) => {
	if (!headerContentLength) {
		headerContentLength = 0;
	}

	return {
		hostname: TRELLO_HOST,
		path: path,
		method: method,
		headers: {
			"Content-Length": headerContentLength
		}
	};
}

let stubHttpsSimpleResponse = (stubFunc: sinon.SinonStub) => {
	stubHttpsResponse(stubFunc, 200);
}

let stubHttpsResponse = (stubFunc: sinon.SinonStub, statusCode: number, body?: any) => {
	let response = createResponse(statusCode, body);
	let request = new PassThrough();
	stubFunc.yields(response).returns(request);
}

let createSimpleResponse = () => {
	return createResponse(200);
}

let createResponse = (statusCode: number, body?: any) => {
	let response = new PassThrough();
	response['statusCode'] = statusCode;

	if (body) {
		response.write(JSON.stringify(body));
		response.end();
	}
	
	return response;
}