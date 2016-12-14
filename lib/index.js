"use strict";

const fs             = require('fs')
	, crypto         = require('crypto')
	, Clapp          = require('./modules/clapp-discord')
	, SummaryHandler = require('./modules/summaryhandler')
	, db             = require('./modules/dbhandler')
	, cfg            = require('../config.js')
	, moment         = require('moment')
	, pkg            = require('../package.json')
	, Discord        = require('discord.js')
	, Dota2          = require('dota2')
	, DotaHandler    = require('./modules/dotahandler')
	, Steam          = require('steam')
	, steamVerf      = require('steam-verificator')
	, bot            = new Discord.Client();

let masterChannel, summaryHandler, botAdmins, blacklist = [], verificator, dotaHandler,
	steamClient = new Steam.SteamClient(),
	steamUser = new Steam.SteamUser(steamClient),
	steamFriends = new Steam.SteamFriends(steamClient),
	dotaClient = new Dota2.Dota2Client(steamClient, false, false);

let generalApp = new Clapp.App({
	name: cfg.name,
	desc: pkg.description,
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

let adminApp = new Clapp.App({
	name: cfg.name + "-admin",
	desc: cfg.admin_app.desc + "\nhttps://github.com/MeLlamoPablo/schedulebot",
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

steamClient.on("error", console.error);

// If a sentry file is generated, update it.
steamUser.on('updateMachineAuth', function(sentry, callback) {
	let hashedSentry = crypto.createHash('sha1').update(sentry.bytes).digest();
	db.config.steam.saveSentryFile(hashedSentry).then(() => {
		console.log("[STEAM] New sentry file saved to the database.");
		callback({ sha_file: hashedSentry});
	}).catch(err => {
		console.log("[STEAM] Couldn't save the sentry file to the database:");
		consle.error(err);

		console.log("[STEAM] Saving it to the local machine instead");
		fs.writeFileSync('sentry', hashedSentry);
		callback({ sha_file: hashedSentry});
	});
});

// Startup tasks
console.log("[INFO] Loading ScheduleBot... Please wait");

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
					if (file.match(/(?:.+).js/)) {
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
		let steamStartupPromises = [];

		// Get Steam credentials
		steamStartupPromises.push(db.config.steam.getCredentials());

		// Ignore all users that have already linked their Steam.
		steamStartupPromises.push(new Promise((fulfill, reject) => {
			db.users.getAllLinked().then(users => {
				fulfill(users.map(e => { return e.steam_id }));
			}).catch(reject);
		}));

		// Read sentry file if it exists
		steamStartupPromises.push(new Promise((fulfill, reject) => {
			// Try to find the sentry in the database first
			db.config.steam.getSentryFile().then(sentryFile => {
				if (sentryFile !== null) {
					console.log("[STEAM] Found sentry file on the database.");
					fulfill(sentryFile);
				} else {
					// If it doesn't exist, search it on the schedulebot directory
					console.log("[STEAM] Sentry file doesn't exist in database, searching it in" +
						" the local machine.");

					fs.readFile("./sentry", (err, sentryFile) => {
						if (!err) {
							console.log("[STEAM] Found sentry file on the local machine.");
							fulfill(sentryFile);
						} else {
							if (err.code === "ENOENT") {
								// No such file or directory error
								console.log("[STEAM] Sentry file doesn't exist in the local" +
									" machine.");
								fulfill(null);
							} else {
								reject(err);
							}
						}
					});
				}
			}).catch(reject);
		}));

		// Connect to the Steam network
		steamStartupPromises.push(new Promise(fulfill => {
			steamClient.on("connected", () => {
				console.log("[STEAM] Connected to Steam");
				fulfill()
			});

			steamClient.connect();
		}));

		Promise.all(steamStartupPromises).then(values => {
			let credentials = values[0];
			let ignoredUsers = values[1];
			let sentry = values[2];

			let logOnDetails = {};

			logOnDetails.account_name = credentials.username;
			logOnDetails.password = credentials.password;

			if (credentials.auth_code !== null) {
				logOnDetails.auth_code = credentials.auth_code;
				db.config.steam.deleteAuthCode().then(() => {
					console.log("[STEAM] Steam Guard code was used, and therefore deleted from" +
						" the database.");
				}).catch(console.error);
			}

			if (sentry !== null) {
				logOnDetails.sha_sentryfile = sentry;
			}

			steamUser.logOn(logOnDetails);

			steamClient.on("logOnResponse", response => {
				if (response.eresult == Steam.EResult.OK) {
					console.log("[STEAM] Successfully logged in!");
					steamFriends.setPersonaState(Steam.EPersonaState.Online);
					steamFriends.setPersonaName(cfg.steam.name);
					steamUser.gamesPlayed([{
						game_id: 570
					}]); // Appear as playing Dota 2

					verificator = new steamVerf.Verificator({
						trigger: steamVerf.Trigger.FriendRequest,
						triggerOptions: {
							secondService: "Discord's " + cfg.name,
							ignoredUsers: ignoredUsers
						},
						steamClient: steamClient,
						steamUser: steamUser,
						steamFriends: steamFriends
					});

					dotaClient.on("ready", () => {
						console.log("[DOTA] Running!");
						dotaHandler = new DotaHandler(dotaClient);

						fulfill();
					});

					dotaClient.launch();
				} else {
					let err = new Error("[STEAM] Login failed");
					err.steamResponse = response;
					reject(err);
				}
			});
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

						if (events[i].time.diff(moment()) < 0) {
							let getInhousePromise = db.events.getInhouse(events[i]);
							let getLobbyEndedPromise = events[i].getLobbyEnded();

							Promise.all([
								getInhousePromise,
								getLobbyEndedPromise
							]).then(values => {
								let inhouseProps = values[0];
								let lobbyEnded = values[1];

								if (
									inhouseProps !== null &&
									dotaClient.Lobby === null &&
									!lobbyEnded
								) {
									// If the event has an inhouse, is already happening, the
									// dota client is not currently in a lobby, and this event's
									// lobby was never created then create it.
									inhouseProps.event = events[i];
									dotaHandler.createLobby(inhouseProps).catch(console.error);
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

}).catch(console.error);
