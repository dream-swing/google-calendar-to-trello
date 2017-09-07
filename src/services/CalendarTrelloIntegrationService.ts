import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";
import {WeekdayList} from "./../models/WeekdayList";

import { GoogleCalendarService } from "./GoogleCalendarService";
import { TrelloService } from "./TrelloService";
import { GoogleCalendarAPI } from "./../api/GoogleCalendarAPI";
import { TrelloAPI } from "./../api/TrelloAPI";

export class CalendarTrelloIntegrationService {
	private static readonly DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	private static readonly EVENT_IDENTIFIER = "[event]";
	private static readonly DAY_START_HOUR = 10;

	constructor(private _gCalService: GoogleCalendarService, private _trelloService: TrelloService) {}

	static createService(gCalAPI: GoogleCalendarAPI, trelloAPI: TrelloAPI) {
		let gCalService = new GoogleCalendarService(gCalAPI);
		let trelloService = new TrelloService(trelloAPI);
		return new CalendarTrelloIntegrationService(gCalService, trelloService);
	}

	public checkUpdatedEvents() {
		this._gCalService.getCurrentWeekUpdatedEvents((events) => {
			console.log("Retrieved updated events from Google Calendar. " + JSON.stringify(events));
			this._trelloService.getWeekdayLists((weekdayLists) => {
				for (let event of events) {
					let cards = this.findEventsOnBoard(event, weekdayLists);

					if (event.status == "cancelled") {
						if (cards) {
							for (let card in cards) {
								this._trelloService.deleteCard(card);
							}
						}
					} else {
						if (cards) {
							for (let card in cards) {
								this.updateCard(card, event);
							}
						} else {
							this.createCards(event, weekdayLists);
						}
					}
				}
			});
		});
	}

	public populateTrelloWithWeeklyEvent() {
		this._gCalService.getWeeklyEvents((events) => {
			if (!events) {
				throw new Error("Error retrieving weekly Google events");
			} else if (events.length == 0) {
				console.log("No upcoming events found.");
			} else {
				this._trelloService.getWeekdayLists((weekdayLists) => {
					for (let event of events) {
						let cards = this.findEventsOnBoard(event, weekdayLists);
						if (!cards) {
							this.createCards(event, weekdayLists);
						}
					}
				});
			}
		});
	}

	public resetBoard() {
		this._trelloService.getWeekdayLists((weekdayLists) => {
			for (let list of weekdayLists) {
				let cards = list.trelloList.cards;
				for (let i: number = 0; i < cards.length; i++) {
					let card = cards[i];
					if (this._trelloService.isDoneSeparatorCard(card)) {
						this._trelloService.moveCardToTop(card);
					} else {
						if (!this.isEventCard(card)) {
							let startTime: Date = this.getStartTimeForCard(list.trelloList, card, i);
							this._gCalService.addEventToTask(card.name, startTime);
						}
						if (!this._trelloService.isRecurringCard(card)) {
							this._trelloService.deleteCard(card);
						}
					}
				}
				// update list name with this week's dates
				let newListName = this.getUpdatedListDate(list);
				this._trelloService.renameList(list.trelloList, newListName);
			}
		});
	}

	private createCards(event, weekdayLists) {
		if (!this._gCalService.validateEventIsComplete(event)) {
			throw new Error(`Error: Attempting to add an incomplete event.`);
		}

		let lists: WeekdayList[] = this.getListsEventBelongsTo(event, weekdayLists);

		if (lists === null) {
			throw new Error("Finding list card belongs to failed. Cannot create card.");
		}

		let cardTitle = this.getCardNameFromEvent(event);
		for (let list of lists) {
			this._trelloService.createCard(list.trelloList, cardTitle, event.id);
		}
	}

	private updateCard(card, updatedEvent) {
		if (!this._gCalService.validateEventIsComplete(updatedEvent)) {
			throw new Error(`Error: Attempting to update an card to an incomplete event.`);
		}

		let newName = this.getCardNameFromEvent(updatedEvent);
		this._trelloService.updateCard(card, newName, updatedEvent.id);
	}

	private findEventsOnBoard(event, weekdayLists): any[] {
		let lists: WeekdayList[] = this.getListsEventBelongsTo(event, weekdayLists);

		if (lists === null) {
			console.log("Searching all lists.");
			lists = weekdayLists;
		}

		let cards = new Array();
		for (let list of lists) {
			let card = this.findEventOnSingleList(event, list);
			if (card) {
				cards.push(card);
			}
		}

		if (cards.length == 0) {
			let eventName = event.summary || event.id;
			console.log(`No corresponding card found for ${eventName} on board.`);
			return null;
		}

		return cards;
	}

