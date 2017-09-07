import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";

import { GoogleCalendarAPI } from "./../api/GoogleCalendarAPI";

export class GoogleCalendarService {
	private static readonly TASK_CALENDAR_ID = "7gbqp1gdlr9vkg2l7j7kkfa71g@group.calendar.google.com";
	private static readonly TEST_TASK_CALENDAR_ID = "gc1bpqfc1i5rvaeef0l913b8bk@group.calendar.google.com";

	constructor(private _gCalAPI: GoogleCalendarAPI) {}

	public getWeeklyEvents(callback) {
		let { timeMin, timeMax } = this.getCurrentWeekTimeRange();
		console.log("timeMin: %s, timeMax: %s", moment(timeMin).format("LLLL"), moment(timeMax).format("LLLL"));

		this._gCalAPI.listSingleEventsInRange(timeMin.toISOString(), timeMax.toISOString(), callback);
	}

	public getCurrentWeekUpdatedEvents(callback) {
		let { timeMin, timeMax } = this.getCurrentWeekTimeRange();
		this._gCalAPI.getUpdatedEvents((events) => {
			if (!events) {
				throw new Error("Error getting events.");
			}

			let thisWeekEvents = events.filter((event, index, eventsArr) => {
				if (!event.start) {
					// deleted events don't have a date, so just include it
					return true;
				}
				// for all-day events, it could span multiple weeks,
				// include it if it overlaps with current week
				if (event.start.date) {
					let eventStart = moment(event.start.date);
					let eventEnd = moment(event.end.date);

					if (eventStart.isSameOrBefore(timeMin)) {
						return eventEnd.isSameOrAfter(timeMin);
					} else if (eventStart.isSameOrBefore(timeMax)) {
						return true;
					} else {
						return false;
					}
				} else {
					let eventStart = moment(event.start.dateTime);
					return eventStart.isSameOrAfter(timeMin) && eventStart.isBefore(timeMax);
				}
			});

			callback(thisWeekEvents);
		});
	}

	public validateEventIsComplete(event): boolean {
		let eventComplete: boolean = (event.start && event.summary);
		if (!eventComplete) {
			console.log(`Event complete validation failed for event ${event.id}`);
		}

		return eventComplete;
	}

	public addEventToTask(summary: string, startTime: Date) {
		let endTime: Date = moment(startTime).add("1", "h").toDate();
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

	private getCurrentWeekTimeRange() {
		let today = moment().tz(Constants.TIMEZONE);
		let dayOfWeek: number = today.day();

		let timeMin: Date = today.toDate();
		let timeMax: Date = today.toDate();

		if (dayOfWeek == 5) {
			// today is Friday
			// we want min to be tomorrow, and max to be next Sat midnight
			timeMin = moment(today).startOf("day").add(1, "days").toDate();
			timeMax = moment(today).startOf("day").add(8, "days").toDate();
		} else {
			// all days except Friday
			// we want min to be right now, and max to be this Sat midnight
			// no need to set timeMin because it's already now
			if (dayOfWeek == 6) {
				// today is Saturday
				// set dayOfWeek to -1 so timeMax is actually a week from now
				dayOfWeek = -1;
			}
			timeMax = moment(today).startOf("day").add(7 - (dayOfWeek + 1), "days").toDate();
		}

		return {
			timeMin: timeMin,
			timeMax: timeMax
		};
	}

	private getTaskCalendarId() {
		if (Constants.DEBUG) {
			return GoogleCalendarService.TEST_TASK_CALENDAR_ID;
		} else {
			return GoogleCalendarService.TASK_CALENDAR_ID;
		}
	}
}