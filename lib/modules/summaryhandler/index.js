"use strict";

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
			event.getConfirms().then(people => {
				var summary = "";
				var status = event.getStatus();

				summary += "Summary for **" + event.name + "** (`#" + event.id + "`):\n\n"

					+ "The event " + (status === "expired" ? "was" : "is") + " scheduled for `"
					+ event.time.format("dddd, MMMM Do YYYY, HH:mm")
					+ " (" + event.time._z.name + ")`.\n";

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

				summary += "**Will attend** ("
					+ people.confirmed.length + "/" + event.limit + "):\n\n";
				if (people.confirmed.length > 0) {
					for (var i = 0; i < people.confirmed.length; i++) {
						summary += "- <@" + people.confirmed[i] + ">\n";
					}
				} else {
					summary +=  "- None yet.\n";
				}

				summary += "\n**Will not attend**:\n\n";
				if (people.rejected.length > 0) {
					for (i = 0; i < people.rejected.length; i++) {
						summary += "- <@" + people.rejected[i] + ">\n";
					}
				} else {
					summary +=  "- None yet.\n";
				}

				if (people.waiting.length > 0) {
					summary += "\n**Waiting to confirm**:\n\n";

					for (i = 0; i < people.waiting.length; i++) {
						summary += "- <@" + people.waiting[i] + ">\n";
					}
				}

				summary += "\nTo confirm your attendance, type `@ScheduleBot confirm " + event.id
					+ "`. To deny your attendance, type `@ScheduleBot confirm " +
					event.id  + " no`\n";

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
						var getMsgPromise = this.masterChannel.fetchMessage(msgId);
						var getSummaryPromise = SummaryHandler.generateSummary(event);

						Promise.all([getMsgPromise, getSummaryPromise]).then(values => {
							var message = values[0];
							var summary = values[1];

							message.edit(summary).then(msg => {
								if (!msg.pinned) {
									msg.pin().then(() => {
										fulfill(msg.id);
									}, reject);
								} else {
									fulfill(msg.id);
								}
							}, reject);
						}, reject);

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