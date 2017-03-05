"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    =  require('../../modules/confighandler/cfg')();
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "blacklist-add",
	desc: "Adds an user to the blacklist. That user will not be able to execute bot commands.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let id = argv.args.user.match(/<@([0-9]+)>/)[1];
			context.summaryHandler.bot.fetchUser(id).then(user => {
				if (user !== null) {
					db.blacklist.add(user).then(added => {
						if (added) {
							context.blacklist.push(user.id);
							fulfill("The user was added as to the blacklist.", context);
						} else {
							fulfill("Error: the user is already blacklisted");
						}
					}).catch(reject);
				} else {
					fulfill("Error: the specified user doesn't exist.");
				}
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