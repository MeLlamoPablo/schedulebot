"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const db     = require('../../modules/dbhandler/index');

module.exports = new Clapp.Command({
	name: "link",
	desc: "Links an event with a role. ScheduleBot will notify all members of the role so they" +
	" can confirm or reject.",
	fn: (argv, context, cb) => {
		var roleId = argv.args.role.match(/<@&([0-9]+)>/)[1];
		var role = context.summaryHandler.masterChannel.guild.roles.get(roleId);
		if (role) {
			var waiting = role.members.keyArray();

			db.events.get(argv.args.id).then(event => {
				if (event !== null) {
					db.events.updateWaiting(event, waiting).then(() => {
						cb("The event #`" + argv.args.id + "` has been linked " +
							"to <@&" + roleId + ">");
					}).catch(err => {
						console.error(err);
						cb("Sorry, an internal error occurred. Please talk to my author.");
					});

					context.summaryHandler.updateSummary(event).catch(console.error);
				} else {
					cb("Event #`" + argv.args.id + "` does not exist");
				}
			}).catch(err => {
				console.error(err);
				cb("Sorry, an internal error occurred. Please talk to my author.");
			});
		} else {
			cb("Sorry, the role you specified doesn't exist");
		}
	},
	args: [
		{
			name: "id",
			desc: "The ID of the event",
			type: "number",
			required: true
		},
		{
			name: "role",
			desc: "The role to be linked to the event, with the @ (as if you were mentioning" +
			" them). The role must be mentionable for this command to work.",
			type: "string",
			required: true,
			validations: [
				{
					errorMessage: "You need to mention the role for the command to work",
					validate: val => {
						return !!val.match(/<@&[0-9]+>/);
					}
				}
			]
		}
	],
	async: true
});