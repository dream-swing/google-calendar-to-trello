import * as moment from "moment-timezone";
import * as Constants from "./../shared/Constants";

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
		let parsedMoment = moment.tz(listName, "dddd M/D", Constants.TIMEZONE);
		let thisYear: number = moment().year();
		let year: number = thisYear;
		// if we're in the new year (Jan) and we're logging December's events
		// subtract one from current year
		if (parsedMoment.isAfter(moment().add("2", "w"))) {
			let lastYear = parsedMoment.year() - 1;
			parsedMoment = parsedMoment.year(lastYear);
		}

		return parsedMoment;
	}
}

export { WeekdayList };