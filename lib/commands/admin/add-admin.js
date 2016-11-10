"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    = require('../../../config');
const db     = require('../../modules/dbhandler/index').config;

module.exports = new Clapp.Command({
	name: "add-admin",
	desc: "Adds an user to the admins list. Careful when using this.",
	fn: (argv, context, cb) => {
		var id = argv.args.user.match(/<@([0-9]+)>/)[1];
		context.summaryHandler.bot.fetchUser(id).then(user => {
			if (user !== null) {
				db.admins.add(user).then(added => {
					if (added) {
						context.botAdmins.push(user.id);
						cb("The user was added as an admin.", context);
					} else {
						cb("Error: the user is already in the admin list");
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