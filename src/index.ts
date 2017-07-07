import * as gCal from "./api/GoogleCalendar";
import * as trello from "./api/Trello";
import * as moment from "moment";

let listEvents = () => {
	let today = moment();
	let dayOfWeek: number = today.day();

	let timeMin: string = today.toDate().toISOString();
	let timeMax: string = today.toDate().toISOString();

	if (dayOfWeek == 5) {
		// today is Friday
		// we want min to be tomorrow, and max to be next Sat midnight
		timeMin = moment(today).startOf('day').add(1, 'days').toDate().toISOString();
		timeMax = moment(today).startOf('day').add(8, 'days').toDate().toISOString();
	} else {
		// all days except Friday
		// we want min to be right now, and max to be this Sat midnight
		// no need to set timeMin because it's already now
		if (dayOfWeek == 6) {
			// today is Saturday
			// set dayOfWeek to -1 so timeMax is actually a week from now
			dayOfWeek = -1;
		}
		timeMax = moment(today).startOf('day').add(7 - (dayOfWeek + 1), 'days').toDate().toISOString();
	}

	console.log("timeMin: %s, timeMax: %s", moment(timeMin).format('LLLL'), moment(timeMax).format('LLLL'));

	gCal.listSingleEventsInRange(timeMin, timeMax, printEvents);
}

let printEvents = (events) => {
	if (!events) {
		console.log('Error retrieving events');
	} else if (events.length == 0) {
		console.log('No upcoming events found.');
	} else {
		console.log('Events this week:');
		for (let i: number = 0; i < events.length; i++) {
			let event = events[i];
			let start: string = '';
			if (event.start.dateTime) {
				start = moment(event.start.dateTime).format('h:mma') + ' ';
			}
			console.log(start + event.summary);
		}
	}
}

let printBoards = () => {
	trello.getBoards((boards) => {
		if (!boards) {
			console.error("Error retrieving boards.");
		} else {
			console.log("All your boards:");
			for (let board of boards) {
				console.log(board.name);
			}
		}
	});
}

let AddCardToList = () => {
	trello.getWeekList((lists) => {
		if (!lists) {
			console.error("Error retrieving lists.");
		} else {
			let satList = lists["Saturday"];
			trello.createCard(satList.id, "Test card created!");
		}
	});
}

AddCardToList(); 











