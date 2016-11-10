"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    = require('../../../config');
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "blacklist-remove",
	desc: "Removes an user from the blacklist, thus being able to use the bot again.",
	fn: (argv, context, cb) => {
		var id = argv.args.user.match(/<@([0-9]+)>/)[1];
		context.summaryHandler.bot.fetchUser(id).then(user => {
			db.blacklist.remove(user).then(removed => {
				if (removed) {
					context.blacklist.splice(
						context.blacklist.indexOf(user.id), 1
					);
					cb("The user was removed from the blacklist successfully", context);
				} else {
					cb("The user is not blacklisted")
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
	},
	args: [
		require("./shared/arg_user.js")
	],
	async: true
});