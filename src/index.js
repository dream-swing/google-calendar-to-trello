"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var gCal = require("./api/GoogleCalendar");
var moment = require("moment");
var listEvents = function () {
    var today = moment();
    var dayOfWeek = today.day();
    var timeMin = today.toDate().toISOString();
    var timeMax = today.toDate().toISOString();
    if (dayOfWeek == 5) {
        // today is Friday
        // we want min to be tomorrow, and max to be next Sat midnight
        timeMin = moment(today).startOf('day').add(1, 'days').toDate().toISOString();
        timeMax = moment(today).startOf('day').add(8, 'days').toDate().toISOString();
    }
    else {
        // all days except Friday
        // we want min to be right now, and max to be this Sat midnight
        // no need to set timeMin because it's already now
        if (dayOfWeek == 6) {
            // today is Saturday
            // set dayOfWeek to -1 so timeMax is actually a week from now
            dayOfWeek = -1;
        }
        timeMax = moment(today).startOf('day').add(7 - (dayOfWeek + 1), 'days').toDate().toISOString();
    }
    console.log("timeMin: %s, timeMax: %s", moment(timeMin).format('LLLL'), moment(timeMax).format('LLLL'));
    gCal.listSingleEventsInRange(timeMin, timeMax, printEvents);
};
var printEvents = function (events) {
    if (!events) {
        console.log('Error retrieving events');
    }
    else if (events.length == 0) {
        console.log('No upcoming events found.');
    }
    else {
        console.log('Events this week:');
        for (var i = 0; i < events.length; i++) {
            var event_1 = events[i];
            var start = '';
            if (event_1.start.dateTime) {
                start = moment(event_1.start.dateTime).format('h:mma') + ' ';
            }
            console.log(start + event_1.summary);
        }
    }
};
listEvents();
