import * as moment from "moment";

class WeekdayList {
	public weekdayWord: string;
	public date: Date;
	public trelloList: any;

	constructor(trelloList: any) {
		this.trelloList = trelloList;
		let listMoment = this.getDateFromListName(trelloList.name);
		this.date = listMoment.toDate();
		this.weekdayWord = listMoment.format("dddd");
	};

	private getDateFromListName = (listName: string) => {
		let parsedMoment = moment(listName, "dddd M/D");
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
}

export { WeekdayList };