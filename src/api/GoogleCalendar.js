"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var google = require("googleapis");
var googleAuth = require("./GoogleAuth");
/**
 * Lists single events in the time range specified. Time range params are specified
 * in ISO format as strings.
 */
exports.listSingleEventsInRange = function (timeMinISO, timeMaxISO, callback) {
    googleAuth.processClientSecrets(function (auth) {
        var calendar = google.calendar('v3');
        calendar.events.list({
            auth: auth,
            calendarId: 'primary',
            timeMin: timeMinISO,
            timeMax: timeMaxISO,
            singleEvents: true,
            orderBy: 'startTime',
        }, function (err, response) {
            if (err) {
                console.error('The API returned an error: ' + err);
                return;
            }
            callback(response.items);
        });
    });
};
