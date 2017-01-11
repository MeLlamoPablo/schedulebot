"use strict";

const Clapp        = require('../../modules/clapp-discord/index');
const db           = require('../../modules/dbhandler/index');
const ELobbyStatus = require('../../structures/enums/ELobbyStatus');

module.exports = new Clapp.Command({
	name: "confirm",
	desc: "Confirms or denies attendance to an event.",
	fn: (argv, context, cb) => {
		return new Promise((fulfill, reject) => {
			if (argv.args.attendance !== "yes" && argv.args.attendance !== "no") {
				fulfill("You have a syntax error: the `attendance` argument should be either" +
					"`yes` or `no`"); return;
			}

			let isSteamLinkedPromise = new Promise((fulfill, reject) => {
				db.users.getByDiscord(context.msg.author.id).then(user => {
					fulfill(user !== null && user.steam_id !== null);
				});
			});
			let getEventPromise = db.events.get(argv.args.id);

			Promise.all([isSteamLinkedPromise, getEventPromise]).then(values => {
				let isSteamLinked = values[0];
				let event = values[1];

				if (event !== null) {
					let getInhousePropsPromise = db.events.getInhouse(event);
					let getConfirmsPromise = db.confirms.getByEvent(event);

					Promise.all([getInhousePropsPromise, getConfirmsPromise]).then(values2 => {
						let inhouseProps = values2[0];
						let confirms = values2[1];

						if (!(inhouseProps !== null && !isSteamLinked)) {
							let attendanceConfirms = confirms !== null ? confirms.filter(el => {
								return el.attends;
							}) : [];

							// Don't let people confirm yes if the event is full, but do let
							// people confirm no even if the event is full.
							if (
								(argv.args.attendance === "yes" && attendanceConfirms.length < event.limit)
								||
								argv.args.attendance === "no"
							) {
								db.confirms.add(
									event,
									context.msg.author,
									argv.args.attendance === "yes"
								)
									.then(() => {
										fulfill("Your attendance status was updated.");
										context.summaryHandler.updateSummary(event)
											.catch(console.error);
									})
									.then(() => event.getLobbyStatus())
									.then(status => {
										if (status === ELobbyStatus.CREATED) {
											context.dotaHandler.invite(context.msg.author.id)
												.catch(reject);
										}
									})
									.catch(reject);
							} else {
								fulfill("Sorry, the event is full.");
							}
						} else {
							fulfill("Error: this event is an inhouse, but you haven't linked" +
								" your Steam account.\n" +
								"Use the `link-steam` command to link it, then try to confirm" +
								" again.");
						}
					}).catch(reject);

					db.confirms.getByEvent(event).then(confirms => {

					}).catch(reject);
				} else {
					fulfill("Event #`" + argv.args.id + "` does not exist");
				}
			}).catch(reject);
			db.events.get(argv.args.id).then(event => {

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