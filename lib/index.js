"use strict";

const fs             = require('fs');
const Clapp          = require('./modules/clapp-discord');
const SummaryHandler = require('./modules/summaryhandler');
const db             = require('./modules/dbhandler');
const cfg            = require('../config.js');
const pkg            = require('../package.json');
const Discord        = require('discord.js');
const bot            = new Discord.Client();

var masterChannel, summaryHandler, botAdmins, blacklist = [];

var generalApp = new Clapp.App({
	name: cfg.name,
	desc: pkg.description,
	prefix: cfg.prefix,
	version: pkg.version,
	onReply: (msg, context) => {
		// Fired when input is needed to be shown to the user.
		context.msg.reply('\n' + msg).then(bot_response => {
			if (cfg.delete_after_reply.enabled) {
				context.msg.delete(cfg.delete_after_reply.time).catch(console.error);
				bot_response.delete(cfg.delete_after_reply.time).catch(console.error);
			}
		});
	}
});

var adminApp = new Clapp.App({
	name: cfg.name + "-admin",
	desc: cfg.admin_app.desc + "\nhttps://github.com/MeLlamoPablo/schedulebot",
	prefix: cfg.admin_app.prefix,
	version: pkg.version,
	onReply: (msg, context) => {
		context.msg.reply('\n' + msg).then(bot_response => {
			if (cfg.delete_after_reply.enabled) {
				context.msg.delete(cfg.delete_after_reply.time).catch(console.error);
				bot_response.delete(cfg.delete_after_reply.time).catch(console.error);
			}
		});
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
					summaryHandler: summaryHandler
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
					blacklist: blacklist
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
console.log("Loading ScheduleBot...");

var getBotTokenPromise = db.config.token.get();
var getBotAdminsPromise = db.config.admins.getAll();
var getBlacklistPromise = db.config.blacklist.getAll();
var getGeneralCommandsPromise = new Promise((fulfill, reject) => {
	fs.readdir("./lib/commands/general", {encoding: "utf-8"}, (err, files) => {
		if (!err) {
			files.forEach(file => {
				generalApp.addCommand(require("./commands/general/" + file));
			});
			fulfill();
		} else {
			reject(err);
		}
	});
});
var getAdminCommandsPromise = new Promise((fulfill, reject) => {
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
});

Promise.all(
	[getBotTokenPromise, getBotAdminsPromise, getBlacklistPromise,
		getGeneralCommandsPromise, getAdminCommandsPromise]
).then(values => {

	var botToken = values[0];
	botAdmins = values[1];
	blacklist = values[2];

	bot.login(botToken).then(() => {
		masterChannel = bot.channels.get(cfg.master_channel);
		summaryHandler = new SummaryHandler(bot, masterChannel);

		// Execute the update function now and every update_interval milliseconds
		(function update(){
			// Update all active events' summaries
			db.events.getAllActive().then(
				events => {
					for (var i = 0; i < events.length; i++) {
						summaryHandler.updateSummary(events[i]).catch(console.error);
					}
				}
			).catch(console.error);

			setTimeout(update, cfg.update_interval);
		})();

		console.log("Running!");
	});

}).catch(console.error);
