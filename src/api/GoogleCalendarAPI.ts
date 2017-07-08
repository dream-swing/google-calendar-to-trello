import * as google from "googleapis";
import * as googleAuth from "./GoogleAuthAPI";

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
			orderBy: "startTime",
		}, (err, response) => {
			if (err) {
				console.error("The API returned an error: " + err);
				return;
			}

			callback(response.items);
		});
	});
};

export let getUpdatedEvents = (syncToken: string, callback) => {
	googleAuth.processClientSecrets((auth) => {
		let calendar = google.calendar("v3");
		calendar.events.list({
			auth: auth,
			calendarId: "primary",
			singleEvents: true,
			syncToken: syncToken
		}, (err, response) => {
			if (err) {
				console.error("Google API returned error: " + err);
				return;
			}

			callback(response.items);
		});
	});
}






