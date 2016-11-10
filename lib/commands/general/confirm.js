"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const db     = require('../../modules/dbhandler/index');

module.exports = new Clapp.Command({
	name: "confirm",
	desc: "Confirms or denies attendance to an event.",
	fn: (argv, context, cb) => {
		if (argv.args.attendance !== "yes" && argv.args.attendance !== "no") {
			cb(
				"You have a syntax error: the `attendance` argument should be either `yes` or `no`"
			); return;
		}

		db.events.get(argv.args.id).then(
			event => {
				if (event !== null) {
					db.confirms.getByEvent(event).then(confirms => {
						var attendanceConfirms = confirms !== null ? confirms.filter(el => {
							return el.attends;
						}) : [];

						if (attendanceConfirms.length < event.limit) {
							db.confirms.add(
								event,
								context.msg.author,
								argv.args.attendance === "yes"
							).then(() => {
								cb("Your attendance status was updated.");
								context.summaryHandler.updateSummary(event).catch(console.error);
							}, err => {
								console.error(err);
								cb("Sorry, an internal error occurred. Please talk to my author.");
							});
						} else {
							cb("Sorry, the event is full.");
						}
					}).catch(err => {
						console.error(err);
						cb("Sorry, an internal error occurred. Please talk to my author.");
					});
				} else {
					cb("Event #`" + argv.args.id + "` does not exist");
				}
			}, err => {
				console.error(err);
				cb("Sorry, an internal error occurred. Please talk to my author.");
			}
		);
	},
	args: [
		{
			name: "id",
			desc: "The ID of the event",
			type: "number",
			required: true
		},
		{
			name: "attendance",
			desc: "Whether or not you will attend the event (yes/no)",
			type: "string",
			required: "false",
			default: "yes"
		}
	],
	async: true
});