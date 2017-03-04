"use strict";

const Clapp       = require('../../modules/clapp-discord/index')
	, getCfgValue = require("../../modules/confighandler/getValue")
	, db          = require('../../modules/dbhandler')
	, shouldAddN  = require('../../modules/helpers/shouldAddN')
;

module.exports = new Clapp.Command({
	name: "add-" + getCfgValue("dota.game_generic_name").toLowerCase(),
	desc: `Adds a Dota 2 ${getCfgValue("dota.game_generic_name")} to an event, or edits the ` +
	`configuration of the already created ${getCfgValue("dota.game_generic_name")}.\n` +
	"The event will only be able to be joined by people who have linked their steam with the" +
	" link-steam command." +
	"\nWhen the event time comes, every attendant will be invited to the event.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.events.get(argv.args.id).then(event => {
				if (event !== null) {
					if (event.limit >= 10) {
						let inhouseProps = {};

						inhouseProps.gameMode = argv.flags.gamemode.toLowerCase().replace(" ", "");
						inhouseProps.server = argv.flags.server.toLowerCase().replace(" ", "");
						inhouseProps.autoBalance = !argv.flags.nobalance;
						if (inhouseProps.gameMode === "captainsmode") {
							inhouseProps.cmPick = argv.flags.cmpick.toLowerCase().replace(" ", "");
						}

						db.events.addInhouse(event, inhouseProps).then(() => {
							// Kick every user that hasn't linked their Steam from the event
							db.confirms.getByEvent(event).then(confirms => {
								let people = confirms.map(e => {
									return e.user
								});

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

							fulfill("The " + getCfgValue("dota.game_generic_name") + " has been " +
								"added to the event `#" + argv.args.id + "`\n" +
								"If there were any people who confirmed their attendance, but " +
								"didn't have their Steam account linked, they have been removed.");
						}).catch(reject);
					} else {
						fulfill("The event's player limit must be 10 or greater in order to add" +
							` a${shouldAddN() ? "n" : ""} ` + getCfgValue("dota.game_generic_name")
							+ ".");
					}
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
			desc: `The ${getCfgValue("dota.game_generic_name")} game mode. Possible values are:\n` +
			"Captains Mode, All Pick, Ranked All Pick, Captains Draft, Random Draft, Single" +
			" Draft, All Random",
			type: "string",
			default: "Captains Mode",
			alias: "g",
			validations: [
				{
					errorMessage: "Type --help for a list of supported values",
					validate: val => {
						let value = val.toLowerCase().replace(" ", "");

						switch (value) {
							case "captainsmode":
							case "allpick":
							case "captainsdraft":
							case "randomdraft":
							case "singledraft":
							case "allrandom":
							case "rankedallpick":
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
			desc: `The ${getCfgValue("dota.game_generic_name")} server. Possible values are:\n` +
			"US West, US East, Luxembourg, Australia, Stockholm, Singapore, Dubai, Austria," +
			" Brazil, South Africa, Chile, Peru, India, Japan.",
			type: "string",
			default: getCfgValue("dota.default_server"),
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
							case "singapore":
							case "dubai":
							case "austria":
							case "brazil":
							case "southafrica":
							case "chile":
							case "peru":
							case "india":
							case "japan":
								return true;
							default:
								return false;
						}
					}
				}
			]
		}),
		new Clapp.Flag({
			name: "cmpick",
			desc: "Determines who gets the first pick, in Captains Mode.\n" +
				"Can be either \"Radiant\", \"Dire\", or \"Random\"",
			type: "string",
			default: "Random",
			alias: "p",
			validations: [
				{
					errorMessage: "Type --help for a list of supported values",
					validate: val => {
						let value = val.toLowerCase().replace(" ", "");

						switch (value) {
							case "random":
							case "radiant":
							case "dire":
								return true;
							default:
								return false;
						}
					}
				}
			]
		}),
		new Clapp.Flag({
			name: "nobalance",
			desc: "Disable automatic team balance.",
			type: "boolean",
			default: false,
			alias: "n"
		})
	]
});