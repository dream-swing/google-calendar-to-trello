import * as gCal from "./services/GoogleCalendarService";
import * as trello from "./services/TrelloService";
import * as trelloAPI from "./api/TrelloAPI";
import * as moment from "moment";
import * as s3 from "./services/AwsS3Service";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let testS3 = () => {
	s3.storeSyncToken("test token");
}

let main = () => {
	// grab weekly calendar
	gCal.getWeeklyEvents((events) => {
		if (!events) {
			console.error("Error retrieving weekly Google events");
		} else if (events.length == 0) {
			console.log("No upcoming events found.");
		} else {
			trello.getWeekdayLists((weekdayLists) => {
				for (let event of events) {
					if (!isEventOnBoard(event, weekdayLists)) {
						let list = getListEventBelongsTo(event, weekdayLists);
						createCard(list, event);
					}
				}
			});
		}
	});
}

let createCard = (list, event) => {
	let cardTitle = getCardNameFromEvent(event);
	console.log(`Adding ${cardTitle} to list ${list.name}`);
	trelloAPI.createCard(list.id, cardTitle);
}

let isEventOnBoard = (event, weekdayLists): boolean => {
	let list = getListEventBelongsTo(event, weekdayLists);
	for (let card of list.cards) {
		if (card.name == getCardNameFromEvent(event)) {
			return true;
		}
	}
	return false;
}

let getListEventBelongsTo = (event, weekdayLists) => {
	let eventStart: string = (event.start.date || event.start.dateTime);
	let eventDay: number = moment(eventStart).day();
	let eventDayWords: string = DAYS_OF_WEEK[eventDay];
	let list = weekdayLists[eventDayWords];
	return list;
}

let getCardNameFromEvent = (event): string => {
	let startTime: string = "";
	if (event.start.dateTime) {
		startTime = moment(event.start.dateTime).format("h:mma") + " ";
	}
	let cardTitle = startTime + event.summary;
	return cardTitle;
}

testS3();











