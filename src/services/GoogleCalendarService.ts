import * as gCal from "./../api/GoogleCalendarAPI";
import * as moment from "moment";
import * as s3 from "./AwsS3Service";

export let getWeeklyEvents = (callback) => {
	let { timeMin, timeMax } = getCurrentWeekTimeRange();
	console.log("timeMin: %s, timeMax: %s", moment(timeMin).format("LLLL"), moment(timeMax).format("LLLL"));

	gCal.listSingleEventsInRange(timeMin.toISOString(), timeMax.toISOString(), callback);
}

export let getCurrentWeekUpdatedEvents = (callback) => {
	let { timeMin, timeMax } = getCurrentWeekTimeRange();
	gCal.getUpdatedEvents((events) => {
		if (!events) {
			console.error("Error getting events.");
			return;
		}

		let thisWeekEvents = events.filter((event, index, eventsArr) => {
			let eventStart = moment(event.start.date || event.start.dateTime);
			return eventStart.isSameOrAfter(timeMin) && eventStart.isBefore(timeMax);
		});

		callback(thisWeekEvents);
	});
}

let getCurrentWeekTimeRange = () => {
	let today = moment();
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