"use strict";

const Clapp  = require("../../modules/clapp-discord/index")
	, Heroku = require("heroku-client")
	, cfg    = require("../../modules/confighandler/cfg")();

module.exports = new Clapp.Command({
    name: "config-mode",
    desc: "Shuts the bot down, and loads the setup page.",
    fn: (argv, context) => new Promise(fulfill => {
    	if (process.env.HEROKU_API_KEY) {

			if (argv.flags.accept) {

				const hk = new Heroku({ token: process.env.HEROKU_API_KEY });

				hk.patch(`/apps/${process.env.HEROKU_APP_NAME}/formation/web`, {
					body: { quantity: 0 }
				})

			} else {

				fulfill("**WARNING!**\n" +
					"Entering the config mode will shut down this bot, and will turn on the " +
					"setup site on Heroku.\n" +
					"This means that all lobbies currently in progress will be closed, and I " +
					"will stop responding to any incoming message.\n\n" +

					"If you're sure that you want to procceed, run this command with the " +
					"`accept` flag, like this:\n" +
					`\`${cfg.readable_prefix}\` config-mode --accept`);

			}

		} else {

    		fulfill("This command is intended to be ran on Heroku.\n" +
				"You may manually turn on the config mode.");

		}
	}),
	flags: [
		new Clapp.Flag({
			name: "accept",
			alias: "y",
			type: "boolean",
			default: false
		})
	]
});