import * as gCal from "./GoogleCalendarService";
import * as trello from "./TrelloService";
import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EVENT_IDENTIFIER = "[event]";

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
			// update list name
		}
	});

	// reorder lists
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

	let eventStart: string = (event.start.date || event.start.dateTime);
	let eventDay: number = moment(eventStart).tz(Constants.TIMEZONE).day();
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
	// TODO: do date time math
	return new Date();
}

let isEventCard = (card): boolean => {
	return card.name.includes(EVENT_IDENTIFIER);
}











