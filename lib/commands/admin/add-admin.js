"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    =  require('../../modules/confighandler/cfg')();
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "add-admin",
	desc: "Adds an user to the admins list. Careful when using this.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let id = argv.args.user.match(/<@([0-9]+)>/)[1];
			context.summaryHandler.bot.fetchUser(id).then(user => {
				db.admins.add(user).then(added => {
					if (added) {
						context.botAdmins.push(user.id);
						fulfill("The user was added as an admin.", context);
					} else {
						fulfill("Error: the user is already in the admin list");
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