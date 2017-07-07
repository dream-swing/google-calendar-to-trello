import * as gCal from "./../api/GoogleCalendarAPI";
import * as moment from "moment";

export let getWeeklyEvents = (callback) => {
	let today = moment();
	let dayOfWeek: number = today.day();

	let timeMin: string = today.toDate().toISOString();
	let timeMax: string = today.toDate().toISOString();

	if (dayOfWeek == 5) {
		// today is Friday
		// we want min to be tomorrow, and max to be next Sat midnight
		timeMin = moment(today).startOf("day").add(1, "days").toDate().toISOString();
		timeMax = moment(today).startOf("day").add(8, "days").toDate().toISOString();
	} else {
		// all days except Friday
		// we want min to be right now, and max to be this Sat midnight
		// no need to set timeMin because it's already now
		if (dayOfWeek == 6) {
			// today is Saturday
			// set dayOfWeek to -1 so timeMax is actually a week from now
			dayOfWeek = -1;
		}
		timeMax = moment(today).startOf("day").add(7 - (dayOfWeek + 1), "days").toDate().toISOString();
	}

	console.log("timeMin: %s, timeMax: %s", moment(timeMin).format("LLLL"), moment(timeMax).format("LLLL"));

	gCal.listSingleEventsInRange(timeMin, timeMax, callback);
}