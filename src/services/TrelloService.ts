import * as Constants from "./../shared/Constants";

import { TrelloAPI } from "./../api/TrelloAPI";
import { AwsS3 } from "./../storage/AwsS3";

const WEEKLY_PLANNER_BOARDID = "59387c00db4e82fa3c3825b3";
const TEST_BOARDID = "595fcd34efd0be9149f39649";
const DONE_SEPARATOR = "===^===^=DONE=^===^===";
const RECURRING_LABEL = "Recurring";

let trelloAPI = new TrelloAPI(new AwsS3());

export let getWeekdayLists = (callback) => {
	let params = {
		"cards": "open",
		"card_fields": "name,desc,labels",
		"fields": "name"
	};

	let boardId = getBoardId();
	
	trelloAPI.getListsAndCardsOnBoard(boardId, params, (allTheLists) => {
		let listsWeWant = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
		let outputList = {};
		for (let list of allTheLists) {
			for (let weekday of listsWeWant) {
				if (list.name.includes(weekday)) {
					outputList[weekday] = list;
				}
			}
		}
		callback(outputList);
	});
}

export let renameList = (list, newName: string) => {
	console.log(`Renaming list name from ${list.name} to ${newName}`);
	trelloAPI.updateList(list.id, newName, null);
}

export let sortLists = (orderedLists: Array<any>) => {
	console.log("Reordering lists...");
	for (let i = 0; i < orderedLists.length; i++) {
		let list = orderedLists[i];
		// Trello API says position has to be positive number,
		// not in the mood for testing if they consider 0 a positive number.
		let pos: number = i + 1;
		trelloAPI.updateList(list.id, null, pos + "");
	}
}

export let createCard = (list, cardName: string, cardDesc: string) => {
	console.log(`Adding ${cardName} to list ${list.name}`);
	trelloAPI.createCard(list.id, cardName, cardDesc);
}

export let deleteCard = (card) => {
	console.log(`Deleting card ${card.name}...`);
	trelloAPI.deleteCard(card.id);
}

/**
 * if newDesc is null, then don't update it, keep the original content.
 * However, if newDesc is empty string "", then clear it.
 * Same rules apply to newName
 */
export let updateCard = (card, newName: string, newDesc: string) => {
	if (newName === null) {
		newName = card.name;
	}

	if (newDesc === null) {
		newDesc = card.desc;
	}

	console.log(`Updating card ${card.name}. New name: ${newName}, new desc: ${newDesc}`);

	trelloAPI.updateCard(card.id, newName, newDesc);
}

export let moveCardToTop = (card) => {
	console.log(`Moving card ${card.name} to top of list.`);
	trelloAPI.updateCardPos(card.id, "top");
}

export let isDoneSeparatorCard = (card): boolean => {
	return card.name == DONE_SEPARATOR;
}

export let isRecurringCard = (card): boolean => {
	let labels = card.labels;

	if (!labels) {
		return false;
	}

	return labels.some((label, index, array) => {
		return label.name == RECURRING_LABEL;
	});
}

export let storeTokenToS3 = () => {
	trelloAPI.storeToken();
}

let getBoardId = () => {
	if (Constants.DEBUG) {
		console.log("Using test Trello board.");
		return TEST_BOARDID;
	} else {
		return WEEKLY_PLANNER_BOARDID;
	}
}