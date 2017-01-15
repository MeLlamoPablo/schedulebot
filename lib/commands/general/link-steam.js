"use strict";

const Clapp  = require('../../modules/clapp-discord/index')
	, cfg    = require('../../../config')
	, db     = require('../../modules/dbhandler').users
	, getMmr = require('../../modules/dotahandler/mmr')
;

module.exports = new Clapp.Command({
	name: "link-steam",
	desc: "Links your Steam account to your Discord account, so that you're able to be invited" +
	" to inhouses by the Dota bot.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.getByDiscord(context.msg.author.id).then(user => {
				if (user === null || !user.steam_id) {
					if (argv.args.code === "") {
						// The user hasn't entered any code.
						fulfill("To link your Steam account to your Discord account, " +
							"add the Steam bot:\n" +
							cfg.steam.profile_url + "\n\n" +

							"It will send you a code. After you have it, run the command " +
							"`" + cfg.readable_prefix + " link-steam YOUR_CODE`.");
					} else {
						// The user entered a code, verify it.
						let steamID = context.steam.verificator.verify(argv.args.code);

						if (steamID !== null) {
							db.add(context.msg.author.id, steamID).then(() => {
								context.steam.verificator.ignoredUsers.push(steamID);

								getMmr(steamID)
									.then(mmr => db.updateMmr(steamID, mmr))
									.catch(console.error);

								fulfill("Your steam account has been linked!\n" +
									"You may now join any inhouse events.", context);
							}).catch(reject);
						} else {
							fulfill("The code you introduced is not correct");
						}
					}
				} else {
					fulfill("Your Steam account is already linked.");
				}
			}).catch(reject);
		});
	},
	args: [
		new Clapp.Argument({
			name: "code",
			desc: "The code sent to you by the Steam Bot. If you don't have it, run this command" +
			" without arguments",
			required: "false",
			type: "string",
			default: ""
		})
	]
});