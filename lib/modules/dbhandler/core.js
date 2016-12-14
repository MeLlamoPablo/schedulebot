"use strict";

const cfg            = require('../../../config.js');
const moment         = require('moment');
const db             = require('knex')({
	client: 'pg',
	connection: "postgres://" + cfg.db.user + ":" + cfg.db.password
				+ "@" + cfg.db.host + "/" + cfg.db.database + ""
});

const events = {
	/**
	 * Retrieves a single row from the events table
	 * @param {number} id              The row to get.
	 * @returns {Promise<eventObject>} Resolves with the event object if found, or null if it
	 *                                 doesn't exist, or rejects with the error.
	 *
	 * @typedef {Object} eventObject
	 * @property {number} id
	 * @property {string} name
	 * @property {number} time
	 */
	get: function(id) {
		return new Promise((fulfill, reject) => {
			db.select().from("events").where({
				id: id
			}).then(rows => {
				fulfill(rows[0] ||null);
			}, reject);
		});
	},

	/**
	 * Returns every active row in the events table, understanding by active every future event.
	 *
	 * @return {Promise<eventObject[]>}
	 */
	getAll: function() {
		return new Promise((fulfill, reject) => {
			db.select().from("events").then(fulfill).catch(reject);
		});
	},

	/**
	 * Returns every active row in the events table, understanding by active every future event.
	 *
	 * @return {Promise<eventObject[]>}
	 */
	getAllActive: function() {
		return new Promise((fulfill, reject) => {
			db.select().from("events").where(
				"time", ">", moment().unix()
			).then(fulfill, reject);
		});
	},

	/**
	 * Gets the summary message id for a specific event
	 *
	 * @param {number} eventId
	 * @return {Promise<string>} Resolves with the id, or rejects with the error.
	 */
	getSummaryMsgId: function(eventId) {
		return new Promise((fulfill, reject) => {
			db.select("summary_msg_id").from("events").where({
				id: eventId
			}).then(
				rows => {
					fulfill(rows[0] ? rows[0].summary_msg_id : null);
				}, reject
			);
		});
	},

	/**
	 * Gets the waiting users for the specified event
	 * @param {ScheduledEvent} event
	 * @return {Promise<string[]>} Resolves with an array containing the ID of every user, or null
	 *                             if the event was never linked to a role.
	 */
	getWaiting: function(event) {
		return new Promise((fulfill, reject) => {
			db("events").select("waiting").where({
				id: event.id
			}).then(rows => {
				fulfill(rows[0] ? rows[0].waiting : null);
			}).catch(reject);
		});
	},

	/**
	 * Gets the "lobby ended" property of a specific event.
	 * @param {ScheduledEvent} event
	 * @return {Promise<boolean>}
	 */
	getLobbyEnded: function(event) {
		return new Promise((fulfill, reject) => {
			db("events").select("lobby_ended").where({
				id: event.id
			}).then(rows => {
				fulfill(rows[0] ? rows[0].lobby_ended : null);
			}).catch(reject);
		});
	},

	/**
	 * Gets the inhouse properties for the specified event.
	 * @param {ScheduledEvent} event
	 * @return {Promise<object>} Resolves with the inhouse properties or null if no inhouse was
	 *                           added.
	 */
	getInhouse: function(event) {
		return new Promise((fulfill, reject) => {
			db("events").select("inhouse").where({
				id: event.id
			}).then(rows => {
				fulfill(rows[0].inhouse || null);
			}).catch(reject);
		});
	},

	/**
	 * Adds a single row into the events table.
	 * @param {string} name       The event's name.
	 * @param {number} timestamp  The event's time, in UNIX timestamp.
	 * @param {number} limit      The limit of people who can attend the event
	 * @returns {Promise<number>} Resolves with the row id in the table, or rejects with the
	 *                            error.
	 */
	add: function(name, timestamp, limit) {
		return new Promise((fulfill, reject) => {
			db.insert({
				name: name,
				time: timestamp,
				limit: limit
			}).into("events").returning("id").then(
				result => {
					fulfill(result[0]);
				}, reject
			);
		});
	},

	/**
	 * Adds or updates the inhouse information for an event
	 * @param {ScheduledEvent} event
	 * @param {object} inhouseProps
	 * @param {string} inhouseProps.gameMode
	 * @param {string} inhouseProps.server
	 * @return {Promise}
	 */
	addInhouse: function(event, inhouseProps) {
		return new Promise((fulfill, reject) => {
			db("events").update({
				inhouse: inhouseProps
			}).where({
				id: event.id
			}).then(fulfill).catch(reject);
		});
	},

	/**
	 * Updates the summary message id for a specific event in the events table.
	 * @param {number} eventId
	 * @param {string} msgId
	 * @return {Promise} Resolves on success, or rejects with the error.
	 */
	updateSummaryMsgId: function(eventId, msgId) {
		return new Promise((fulfill, reject) => {
			db("events").update({
				summary_msg_id: msgId
			}).where({
				id: eventId
			}).then(() => {
				fulfill();
			}, reject);
		});
	},

	/**
	 *
	 * @param {ScheduledEvent} event
	 * @param {string[]} waiting An array containing every waiting user's discord ID
	 * @return {Promise}
	 */
	updateWaiting: function(event, waiting) {
		return new Promise((fulfill, reject) => {
			db("events").update({
				waiting: JSON.stringify(waiting)
			}).where({
				id: event.id
			}).then(() => {
				fulfill();
			}).catch(reject);
		});
	},

	/**
	 * Updates the lobby_ended property of an event
	 *
	 * @param {ScheduledEvent} event
	 * @param {boolean} lobbyEnded
	 * @return {Promise}
	 */
	updateLobbyEnded: function(event, lobbyEnded) {
		return new Promise((fulfill, reject) => {
			db("events").update({
				lobby_ended: lobbyEnded
			}).where({
				id: event.id
			}).then(fulfill).catch(reject);
		});
	},

	/**
	 * Deletes a single event.
	 *
	 * @param {number} eventId
	 * @return {Promise}
	 */
	deleteEvent: function(eventId) {
		return new Promise((fulfill, reject) => {
			db("events").del().where({
				id: eventId
			}).then(fulfill, reject);
		});
	}
};

