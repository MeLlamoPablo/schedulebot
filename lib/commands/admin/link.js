"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const db     = require('../../modules/dbhandler/index');

module.exports = new Clapp.Command({
	name: "link",
	desc: "Links an event with a role. ScheduleBot will notify all members of the role so they" +
	" can confirm or reject.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let roleId = argv.args.role.match(/<@&([0-9]+)>/)[1];
			let role = context.summaryHandler.masterChannel.guild.roles.get(roleId);
			if (role) {
				let waiting = role.members.keyArray();

				db.events.get(argv.args.id).then(event => {
					if (event !== null) {
						db.events.updateWaiting(event, waiting).then(() => {
							fulfill("The event #`" + argv.args.id + "` has been linked " +
								"to <@&" + roleId + ">");
						}).catch(reject);

						context.summaryHandler.updateSummary(event).catch(console.error);
					} else {
						fulfill("Event #`" + argv.args.id + "` does not exist");
					}
				}).catch(reject);
			} else {
				fulfill("Sorry, the role you specified doesn't exist");
			}
		});
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
	]
});