"use strict";

const Clapp = require('../../modules/clapp-discord/index')
	, cfg   = require('../../../config')
	, db    = require('../../modules/dbhandler');

module.exports = new Clapp.Command({
	name: "add-inhouse",
	desc: "Adds a Dota 2 inhouse to an event, or edits the configuration of the already created" +
	" inhouse.\n" +
	"The event will only be able to be joined by people who have linked their steam with the" +
	" link-steam command." +
	"\nWhen the event time comes, every attendant will be invited to the event.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.events.get(argv.args.id).then(event => {
				if (event !== null) {
					let inhouseProps = {};

					inhouseProps.gameMode = argv.flags.gamemode.toLowerCase().replace(" ", "");
					inhouseProps.server = argv.flags.server.toLowerCase().replace(" ", "");

					db.events.addInhouse(event, inhouseProps).then(() => {

						// Kick every user that hasn't linked their Steam from the event
						db.confirms.getByEvent(event).then(confirms => {
							let people = confirms.map(e => { return e.user });

							for (let i = 0; i < people.length; i++) {
								db.users.getByDiscord(people[i]).then(user => {
									if (user === null || user.steam_id === null) {
										db.confirms.deleteByUserAndEvent(
											people[i], event.id
										).then(() => {
											context.summaryHandler.updateSummary(event)
												.catch(reject);
										}).catch(reject);
									}
								}).catch(reject);
							}
						}).catch(reject);
						context.summaryHandler.updateSummary(event).catch(reject);

						fulfill("The inhouse has been added to the event `#"
							+ argv.args.id + "`\n" +
							"If there were any people who confirmed their attendance, but didn't" +
							" have their Steam account linked, they have been removed.");
					}).catch(reject);
				} else {
					fulfill("The event `#" + argv.args.id + "` doesn't exist.");
				}
			});
		});
	},
	args: [
		require("./shared/id")
	],
	flags: [
		new Clapp.Flag({
			name: "gamemode",
			desc: "The inhouse game mode. Possible values are \"Captains Mode\" and \"All Pick\"",
			type: "string",
			default: "Captains Mode",
			alias: "g",
			validations: [
				{
					errorMessage: "Supported values are \"Captains Mode\" and \"All Pick\"",
					validate: val => {
						let value = val.toLowerCase().replace(" ", "");

						switch (value) {
							case "captainsmode":
							case "allpick":
								return true;
							default:
								return false;
						}
					}
				}
			]
		}),
		new Clapp.Flag({
			name: "server",
			desc: "The inhouse server. Possible values are:\n" +
			"- US West\n" +
			"- US East\n" +
			"- Luxembourg\n" +
			"- Australia\n" +
			"- Stockholm\n\n" +
			"" +
			"If you wish to have another server added, please talk to this bot's author.",
			type: "string",
			default: cfg.dota.defaultServer,
			alias: "s",
			validations: [
				{
					errorMessage: "Type --help for a list of supported values",
					validate: val => {
						let value = val.toLowerCase().replace(" ", "");

						switch (value) {
							case "uswest":
							case "useast":
							case "luxembourg":
							case "australia":
							case "stockholm":
								return true;
							default:
								return false;
						}
					}
				}
			]
		})
	]
});