"use strict";

const cfg   = require("../../modules/confighandler/getValue")
	, db    = require("../dbhandler")
	, Dota2 = require("dota2")
;

// ENUMS
const EServerRegion     = Dota2.ServerRegion
	, ESeriesType       = Dota2.SeriesType
	, EGameMode         = Dota2.schema.lookupEnum("DOTA_GameMode")
	, EGameVersion      = Dota2.schema.lookupEnum("DOTAGameVersion")
	, ECMPick           = Dota2.schema.lookupEnum("DOTA_CM_PICK")
	, EDotaTVDelay      = Dota2.schema.lookupEnum("LobbyDotaTVDelay")
	, EChatChannelType  = Dota2.schema.lookupEnum("DOTAChatChannelType_t")
	, ELobbyStatus      = require("../../structures/enums/ELobbyStatus")
;

/**
 * @class DotaClientX
 * @extends Dota2Client
 *
 * DotaClientX is an extended Dota2Client class that contains the currentLobby property,
 * and helper methods
 *
 * @property {number}              botId
 * @property {object}              currentLobby
 * @property {string|null}         currentLobby.name
 * @property {string|null}         currentLobby.password
 * @property {ScheduledEvent|null} currentLobby.event
 * @property {string|null}         currentLobby.chatChannel
 * @property {boolean}             currentLobby.starting
 * @property {boolean}             currentLobby.enoughPeople
 * @property {boolean}             currentLobby.autoBalance
 * @property {boolean}             currentLobby.matchIdSaved
 */
class DotaClientX extends Dota2.Dota2Client {

	constructor(steamClient, botId, debug = false, debugMore = false) {
		super(steamClient, debug, debugMore);

		this.botId = botId;

		this._setCurrentLobbyDefaultValues();

		this.on("practiceLobbyUpdate", lobby => {
			this.currentLobby.chatChannel = "Lobby_" + lobby.lobby_id;

			let people = lobby.members.filter(e => {
				// e.team: 0 - Radiant
				//         1 - Dire
				//         2 - Casters    |
				//         3 - Coaches    |-> Filter out these
				//         4 - Unassigned |
				return e.team === 0 || e.team === 1
			}).length;

			if (!cfg("dota.disable_autostart") && !this.currentLobby.starting) {
				this.sendMessageToLobby(DotaClientX.generateStatusMessage(people));
			}

			this.currentLobby.enoughPeople = (people >= 10);
			if (!cfg("dota.disable_autostart") &&
				this.currentLobby.enoughPeople &&
				!this.currentLobby.starting) {
				this.start();
			}

			if (lobby.match_id > 0 && cfg("dota.ticketing.enabled")) {
				if (!this.currentLobby.matchIdSaved && this.currentLobby.event !== null) {
					db.events.updateDotaMatchId(this.currentLobby.event, lobby.match_id.toString())
						.then(() => {
							this.currentLobby.matchIdSaved = true
						}).catch(console.error);
				}
			}
		});
	}

