"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const moment = require('moment-timezone');
const db     = require('../../modules/dbhandler/index').events;
const cfg    = require('../../../config');

module.exports = new Clapp.Command({
	name: "create",
	desc: "Creates a new event. Example: @ScheduleBot create \"My Event\" \"09/11/2001 09:00\"",
	fn: (argv, context, cb) => {
		var date;
		if (argv.flags.timestamp) {
			// We got an unix timestamp
			date = moment.unix(argv.args.time);
		} else {
			// We got a date string
			date = moment.tz(argv.args.time, "DD/MM/YYYY HH:mm", argv.flags.timezone);
		}

		if (!date.isValid()) {
			cb("Sorry, the date you specified is invalid"); return;
		}

		if (date.diff(moment()) < 0) {
			cb("You can't schedule an event in the past!"); return;
		}

		db.add(argv.args.name, date.unix(), argv.flags.limit).then(id => {
			cb("Your event `" + argv.args.name + "` was created with ID #`" + id + "`.");

			// Post the event summary
			db.get(id).then(event => {
				context.summaryHandler.updateSummary(event).then(msgId => {
					event.updateMsgId(msgId).catch(err => {
						console.error(err);
						cb(
							"Sorry, there was an internal error when trying to create the event." +
							"Please contact my author."
						);
					});
				});
			}, err => {
				console.error(err);
				cb(
					"Sorry, there was an internal error when trying to create the event." +
					"Please contact my author."
				);
			});
		}, err => {
			console.error(err);
			cb(
				"Sorry, there was an internal error when trying to create the event." +
				"Please contact my author."
			);
		});
	},
	args: [
		{
			name: "name",
			desc: "The name of the event",
			type: "string",
			required: true
		},
		{
			name: "time",
			desc: "When the event will take place, in the format: DD/MM/YYYY HH:mm\n",
			type: "string",
			required: true
		}
	],
	flags: [
		{
			name: "timezone",
			desc: "The time zone in which you\'re specifying the time",
			alias: 't',
			type: "string",
			default: cfg.default_timezone,
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
		},
		{
			name: "timestamp",
			desc: "If set, indicates that you specified the time in UNIX timestamp format.",
			alias: 'u',
			type: "boolean",
			default: false
		},
		{
			name: "limit",
			desc: "The maximum number of people that can attend the event",
			alias: 'l',
			type: "number",
			default: 5,
			validations: [
				{
					errorMessage: "The limit must be between 2 and 30",
					validate: val => {
						return (val >= 2 && val <= 30);
					}
				}
			]
		}
	],
	async: true
});