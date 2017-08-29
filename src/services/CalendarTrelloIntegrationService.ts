import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";

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
					let card = this.findEventOnBoard(event, weekdayLists);

					if (event.status == "cancelled") {
						if (card) {
							this._trelloService.deleteCard(card);
						}
					} else {
						if (card) {
							this.updateCard(card, event);
						} else {
							this.createCard(event, weekdayLists);
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
						let card = this.findEventOnBoard(event, weekdayLists);
						if (!card) {
							this.createCard(event, weekdayLists);
						}
					}
				});
			}
		});
	}

	public resetBoard() {
		this._trelloService.getWeekdayLists((weekdayLists) => {
			for (let weekday in weekdayLists) {
				let list = weekdayLists[weekday];
				let cards = list.cards;
				for (let i: number = 0; i < cards.length; i++) {
					let card = cards[i];
					if (this._trelloService.isDoneSeparatorCard(card)) {
						this._trelloService.moveCardToTop(card);
					} else {
						if (!this.isEventCard(card)) {
							let startTime: Date = this.getStartTimeForCard(list, card, i);
							this._gCalService.addEventToTask(card.name, startTime);
						}
						if (!this._trelloService.isRecurringCard(card)) {
							this._trelloService.deleteCard(card);
						}
					}
				}
				// update list name with this week's dates
				let newListName = this.getUpdatedListDate(list.name);
				this._trelloService.renameList(list, newListName);
			}
		});
	}

	private createCard(event, weekdayLists) {
		if (!this._gCalService.validateEventIsComplete(event)) {
			throw new Error(`Error: Attempting to add an incomplete event.`);
		}

		let list = this.getListEventBelongsTo(event, weekdayLists);

		if (list === null) {
			throw new Error("Finding list card belongs to failed. Cannot create card.");
		}

		let cardTitle = this.getCardNameFromEvent(event);
		this._trelloService.createCard(list, cardTitle, event.id);
	}

	private updateCard(card, updatedEvent) {
		if (!this._gCalService.validateEventIsComplete(updatedEvent)) {
			throw new Error(`Error: Attempting to update an card to an incomplete event.`);
		}

		let newName = this.getCardNameFromEvent(updatedEvent);
		this._trelloService.updateCard(card, newName, updatedEvent.id);
	}

	private findEventOnBoard(event, weekdayLists) {
		let list = this.getListEventBelongsTo(event, weekdayLists);

		if (list === null) {
			// search all lists
			console.log("Searching all lists.");
			let eventName = event.summary || event.id;
			for (let listName in weekdayLists) {
				let card = this.findEventOnSingleList(event, weekdayLists[listName]);
				if (card) {
					return card;
				}
			}

			console.log(`No corresponding card found for ${eventName} on board.`);
			return false;
		} else {
			return this.findEventOnSingleList(event, list);
		}
	}

	private findEventOnSingleList(event, list) {
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

	private getListEventBelongsTo(event, weekdayLists) {
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
		let eventDayWords: string = CalendarTrelloIntegrationService.DAYS_OF_WEEK[eventDay];
		let list = weekdayLists[eventDayWords];
		return list;
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

	private getStartTimeForCard(list, card, index: number): Date {
		let date = this.getDateFromListName(list.name);
		let hour: number = CalendarTrelloIntegrationService.DAY_START_HOUR + index;
		let startTime = moment.tz([date.year(), date.month(), date.date(), hour], Constants.TIMEZONE).toDate();
		console.log(`Start time for ${card.name} constructed to be ${startTime}`);
		return startTime;
	}

	/** 
	 * Not used
	 * Use regex to look for date portion of list name (e.g. "7/21")
	 */
	private getMonthDayFromListName(listName: string) {
		let dateReg = /(\d{1,2})\/(\d{1,2})/g;
		let regMatches = dateReg.exec(listName);
		return {
			"month": parseInt(regMatches[1]) - 1, // month in code is 0 based
			"day": parseInt(regMatches[2])
		};
	}

	private getDateFromListName(listName: string) {
		let parsedMoment = moment(listName, "dddd M/D");
		let {month, day} = this.getMonthDayFromListName(listName);
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

	private getUpdatedListDate(listName: string) {
		let currentDate = this.getDateFromListName(listName);
		let updatedDate = moment(currentDate).add("1", "w");
		let updatedListName = updatedDate.format("dddd M/D");
		return updatedListName;
	}

	private isEventCard(card): boolean {
		return card.name.includes(CalendarTrelloIntegrationService.EVENT_IDENTIFIER);
	}
}











