const db    = require("../dbhandler")
	, Dota2 = require("dota2");

class DotaHandler {

	constructor(dotaClient) {
		this.client = dotaClient;
		this.starting = false;

		this.client.on("practiceLobbyUpdate", lobby => {
			this.currentLobbyChatChannel = "Lobby_" + lobby.lobby_id;

			let people = lobby.members.filter(e => {
				return e.slot !== 0 && e.slot !== null
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

			let server;

			switch (inhouseProps.server) {
				case "uswest":
					server = Dota2.ServerRegion.USWEST;
					break;
				case "useast":
					server = Dota2.ServerRegion.USEAST;
					break;
				case "luxembourg":
					server = Dota2.ServerRegion.EUROPE;
					break;
				case "australia":
					server = Dota2.ServerRegion.AUSTRALIA;
					break;
				case "stockholm":
					server = Dota2.ServerRegion.STOCKHOLM;
					break;
			}

			let gamemode;

			switch (inhouseProps.gameMode) {
				case "captainsmode":
					gamemode = Dota2.schema.DOTA_GameMode.DOTA_GAMEMODE_CM;
					break;
				case "allpick":
					gamemode = Dota2.schema.DOTA_GameMode.DOTA_GAMEMODE_AP;
					break;
			}

			this.client.createPracticeLobby(
				this.currentLobbyPassword,
				{
					"game_name": this.currentLobbyName,
					"server_region": server,
					"game_mode": gamemode,
					"game_version": Dota2.schema.DOTAGameVersion.GAME_VERSION_STABLE,
					"series_type": Dota2.SeriesType.NONE,
					"cm_pick": Dota2.schema.DOTA_CM_PICK.DOTA_CM_RANDOM,
					"allow_cheats": false,
					"fill_with_bots": false,
					"allow_spectating": true,
					"pass_key": this.currentLobbyPassword,
					"radiant_series_wins": 0,
					"dire_series_wins": 0,
					"allchat": false,
					"dota_tv_delay": Dota2.schema.LobbyDotaTVDelay.LobbyDotaTV_120
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
			Dota2.schema.DOTAChatChannelType_t.DOTAChannelType_Lobby
		);

		this.client.sendMessage(
			/*channel*/ this.currentLobbyChatChannel,
			/*message*/ message,
			/*channel_type*/ Dota2.schema.DOTAChatChannelType_t.DOTAChannelType_Lobby
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
						self.currentLobbyEvent.setLobbyEnded().then(fulfill).catch(reject);
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

			let remainingSeconds = 10;
			let self = this;

			(function tick() {
				if (remainingSeconds > 0) {
					self.sendMessageToLobby("Starting in " + remainingSeconds + " seconds.");
					setTimeout(tick, 1000);
					remainingSeconds--;
				} else {
					self.client.launchPracticeLobby();
					self.currentLobbyEvent.setLobbyEnded().then(fulfill).catch(reject);
				}
			})();
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