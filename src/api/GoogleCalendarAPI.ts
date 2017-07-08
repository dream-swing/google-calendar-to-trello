import * as google from "googleapis";
import * as googleAuth from "./GoogleAuthAPI";
import * as s3 from "./../services/AwsS3Service";

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
				console.error("The API returned an error: " + err);
				return;
			}

			storeSyncToken(response.nextSyncToken);
			callback(response.items);
		});
	});
};

export let getUpdatedEvents = (callback) => {
	s3.getSyncToken((syncToken) => {
		if (!syncToken) {
			console.error("No sync token for updating event.");
			return;
		}
		
		googleAuth.processClientSecrets((auth) => {
			let calendar = google.calendar("v3");
			calendar.events.list({
				auth: auth,
				calendarId: "primary",
				syncToken: syncToken
			}, (err, response) => {
				if (err) {
					console.error("Google API returned error: " + err);
					return;
				}

				storeSyncToken(response.nextSyncToken);
				callback(response.items);
			});
		});
	});
}

let storeSyncToken = (syncToken: string) => {
	if (!syncToken) {
		console.error("No sync token returned from initial sync.");
		return;
	}

	s3.storeSyncToken(syncToken);
}






