"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    = require('../../../config');
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "blacklist-add",
	desc: "Adds an user to the blacklist. That user will not be able to execute bot commands.",
	fn: (argv, context, cb) => {
		var id = argv.args.user.match(/<@([0-9]+)>/)[1];
		context.summaryHandler.bot.fetchUser(id).then(user => {
			if (user !== null) {
				db.blacklist.add(user).then(added => {
					if (added) {
						context.blacklist.push(user.id);
						cb("The user was added as to the blacklist.", context);
					} else {
						cb("Error: the user is already blacklisted");
					}
				}).catch(err => {
					console.error(err);
					cb("Sorry, an internal error occurred. Please talk to my author.");
				});
			} else {
				cb("Error: the specified user doesn't exist.");
			}
		}).catch(err => {
			if (err.status === 404) {
				cb("Error: the specified user doesn't exist.");
			} else {
				console.error(err);
				cb("Sorry, an internal error occurred. Please talk to my author.");
			}
		});
	},
	args: [
		require("./shared/arg_user.js")
	],
	async: true
});