"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    = require('../../../config');
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "remove-admin",
	desc: "Removes an user from the admin list.",
	fn: (argv, context, cb) => {
		if (context.botAdmins.length > 1) {
			var id = argv.args.user.match(/<@([0-9]+)>/)[1];
			context.summaryHandler.bot.fetchUser(id).then(user => {
				db.admins.remove(user).then(removed => {
					if (removed) {
						context.botAdmins.splice(
							context.botAdmins.indexOf(user.id), 1
						);
						cb("The user was removed from the admins list successfully", context);
					} else {
						cb("The user is not an admin")
					}
				}).catch(err => {
					console.error(err);
					cb("Sorry, an internal error occurred. Please talk to my author.");
				});
			}).catch(err => {
				if (err.status === 404) {
					cb("Error: the specified user doesn't exist.");
				} else {
					console.error(err);
					cb("Sorry, an internal error occurred. Please talk to my author.");
				}
			});
		} else {
			cb("Sorry, you can't remove the only admin that there is. Add another admin first.");
		}
	},
	args: [
		require("./shared/arg_user.js")
	],
	async: true
});