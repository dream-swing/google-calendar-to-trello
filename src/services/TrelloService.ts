import * as trelloAPI from "./../api/TrelloAPI";

const WEEKLY_PLANNER_BOARDID = "59387c00db4e82fa3c3825b3";
const TEST_BOARDID = "595fcd34efd0be9149f39649";

export let getWeekdayLists = (callback) => {
	let params = {
		"cards": "open",
		"card_fields": "name,desc",
		"fields": "name"
	};
	
	trelloAPI.getListsAndCardsOnBoard(TEST_BOARDID, params, (allTheLists) => {
		let listsWeWant = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
		let outputList = {};
		for (let list of allTheLists) {
			if (listsWeWant.includes(list.name)) {
				outputList[list.name] = list;
			}
		}
		callback(outputList);
	});
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

export let storeTokenToS3 = () => {
	trelloAPI.storeToken();
}