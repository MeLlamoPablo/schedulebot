"use strict";

const Clapp        = require('../../modules/clapp-discord/index')
	, cfg          =  require('../../modules/confighandler/cfg')()
	, db           = require('../../modules/dbhandler/index')
	, getMmr       = require('../../modules/dotahandler/mmr')
	, ELobbyStatus = require('../../structures/enums/ELobbyStatus')
	, shouldAddN   = require('../../modules/helpers/shouldAddN')
;

module.exports = new Clapp.Command({
	name: "confirm",
	desc: "Confirms or denies attendance to an event.",
	fn: (argv, context, cb) => {
		return new Promise((fulfill, reject) => {
			if (argv.args.attendance !== "yes" && argv.args.attendance !== "no") {
				fulfill("You have a syntax error: the `attendance` argument should be either" +
					"`yes` or `no`"); return;
			}

			let isSteamLinkedPromise = new Promise((fulfill2, reject2) => {
				db.users.getByDiscord(context.msg.author.id).then(user => {
					fulfill2(user !== null && user.steam_id !== null);
				});
			});
			let getEventPromise = db.events.get(argv.args.id);

			Promise.all([isSteamLinkedPromise, getEventPromise]).then(values => {
				let isSteamLinked = values[0];
				let event = values[1];

				if (event !== null) {
					let getInhousePropsPromise = db.events.getInhouse(event);
					let getConfirmsPromise = db.confirms.getByEvent(event);
					let userDisplaysMmrPromise = new Promise((fulfill2, reject2) => {
						// If the user hasn't linked their Steam account, then they cannot be
						// displaying ther MMR.
						if (!isSteamLinked) {
							return fulfill2(false);
						}

						if (cfg.dota.mmr.enforce) {
							db.users.getMmrByDiscord(context.msg.author.id)
								.then(mmr => {
									if (mmr !== null) {
										// The user is displaying their MMR
										fulfill2(true);
									} else {
										// The MMR is not found on the database.
										// Try to get it from OpenDota.
										let steamID;

										db.users.getByDiscord(context.msg.author.id)
											.then(user => steamID = user.steam_id)
											.then(() => getMmr(steamID))
											.then(mmr => {
												if (mmr !== null) {
													// The user is displaying their MMR on OpenDota
													// Fulfill true and also update it on the DB.
													db.users.updateMmr(steamID, mmr)
														.then(() => fulfill2(true))
														.catch(reject2);
												} else {
													fulfill2(false);
												}
											})
											.catch(reject2);
									}
								})
								.catch(reject2);
						} else {
							fulfill2(true);
						}
					});

					Promise.all([
						getInhousePropsPromise,
						getConfirmsPromise,
						userDisplaysMmrPromise
					]).then(values2 => {
						let inhouseProps = values2[0];
						let confirms = values2[1];
						let userDisplaysMmr = values2[2];

						if (!(inhouseProps !== null && !isSteamLinked)) {
							let attendanceConfirms = confirms !== null ? confirms.filter(el => {
								return el.attends;
							}) : [];

							// Don't let people confirm yes if the event is full, but do let
							// people confirm no even if the event is full.
							if (
								(
									argv.args.attendance === "yes" &&
									attendanceConfirms.length < event.limit
								)
								||
								argv.args.attendance === "no"
							) {
								if (userDisplaysMmr || argv.args.attendance === "no") {
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
												db.events.getLobbyBotId(event)
													.then(botID =>
														context.dotaHandler.invite(
															botID, context.msg.author.id
														))
													.catch(reject);
											}
										})
										.catch(reject);
								} else {
									fulfill("Sorry, but you need to be displaying your MMR " +
										"publicly in order to confirm your attendance to any " +
										"event.\n\n" +

										"Please log in OpenDota to do so, then try again:\n" +
										"https://www.opendota.com/");
								}
							} else {
								fulfill("Sorry, the event is full.");
							}
						} else {
							fulfill("Error: this event is a" + (shouldAddN() ? "n" : "") + " " +
								cfg.quick_inhouse.event_name + ", but you haven't linked" +
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