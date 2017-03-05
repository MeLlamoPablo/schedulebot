"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    =  require('../../modules/confighandler/cfg')();
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "remove-admin",
	desc: "Removes an user from the admin list.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			if (context.botAdmins.length > 1) {
				let id = argv.args.user.match(/<@([0-9]+)>/)[1];
				context.summaryHandler.bot.fetchUser(id).then(user => {
					db.admins.remove(user).then(removed => {
						if (removed) {
							context.botAdmins.splice(
								context.botAdmins.indexOf(user.id), 1
							);
							fulfill("The user was removed from the admins list successfully",
								context);
						} else {
							fulfill("The user is not an admin")
						}
					}).catch(reject);
				}).catch(err => {
					if (err.status === 404) {
						fulfill("Error: the specified user doesn't exist.");
					} else {
						reject(err);
					}
				});
			} else {
				fulfill("Sorry, you can't remove the only admin that there is." +
					"Add another admin first.");
			}
		});
	},
	args: [
		require("./shared/user.js")
	]
});