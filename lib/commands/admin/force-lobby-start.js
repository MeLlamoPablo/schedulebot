"use strict";

const Clapp            = require("../../modules/clapp-discord")
	, ECloseLobbyError = require("../../structures/enums/ECloseLobbyError")
	, db               = require("../../modules/dbhandler")
;

module.exports = new Clapp.Command({
	name: "force-lobby-start",
	desc: "Forces the lobby for the specified event to start, even if there aren't enough players.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.events.get(argv.args.event).then(event => {
				if (event !== null) {
					db.events.getLobbyBotId(event)
						.then(botID => {
							fulfill(`Forced lobby start for the event ${event.id}.`);
							context.dotaHandler.forceLobbyStart(botID).catch(reject);
						})
						.catch(reject);
				} else {
					fulfill("Error: the specified event `" + argv.args.event + "` doesn't exist.");
				}
			}).catch(reject);
		});
	},
	args: [
		require("./shared/event")
	]
});