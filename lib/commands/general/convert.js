"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const db     = require('../../modules/dbhandler/index').events;
const moment = require('moment-timezone');

module.exports = new Clapp.Command({
	name: "convert",
	desc: "Converts the specified event's time to your time zone.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.get(argv.args.id).then(event => {
				if (event !== null) {
					let result = event.time.tz(argv.args.timezone)
						.format("dddd, MMMM Do YYYY, HH:mm");

					fulfill("The event **" + event.name + "** (`#" + event.id + "`) time is: " +
						"`" + result + " (" + event.time._z.name + ")`");
				} else {
					fulfill("Error: the specified event `" + argv.args.id + "` doesn't exist.");
				}
			}).catch(reject);
		});
	},
	args: [
		require("./shared/id"),
		{
			name: "timezone",
			desc: "The time zone you want the time to be converted to.",
			type: "string",
			required: true,
			validations: [
				{
					errorMessage: "The timezone you passed is invalid.\n" +
					"You can find a list with the available time zones here:\n\n" +
					"https://en.wikipedia.org/wiki/List_of_tz_database_time_zones (column `TZ`)",
					validate: val => {
						return !(typeof val !== 'string' || moment.tz.zone(val) === null);
					}
				}
			]
		}
	]
});