	private findEventOnSingleList(event, list: WeekdayList) {
		let eventName = event.summary || event.id;
		console.log(`Checking for event ${eventName} on list ${list.trelloList.name}`);
		for (let card of list.trelloList.cards) {
			if (card.desc == event.id) {
				console.log(`Event found in list. cardName: ${card.name}, cardDesc: ${card.desc}`);
				return card;
			}
		}

		console.log(`No corresponding card found for ${eventName} on list ${list.trelloList.name}`);
		return null;
	}

	/**
	 * Return the Trello weekday lists this event belongs to.
	 * If the event doesn't have start or end date return null.
	 * If event spans multiple days, return all lists it belongs to
	 */
	private getListsEventBelongsTo(event, weekdayLists: WeekdayList[]): WeekdayList[] {
		if (!event.start) {
			// updated events for deleted events don't have start dates
			console.log("Event does not belong to any list.");
			return null;
		}

		console.log(`Getting lists for ${event.summary}`);

		// Get the day this event covers
		// For multi-day events, get all days from event start to event end
		let eventDates = new Array();
		if (event.start.dateTime) {
			let eventStartDate = moment(event.start.dateTime).tz(Constants.TIMEZONE).startOf("day");
			eventDates.push(eventStartDate);
		} else {
			// all-day events don't have a start time, defaulting to midnight UTC
			// if we convert to local timezone, the day we get might be off
			let eventStartDate = moment(event.start.date);
			let eventEndDate = moment(event.end.date);

			for (let currentDay = moment(eventStartDate); currentDay.isSameOrBefore(eventEndDate, "day"); currentDay = moment(currentDay.add(1, "day"))) {
				eventDates.push(currentDay);
			}
		}

		console.log(`${event.summary} spans these days: ${eventDates}`);

		// add any list whose date is the same as the days the event covers
		let lists = new Array<WeekdayList>();
		for (let currentMoment of eventDates) {
			for (let list of weekdayLists) {
				if (currentMoment.isSame(moment(list.date), "day")) {
					lists.push(list);
					console.log(`pushing ${list.trelloList.name} to lists.`);
				}
			}
		}

		return lists;

/*
		let eventDays: number[] = new Array();
		if (event.start.dateTime) {
			eventDays.push(moment(event.start.dateTime).tz(Constants.TIMEZONE).day());
		} else {
			// get start and end days and include every day in between

			// all day events don't have a start time, defaulting to midnight UTC
			// if we convert to local timezone, the day we get might be off
			let startDay = moment(event.start.date).day();
			let endDay = moment(event.end.date).day();
			for (let i = startDay; i <= endDay; i++) {
				eventDays.push(i);
			}
		}

		if (eventDays.length == 0) {
			throw new Error("Event does not belong to any list even though it's got start day.\n" + JSON.stringify(event));
		}

		let lists = new Array();
		for (let day in eventDays) {
			let eventDayWords: string = DAYS_OF_WEEK[day];
			lists.push(weekdayLists[eventDayWords]);
		}
		return lists;
*/
	}

	private getCardNameFromEvent(event): string {
		if (!this._gCalService.validateEventIsComplete(event)) {
			throw new Error("Cannot create card name from incomplete event info.");
		}

		let startTime: string = "";
		if (event.start.dateTime) {
			startTime = moment(event.start.dateTime).tz(Constants.TIMEZONE).format("h:mma") + " ";
		}
		let cardTitle = `${startTime}${CalendarTrelloIntegrationService.EVENT_IDENTIFIER} ${event.summary}`;
		return cardTitle;
	}

	private getStartTimeForCard(list: WeekdayList, card, index: number): Date {
		let date = moment(list.date);
		let hour: number = CalendarTrelloIntegrationService.DAY_START_HOUR + index;
		let startTime = moment.tz([date.year(), date.month(), date.date(), hour], Constants.TIMEZONE).toDate();
		console.log(`Start time for ${card.name} constructed to be ${startTime}`);
		return startTime;
	}

	private getUpdatedListDate(list: WeekdayList) {
		let updatedDate = moment(list.date).add("1", "w");
		let updatedListName = updatedDate.format("dddd M/D");
		return updatedListName;
	}

	private isEventCard(card): boolean {
		return card.name.includes(CalendarTrelloIntegrationService.EVENT_IDENTIFIER);
	}
}











