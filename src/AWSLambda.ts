import * as calendarTrelloIntegration from "./services/CalendarTrelloIntegrationService";
import * as process from "process";

process.env["PATH"] = process.env["PATH"] + ":" + process.env["LAMBDA_TASK_ROOT"];

export let lambdaHandler = (lambdaEvent, lambdaContext, lambdaCallback) => {
	try {
		calendarTrelloIntegration.checkUpdatedEvents();
	} catch (error) {
		console.error("==ERROR== " + error);
		lambdaCallback(error);
	}
}