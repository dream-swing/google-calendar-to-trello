import { GoogleCalendarService } from "./GoogleCalendarService";
import { TrelloService } from "./TrelloService";
import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EVENT_IDENTIFIER = "[event]";
const DAY_START_HOUR = 10;

let trello = new TrelloService(null);
let gCal = new GoogleCalendarService(null);

export let checkUpdatedEvents = () => {
	gCal.getCurrentWeekUpdatedEvents((events) => {
		console.log("Retrieved updated events from Google Calendar. " + JSON.stringify(events));
		trello.getWeekdayLists((weekdayLists) => {
			for (let event of events) {
				let card = findEventOnBoard(event, weekdayLists);

				if (event.status == "cancelled") {
					if (card) {
						trello.deleteCard(card);
					}
				} else {
					if (card) {
						updateCard(card, event);
					} else {
						createCard(event, weekdayLists);
					}
				}
			}
		});
	});
}

export let populateTrelloWithWeeklyEvent = () => {
	gCal.getWeeklyEvents((events) => {
		if (!events) {
			throw new Error("Error retrieving weekly Google events");
		} else if (events.length == 0) {
			console.log("No upcoming events found.");
		} else {
			trello.getWeekdayLists((weekdayLists) => {
				for (let event of events) {
					let card = findEventOnBoard(event, weekdayLists);
					if (!card) {
						createCard(event, weekdayLists);
					}
				}
			});
		}
	});
}

export let resetBoard = () => {
	trello.getWeekdayLists((weekdayLists) => {
		for (let weekday in weekdayLists) {
			let list = weekdayLists[weekday];
			let cards = list.cards;
			for (let i: number = 0; i < cards.length; i++) {
				let card = cards[i];
				if (trello.isDoneSeparatorCard(card)) {
					trello.moveCardToTop(card);
				} else {
					if (!isEventCard(card)) {
						let startTime: Date = getStartTimeForCard(list, card, i);
						gCal.addEventToTask(card.name, startTime);
					}
					if (!trello.isRecurringCard(card)) {
						trello.deleteCard(card);
					}
				}
			}
			// update list name with this week's dates
			let newListName = getUpdatedListDate(list.name);
			trello.renameList(list, newListName);
		}
	});
}

let createCard = (event, weekdayLists) => {
	if (!gCal.validateEventIsComplete(event)) {
		throw new Error(`Error: Attempting to add an incomplete event.`);
	}

	let list = getListEventBelongsTo(event, weekdayLists);

	if (list === null) {
		throw new Error("Finding list card belongs to failed. Cannot create card.");
	}

	let cardTitle = getCardNameFromEvent(event);
	trello.createCard(list, cardTitle, event.id);
}

let updateCard = (card, updatedEvent) => {
	if (!gCal.validateEventIsComplete(updatedEvent)) {
		throw new Error(`Error: Attempting to update an card to an incomplete event.`);
	}

	let newName = getCardNameFromEvent(updatedEvent);
	trello.updateCard(card, newName, updatedEvent.id);
}

let findEventOnBoard = (event, weekdayLists) => {
	let list = getListEventBelongsTo(event, weekdayLists);

	if (list === null) {
		// search all lists
		console.log("Searching all lists.");
		let eventName = event.summary || event.id;
		for (let listName in weekdayLists) {
			let card = findEventOnSingleList(event, weekdayLists[listName]);
			if (card) {
				return card;
			}
		}

		console.log(`No corresponding card found for ${eventName} on board.`);
		return false;
	} else {
		return findEventOnSingleList(event, list);
	}
}

let findEventOnSingleList = (event, list) => {
	let eventName = event.summary || event.id;
	console.log(`Checking for event ${eventName} on list ${list.name}`);
	for (let card of list.cards) {
		if (card.desc == event.id) {
			console.log(`Event found in list. cardName: ${card.name}, cardDesc: ${card.desc}`);
			return card;
		}
	}

	console.log(`No corresponding card found for ${eventName} on list ${list.name}`);
	return null;
}

let getListEventBelongsTo = (event, weekdayLists) => {
	if (!event.start) {
		// updated events for deleted events don't have start dates
		console.log("Event does not belong to any list.");
		return null;
	}

	let eventDay: number = null;
	if (event.start.dateTime) {
		eventDay = moment(event.start.dateTime).tz(Constants.TIMEZONE).day();
	} else {
		// all day events don't have a start time, defaulting to midnight UTC
		// if we convert to local timezone, the day we get might be off
		eventDay = moment(event.start.date).day();
	}
	let eventDayWords: string = DAYS_OF_WEEK[eventDay];
	let list = weekdayLists[eventDayWords];
	return list;
}

let getCardNameFromEvent = (event): string => {
	if (!gCal.validateEventIsComplete(event)) {
		throw new Error("Cannot create card name from incomplete event info.");
	}

	let startTime: string = "";
	if (event.start.dateTime) {
		startTime = moment(event.start.dateTime).tz(Constants.TIMEZONE).format("h:mma") + " ";
	}
	let cardTitle = `${startTime}${EVENT_IDENTIFIER} ${event.summary}`;
	return cardTitle;
}

let getStartTimeForCard = (list, card, index: number): Date => {
	let date = getDateFromListName(list.name);
	let hour: number = DAY_START_HOUR + index;
	let startTime = moment.tz([date.year(), date.month(), date.date(), hour], Constants.TIMEZONE).toDate();
	console.log(`Start time for ${card.name} constructed to be ${startTime}`);
	return startTime;
}

/** 
 * Not used
 * Use regex to look for date portion of list name (e.g. "7/21")
 */
let getMonthDayFromListName = (listName: string) => {
	let dateReg = /(\d{1,2})\/(\d{1,2})/g;
	let regMatches = dateReg.exec(listName);
	return {
		"month": parseInt(regMatches[1]) - 1, // month in code is 0 based
		"day": parseInt(regMatches[2])
	};
}

let getDateFromListName = (listName: string) => {
	let parsedMoment = moment(listName, "dddd M/D");
	let {month, day} = getMonthDayFromListName(listName);
	let thisYear: number = moment().year();
	let year: number = thisYear;
	// if we're in the new year (Jan) and we're logging December's events
	// subtract one from current year
	if (parsedMoment.isAfter(moment().add("1", "d"))) {
		let lastYear = parsedMoment.year() - 1;
		parsedMoment.year(lastYear);
	}

	return parsedMoment;
}

let getUpdatedListDate = (listName: string) => {
	let currentDate = getDateFromListName(listName);
	let updatedDate = moment(currentDate).add("1", "w");
	let updatedListName = updatedDate.format("dddd M/D");
	return updatedListName;
}

let isEventCard = (card): boolean => {
	return card.name.includes(EVENT_IDENTIFIER);
}











