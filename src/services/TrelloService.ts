import * as trelloAPI from "./../api/TrelloAPI";

const WEEKLY_PLANNER_BOARDID = "59387c00db4e82fa3c3825b3";
const TEST_BOARDID = "595fcd34efd0be9149f39649";

export let getWeekdayLists = (callback) => {
	let params = {
		"cards": "open",
		"card_fields": "name",
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