const confirms = {
	/**
	 * Gets a confirm for a specific user in a specific event.
	 * @param {ScheduledEvent}     event
	 * @param {Discord.User} user
	 * @returns {Promise<boolean>} Resolves on success with true if the user attends, false if they
	 *                             don't, null if the confirm doesn't exist, or rejects with the
	 *                             error.
	 */
	getByUser: function(event, user) {
		return new Promise((fulfill, reject) => {
			db.select().from("confirms").where({
				user: user.id,
				event: event.id
			}).then(
				rows => {
					fulfill(typeof rows[0].attends === "boolean" ? rows[0].attends : null);
				}, reject
			);
		});
	},

	/**
	 * Gets every confirm dor a specific event
	 * @param   {ScheduledEvent}     event
	 * @returns {Promise<confirm[]>} Resolves on success with the table rows, or with null if no
	 *                               confirms are found, or rejects with the error.
	 *
	 * @typedef  {Object}  confirm
	 * @property {number}  id
	 * @property {number}  event   The event id
	 * @property {string}  user    The user Discord's snowflake id. Should not be converted to
	 *                             number.
	 * @property {boolean} attends Whether or not the user will attend the event.
	 */
	getByEvent: function(event) {
		return new Promise((fulfill, reject) => {
			db.select().from("confirms").where({
				event: event.id
			}).then(
				rows => {
					fulfill(rows.length > 0 ? rows : null);
				}, reject
			);
		});
	},

	/**
	 * Adds a single row into the confirms table
	 * @param {Event}        event
	 * @param {Discord.User} user
	 * @param {boolean}      attends
	 * @returns {Promise}    Resolves on success, or rejects with the error.
	 */
	add: function(event, user, attends) {
		return new Promise((fulfill, reject) => {
			var deletePreviousThenAddPromise = new Promise((fulfill2, reject2) => {
				db.del().from("confirms").where({
					user: user.id,
					event: event.id
				}).then(() => {
					db.insert({
						event: event.id,
						user: user.id,
						attends: attends
					}).into("confirms").then(() => {
						fulfill2();
					}).catch(reject2);
				}).catch(reject2);
			});

			var deleteFromWaitingPromise = new Promise((fulfill2, reject2) => {
				events.getWaiting(event).then(waiting => {
					if (waiting !== null) {
						var index = waiting.indexOf(user.id);
						if (index !== -1) {
							waiting.splice(index, 1);
							events.updateWaiting(event, waiting).then(() => {
								fulfill2();
							}).catch(reject2);
						} else {
							fulfill2();
						}
					} else {
						fulfill2();
					}
				})
			});

			Promise.all([deletePreviousThenAddPromise, deleteFromWaitingPromise]).then(() => {
				fulfill();
			}).catch(reject);
		});
	},

	/**
	 * Deletes every confirm associated with a specific event.
	 *
	 * @param {number} eventId
	 * @return {Promise}
	 */
	deleteByEvent: function(eventId) {
		return new Promise((fulfill, reject) => {
			db("confirms").del().where({
				event: eventId
			}).then(fulfill).catch(reject);
		});
	},

	deleteByUserAndEvent: function (userId, eventId) {
		return new Promise((fulfill, reject) => {
			db("confirms").del().where({
				event: eventId,
				user: userId
			}).then(fulfill).catch(reject);
		});
	}
};

