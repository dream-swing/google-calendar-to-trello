import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as moment from "moment-timezone";

import * as google from "googleapis";
import { GoogleAuthAPI } from "./GoogleAuthAPI";
import { GoogleCalendarAPI } from "./GoogleCalendarAPI";
import { FakeTokenStorage } from "./../storage/TokenStorage";
import { FakeAuthStorage } from "./../storage/AuthStorage";

let expect = chai.expect;

describe("Google Calendar API", function() {
	before(function() {
		let googleAuth = new GoogleAuthAPI(new FakeAuthStorage());
		let stubbedprocessSecret = sinon.stub(googleAuth, "processClientSecrets");
		stubbedprocessSecret.yields("");
		this.calAPIHelper = google.calendar("v3");
		this.gCalAPI = new GoogleCalendarAPI(googleAuth, new FakeTokenStorage(), this.calAPIHelper);
	});

	describe("#listSingleEventsInRange()", function() {
		beforeEach(function() {
			this.stubbedList = sinon.stub(this.calAPIHelper.events, "list");
		});

		afterEach(function() {
			this.stubbedList.restore();
		});

		it("should pass events to callback", function(done) {
			let expectedResponse = {
				nextSyncToken: "12345",
				items: [
					{ id: "12345", summary: "event 1" },
					{ id: "23456", summary: "event 2" }
				]
			};
			this.stubbedList.yields(null, expectedResponse);
			this.gCalAPI.listSingleEventsInRange(new Date().toISOString(), new Date().toISOString(), (data) => {
				expect(data).to.eql(expectedResponse.items);
				done();
			});
		});

		it("should throw if encounted API error", function() {
			let error = "API error";
			this.stubbedList.yields(error, null);

			let testFunc = () => {
				let callback = sinon.spy();
				this.gCalAPI.listSingleEventsInRange(new Date().toISOString(), new Date().toISOString(), callback);
			};

			expect(testFunc).to.throw("Google API returned an error");
		});
	});

	describe("#getUpdatedEvents()", function() {
		beforeEach(function() {
			this.stubbedList = sinon.stub(this.calAPIHelper.events, "list");
		});

		afterEach(function() {
			this.stubbedList.restore();
		});

		it("should pass updated events to callback", function(done) {
			let expectedResponse = {
				nextSyncToken: "12345",
				items: [
					{ id: "12345", summary: "event 1" },
					{ id: "12345", summary: "event 2" }
				]
			};
			this.stubbedList.yields(null, expectedResponse);
			this.gCalAPI.getUpdatedEvents((data) => {
				expect(data).to.eql(expectedResponse.items);
				done();
			});
		});

		it("should throw if encounted API error", function() {
			let error = "API error";
			this.stubbedList.yields(error, null);

			let testFunc = () => {
				this.gCalAPI.getUpdatedEvents(null);
			};

			expect(testFunc).to.throw("Google API returned an error");
		});
	});

	describe("#createEvent()", function() {
		beforeEach(function() {
			this.stubbedInsert = sinon.stub(this.calAPIHelper.events, "insert");
		});

		afterEach(function() {
			this.stubbedInsert.restore();
		});

		it("should pass the correct params to google API", function() {
			let calendarId = "calendar12345";
			let event = { id: "asdf123", summary: "test event" };
			this.stubbedInsert.yields(null, event);

			this.gCalAPI.createEvent(calendarId, event);

			let apiParams = {
				auth: "",
				calendarId: calendarId,
				resource: event
			};
			expect(this.stubbedInsert.calledWith(apiParams)).to.be.true;
		});

		it("should throw if calendarId is null", function() {
			let testFunc = () => {
				this.gCalAPI.createEvent(null, { id: "123" });
			};

			expect(testFunc).to.throw("calendarId required");
		});

		it("should throw if calendarId is empty string", function() {
			let testFunc = () => {
				this.gCalAPI.createEvent("", { id: "123" });
			};

			expect(testFunc).to.throw("calendarId required");
		});

		it("should throw if event is null", function() {
			let testFunc = () => {
				this.gCalAPI.createEvent("123", null);
			}

			expect(testFunc).to.throw("event required");
		});
	});
});