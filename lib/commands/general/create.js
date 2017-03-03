"use strict";

const Clapp      = require('../../modules/clapp-discord/index')
	, moment     = require('moment-timezone')
	, db         = require('../../modules/dbhandler/index').events
	, cfg        =  require('../../modules/confighandler/cfg')()
	, shouldAddN = require('../../modules/helpers/shouldAddN')
;

module.exports = new Clapp.Command({
	name: "create",
	desc: "Creates a new event. Example: `" + cfg.readable_prefix
	+ " create \"My Event\" \"09/11/2001 09:00\"`",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let date;
			if (argv.args.time.toLowerCase() !== "now") {
				if (argv.flags.timestamp) {
					// We got an unix timestamp
					date = moment.unix(argv.args.time);
				} else {
					// We got a date string
					date = moment.tz(argv.args.time, cfg.time_format, argv.flags.timezone);
				}

				if (!date.isValid()) {
					return fulfill("Sorry, the date you specified is invalid");
				}

				if (date.diff(moment()) < 0) {
					return fulfill("You can't schedule an event in the past!");
				}

				db.add(argv.args.name, date.unix(), argv.flags.limit).then(id => {
					fulfill("Your event `" + argv.args.name + "` was created with ID #`"
						+ id + "`.");

					// Post the event summary
					db.get(id).then(event => {
						context.summaryHandler.updateSummary(event).then(msgId => {
							event.updateMsgId(msgId).catch(reject);
						});
					}).catch(reject);
				}).catch(reject);
			} else {
				db.addInstant(argv.args.name, argv.flags.limit).then(id => {
					let msg =
						`Your event \`${argv.args.name}\` was created with ID #\`${id}\`.\n` +
						`The lobby will be started after you add a${shouldAddN() ? "n" : ""} ` +
						`${cfg.dota.game_generic_name} using the command ` +
						`\`${cfg.readable_prefix} add-${cfg.dota.game_generic_name.toLowerCase()}` +
						`${id}\``;

					fulfill(msg);

					// Post the event summary
					db.get(id).then(event => {
						context.summaryHandler.updateSummary(event).then(msgId => {
							event.updateMsgId(msgId).catch(reject);
						});
					}).catch(reject);
				});
			}
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
			desc: "Either the time of the event, in the format: " + cfg.time_format + "\n" +
				"or the keyword \"now\" to create an instant event.",
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
			default: 10,
			validations: [
				{
					errorMessage: "The limit must be between 2 and 30",
					validate: val => {
						return (val >= 2 && val <= 30);
					}
				}
			]
		}
	]
});