"use strict";

const Clapp = require("../../modules/clapp-discord")
	, db    = require("../../modules/dbhandler").events
;

module.exports = new Clapp.Command({
	name: "get-lobby",
	desc: "Gets the current lobby name and password sent to you on a DM",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.get(argv.args.event).then(event => {
				if (event === null) {
					fulfill("Error: the specified event `" + argv.args.event + "` doesn't exist.");
				} else {
					db.getLobbyBotId(event).then(botID => {
						let details = context.dotaHandler.getLobbyDetails(botID);

						if (details === null) {
							fulfill("The Dota bot is not in a lobby.");
						} else {
							context.msg.author.sendMessage(
								"Hello! Here's the information you requested:\n\n" +

								"- **Lobby name**: `" + details.name + "`\n" +
								"- **Lobby password**: `" + details.password + "`"
							).then(() => {
								fulfill("The information you requested was sent to you in a DM.");
							}).catch(reject);
						}
					}).catch(reject);
				}
			}).catch(reject);
		});
	},
	args: [
		require("./shared/event")
	]
});