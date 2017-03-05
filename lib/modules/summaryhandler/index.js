const getCfgVal = require("../../modules/confighandler/getValue");
const ELobbyStatus = require("../../structures/enums/ELobbyStatus");

"use strict";

/**
 * @class SummaryHandler
 * @property {Discord.Client} bot
 * @property {Discord.Channel} masterChannel
 */
class SummaryHandler {

	/**
	 * @param {Discord.Client}  bot
	 * @param {Discord.Channel} masterChannel
	 */
	constructor(bot, masterChannel) {
		this.bot = bot;
		this.masterChannel = masterChannel;
	}

	/**
	 * @param {ScheduledEvent} event
	 *
	 * @return {Promise<string>} Resolves on success with the summary, or rejects with the error.
	 */
	static generateSummary(event) {
		return new Promise((fulfill, reject) => {
			let getConfirmsPromise = event.getConfirms();
			let getInhousePropsPromise = event.getInhouseProperties();
			let getLobbyStatusPromise = event.getLobbyStatus();
			let getMatchIdPromise = event.getMatchId();

			Promise.all([
				getConfirmsPromise,
				getInhousePropsPromise,
				getLobbyStatusPromise,
				getMatchIdPromise
			]).then(values => {
				let people = values[0];
				let inhouseProps = values[1];
				let lobbyStatus = values[2];
				let matchId = values[3];

				let summary = "";
				let status = event.getStatus();

				// This variable is used to know if the event has expired. If the event doesn't
				// have a lobby, this is simply true if status is "expired".
				// However, if the event does have a lobby, this is only true when the lobby is
				// also closed.
				// Furthermore, instant events begin as expired and no lobby associated. So
				// don't be true on that scenario either.
				let expired = (
					status === "expired"
					&&
					(
						(inhouseProps === null && !event.instant)
						||
						lobbyStatus === ELobbyStatus.CLOSED
					)
				);

				summary += "Summary for **" + event.name + "** (`#" + event.id + "`):\n\n";

				if (!event.instant) {
					summary += "The event " + (status === "expired" ? "was" : "is") + " scheduled" +
					" for `" + event.time.format("dddd, MMMM Do YYYY, HH:mm")
					+ " (" + event.time._z.name + ")`.\n";
				}

				if (inhouseProps === null) {
					if (!event.instant) {
						switch (status) {
							case "pending":
								summary += "That's " + event.time.fromNow() + ".\n\n";
								break;

							case "happening":
								summary += "The event is happening right now! Hurry up!\n\n";
								break;

							case "expired":
								summary += "The event has expired. Stay tuned for new events!\n\n";
								break;
						}
					} else {
						summary += `Waiting for the ${getCfgVal("dota.game_generic_name")} to be ` +
							`configured.\n\n`;
					}
				} else {
					switch (inhouseProps.gameMode) {
						case "captainsmode":
							inhouseProps.gameMode = "Captains Mode";

							switch (inhouseProps.cmPick) {
								case "radiant":
									inhouseProps.cmPick = "Radiant";
									break;
								case "dire":
									inhouseProps.cmPick = "Dire";
									break;
								case "random":
									inhouseProps.cmPick = "Random";
									break;
							}

							break;
						case "allpick":
							inhouseProps.gameMode = "All Pick";
							break;
						case "captainsdraft":
							inhouseProps.gameMode = "Captains Draft";
							break;
						case "randomdraft":
							inhouseProps.gameMode = "Random Draft";
							break;
						case "singledraft":
							inhouseProps.gameMode = "Single Draft";
							break;
						case "allrandom":
							inhouseProps.gameMode = "All Random";
							break;
						case "rankedallpick":
							inhouseProps.gameMode = "Ranked All Pick";
							break;
					}

					switch (inhouseProps.server) {
						case "uswest":
							inhouseProps.server = "US West";
							break;
						case "useast":
							inhouseProps.server = "US East";
							break;
						case "luxembourg":
							inhouseProps.server = "Luxembourg";
							break;
						case "australia":
							inhouseProps.server = "Australia";
							break;
						case "stockholm":
							inhouseProps.server = "Stockholm";
							break;
						case "singapore":
							inhouseProps.server = "Singapore";
							break;
						case "dubai":
							inhouseProps.server = "Dubai";
							break;
						case "austria":
							inhouseProps.server = "Austria";
							break;
						case "brazil":
							inhouseProps.server = "Brazil";
							break;
						case "southafrica":
							inhouseProps.server = "South Africa";
							break;
						case "chile":
							inhouseProps.server = "Chile";
							break;
						case "peru":
							inhouseProps.server = "Peru";
							break;
						case "india":
							inhouseProps.server = "India";
							break;
						case "japan":
							inhouseProps.server = "Japan";
							break;
					}

					inhouseProps.autoBalance = inhouseProps.autoBalance ? "Enabled" : "Disabled";

					switch (status) {
						case "pending":
							summary += "That's " + event.time.fromNow() + ".\n\n";
							break;

						case "happening":
						case "expired":
							switch (lobbyStatus) {
								case ELobbyStatus.NOT_CREATED:
									summary += "The lobby will be created soon. Please wait.";
									break;
								case ELobbyStatus.CREATED:
									summary += "The lobby is up! If you haven't got an invite, run"
										+ " the command `resend-invite " + event.id + "`.";
									break;
								case ELobbyStatus.CLOSED:
									summary += "The lobby for this event is closed.";

									if (matchId) {
										summary += ` Match ID: \`${matchId}\``;
									}

									break;
								case ELobbyStatus.NO_AVAILABLE_BOT:
									summary += "All Steam bots are currently busy. Please wait " +
										"until one becomes free, or talk to an admin.";
									break;
							}

							summary += "\n\n";

							break;
					}

					summary += "**Lobby details**\n\n" +

						"- Game mode: *" + inhouseProps.gameMode + "*\n" +
							(inhouseProps.gameMode !== "Captains Mode" ? "" :
							"- First pick: *" + inhouseProps.cmPick + "*\n") +
						"- Server: *" + inhouseProps.server + "*\n" +
						"- Automatic team balance: *" + inhouseProps.autoBalance + "*\n\n";
				}

				summary += `**${!expired ? "Will attend" : "Did attend"}** (`
					+ people.confirmed.length + "/" + event.limit + "):\n\n";
				if (people.confirmed.length > 0) {
					for (let i = 0; i < people.confirmed.length; i++) {
						summary += "- <@" + people.confirmed[i].user + ">";

						if (getCfgVal("dota.mmr.enabled")) {
							summary += ` | \`${people.confirmed[i].solo_mmr || "Unknown"} MMR\``;
						}

						summary += "\n";
					}
				} else {
					summary +=  "- None yet.\n";
				}

				summary += `\n**${!expired ? "Will not attend" : "Did not attend"}**:\n\n`;
				if (people.rejected.length > 0) {
					for (let i = 0; i < people.rejected.length; i++) {
						summary += "- <@" + people.rejected[i].user + ">";

						if (getCfgVal("dota.mmr.enabled")) {
							summary += ` | \`${people.rejected[i].solo_mmr || "Unknown"} MMR\``;
						}

						summary += "\n";
					}
				} else {
					summary +=  "- None yet.\n";
				}

				if (people.waiting.length > 0) {
					summary += "\n**Waiting to confirm**:\n\n";

					for (let i = 0; i < people.waiting.length; i++) {
						summary += "- <@" + people.waiting[i] + ">\n";
					}
				}

				if (!expired) {
					summary += "\nTo confirm your attendance, type `" + getCfgVal("readable_prefix")
						+ " confirm " + event.id + "`. To deny your attendance, type `"
						+ getCfgVal("readable_prefix") + " confirm " + event.id  + " no`\n";
				}

				fulfill(summary);
			}).catch(reject);
		});
	}

