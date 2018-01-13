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
						let desc = null;
						if (cards) {
							if (cards.length > 0) {
								labels = cards[0].idLabels;
								desc = cards[0].desc;
							}

							for (let card of cards) {
								this._trelloService.deleteCard(card);
							}
						}
						
						this.createCards(event, weekdayLists, desc, labels);
					}
				}
			});
		});
	}

	public populateTrelloWithWeeklyEvent() {
		this._trelloService.getWeekdayLists((weekdayLists: WeekdayList[]) => {
			let { timeMin, timeMax } = this.getWeekdayListSpan(weekdayLists);
			this._gCalService.getWeeklyEvents(timeMin, timeMax, (events) => {
				if (!events) {
					throw new Error("Error retrieving weekly Google events");
				} else if (events.length == 0) {
					console.log("No upcoming events found.");
				} else {
					for (let event of events) {
						let cards = this.findEventsOnBoard(event, weekdayLists);
						if (!cards) {
							this.createCards(event, weekdayLists, null, []);
						}
					}
				}
			});
		});
	}

	public resetBoard() {
		this._trelloService.getWeekdayLists((weekdayLists: WeekdayList[]) => {
			for (let list of weekdayLists) {
				let cards = list.trelloList.cards;
				for (let i: number = 0; i < cards.length; i++) {
					let card = cards[i];
					if (!this._trelloService.isSeparatorCard(card)) {
						if (!this.isEventCard(card)) {
							let { start, end } = this.getTimeForCard(list, card, i);
							this._gCalService.addEventToTask(card.name, start, end);
						}
						if (!this._trelloService.isRecurringCard(card)) {
							this._trelloService.deleteCard(card);
						} else {
							this._trelloService.clearTrelliusDates(card);
						}
					}
				}
				// update list name with this week's dates
				let newListName = this.getUpdatedListDate(list);
				this._trelloService.renameList(list.trelloList, newListName);
			}
		});
	}

	private createCards(event, weekdayLists: WeekdayList[], existingDesc: string, labels: any[]) {
		if (!this._gCalService.validateEventIsComplete(event)) {
			throw new Error(`Error: Attempting to add an incomplete event.`);
		}

		let listToAdd: (list: WeekdayList) => boolean;

		if (this._gCalService.isMultidayEvent(event)) {

			listToAdd = (list: WeekdayList) => {
				// all day events from Google don't have timezone information
				let eventStart = moment.tz(event.start.date, Constants.TIMEZONE);
				let eventEnd = moment.tz(event.end.date, Constants.TIMEZONE);

				let listDate = moment(list.date).tz(Constants.TIMEZONE);
				return listDate.isSameOrAfter(eventStart) && listDate.isBefore(eventEnd);
			};
		} else {
			// one day event
			let list: WeekdayList = this.getListEventBelongsTo(event, weekdayLists);

			if (list === null) {
				console.log(`${event.summary} does not belong to current week. No event created.`);
				return;
			}

			listToAdd = (listToCheck: WeekdayList) => {
				return listToCheck.trelloList.id == list.trelloList.id;
			}
		}

		for (let list of weekdayLists) {
			if (listToAdd(list)) {
				let cardTitle = this.getCardNameFromEvent(event);
				let cardDesc = (existingDesc) ? existingDesc : event.id;
				this._trelloService.createCard(list.trelloList, cardTitle, cardDesc, labels);
			}
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
			if (card.desc.includes(event.id)) {
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

	private getWeekdayListSpan(weekdayLists: WeekdayList[]) {
		if (!weekdayLists || weekdayLists.length <= 0) {
			return null;
		}

		let min = moment(weekdayLists[0].date);
		let max = moment(weekdayLists[0].date);

		for (let weekday of weekdayLists) {
			let weekdayMoment = moment(weekday.date);
			if (weekdayMoment.isBefore(min)) {
				min = weekdayMoment;
			}
			if (weekdayMoment.isAfter(max)) {
				max = weekdayMoment;
			}
		}

		max = max.add(1, "d");

		return {
			timeMin: min.toDate(),
			timeMax: max.toDate()
		}
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

	private getTimeForCard(list: WeekdayList, card, index: number) {
		let timeRange = this.getTrelliusTimeForCard(card);

		if (!timeRange) {
			timeRange = {
				start: this.getStartTimeForCard(list, card, index),
				end: null
			};
		}

		return timeRange;
	}

	private getStartTimeForCard(list: WeekdayList, card, index: number): Date {
		let date = moment(list.date);
		let hour: number = CalendarTrelloIntegrationService.DAY_START_HOUR + index;
		let startTime = moment.tz([date.year(), date.month(), date.date(), hour], Constants.TIMEZONE).toDate();
		console.log(`Start time for ${card.name} artificially constructed to be ${startTime}`);
		return startTime;
	}

	private getTrelliusTimeForCard(card) {
		let TRELLIUS_INDICATOR = "![Trellius Data - DO NOT EDIT!]()[]";

		if (!card.desc.includes(TRELLIUS_INDICATOR)) {
			return null;
		}

		let trelliusSplit: string[] = card.desc.split(TRELLIUS_INDICATOR);

		if (!(trelliusSplit.length == 2 && trelliusSplit[1].length >= 3)) {
			return null;
		}

		console.log(`trelliusSplit[1]: ${trelliusSplit[1]}`);

		let trelliusDataProcessed = trelliusSplit[1].substring(1, trelliusSplit[1].length - 1);
		let trelliusData = JSON.parse(trelliusDataProcessed);

		console.log("trellius data: ");
		console.log(JSON.stringify(trelliusData));

		if (!(trelliusData["start"] && trelliusData["end"])) {
			return null;
		}

		let startTime = moment.utc(trelliusData["start"]).toDate();
		let endTime = moment.utc(trelliusData["end"]).toDate();

		return {
			"start": startTime,
			"end": endTime
		};
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











