"use strict";

const SteamBot = require("./SteamBot");

/**
 * @typedef {object} BotObject
 * @property {number} id
 * @property {string} username
 * @property {string} password
 * @property {boolean} steam_guard
 * @property {string} [steam_guard_code]
 * @property {Buffer} [sentry_file]
 */

/**
 * @param {BotObject} botObj
 * @return {Promise<SteamBot>}
 */
module.exports = botObj => new Promise((fulfill, reject) => {
	let bot = new SteamBot(botObj.id, botObj.steam_guard);

	let logInDetails = {
		username: botObj.username,
		password: botObj.password,
		steam_guard_code: botObj.steam_guard_code,
		sentry_file: botObj.sentry_file
	};

	bot.connectToSteam()
		.then(() => bot.logIn(logInDetails))
		.then(() => bot.connectToDota())
		.then(() => fulfill(bot))
		.catch(reject);
});