const users = {
	/**
	 * Adds an user to the users table, given its Discord ID and Steam ID.
	 *
	 * @param {string} discordID
	 * @param {string} steamID
	 * @return {Promise} Resolves on success, or rejects with the error.
	 */
	add: function(discordID, steamID) {
		return new Promise((fulfill, reject) => {
			db("users").insert({
				discord_id: discordID,
				steam_id: steamID
			}).then(fulfill).catch(reject);
		});
	},

	/**
	 * Gets an user by its discord ID
	 * @param {string} discordID
	 * @return {Promise<user>} Resolves with the user, or null if it doesn't exist, or rejects
	 *                         with the error.
	 *
	 * @typedef {object} user
	 * @property {string} discord_id
	 * @property {string} steam_id
	 */
	getByDiscord: function (discordID) {
		return new Promise((fulfill, reject) => {
			db("users").select().where({
				discord_id: discordID
			}).then(rows => {
				if (rows.length === 1) {
					fulfill(rows[0]);
				} else {
					fulfill(null);
				}
			}).catch(reject);
		});
	},

	/**
	 * Returns every user that has a steam ID linked
	 *
	 * @return {Promise<user[]>}
	 */
	getAllLinked: function() {
		return new Promise((fulfill, reject) => {
			db("users").select().whereNotNull("steam_id").then(fulfill).catch(reject);
		});
	}
};

const config = {
	admins: {
		getAll: function() {
			return new Promise((fulfill, reject) => {
				db("admins").select("userid").then(rows => {
					var result = [];
					for (var i = 0; i < rows.length; i++) {
						result.push(rows[i].userid)
					}
					fulfill(result);
				}).catch(reject);
			});
		},

		/**
		 * Adds an admin to the admins table, if it doesn't exist
		 * @param {Discord.User} user
		 * @return {Promise<boolean>} True on success, false if the admin is already in the table.
		 */
		add: function (user) {
			return new Promise((fulfill, reject) => {
				db("admins").select("userid").where({
					userid: user.id
				}).then(rows => {
					if (rows.length > 0) {
						// The admin already exists
						fulfill(false);
					} else {
						db("admins").insert({
							userid: user.id,
							name: user.username
						}).then(() =>{
							fulfill(true);
						}).catch(reject);
					}
				}).catch(reject);
			});
		},

		/**
		 * Deletes the user from the admins table
		 * @param {Discord.User} user
		 * @return {Promise<boolean>} True on success, false if the admin is not in the table.
		 */
		remove: function (user) {
			return new Promise((fulfill, reject) => {
				db("admins").select("userid").where({
					userid: user.id
				}).then(rows => {
					if (rows.length > 0) {
						db("admins").del().where({
							userid: user.id
						}).then(() => {
							fulfill(true);
						}).catch(reject);
					} else {
						fulfill(false);
					}
				}).catch(reject);
			});
		}
	},

	blacklist: {
		getAll: function() {
			return new Promise((fulfill, reject) => {
				db("blacklist").select("userid").then(rows => {
					var result = [];
					for (var i = 0; i < rows.length; i++) {
						result.push(rows[i].userid)
					}
					fulfill(result);
				}).catch(reject);
			});
		},

		/**
		 * Adds an admin to the blacklist, if it doesn't exist
		 * @param {Discord.User} user
		 * @return {Promise<boolean>} True on success, false if the user is already iblacklisted.
		 */
		add: function (user) {
			return new Promise((fulfill, reject) => {
				db("blacklist").select("userid").where({
					userid: user.id
				}).then(rows => {
					if (rows.length > 0) {
						// The user is already blacklisted
						fulfill(false);
					} else {
						db("blacklist").insert({
							userid: user.id,
							name: user.username
						}).then(() =>{
							fulfill(true);
						}).catch(reject);
					}
				}).catch(reject);
			});
		},

		/**
		 * Deletes the user from the blacklist
		 * @param {Discord.User} user
		 * @return {Promise<boolean>} True on success, false if the user is not blacklisted.
		 */
		remove: function (user) {
			return new Promise((fulfill, reject) => {
				db("blacklist").select("userid").where({
					userid: user.id
				}).then(rows => {
					if (rows.length > 0) {
						db("blacklist").del().where({
							userid: user.id
						}).then(() => {
							fulfill(true);
						}).catch(reject);
					} else {
						fulfill(false);
					}
				}).catch(reject);
			});
		}
	},

	token: {
		get() {
			return new Promise((fulfill, reject) => {
				db("config").select("bot_token").then(rows => {
					fulfill(rows[0].bot_token);
				}).catch(reject);
			});
		}
	},

	steam: {
		getCredentials: function() {
			return new Promise((fulfill, reject) => {
				db("config").select(["steam_username", "steam_password", "steam_guard_code"])
					.then(rows => {
					fulfill({
						username: rows[0].steam_username,
						password: rows[0].steam_password,
						auth_code: rows[0].steam_guard_code || null
					});
				}).catch(reject);
			});
		},

		getSentryFile: function() {
			return new Promise((fulfill, reject) => {
				db("config").select("steam_sentry_file").then(rows => {
					fulfill(rows[0] ? rows[0].steam_sentry_file : null);
				}).catch(reject);
			});
		},

		saveSentryFile: function(sentryFile) {
			return new Promise((fulfill, reject) => {
				db("config").update({
					steam_sentry_file: sentryFile
				}).then(fulfill).catch(reject);
			});
		},

		deleteAuthCode: function() {
			return new Promise((fulfill, reject) => {
				db("config").update({
					steam_guard_code: null
				}).then(fulfill).catch(reject);
			});
		}
	}

};

module.exports = {
	events: events,
	confirms: confirms,
	users: users,
	config: config
};