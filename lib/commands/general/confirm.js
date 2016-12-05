"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const db     = require('../../modules/dbhandler/index');

module.exports = new Clapp.Command({
	name: "confirm",
	desc: "Confirms or denies attendance to an event.",
	fn: (argv, context, cb) => {
		return new Promise((fulfill, reject) => {
			if (argv.args.attendance !== "yes" && argv.args.attendance !== "no") {
				fulfill("You have a syntax error: the `attendance` argument should be either" +
					"`yes` or `no`"); return;
			}

			db.events.get(argv.args.id).then(event => {
				if (event !== null) {
					db.confirms.getByEvent(event).then(confirms => {
						let attendanceConfirms = confirms !== null ? confirms.filter(el => {
							return el.attends;
						}) : [];

						if (attendanceConfirms.length < event.limit) {
							db.confirms.add(
								event,
								context.msg.author,
								argv.args.attendance === "yes"
							).then(() => {
								cb("Your attendance status was updated.");
								context.summaryHandler.updateSummary(event)
									.catch(console.error);
							}).catch(reject);
						} else {
							fulfill("Sorry, the event is full.");
						}
					}).catch(reject);
				} else {
					fulfill("Event #`" + argv.args.id + "` does not exist");
				}
			}).catch(reject);
		});
	},
	args: [
		require("./shared/id"),
		{
			name: "attendance",
			desc: "Whether or not you will attend the event (yes/no)",
			type: "string",
			required: "false",
			default: "yes"
		}
	]
});