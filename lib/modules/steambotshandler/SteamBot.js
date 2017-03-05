const getCfgValue  = require("../confighandler/getValue")
	, crypto       = require("crypto")
	, db           = require("../dbhandler/index").steambots
	, errorHandler = require("../errorhandler")
	, DotaClientX  = require("../dotahandler/DotaClientX")
	, Steam        = require("steam")
;

/**
 * @class SteamBot
 * A class representing a single Steam Bot with its corresponding steam client and dota client.
 *
 * @property {number} id The bot's id
 * @property {boolean} steamGuard Whether or not the bot has enabled steam guard.
 *
 * @property {object} steam
 * @property {SteamClient} steam.client
 * @property {SteamUser} steam.user
 * @property {SteamFriends} steam.friends
 *
 * @property {object} dota
 * @property {DotaClientX} dota.client
 *
 * @property {string} prefix The bot's prefix, used for console logs.
 */
class SteamBot {

	/**
	 * Instantiates the SteamBots and creates all needed clients.
	 * Subscribes to the updateMachineAuth and error events. Saves a sentry file to the database
	 * if received.
	 *
	 * @param {number} id The bot's ID in the database
	 * @param {boolean} steamGuard Whether or not the bot has enabled steam guard.
	 */
	constructor(id, steamGuard) {
		this.id = id;
		this.steamGuard = steamGuard;
		this.prefix = `[BOT #${id}] [SECTION]`;

		this.steam = {};
		this.dota = {};

		this.steam.client = new Steam.SteamClient();
		this.steam.user = new Steam.SteamUser(this.steam.client);
		this.steam.friends = new Steam.SteamFriends(this.steam.client);
		this.dota.client = new DotaClientX(this.steam.client, id);

		this.steam.user.on("updateMachineAuth", (sentry, callback) => {
			let hashedSentry = crypto.createHash('sha1').update(sentry.bytes).digest();

			if (steamGuard) {
				db.saveSentryFile(this.id, hashedSentry).then(() => {
					this._log("Saved new sentry file to the database.");
				}).catch(console.error);
			}

			callback({ sha_file: hashedSentry });
		});

		this.steam.client.on("error", err => {
			if (err.message === "Disconnected") {

				err.message += "\n\nUnexpected Steam disconnection.\n\n" +

					"The cause of this issue is unknown. All I know is that this is not the\n" +
					"fault of ScheduleBot, but rather, of node-steam.\n\n" +

					"First, make sure that you have no other instances of this bot running.\n" +
					"Logging in Steam twice might be the cause of this." +

					"If you have multiple Steam bots, try disabling this one. If this is the\n" +
					"only one, try disabling Steam Guard. I know, it's not the ideal solution,\n" +
					"but I don't think there's anything else I can do.\n\n" +

					"Open an issue on GitHub if you'd like to discuss this further.";

				errorHandler(err);
			} else {
				this._logErr("Unexpected error:");
				console.error(err);
			}
		});
	}

	/**
	 * Connects the current client to the steam network.
	 * @return {Promise}
	 */
	connectToSteam() {
		return new Promise((fulfill, reject) => {
			this.steam.client.on("connected", err => {
				if (!err) {
					this._log("Connected to the Steam network.");
					fulfill();
				} else {
					reject(err);
				}
			});

			this.steam.client.connect();
		});
	}

	/**
	 * Connects the current client to the Dota game coordinator. Requires the Steam client to be
	 * already logged in.
	 * @returns {Promise}
	 */
	connectToDota() {
		return new Promise((fulfill, reject) => {
			this.dota.client.on("ready", () => {
				this._log("Connected to the Dota game coordinator!", "DOTA");

				fulfill();
			});

			this.dota.client.launch();
		});
	}

	/**
	 * Logs in Steam with the provided details.
	 * @param details
	 * @param {string} details.username The steam account's username
	 * @param {string} details.password The steam account's password
	 * @param {string} [details.steam_guard_code] If present, will log in with the Steam guard code.
	 * @param {Buffer} [details.sentry_file] If present, will log in with the sentry file.
	 * @return {Promise}
	 */
	logIn(details) {
		return new Promise((fulfill, reject) => {
			let logOnDetails = {};

			logOnDetails.account_name = details.username;
			logOnDetails.password = details.password;

			if (details.sentry_file) {
				logOnDetails.sha_sentryfile = details.sentry_file;
				this._log("Logging in with the database's sentry file...");
			}

			if (details.steam_guard_code) {
				logOnDetails.auth_code = details.steam_guard_code;
				db.deleteSteamGuardCode(this.id).then(() => {
					this._log("Steam Guard code was used, and therefore deleted from the database");
				});
			}

			this.steam.user.logOn(logOnDetails);

			this.steam.client.on("logOnResponse", response => {
				if (response.eresult == Steam.EResult.OK) {
					this._log("Successfully logged in!");

					this.steam.friends.setPersonaState(Steam.EPersonaState.Online);
					this.steam.friends.setPersonaName(getCfgValue("steam.name") + ` #${this.id}`);
					this.steam.user.gamesPlayed([{
						game_id: 570
					}]); // Appear as playing Dota 2

					fulfill();
				} else {
					let err = new Error(this.prefix.replace("SECTION", "STEAM")
						+ " Login failed. Re-check your credentials.");
					err.steamResponse = response;
					err.message += `\n\nError code: ${response.eresult}.`
						+ "\nYou may check what it means here: https://steamerrors.com/";
					reject(err);
				}
			});
		});
	}

	/**
	 * @param {string} msg
	 * @param {string} [logSection="STEAM"]
	 * @private
	 */
	_log(msg, logSection = "STEAM") {
		console.log(this.prefix.replace("SECTION", logSection) + " " + msg);
	}

	/**
	 * @param {string} msg
	 * @param {string} [logSection="STEAM"]
	 * @private
	 */
	_logErr(msg, logSection = "STEAM") {
		console.error(this.prefix.replace("SECTION", logSection) + " Error: " + msg);
	}

}

module.exports = SteamBot;