	createLobby(inhouseProps) {
		return new Promise((fulfill, reject) => {
			this.leavePracticeLobby(); // Removing this line would randomly cause error 2.

			this.currentLobby.event = inhouseProps.event;
			this.currentLobby.name = inhouseProps.event.name;
			this.currentLobby.password = DotaClientX.generatePassword();
			this.currentLobby.autoBalance = inhouseProps.autoBalance;

			let server;

			switch (inhouseProps.server) {
				case "uswest":
					server = EServerRegion.USWEST;
					break;
				case "useast":
					server = EServerRegion.USEAST;
					break;
				case "luxembourg":
					server = EServerRegion.EUROPE;
					break;
				case "australia":
					server = EServerRegion.AUSTRALIA;
					break;
				case "stockholm":
					server = EServerRegion.STOCKHOLM;
					break;
				case "singapore":
					server = EServerRegion.SINGAPORE;
					break;
				case "dubai":
					server = EServerRegion.DUBAI;
					break;
				case "austria":
					server = EServerRegion.AUSTRIA;
					break;
				case "brazil":
					server = EServerRegion.BRAZIL;
					break;
				case "southafrica":
					server = EServerRegion.SOUTHAFRICA;
					break;
				case "chile":
					server = EServerRegion.CHILE;
					break;
				case "peru":
					server = EServerRegion.PERU;
					break;
				case "india":
					server = EServerRegion.INDIA;
					break;
				case "japan":
					server = EServerRegion.JAPAN;
					break;
				default:
					return reject(new Error("Unknown server " + inhouseProps.server));
			}

			let gamemode; let cmpick = ECMPick.DOTA_CM_RANDOM;

			switch (inhouseProps.gameMode) {
				case "captainsmode":
					gamemode = EGameMode.DOTA_GAMEMODE_CM;

					switch (inhouseProps.cmPick) {
						case "radiant":
							cmpick = ECMPick.DOTA_CM_GOOD_GUYS;
							break;
						case "dire":
							cmpick = ECMPick.DOTA_CM_BAD_GUYS;
							break;
					}

					break;
				case "allpick":
					gamemode = EGameMode.DOTA_GAMEMODE_AP;
					break;
				case "captainsdraft":
					gamemode = EGameMode.DOTA_GAMEMODE_CD;
					break;
				case "randomdraft":
					gamemode = EGameMode.DOTA_GAMEMODE_RD;
					break;
				case "singledraft":
					gamemode = EGameMode.DOTA_GAMEMODE_SD;
					break;
				case "allrandom":
					gamemode = EGameMode.DOTA_GAMEMODE_AR;
					break;
				case "rankedallpick":
					gamemode = EGameMode.DOTA_GAMEMODE_ALL_DRAFT;
					break;
				default:
					return reject(new Error("Unknown game mode " + inhouseProps.gameMode));
			}

			let options = {
				"game_name": this.currentLobby.name,
				"server_region": server,
				"game_mode": gamemode,
				"game_version": EGameVersion.GAME_VERSION_CURRENT,
				"series_type": ESeriesType.NONE,
				"cm_pick": cmpick,
				"allow_cheats": false,
				"fill_with_bots": false,
				"allow_spectating": true,
				"pass_key": this.currentLobby.password,
				"radiant_series_wins": 0,
				"dire_series_wins": 0,
				"allchat": false,
				"dota_tv_delay": EDotaTVDelay.LobbyDotaTV_120,
			};

			if (cfg("dota.ticketing.enabled")) {
				options.leagueid = cfg("dota.ticketing.league_id");
			}

			this.createPracticeLobby(
				this.currentLobby.password,
				options,
				err => {
					if (!err) {
						this._log("Created lobby " + this.currentLobby.name);

						// For some reason the bot automatically joins the first slot. Kick him.
						this.practiceLobbyKickFromTeam(this.AccountID, err => {
							if (err) {
								reject(new Error("Couldn't kick the bot from the game slot."));
							}
						});

						this.inviteAll().catch(reject);
						fulfill();
					} else {
						reject(new Error("[DOTA] Error creating lobby - Error code: " + err
						+ "\nList of error codes: https://github.com/Arcana/node-dota2/blob/86f02" +
							"0e01dba86af3ec02323a8325243b8d9d0c2/handlers/helper.js#L5\n\n" +

							"If you're getting error 2, make sure that your Steam account's " +
							"email is verified, and launch dota from your bot's account, then " +
							"manually create a lobby."));
					}
				}
			);
		});
	}

	sendMessageToLobby(message) {
		this.joinChat(
			this.currentLobby.chatChannel,
			EChatChannelType.DOTAChannelType_Lobby
		);

		this.sendMessage(
			/*channel*/ this.currentLobby.chatChannel,
			/*message*/ message,
			/*channel_type*/ EChatChannelType.DOTAChannelType_Lobby
		);
	}

	start() {
		return new Promise((fulfill, reject) => {
			this.currentLobby.starting = true;

			if (this.currentLobby.autoBalance) {
				this.balancedShuffleLobby();
				this.sendMessageToLobby("Teams were automatically balanced.");
			}

			let remainingSeconds = 10;
			let self = this;

			(function tick() {
				if (self.currentLobby.enoughPeople) {
					if (remainingSeconds > 0) {
						self.sendMessageToLobby("Starting in " + remainingSeconds + " seconds.");
						setTimeout(tick, 1000);
						remainingSeconds--;
					} else {
						self.launchPracticeLobby();
						self.closeLobby().then(fulfill).catch(reject);
					}
				} else {
					self.sendMessageToLobby("Aborting start: someone left.");
					self.starting = false;
				}
			})();
		});
	}

