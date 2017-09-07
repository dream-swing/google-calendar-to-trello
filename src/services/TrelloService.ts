import * as Constants from "./../shared/Constants";
import { WeekdayList } from "./../models/WeekdayList";

import { TrelloAPI } from "./../api/TrelloAPI";

export class TrelloService {
	private static readonly WEEKLY_PLANNER_BOARDID = "59387c00db4e82fa3c3825b3";
	private static readonly TEST_BOARDID = "595fcd34efd0be9149f39649";
	private static readonly DONE_SEPARATOR = "===^===^=DONE=^===^===";
	private static readonly RECURRING_LABEL = "Recurring";

	constructor(private _trelloAPI: TrelloAPI) {}

	public getWeekdayLists(callback) {
		let params = {
			"cards": "open",
			"card_fields": "name,desc,labels",
			"fields": "name"
		};

		let boardId = this.getBoardId();
		
		this._trelloAPI.getListsAndCardsOnBoard(boardId, params, (allTheLists) => {
			let listsWeWant = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
			let outputList: WeekdayList[] = new Array<WeekdayList>();
			for (let list of allTheLists) {
				for (let weekday of listsWeWant) {
					if (list.name.includes(weekday)) {
						let weekdayList = new WeekdayList(list);
						outputList.push(weekdayList);
					}
				}
			}
			callback(outputList);
		});
	}

	public renameList(list, newName: string) {
		console.log(`Renaming list name from ${list.name} to ${newName}`);
		this._trelloAPI.updateList(list.id, newName, null);
	}

	public sortLists(orderedLists: Array<any>) {
		console.log("Reordering lists...");
		for (let i = 0; i < orderedLists.length; i++) {
			let list = orderedLists[i];
			// Trello API says position has to be positive number,
			// not in the mood for testing if they consider 0 a positive number.
			let pos: number = i + 1;
			this._trelloAPI.updateList(list.id, null, pos + "");
		}
	}

	public createCard(list, cardName: string, cardDesc: string) {
		console.log(`Adding ${cardName} to list ${list.name}`);
		this._trelloAPI.createCard(list.id, cardName, cardDesc);
	}

	public deleteCard(card) {
		console.log(`Deleting card ${card.name}...`);
		this._trelloAPI.deleteCard(card.id);
	}

	/**
	 * if newDesc is null, then don't update it, keep the original content.
	 * However, if newDesc is empty string "", then clear it.
	 * Same rules apply to newName
	 */
	public updateCard(card, newName: string, newDesc: string) {
		if (newName === null) {
			newName = card.name;
		}

		if (newDesc === null) {
			newDesc = card.desc;
		}

		console.log(`Updating card ${card.name}. New name: ${newName}, new desc: ${newDesc}`);

		this._trelloAPI.updateCard(card.id, newName, newDesc);
	}

	public moveCardToTop(card) {
		console.log(`Moving card ${card.name} to top of list.`);
		this._trelloAPI.updateCardPos(card.id, "top");
	}

	public isDoneSeparatorCard(card): boolean {
		return card.name == TrelloService.DONE_SEPARATOR;
	}

	public isRecurringCard(card): boolean {
		let labels = card.labels;

		if (!labels) {
			return false;
		}

		return labels.some((label, index, array) => {
			return label.name == TrelloService.RECURRING_LABEL;
		});
	}

	public storeTokenToS3() {
		this._trelloAPI.storeToken();
	}

	private getBoardId() {
		if (Constants.DEBUG) {
			console.log("Using test Trello board.");
			return TrelloService.TEST_BOARDID;
		} else {
			return TrelloService.WEEKLY_PLANNER_BOARDID;
		}
	}
}