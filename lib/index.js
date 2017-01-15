"use strict";

const fs                = require('fs')
	, crypto            = require('crypto')
	, Clapp             = require('./modules/clapp-discord')
	, SummaryHandler    = require('./modules/summaryhandler')
	, db                = require('./modules/dbhandler')
	, cfg               = require('../config.js')
	, loadSteamBot      = require('./modules/steambotshandler/loadbot')
	, moment            = require('moment')
	, pkg               = require('../package.json')
	, Discord           = require('discord.js')
	, DotaHandler       = require('./modules/dotahandler')
	, ECreateLobbyError = require('./structures/enums/ECreateLobbyError')
	, ELobbyStatus      = require('./structures/enums/ELobbyStatus')
	, steamVerf         = require('steam-verificator')
	, bot               = new Discord.Client()
;

let masterChannel, summaryHandler, botAdmins, blacklist = [], verificator, dotaHandler,
	bannedCommands = [],
	steamBots = [];

if (!cfg.quick_inhouse.enabled) {
	bannedCommands.push("quick-inhouse.js");
}

//noinspection JSUnusedGlobalSymbols - reason: onReply is used by Clapp
let generalApp = new Clapp.App({
	name: cfg.name,
	desc: pkg.description + "\nhttps://mellamopablo.github.io/schedulebot/",
	prefix: cfg.prefix,
	version: pkg.version + "-DotaEdition",
	onReply: (msg, context) => {
		let send = function(content) {
			masterChannel.sendMessage(content).then(botMessage => {
				if (cfg.delete_after_reply.enabled) {
					botMessage.delete(cfg.delete_after_reply.time).catch(console.error);
				}
			}).catch(console.error);
		};

		context.msg.reply("\n").then(botResponse => {
			if (cfg.delete_after_reply.enabled) {
				context.msg.delete(cfg.delete_after_reply.time).catch(console.error);
				botResponse.delete(cfg.delete_after_reply.time).catch(console.error);
			}
		}).catch(console.error);

		if (typeof msg === "string") {
			send(msg);
		} else {
			// Discord has a 2000 message character limit
			// We overcome that limit by sending an array of messages to post
			for (let i = 0; i < msg.length; i++) {
				send(msg[i]);
			}
		}

		verificator = context.steam.verificator;
	}
});

//noinspection JSUnusedGlobalSymbols - reason: onReply is used by Clapp
let adminApp = new Clapp.App({
	name: cfg.name + "-admin",
	desc: cfg.admin_app.desc + "\nNeed any help? Send a" +
	" ticket: https://github.com/MeLlamoPablo/schedulebot/issues",
	prefix: cfg.admin_app.prefix,
	version: pkg.version + "-DotaEdition",
	onReply: (msg, context) => {
		context.msg.reply('\n' + msg).then(bot_response => {
			if (cfg.delete_after_reply.enabled) {
				context.msg.delete(cfg.delete_after_reply.time).catch(console.error);
				bot_response.delete(cfg.delete_after_reply.time).catch(console.error);
			}
		}).catch(console.error);
		botAdmins = context.botAdmins;
		blacklist = context.blacklist;
	}
});

bot.on('message', msg => {
	// Fired when someone sends a message
	if (msg.channel.id === masterChannel.id) {
		if (generalApp.isCliSentence(msg.content)) {
			if (blacklist.indexOf(msg.author.id) === -1) {
				generalApp.parseInput(msg.content, {
					msg: msg,
					summaryHandler: summaryHandler,
					steam: {
						verificator: verificator
					},
					dotaHandler: dotaHandler
				});
			} else {
				msg.reply('\n' + "Sorry, you are blacklisted and can't use any commands.")
					.then(bot_response => {
					msg.delete();
					bot_response.delete(7500);
				});
			}
		} else if (adminApp.isCliSentence(msg.content)) {
			if (botAdmins.indexOf(msg.author.id) != -1) {
				adminApp.parseInput(msg.content, {
					msg: msg,
					summaryHandler: summaryHandler,
					botAdmins: botAdmins,
					blacklist: blacklist,
					dotaHandler: dotaHandler
				});
			} else {
				msg.reply('\n' + "Yo, this is top secret! You need to be a bot admin to access" +
					" this.").then(bot_response => {
					msg.delete();
					bot_response.delete(7500);
				});
			}
		} else if (cfg.disallow_talking && msg.author.id !== bot.user.id) {
			msg.reply('\n' + "No fun allowed in here! Sorry, this channel is only for sending" +
				" commands to me. Please talk in another channel.").then(bot_response => {
				msg.delete();
				bot_response.delete(7500);
			});
		} else if (msg.author.id === bot.user.id && msg.content === '') {
			// If the message was written by the bot, and its content is empty string, it means
			// that it's the "ScheduleBot pinned a message" message.
			// We get rid of that ASAP because it stays even after deleting the event
			msg.delete().catch(console.error);
		}
	}
});

// Startup tasks
console.log(`[INFO] Loading ScheduleBot v${pkg.version}-dota... Please wait.`);

let startupPromises = [];

