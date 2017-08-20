import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";

import { GoogleCalendarAPI } from "./../api/GoogleCalendarAPI";
import { GoogleAuthAPI } from "./../api/GoogleAuthAPI";
import { AwsS3 } from "./../storage/AwsS3";

const TASK_CALENDAR_ID = "7gbqp1gdlr9vkg2l7j7kkfa71g@group.calendar.google.com";
const TEST_TASK_CALENDAR_ID = "gc1bpqfc1i5rvaeef0l913b8bk@group.calendar.google.com";

let s3 = new AwsS3();
let gCal = new GoogleCalendarAPI(new GoogleAuthAPI(s3), s3);

export let getWeeklyEvents = (callback) => {
	let { timeMin, timeMax } = getCurrentWeekTimeRange();
	console.log("timeMin: %s, timeMax: %s", moment(timeMin).format("LLLL"), moment(timeMax).format("LLLL"));

	gCal.listSingleEventsInRange(timeMin.toISOString(), timeMax.toISOString(), callback);
}

export let getCurrentWeekUpdatedEvents = (callback) => {
	let { timeMin, timeMax } = getCurrentWeekTimeRange();
	gCal.getUpdatedEvents((events) => {
		if (!events) {
			throw new Error("Error getting events.");
		}

		let thisWeekEvents = events.filter((event, index, eventsArr) => {
			if (!event.start) {
				// deleted events don't have a date, so just include it
				return true;
			}

			let eventStart = moment(event.start.date || event.start.dateTime);
			return eventStart.isSameOrAfter(timeMin) && eventStart.isBefore(timeMax);
		});

		callback(thisWeekEvents);
	});
}

export let validateEventIsComplete = (event): boolean => {
	let eventComplete: boolean = (event.start && event.summary);
	if (!eventComplete) {
		console.log(`Event complete validation failed for event ${event.id}`);
	}

	return eventComplete;
}

export let addEventToTask = (summary: string, startTime: Date) => {
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
	gCal.createEvent(getTaskCalendarId(), event);
}

let getCurrentWeekTimeRange = () => {
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

let getTaskCalendarId = () => {
	if (Constants.DEBUG) {
		return TEST_TASK_CALENDAR_ID;
	} else {
		return TASK_CALENDAR_ID;
	}
}