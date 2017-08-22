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

				let expectedOption = {
					hostname: TRELLO_HOST,
					path: `${TRELLO_API_VER}/lists/${listId}?${test.expectedQuery}`,
					method: "PUT",
					headers: {
						"Content-Length": 0
					}
				};
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