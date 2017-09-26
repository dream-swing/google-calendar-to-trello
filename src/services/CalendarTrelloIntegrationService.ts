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
		this._gCalService.getUpdatedEvents((events) => {
			console.log("Retrieved updated events from Google Calendar. " + JSON.stringify(events));
			this._trelloService.getWeekdayLists((weekdayLists: WeekdayList[]) => {
				for (let event of events) {
					let cards = this.findEventsOnBoard(event, weekdayLists);

					if (event.status == "cancelled") {
						if (cards) {
							for (let card of cards) {
								this._trelloService.deleteCard(card);
							}
						}
					} else {
						let labels = [];
						if (cards) {
							if (cards.length > 0) {
								labels = cards[0].idLabels;
							}

							for (let card of cards) {
								this._trelloService.deleteCard(card);
							}
						}
						
						this.createCards(event, weekdayLists, labels);
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
				this._trelloService.getWeekdayLists((weekdayLists: WeekdayList[]) => {
					for (let event of events) {
						let cards = this.findEventsOnBoard(event, weekdayLists);
						if (!cards) {
							this.createCards(event, weekdayLists, []);
						}
					}
				});
			}
		});
	}

	public resetBoard() {
		this._trelloService.getWeekdayLists((weekdayLists: WeekdayList[]) => {
			for (let list of weekdayLists) {
				let cards = list.trelloList.cards;
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
				let newListName = this.getUpdatedListDate(list);
				this._trelloService.renameList(list.trelloList, newListName);
			}
		});
	}

	private createCards(event, weekdayLists: WeekdayList[], labels: any[]) {
		if (!this._gCalService.validateEventIsComplete(event)) {
			throw new Error(`Error: Attempting to add an incomplete event.`);
		}

		if (this._gCalService.isMultidayEvent(event)) {
			// all day events from Google don't have timezone information
			let eventStart = moment.tz(event.start.date, Constants.TIMEZONE);
			let eventEnd = moment.tz(event.end.date, Constants.TIMEZONE);

			for (let list of weekdayLists) {
				let listDate = moment(list.date).tz(Constants.TIMEZONE);
				if (listDate.isSameOrAfter(eventStart) && listDate.isBefore(eventEnd)) {
					let cardTitle = this.getCardNameFromEvent(event);
					this._trelloService.createCard(list.trelloList, cardTitle, event.id, labels);
				}
			}
		} else {
			// one day event
			let list: WeekdayList = this.getListEventBelongsTo(event, weekdayLists);

			if (list === null) {
				console.log(`${event.summary} does not belong to current week. No event created.`);
				return;
			}

			let cardTitle = this.getCardNameFromEvent(event);
			this._trelloService.createCard(list.trelloList, cardTitle, event.id, labels);
		}
	}

	private findEventsOnBoard(event, weekdayLists: WeekdayList[]): any[] {
		let cards = new Array();
		for (let list of weekdayLists) {
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
		for (let card of list.trelloList.cards) {
			if (card.desc == event.id) {
				console.log(`Event found in list. cardName: ${card.name}, cardDesc: ${card.desc}`);
				return card;
			}
		}

		return null;
	}

	/**
	 * For a single day event, get the list that it belongs to out of the given weekday list
	 * Will throw for multi-day events because they don't belong on one single list
	 * Returns null if the event doesn't belong on any of the given lists
	 */
	private getListEventBelongsTo(event, weekdayLists: WeekdayList[]): WeekdayList {
		if (this._gCalService.isMultidayEvent(event)) {
			throw new Error("Multi-day events don't belong to a single list");
		}

		let eventStart = moment(event.start.dateTime).tz(Constants.TIMEZONE).startOf("day");

		for (let list of weekdayLists) {
			let listDate = moment(list.date).tz(Constants.TIMEZONE).startOf("day");
			if (listDate.isSame(eventStart)) {
				return list;
			}
		}

		console.log(`${event.summary} does not belong to any list.`);
		return null;
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











