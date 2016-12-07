"use strict";

const Clapp = require('../../modules/clapp-discord/index')
	, cfg   = require('../../../config')
	, db    = require('../../modules/dbhandler');

module.exports = new Clapp.Command({
	name: "resend-invite",
	desc: "Resends an invite to the current lobby. You need to have confirmed attendance for" +
	" this to work.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			context.dotaHandler.currentLobbyEvent.getConfirms().then(people => {
				let confirmed = false;

				for (let i = 0; i < people.confirmed.length; i++) {
					let discordID = people.confirmed[i];

					if (context.msg.author.id === discordID) {
						confirmed = true;
					}
				}

				if (confirmed) {
					context.dotaHandler.invite(context.msg.author.id).then(() => {
						fulfill("The invite has been resent. Accept it inside Dota 2.");
					}).catch(reject);
				} else {
					fulfill("Error: you haven't confirmed attendance to the event `#" +
						context.dotaHandler.currentLobbyEvent.id + "`.\n" +
						"You need to do so before requesting to be invited to the lobby");
				}
			}).catch(reject);
		});
	}
});