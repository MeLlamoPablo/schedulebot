"use strict";

const ECreateLobbyError = require("../../structures/enums/ECreateLobbyError")
	, ECloseLobbyError  = require("../../structures/enums/ECloseLobbyError")
;

/**
 * @typedef {object} InhouseProps
 * @property {string} gameMode    See commands/general/add-inhouse for possible values.
 * @property {string} server      See commands/general/add-inhouse for possible values.
 * @property {string} autoBalance See commands/general/add-inhouse for possible values.
 */

/**
 * This class allows the rest of the app to interact with dota bots.
 *
 * @property {SteamBot[]} bots An array with all steam bots.
 */
class DotaHandler {

	/**
	 * @param {SteamBot[]} bots
	 */
	constructor (bots) {
		this.bots = bots;
	}

	/**
	 * Looks for an available bot and creates a lobby with the given properties.
	 * @param {InhouseProps} inhouseProps
	 * @returns {Promise<number>} Resolves with the id of the bot hosting the lobby.
	 *                            Rejects with an error. The handler must check whether or not the
	 *                            rejected error contains an ECreateLobbyError property, and handle
	 *                            those accordingly. If it doesn't, then the error is Steam or
	 *                            Dota's fault
	 */
	createLobby(inhouseProps) {
		return new Promise((fulfill, reject) => {
		    let client = this._getAvailableDotaClient();

		    if (client === null) {
		    	let err = new Error();
		    	err.ECreateLobbyError = ECreateLobbyError.NO_AVAILABLE_BOT;
		    	return reject(err);
			}

			client.createLobby(inhouseProps).then(() => {
		    	fulfill(client.botId);
			}).catch(reject);
		});
	}

	/**
	 * @param {number} botID botID The id of the bot hosting the lobby.
	 * @returns {Promise}
	 */
	forceLobbyStart(botID) {
		return new Promise((fulfill, reject) => {
			let client = this._getDotaClientById(botID);

			if (client !== null) {
				client.forceStart().then(fulfill).catch(reject);
			} else {
				reject(new Error(`The specified bot with ID ${botID} doesn't exist.`));
			}
		});
	}

	/**
	 * Closes a lobby. This makes the current lobby be null, makes the bot leave the lobby, and
	 * executes ScheduledEvent.setLobbyStatus();
	 * @param {number} botID botID The id of the bot hosting the lobby.
	 * @param {boolean} [force=false] Force close the lobby. If true, it will be closed immediately.
	 *                                If false, the bot will wait 30 seconds, just in case.
	 * @returns {Promise<number>} Resolves with void.
	 *                            Rejects with an error. The handler must check whether or not the
	 *                            rejected error contains an ECloseLobbyError property, and handle
	 *                            those accordingly. If it doesn't, then the error is Steam or
	 *                            Dota's fault
	 */
	closeLobby(botID, force = false) {
		return new Promise((fulfill, reject) => {
			let client = this._getDotaClientById(botID);

			if (client !== null) {
				if (client.inLobby()) {
					client.closeLobby(force).then(fulfill).catch(reject);
				} else {
					let err = new Error();
					err.ECloseLobbyError = ECloseLobbyError.BOT_NOT_IN_LOBBY;
					return reject(err);
				}
			} else {
				reject(new Error(`The specified bot with ID ${botID} doesn't exist.`));
			}
		});
	}

	/**
	 * Invites an user to the bot's current lobby based on their Discord ID
	 *
	 * @param {number} botID The id of the bot hosting the lobby.
	 * @param {string} discordID The discord id of the user to invite.
	 * @return {Promise}
	 */
	invite(botID, discordID) {
		return new Promise((fulfill, reject) => {
			let client = this._getDotaClientById(botID);

			if (client !== null) {
				if (client.inLobby()) {
					client.invite(discordID).then(fulfill).catch(reject);
				} else {
					reject(new Error(`The bot with ID ${botID} is not in a lobby.`));
				}
			} else {
				reject(new Error(`The specified bot with ID ${botID} doesn't exist.`));
			}
		});
	}

	/**
	 * @param {number} botID botID The id of the bot hosting the lobby.
	 * @returns {LobbyDetails|null} The LobbyDetails object, or null if the bot is not in a lobby.
	 *
	 * @typedef {object} LobbyDetails
	 * @property {string} name
	 * @property {string} password
	 */
	getLobbyDetails(botID) {
		let client = this._getDotaClientById(botID);

		if (client !== null) {
			if (client.inLobby()) {
				return {
					name: client.currentLobby.name,
					password: client.currentLobby.password
				};
			} else {
				return null;
			}
		} else {
			throw new Error(`The bot with ID ${botID} doesn't exist.`);
		}
	}

	/**
	 * @param {number} botID botID The id of the bot hosting the lobby.
	 * @returns {boolean} Whether or not the requested bot is in a lobby.
	 */
	isBotInLobby(botID) {
		let client = this._getDotaClientById(botID);

		if (client !== null) {
			return client.inLobby();
		} else {
			throw new Error(`The bot with ID ${botID} doesn't exist.`);
		}
	}

	/**
	 * @returns {DotaClientX|null} An available DotaClientX or null if none is available.
	 * @private
	 */
	_getAvailableDotaClient() {
		for (let i = 0; i < this.bots.length; i++) {
			let bot = this.bots[i];

			if (!bot.dota.client.inLobby()) {
				return bot.dota.client;
			}
		}

		return null;
	}

	/**
	 * @param {number} id The SteamBot id.
	 * @returns {DotaClientX|null} The requested DotaClientX or null if it doesn't exist.
	 * @private
	 */
	_getDotaClientById(id) {
		let bot = this.bots.find(el => el.id === id);
		return bot ? bot.dota.client : null;
	}
}

module.exports = DotaHandler;