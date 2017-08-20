import * as google from "googleapis";
import * as googleAuth from "./GoogleAuthAPI";
import { AwsS3 } from "./../storage/AwsS3";

let s3 = new AwsS3();

/**
 * Lists single events in the time range specified. Time range params are specified
 * in ISO format as strings.
 */
export let listSingleEventsInRange = (timeMinISO: string, timeMaxISO: string, callback) => {
	googleAuth.processClientSecrets((auth) => {
		let calendar = google.calendar("v3");
		calendar.events.list({
			auth: auth,
			calendarId: "primary",
			timeMin: timeMinISO,
			timeMax: timeMaxISO,
			singleEvents: true,
		}, (err, response) => {
			if (err) {
				throw new Error("The API returned an error: " + err);
			}

			storeSyncToken(response.nextSyncToken);
			callback(response.items);
		});
	});
};

export let getUpdatedEvents = (callback) => {
	s3.getSyncToken((syncToken) => {
		if (!syncToken) {
			throw new Error("No sync token for updating event.");
		}
		
		googleAuth.processClientSecrets((auth) => {
			let calendar = google.calendar("v3");
			calendar.events.list({
				auth: auth,
				calendarId: "primary",
				syncToken: syncToken
			}, (err, response) => {
				if (err) {
					throw new Error("Google API returned error: " + err);
				}

				storeSyncToken(response.nextSyncToken);
				callback(response.items);
			});
		});
	});
}

export let createEvent = (calendarId, event) => {
	googleAuth.processClientSecrets((auth) => {
		let calendar = google.calendar("v3");
		calendar.events.insert({
			auth: auth,
			calendarId: calendarId,
			resource: event
		}, (err, event) => {
			if (err) {
				throw new Error("Insert event failed. Google API returned error: " + err);
			}

			console.log(`Event created: ${event.summary}`);
		});
	});
}

let storeSyncToken = (syncToken: string) => {
	if (!syncToken) {
		throw new Error("No sync token returned from initial sync.");
	}

	s3.storeSyncToken(syncToken);
}







