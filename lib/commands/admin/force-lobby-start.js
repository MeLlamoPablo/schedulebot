"use strict";

const Clapp = require('../../modules/clapp-discord/index');

module.exports = new Clapp.Command({
	name: "force-lobby-start",
	desc: "Forces the current lobby to start, even if there aren't enough players.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			context.dotaHandler.forceStart().catch(reject);
			fulfill("Forced current lobby start");
		});
	}
});