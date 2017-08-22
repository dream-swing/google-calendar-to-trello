import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import * as https from "https";
import { PassThrough } from "stream";

import { TrelloAPI } from "./TrelloAPI";
import { FakeAuthStorage } from "./../storage/AuthStorage";

let expect = chai.expect;

describe("Trello API", function() {
	beforeEach(function() {
		// set up a TrelloAPI object using a mock AuthStorage class
		let fakeAuthStore = new FakeAuthStorage();
		this.trelloAPI = new TrelloAPI(fakeAuthStore);

		// https.get and https.request needs to be stubbed
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
			let response = new PassThrough();
			response['statusCode'] = 200;
			response.write(JSON.stringify(expectedData));
			response.end();

			let request = new PassThrough();

			this.stubbedHttpsGet.yields(response).returns(request);
			this.trelloAPI.getBoards((data) => {
				expect(data).to.eql(expectedData);
				done();
			});
		});
	});

	describe("#getListsAndCardsOnBoard()", function() {
		it("should throw if boardId is invalid", function() {
			// 400 response "invalid id"
			/* Response header:
				date: Sun, 20 Aug 2017 02:46:35 GMT
				x-content-type-options: nosniff
				x-trello-version: 1.1024.0
				vary: Accept-Encoding
				content-length: 10
				x-xss-protection: 1; mode=block
				cache-control: max-age=0, must-revalidate, no-cache, no-store
				etag: W/"a-84da4bba"
				x-frame-options: DENY
				access-control-allow-methods: GET, PUT, POST, DELETE
				content-type: text/plain; charset=utf-8
				access-control-allow-origin: *
				x-trello-environment: Production
				access-control-allow-headers: Authorization, Accept, Content-Type
				expires: Thu, 01 Jan 1970 00:00:00
			*/
			let callback = sinon.spy();
			let testFunc = () => {
				this.trelloAPI.getListsAndCardsOnBoard("12345", {}, callback);
			}

			let response = new PassThrough();
			response['statusCode'] = 400;
			response.write("Invalid id");
			response.end();

			let request = new PassThrough();

			this.stubbedHttpsGet.yields(response).returns(request);

			expect(testFunc).to.throw("request failed");
			expect(callback.called).to.be.false;
		});

		it("should pass all lists and cards to callback", function(done) {
			let expectedData = [
				{ "name": "list1" },
				{ "name": "list2" }
			];
			let response = new PassThrough();
			response['statusCode'] = 200;
			response.write(JSON.stringify(expectedData));
			response.end();

			let request = new PassThrough();

			this.stubbedHttpsGet.yields(response).returns(request);
			this.trelloAPI.getListsAndCardsOnBoard("12345", {}, (data) => {
				expect(data, "Data passed to callback should be same as https call result").to.eql(expectedData);
				done();
			});
		});
	});

	describe("#updateList()", function() {

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