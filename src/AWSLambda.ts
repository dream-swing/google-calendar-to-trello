import * as calendarTrelloIntegration from "./services/CalendarTrelloIntegrationService";

export let lambdaHandler = (lambdaEvent, lambdaContext, lambdaCallback) => {
	try {
		calendarTrelloIntegration.checkUpdatedEvents();
	} catch (error) {
		lambdaCallback(error);
	}
}