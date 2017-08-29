import { CalendarTrelloIntegrationService } from "./services/CalendarTrelloIntegrationService";
import { GoogleCalendarAPI } from "./api/GoogleCalendarAPI";
import { TrelloAPI } from "./api/TrelloAPI";
import { AwsS3 } from "./storage/AwsS3";
import * as process from "process";

process.env["PATH"] = process.env["PATH"] + ":" + process.env["LAMBDA_TASK_ROOT"];

export let lambdaHandler = (lambdaEvent, lambdaContext, lambdaCallback) => {
	try {
		let s3 = new AwsS3();
		let gCalAPI = GoogleCalendarAPI.createAPI(s3, s3);
		let trelloAPI = new TrelloAPI(s3);
		let calendarTrelloIntegration = CalendarTrelloIntegrationService.createService(gCalAPI, trelloAPI);
		calendarTrelloIntegration.checkUpdatedEvents();
	} catch (error) {
		console.error("==ERROR== " + error);
		lambdaCallback(error);
	}
}