import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";

import { GoogleCalendarAPI } from "./../api/GoogleCalendarAPI";

export class GoogleCalendarService {
	private static readonly TASK_CALENDAR_ID = "7gbqp1gdlr9vkg2l7j7kkfa71g@group.calendar.google.com";
	private static readonly TEST_TASK_CALENDAR_ID = "nbjdhtdiqrj1h32jcn86v8lncg@group.calendar.google.com";

	constructor(private _gCalAPI: GoogleCalendarAPI) {}

	public getWeeklyEvents(timeMin: Date, timeMax: Date, callback) {
		console.log("timeMin: %s, timeMax: %s", moment(timeMin).format("LLLL"), moment(timeMax).format("LLLL"));

		this._gCalAPI.listSingleEventsInRange(timeMin.toISOString(), timeMax.toISOString(), callback);
	}

	public getUpdatedEvents(callback) {
		this._gCalAPI.getUpdatedEvents((events) => {
			if (!events) {
				throw new Error("Error getting events.");
			}

			callback(events);
		});
	}

	public validateEventIsComplete(event): boolean {
		let eventComplete: boolean = (event.start && event.summary);
		if (!eventComplete) {
			console.log(`Event complete validation failed for event ${event.id}`);
		}

		return eventComplete;
	}

	public addEventToTask(summary: string, startTime: Date, endTime: Date) {
		if (!endTime) {
			endTime = moment(startTime).add("1", "h").toDate();
		}
		let event = {
			"summary": summary,
			"start": {
				"dateTime": startTime.toISOString()
			},
			"end": {
				"dateTime": endTime.toISOString()
			}
		};
		this._gCalAPI.createEvent(this.getTaskCalendarId(), event);
	}

	public isMultidayEvent(event) {
		if (event.start.dateTime) {
			// not an all-day event
			return false;
		}

		let start = moment(event.start.date);
		let end = moment(event.end.date);
		return end.diff(start, "days") > 0;
	}

	private getTaskCalendarId() {
		if (Constants.DEBUG) {
			return GoogleCalendarService.TEST_TASK_CALENDAR_ID;
		} else {
			return GoogleCalendarService.TASK_CALENDAR_ID;
		}
	}
}