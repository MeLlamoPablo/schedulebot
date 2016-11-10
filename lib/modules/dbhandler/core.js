"use strict";

const cfg            = require('../../../config.js');
const moment         = require('moment');
const pg             = require('pg');

pg.defaults.ssl = true;

const db             = require('knex')({
	client: 'pg',
	connection: process.env.DATABASE_URL
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
				fulfill(rows[0].waiting || null);
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
			}).then(fulfill, reject);
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
	}
};

module.exports = {
	events: events,
	confirms: confirms,
	config: config
};
