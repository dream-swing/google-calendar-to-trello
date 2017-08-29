import * as google from "googleapis";
import { GoogleAuthAPI } from "./GoogleAuthAPI";
import { TokenStorage } from "./../storage/TokenStorage";
import { AuthStorage } from "./../storage/AuthStorage";

export class GoogleCalendarAPI {

	constructor(private _googleAuth: GoogleAuthAPI, private _tokenStore: TokenStorage, private _calAPIHelper) {}

	static createAPI(tokenStore: TokenStorage, authStore: AuthStorage) {
		let googleAuth = new GoogleAuthAPI(authStore);
		let calendar = google.calendar("v3");
		return new GoogleCalendarAPI(googleAuth, tokenStore, calendar);
	}

	/**
	 * Lists single events in the time range specified. Time range params are specified
	 * in ISO format as strings.
	 */
	public listSingleEventsInRange(timeMinISO: string, timeMaxISO: string, callback) {
		this._googleAuth.processClientSecrets((auth) => {
			this._calAPIHelper.events.list({
				auth: auth,
				calendarId: "primary",
				timeMin: timeMinISO,
				timeMax: timeMaxISO,
				singleEvents: true,
			}, (err, response) => {
				if (err) {
					throw new Error("Google API returned an error: " + err);
				}

				this.storeSyncToken(response.nextSyncToken);
				callback(response.items);
			});
		});
	};

	public getUpdatedEvents(callback) {
		this._tokenStore.getSyncToken((syncToken) => {
			if (!syncToken) {
				throw new Error("No sync token for updating event.");
			}
			
			this._googleAuth.processClientSecrets((auth) => {
				this._calAPIHelper.events.list({
					auth: auth,
					calendarId: "primary",
					syncToken: syncToken
				}, (err, response) => {
					if (err) {
						throw new Error("Google API returned an error: " + err);
					}

					this.storeSyncToken(response.nextSyncToken);
					callback(response.items);
				});
			});
		});
	}

	public createEvent(calendarId, event) {
		if (!calendarId) {
			throw new Error("calendarId required for creating an event");
		}
		if (!event) {
			throw new Error("event required for creating event");
		}
		
		this._googleAuth.processClientSecrets((auth) => {
			this._calAPIHelper.events.insert({
				auth: auth,
				calendarId: calendarId,
				resource: event
			}, (err, event) => {
				if (err) {
					throw new Error("Insert event failed. Google API returned an error: " + err);
				}

				console.log(`Event created: ${event.summary}`);
			});
		});
	}

	private storeSyncToken(syncToken: string) {
		if (!syncToken) {
			throw new Error("No sync token returned from initial sync.");
		}

		this._tokenStore.storeSyncToken(syncToken);
	}
}







