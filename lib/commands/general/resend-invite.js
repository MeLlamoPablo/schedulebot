"use strict";

const Clapp = require('../../modules/clapp-discord/index')
	, db    = require('../../modules/dbhandler').events
;

module.exports = new Clapp.Command({
	name: "resend-invite",
	desc: "Resends an invite to the specified event's lobby. You need to have confirmed" +
	" attendance for this to work.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.get(argv.args.id).then(event => {
				if (event !== null) {
					event.getConfirms().then(people => {
						let confirms = people.confirmed.map(e => e.user); // Array with Discord IDs.

						if (confirms.indexOf(context.msg.author.id) !== -1) {
							db.getLobbyBotId(event).then(botID => {
								if (botID === null) {
									fulfill("Error: the specified event doesn't have " +
										"a" + shouldAddN() ? "n" : "" + " " +
										cfg.dota.game_generic_name + " " +
										"associated or the lobby hasn't been created yet.");
								} else {
									if (context.dotaHandler.isBotInLobby(botID)) {
										context.dotaHandler.invite(botID, context.msg.author.id);
										fulfill("The invite has been resent. " +
											"Accept it inside Dota 2.");
									} else {
										fulfill("Error: the bot is not yet in a lobby. Please " +
											"wait for the lobby to be created first.");
									}
								}


							}).catch(reject);
						} else {
							fulfill("Error: you haven't confirmed attendance to the event `#" +
								event.id + "`.\n" +
								"You need to do so before requesting to be invited to the lobby");
						}
					}).catch(reject);
				} else {
					fulfill("Event #`" + argv.args.id + "` does not exist");
				}
			}).catch(reject);
		});
	},
	args: [
		require("./shared/id")
	]
});