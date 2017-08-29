import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";

import { GoogleAuthAPI } from "./GoogleAuthAPI";
import { FakeAuthStorage } from "./../storage/AuthStorage";

let expect = chai.expect;

describe.only("Google Auth API", function() {
	before(function() {
		this.googleAuth = new GoogleAuthAPI(new FakeAuthStorage());
	});

	describe("#processClientSecrets", function() {
		it("should call callback", function() {
			let callback = sinon.spy();
			this.googleAuth.processClientSecrets(callback);
			expect(callback.calledOnce).to.be.true;
		});
	});

	describe("#storeSecretsToS3", function() {

	});

	describe("#promptForNewToken", function() {

	});
});