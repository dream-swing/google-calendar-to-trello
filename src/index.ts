import * as calendarTrelloIntegration from "./services/CalendarTrelloIntegrationService";
import { GoogleAuthAPI } from "./api/GoogleAuthAPI";
import { AwsS3 } from "./storage/AwsS3";
import * as process from "process";

const HELP_TEXT = `
Here are commands you can give:
  'reset-board': At the end of the week, archive past week's tasks to Google 
    Calendar's Task calendar, delete non-recurring items, and move "done" 
    separator to the top of each list.
  'populate-events': Populate the board with this week's events pulled from 
    Google Calendar.
  'update-events': Get event updates for current week.
  'new-google-token': Initiate the process for generating a new Google auth 
    token.
  'test-function': Run content of testFunction.
  'upload-zip': Upload executable zip to S3.
`;

let testFunction = () => {
	// testing things go here
}

console.log("Input: " + process.argv[2]);

let s3 = new AwsS3();

switch (process.argv[2]) {
	case "reset-board":
		calendarTrelloIntegration.resetBoard();
		break;
	case "populate-events":
		calendarTrelloIntegration.populateTrelloWithWeeklyEvent();
		break;
	case "update-events":
		calendarTrelloIntegration.checkUpdatedEvents();
		break;
	case "new-google-token":
		let googleAuth = new GoogleAuthAPI(s3);
		googleAuth.promptForNewToken();
		break;
	case "test-function":
		testFunction();
		break;
	case "upload-zip":
		s3.uploadZip();
		break;
	case "-help":
	case "-h":
	case "help":
		console.log(HELP_TEXT);
		break;
	default:
		console.log("Please run the script with a valid argument.");
		console.log(HELP_TEXT);
		break;
}

