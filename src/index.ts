import * as gCal from "./services/GoogleCalendarService";
import * as trello from "./services/TrelloService";
import * as trelloAPI from "./api/TrelloAPI";
import * as moment from "moment";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/*
deleted events:
"items": [
  {
   "kind": "calendar#event",
   "etag": "\"2998981515386000\"",
   "id": "2206mtcss7hkg47q03gmfea1k2",
   "status": "cancelled"
  }
 ]

 Problem: they don't have names, so I have to store the event ID somewhere
 TODO: test delete on Trello API
 TODO: implement update card
 TODO: store event ID in description (figure out difference between desc and descData)
 TODO: store secrets in S3 instead of locally
 */

let checkUpdatedEvents = () => {
	gCal.getCurrentWeekUpdatedEvents((events) => {
		trello.getWeekdayLists((weekdayLists) => {
			for (let event of events) {

			}
		});
	});
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

main();