	forceStart() {
		return new Promise((fulfill, reject) => {
			this.sendMessageToLobby("Game start was forced");
			this.currentLobby.starting = true;

			if (this.autoBalance) {
				this.balancedShuffleLobby();
				this.sendMessageToLobby("Teams were automatically balanced.");
			}

			let remainingSeconds = 10;
			let self = this;

			(function tick() {
				if (remainingSeconds > 0) {
					self.sendMessageToLobby("Starting in " + remainingSeconds + " seconds.");
					setTimeout(tick, 1000);
					remainingSeconds--;
				} else {
					self.launchPracticeLobby();
					self.closeLobby().then(fulfill).catch(reject);
				}
			})();
		});
	}

	/**
	 * Invites an user to the current lobby based on their Discord ID
	 *
	 * @param {string} discordID
	 * @return {Promise}
	 */
	invite(discordID) {
		return new Promise((fulfill, reject) => {
			db.users.getByDiscord(discordID).then(user => {
				this.inviteToLobby(user.steam_id);
				this._log("Sent an invite to user with Discord ID " + discordID + " and " +
					"Steam ID " + user.steam_id + " to lobby " + this.currentLobby.name);
				fulfill();
			}).catch(reject);
		});
	}

	/**
	 * Sends an invite to every user who has confirmed attendance to the current lobby's event.
	 * @return {Promise}
	 */
	inviteAll() {
		return new Promise((fulfill, reject) => {
			this.currentLobby.event.getConfirms().then(people => {
				let pendingInvites = [];

				for (let i = 0; i < people.confirmed.length; i++) {
					let discordID = people.confirmed[i].user;

					pendingInvites.push(this.invite(discordID));
				}

				Promise.all(pendingInvites).then(fulfill).catch(reject);
			}).catch(reject);
		});
	}

	/**
	 * Closes a lobby. This makes the current lobby be null, makes the bot leave the lobby, and
	 * executes ScheduledEvent.setLobbyStatus();
	 * @param {boolean} force Force close the lobby. If true, it will be closed immediately. If
	 *                        false, the bot will wait 30 seconds, just in case.
	 * @return {Promise}
	 */
	closeLobby(force = false) {
		return new Promise((fulfill, reject) => {
			setTimeout(() => {
				this.sendMessageToLobby("The lobby was closed. See you!");
				this._log("Closed lobby " + this.currentLobby.name);
				this.leavePracticeLobby();

				this.currentLobby.event.setLobbyStatus(ELobbyStatus.CLOSED)
					.then(fulfill).catch(reject);

				this._setCurrentLobbyDefaultValues();
			}, force ? 0 : 30000);
		});
	}

	/**
	 * @returns {boolean} Whether or not the client is currently in a lobby.
	 */
	inLobby() {
		return !!this.currentLobby.name;
	}

	static generateStatusMessage(people) {
		return "Hello! The game will autostart when 10 people join. (We need " + (10 - people)
			+ " more). To force a start, tell an admin to run the command force-lobby-start in" +
			" Discord.";
	}

	static generatePassword() {
		let code = "";

		// Omitted characters that can look like others
		let possibleChars = ["B", "D", "E", "F", "G", "H", "C", "J", "K", "L", "M", "N", "P", "Q",
			"R", "S", "T", "W", "X", "Y","Z", "2", "3", "5", "6", "7", "8", "9"];

		for (let i = 0; i < 20; i++) {
			code += possibleChars[
				Math.floor(Math.random() * possibleChars.length)
				];
		}

		return code;
	}

	_setCurrentLobbyDefaultValues() {
		this.currentLobby = {};

		this.currentLobby.name = null;
		this.currentLobby.password = null;
		this.currentLobby.event = null;
		this.currentLobby.chatChannel = null;
		this.currentLobby.starting = false;
		this.currentLobby.enoughPeople = false;
		this.currentLobby.autoBalance = false;
		this.currentLobby.matchIdSaved = false;
	}

	_log(msg) {
		console.log(`[BOT #${this.botId}] [DOTA] ${msg}`);
	}

}

module.exports = DotaClientX;