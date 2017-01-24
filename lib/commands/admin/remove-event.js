"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const db     = require('../../modules/dbhandler/index').events;

module.exports = new Clapp.Command({
	name: "remove-event",
	desc: "Removes the specified event. This action can't be undone.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.get(argv.args.id).then(event => {
				if (event !== null) {
					let eventName = event.name;
					let deleteSummaryPromise = context.summaryHandler.deleteSummary(event);
					let closeLobbyPromise = new Promise((fulfill2, reject2) => {
						db.getLobbyBotId(event)
							.then(botID => {
								// If the bot exists and is in a lobby, close it. Otherwise fulfill.
								if (botID && context.dotaHandler.isBotInLobby(botID)) {
									context.dotaHandler.closeLobby(botID, true)
										.then(fulfill2)
										.catch(reject2);
								} else {
									fulfill2();
								}
							})
							.catch(reject2);
					});

					Promise.all([deleteSummaryPromise, closeLobbyPromise])
						.then(() => event.deleteEvent())
						.then(() => {
							fulfill("The event `" + eventName + "` was successfully deleted.");
						}).catch(reject);
				} else {
					fulfill("Error: the specified event `" + argv.args.id + "` doesn't exist.");
				}
			}).catch(reject);
		});
	},
	args: [
		{
			name: "id",
			desc: "The ID of the event",
			type: "number",
			required: true
		}
	]
});