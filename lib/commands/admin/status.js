"use strict";

const Clapp = require("../../modules/clapp-discord");

module.exports = new Clapp.Command({
	name: "status",
	desc: "Gets information about the Discord bot and Steam bots sent to you on a DM",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let bots = context.dotaHandler.bots;

			let msg = "Hello! Here's the bot status information:\n\n";

			let genValueString = (key, value, newline = true) => {
				return `- **${key}**: \`${value}\`${newline ? "\n" : ""}`;
			};

			msg += genValueString(
				"Uptime",
				Math.floor((context.summaryHandler.bot.uptime / 1000) / 60) + " minutes"
			);

			for (let i = 0; i < bots.length; i++) {
				let dotaClient = bots[i].dota.client;

				msg += genValueString(
					`Bot #${dotaClient.botId}`,
					context.dotaHandler.isBotInLobby(dotaClient.botId)
						? `In lobby: ${dotaClient.currentLobby.name} ` +
						`(Event #${dotaClient.currentLobby.event.id})`
						: `Not in lobby`,
					i !== bots.length
				);
			}

			context.msg.author.sendMessage(msg)
				.then(() => fulfill("The information you requested was sent to you in a DM."))
				.catch(reject);
		});
	}
});