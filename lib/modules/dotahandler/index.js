const db           = require("../dbhandler")
	, Dota2        = require("dota2")
	, ELobbyStatus = require("../../structures/enums/ELobbyStatus")
;

// ENUMS
const EServerRegion     = Dota2.ServerRegion
	, ESeriesType       = Dota2.SeriesType
	, EGameMode         = Dota2.schema.lookupEnum("DOTA_GameMode")
	, EGameVersion      = Dota2.schema.lookupEnum("DOTAGameVersion")
	, ECMPick           = Dota2.schema.lookupEnum("DOTA_CM_PICK")
	, EDotaTVDelay      = Dota2.schema.lookupEnum("LobbyDotaTVDelay")
	, EChatChannelType  = Dota2.schema.lookupEnum("DOTAChatChannelType_t")
;

class DotaHandler {

	constructor(dotaClient) {
		this.client = dotaClient;

		this.currentLobbyName = null;
		this.currentLobbyPassword = null;
		this.currentLobbyChatChannel = null;
		this.starting = false;
		this.enoughPeople = false;

		this.client.on("practiceLobbyUpdate", lobby => {
			this.currentLobbyChatChannel = "Lobby_" + lobby.lobby_id;

			let people = lobby.members.filter(e => {
				// e.team: 0 - Radiant
				//         1 - Dire
				//         2 - Casters    |
				//         3 - Coaches    |-> Filter out these
				//         4 - Unassigned |
				return e.team === 0 || e.team === 1
			}).length;

			if (!this.starting) {
				this.sendMessageToLobby(DotaHandler.generateStatusMessage(people));
			}

			this.enoughPeople = (people >= 10);
			if (this.enoughPeople && !this.starting) {
				this.start();
			}
		});
	}

	createLobby(inhouseProps) {
		return new Promise((fulfill, reject) => {
			this.client.leavePracticeLobby();

			this.currentLobbyEvent = inhouseProps.event;
			this.currentLobbyName = inhouseProps.event.name;
			this.currentLobbyPassword = DotaHandler.generatePassword();
			this.autoBalance = inhouseProps.autoBalance;

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

			let gamemode;

			switch (inhouseProps.gameMode) {
				case "captainsmode":
					gamemode = EGameMode.DOTA_GAMEMODE_CM;
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

			// TODO make this work
			// Can't continue working until https://github.com/Arcana/node-dota2/issues/414
			// is resolved.
			this.client.createTournamentLobby(
				this.currentLobbyPassword,
				/*tournament_game_id*/ 123456789,
				/*tournament_id*/ 4187, /*https://es.dotabuff.com/esports/leagues/4187*/
				{
					"game_name": this.currentLobbyName,
					"server_region": server,
					"game_mode": gamemode,
					"game_version": EGameVersion.GAME_VERSION_STABLE,
					"series_type": ESeriesType.NONE,
					"cm_pick": ECMPick.DOTA_CM_RANDOM,
					"allow_cheats": false,
					"fill_with_bots": false,
					"allow_spectating": true,
					"pass_key": this.currentLobbyPassword,
					"radiant_series_wins": 0,
					"dire_series_wins": 0,
					"allchat": false,
					"dota_tv_delay": EDotaTVDelay.LobbyDotaTV_120
				},
				err => {
					if (!err) {
						console.log("[DOTA] Created lobby " + this.currentLobbyName);

						// For some reason the bot automatically joins the first slot. Kick him.
						this.client.practiceLobbyKickFromTeam(this.client.AccountID, err => {
							if (err) {
								reject(new Error("Couldn't kick the bot from the game slot."));
							}
						});

						this.inviteAll();
						fulfill();
					} else {
						reject(new Error("[DOTA] Error creating lobby - Error code: " + err));
					}
				}
			);
		});
	}

	sendMessageToLobby(message) {
		this.client.joinChat(
			this.currentLobbyChatChannel,
			EChatChannelType.DOTAChannelType_Lobby
		);

		this.client.sendMessage(
			/*channel*/ this.currentLobbyChatChannel,
			/*message*/ message,
			/*channel_type*/ EChatChannelType.DOTAChannelType_Lobby
		);
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
				this.client.inviteToLobby(user.steam_id);
				console.log("[DOTA] Sent an invite to user with Discord ID " + discordID + " and " +
					"Steam ID " + user.steam_id + " to lobby " + this.currentLobbyName);
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
			this.currentLobbyEvent.getConfirms().then(people => {
				let pendingInvites = [];

				for (let i = 0; i < people.confirmed.length; i++) {
					let discordID = people.confirmed[i];

					pendingInvites.push(this.invite(discordID));
				}

				Promise.all(pendingInvites).then(fulfill).catch(reject);
			}).catch(reject);
		});
	}

	start() {
		return new Promise((fulfill, reject) => {
			this.starting = true;

			if (this.autoBalance) {
				this.client.balancedShuffleLobby();
				this.sendMessageToLobby("Teams were automatically balanced.");
			}

			let remainingSeconds = 10;
			let self = this;

			(function tick() {
				if (self.enoughPeople) {
					if (remainingSeconds > 0) {
						self.sendMessageToLobby("Starting in " + remainingSeconds + " seconds.");
						setTimeout(tick, 1000);
						remainingSeconds--;
					} else {
						self.client.launchPracticeLobby();
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
			this.starting = true;

			try {
				if (this.autoBalance) {
					this.client.balancedShuffleLobby();
					this.sendMessageToLobby("Teams were automatically balanced.");
				}
			} catch (e) {
				console.error(e);
			}


			let remainingSeconds = 10;
			let self = this;

			(function tick() {
				if (remainingSeconds > 0) {
					self.sendMessageToLobby("Starting in " + remainingSeconds + " seconds.");
					setTimeout(tick, 1000);
					remainingSeconds--;
				} else {
					self.client.launchPracticeLobby();
					self.closeLobby().then(fulfill).catch(reject);
				}
			})();
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
				console.log("[DOTA] Closed lobby " + this.currentLobbyName);

				this.currentLobbyName = null;
				this.currentLobbyPassword = null;
				this.currentLobbyChatChannel = null;
				this.starting = false;
				this.enoughPeople = false;
				this.client.leavePracticeLobby();
				this.currentLobbyEvent.setLobbyStatus(ELobbyStatus.CLOSED)
					.then(fulfill).catch(reject);
			}, force ? 0 : 30000);
		});
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

}

module.exports = DotaHandler;