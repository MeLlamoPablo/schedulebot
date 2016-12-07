"use strict";

const Clapp = require('../../modules/clapp-discord/index');

module.exports = new Clapp.Command({
	name: "get-lobby",
	desc: "Gets the current lobby name and password sent to you on a DM",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let lobby = context.dotaHandler.currentLobbyName;
			let pass = context.dotaHandler.currentLobbyPassword;

			context.msg.author.sendMessage(
				"Hello! Here's the information you requested:\n\n" +

				"- **Current lobby name**: `" + lobby + "`\n" +
				"- **Current lobby password**: `" + pass + "`"
			).then(() => {
				fulfill("The information you requested was sent to you in a DM.");
			}).catch(reject);
		});
	}
});