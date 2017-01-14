"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const db     = require('../../modules/dbhandler/index');

module.exports = new Clapp.Command({
	name: "kick",
	desc: "Kicks a player from an event.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let id = argv.args.user.match(/<@([0-9]+)>/)[1];

			db.events.get(argv.args.id).then(event => {
				if (event !== null) {
					context.summaryHandler.bot.fetchUser(id).then(user => {
						db.confirms.getByUser(event, context.msg.author).then(attends => {
							if (attends) {
								db.confirms.add(event, user, false)
									.then(() => context.summaryHandler.updateSummary(event))
									.then(() => {
										fulfill(user + " has been successfully kicked from " +
											"the event `" + argv.args.id + "`.\n" +
											"Please note that they are able to rejoin it at any" +
											"time. To prevent them from doing so, use the" +
											" `blacklist-add` command.");
									}).catch(reject);
							} else {
								fulfill("Error: the specified user isn't attending the specified " +
									"event.");
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
					fulfill("Error: the specified event `" + argv.args.id + "` doesn't exist.");
				}
			}).catch(reject);
		});
	},
	args: [
		require("./shared/user"),
		{
			name: "id",
			desc: "The ID of the event",
			type: "number",
			required: true
		}
	]
});