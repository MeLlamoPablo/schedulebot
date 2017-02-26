"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    =  require('../../modules/confighandler/cfg')();
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "blacklist-remove",
	desc: "Removes an user from the blacklist, thus being able to use the bot again.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let id = argv.args.user.match(/<@([0-9]+)>/)[1];
			context.summaryHandler.bot.fetchUser(id).then(user => {
				db.blacklist.remove(user).then(removed => {
					if (removed) {
						context.blacklist.splice(
							context.blacklist.indexOf(user.id), 1
						);
						fulfill("The user was removed from the blacklist successfully", context);
					} else {
						fulfill("The user is not blacklisted")
					}
				}).catch(reject);
			}).catch(err => {
				if (err.status === 404) {
					fulfill("Error: the specified user doesn't exist.");
				} else {
					reject(err);
				}
			});
		});
	},
	args: [
		require("./shared/user.js")
	]
});