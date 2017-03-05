"use strict";

const Clapp  = require('../../modules/clapp-discord/index')
	, cfg    = require('../../modules/confighandler/getValue')
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
							cfg("steam.profile_url") + "\n\n" +

							"It will send you a code. After you have it, run the command " +
							"`" + cfg("readable_prefix") + " link-steam YOUR_CODE`.");
					} else {
						// The user entered a code, verify it.
						let steamID = context.steam.verificator.verify(argv.args.code);

						if (steamID !== null) {
							db.add(context.msg.author.id, steamID).then(() => {
								context.steam.verificator.ignoredUsers.push(steamID);

								getMmr(steamID)
									.then(mmr => {
										if (mmr !== null) {
											return db.updateMmr(steamID, mmr);
										} else {
											return mmrUnknownNotifyUser(context.msg.author);
										}
									})
									.catch(console.error);

								fulfill("Your steam account has been linked!\n" +
									"You may now join any " + cfg("dota.game_generic_name") +
									" events.", context);
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

/**
 * Notifies the user about their MMR being hidden.
 * @param {User} discordUser The Discord user object.
 */
function mmrUnknownNotifyUser(discordUser) {
	return new Promise((fulfill, reject) => {
		let msg = "Hello! I've tried to fetch your MMR from OpenDota, but I couldn't, " +
			"because you're not displaying your MMR publicly.\n\n" +

			"I use OpenDota to track players' MMR. OpenDota is a free and open source " +
			"statistics service for Dota 2. You can check it out here:\n" +
			"https://www.opendota.com/\n\n";

		if (cfg("dota.mmr.enforce")) {
			msg += "In order to participate in any " + cfg("dota.game_generic_name") +
				" you need to  display your MMR. In order to do so, just log in OpenDota, while " +
				"making sure that you're exposing your MMR in Dota 2.";
		} else {
			msg += "It is not required to display your MMR, but if you wish to do so, just log " +
				"in OpenDota, while making sure that you're exposing your MMR in Dota 2."
		}

		discordUser.sendMessage(msg).then(fulfill).catch(reject);
	});
}