startupPromises.push(db.config.token.get());
startupPromises.push(db.config.admins.getAll());
startupPromises.push(db.config.blacklist.getAll());
// Load general commands
startupPromises.push(
	new Promise((fulfill, reject) => {
		fs.readdir("./lib/commands/general", {encoding: "utf-8"}, (err, files) => {
			if (!err) {
				files.forEach(file => {
					if (file.match(/(?:.+).js/) && bannedCommands.indexOf(file) === -1) {
						generalApp.addCommand(require("./commands/general/" + file));
					}
				});
				fulfill();
			} else {
				reject(err);
			}
		});
	})
);
// Load admin commands
startupPromises.push(
	new Promise((fulfill, reject) => {
		fs.readdir("./lib/commands/admin", {encoding: "utf-8"}, (err, files) => {
			if (!err) {
				files.forEach(file => {
					if (file.match(/(?:.+).js/)) {
						adminApp.addCommand(require("./commands/admin/" + file));
					}
				});
				fulfill();
			} else {
				reject(err);
			}
		});
	})
);
// Connect to Steam and log in
startupPromises.push(
	new Promise((fulfill, reject) => {
		db.steambots.getAll().then(bots => {

			if (bots.length > 0) {

				let steamStartupPromises = [];

				// Load all verificator ignored users
				steamStartupPromises.push(new Promise((fulfill2, reject2) => {
					db.users.getAllLinked()
						.then(users => users.map(e => e.steam_id))
						.then(fulfill2)
						.catch(reject2);
				}));

				// Load all bots
				steamStartupPromises.push(new Promise((fulfill2, reject2) => {

					// Load all Steam bots
					let loadBotsPromises = [];

					for (let i = 0; i < bots.length; i++) {
						let bot = bots[i];
						loadBotsPromises.push(loadSteamBot(bot));
					}

					Promise.all(loadBotsPromises).then(fulfill2).catch(reject2);

				}));


				Promise.all(steamStartupPromises).then(values => {

					let ignoredUsers = values[0];
					steamBots = values[1];

					// Create the verificator based on the first bot.
					verificator = new steamVerf.Verificator({
						trigger: steamVerf.Trigger.FriendRequest,
						triggerOptions: {
							secondService: "Discord's " + cfg.name,
							ignoredUsers: ignoredUsers
						},
						steamClient: steamBots[0].steam.client,
						steamUser: steamBots[0].steam.user,
						steamFriends: steamBots[0].steam.friends
					});

					dotaHandler = new DotaHandler(steamBots);

					fulfill();

				}).catch(reject);

			} else {
				return reject(
					new Error("No steam bots were found. Please run the setup-steam script.")
				);
			}

		}).catch(reject);
	})
);

Promise.all(startupPromises).then(values => {

	let botToken = values[0];
	botAdmins = values[1];
	blacklist = values[2];

	bot.login(botToken).then(() => {
		masterChannel = bot.channels.get(cfg.master_channel);
		summaryHandler = new SummaryHandler(bot, masterChannel);

		// Execute the update function now and every update_interval milliseconds
		(function update(){
			// Update all active events' summaries
			db.events.getAll().then(
				events => {
					for (let i = 0; i < events.length; i++) {
						summaryHandler.updateSummary(events[i]).catch(console.error);

						if (events[i].instant || events[i].time.diff(moment()) < 0) {
							let getInhousePromise = db.events.getInhouse(events[i]);
							let getLobbyStatusPromise = events[i].getLobbyStatus();

							Promise.all([
								getInhousePromise,
								getLobbyStatusPromise
							]).then(values => {
								let inhouseProps = values[0];
								let lobbyStatus = values[1];

								if (
									inhouseProps !== null &&
									(
										lobbyStatus === ELobbyStatus.NOT_CREATED
										||
										lobbyStatus === ELobbyStatus.NO_AVAILABLE_BOT
									)
								) {
									// If the event has an inhouse, is already happening and this
									// event's lobby was never created then create it.
									// If no bots are available, keep retrying.
									inhouseProps.event = events[i];
									dotaHandler.createLobby(inhouseProps)
										.then(botID => db.events.updateLobbyBotId(events[i], botID))
										.then(() => events[i].setLobbyStatus(ELobbyStatus.CREATED))
										.then(() => summaryHandler.updateSummary(events[i]))
										.catch(err => {
											if (err.ECreateLobbyError) {
												switch (err.ECreateLobbyError) {
													case ECreateLobbyError.NO_AVAILABLE_BOT:

														events[i].setLobbyStatus(
															ELobbyStatus.NO_AVAILABLE_BOT
														).then(
															() => summaryHandler.updateSummary(
																events[i]
															)
														).catch(console.error);

														break;
												}
											} else {
												console.error(err);
											}
										});
								}
							}).catch(console.error);
						}
					}
				}
			).catch(console.error);

			setTimeout(update, cfg.update_interval);
		})();

		console.log("[DISCORD] Running!");
		console.log("[INFO] ScheduleBot finished loading.")
	}).catch(console.error);

}).catch(err => {
	console.error(err);
	process.exit(1);
});

// TODO bug - create events creates two summaries sometimes
// TODO bug - not autoinivited on confirming a quick inhouse