	/**
	 * Updates the summary message for a specific event, or creates one if there isn't any. If
	 * successful, also pins the message to the master channel.
	 *
	 * @param {ScheduledEvent} event
	 *
	 * @return {Promise<string>} Resolves with the generated message's id,
	 *                           or rejects with the error.
	 */
	updateSummary(event) {
		return new Promise((fulfill, reject) => {
			// First check whether or not the summary msg id exists
			event.getMsgId().then(
				msgId => {
					if (msgId === null) {

						// The summary message doesn't exist yet. Create it.
						SummaryHandler.generateSummary(event).then(
							summary => {
								this.masterChannel.sendMessage(summary).then(msg => {
									fulfill(msg.id);
								}, reject);
							}, reject
						);

					} else {

						// The summary message already exists. Update it.
						let getMsgPromise = this.masterChannel.fetchMessage(msgId);
						let getSummaryPromise = SummaryHandler.generateSummary(event);

						Promise.all([getMsgPromise, getSummaryPromise]).then(values => {
							let message = values[0];
							let summary = values[1];

							message.edit(summary).then(msg => {
								if (event.getStatus() === "expired") {
									// The event has expired, remove the pin
									if (msg.pinned) {
										msg.unpin().then(() => fulfill(msg.id)).catch(reject);
									}
								} else {
									// The event is still active, keep it pinned.
									if (!msg.pinned) {
										msg.pin().then(() => fulfill(msg.id)).catch(reject);
									}
								}
							}).catch(reject);
						}).catch(reject);

					}
				}, reject
			);
		});
	}

	/**
	 * Deletes the summary message for a specific event.
	 * @param {ScheduledEvent} event
	 * @return {Promise}
	 */
	deleteSummary(event) {
		return new Promise((fulfill, reject) => {
			event.getMsgId().then(msgId => {
				this.masterChannel.fetchMessage(msgId).then(message => {
					message.delete().then(() => {
						fulfill();
					}, reject);
				}, reject);
			}, reject);
		});
	}
}

module.exports = SummaryHandler;