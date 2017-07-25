import * as calendarTrelloIntegration from "./services/CalendarTrelloIntegrationService";
import * as googleAuth from "./api/GoogleAuthAPI";

calendarTrelloIntegration.populateTrelloWithWeeklyEvent();

// Getting new google Auth tokens
// googleAuth.promptForNewToken();

