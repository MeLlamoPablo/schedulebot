"use strict";

const cfg    = require('../../config.js');
const moment = require('moment');
const db     = require('../modules/dbhandler/core.js'); /* Please see the file dbhandler/index.js
                                                           for more info on why core.js is being
                                                           required instead of index.js */

/**
 * @class ScheduledEvent
 *
 * @property {number} id   The event id
 * @property {string} name The event name
 * @property {Moment} time The event time
 */
class ScheduledEvent {

	/**
	 * @param {number} id    The event id
	 * @param {string} name  The event name
	 * @param {number} time  The event time, in UNIX timestamp
	 * @param {number} limit The limit of people who can attend the event
	 */
	constructor(id, name, time, limit) {
		this.id = id;
		this.name = name;
		this.time = moment.unix(time).tz(cfg.default_timezone);
		this.limit = limit;
	}

	/**
	 * @return {Promise<string>} Resolves with the id, or rejects with the error.
	 */
	getMsgId() {
		return new Promise((fulfill, reject) => {
			db.events.getSummaryMsgId(this.id).then(
				id => { fulfill(id) }, err => { reject(err) }
			);
		});
	}

	/**
	 * Returns the status of this event.
	 * @return {string} pending if it's in the future. Happening if it's in the past, but there
	 *                  hasn't passed more than the amount of time defined in
	 *                  cfg.happening_margin. Expired if it's in the past.
	 */
	getStatus() {
		if(this.time.diff(moment()) > 0) {
			return "pending";
		} else if (this.time.diff(moment() - cfg.happening_margin) > 0) {
			return "happening";
		} else {
			return "expired";
		}
	}

	/**
	 * @param {string} msgId
	 * @return {Promise} Resolves on success, or rejects with the error.
	 */
	updateMsgId(msgId) {
		return new Promise((fulfill, reject) => {
			db.events.updateSummaryMsgId(this.id, msgId).then(
				() => { fulfill() }, err => { reject(err) }
			);
		});
	}

	/**
	 * Gets every confirm for the event.
	 * @returns {Promise<people>}     Resolves on success with the people object, or rejects
	 *                                with the error.
	 *
	 * @typedef  {Object}   people
	 * @property {string[]} confirmed An array with the Discord's snowflake user ids of
	 *                                confirmed people.
	 * @property {string[]} rejected  An array with the Discord's snowflake user ids of
	 *                                people who have declined the event.
	 * @property {string[]} waiting   An array with the Discord's snowflake user ids of
	 *                                people who are waiting to confirm or reject.
	 */
	getConfirms() {
		return new Promise((fulfill, reject) => {
			var getConfirmsPromise = db.confirms.getByEvent(this);
			var getWaitingPromise = db.events.getWaiting(this);

			Promise.all([getConfirmsPromise, getWaitingPromise]).then(vals => {
				var confirms = vals[0];
				var waiting = vals[1];

				var confirmed = [], rejected = [];

				if (confirms !== null) {
					for (var i = 0; i < confirms.length; i++) {
						if (confirms[i].attends) {
							confirmed.push(confirms[i].user);
						} else {
							rejected.push(confirms[i].user);
						}
					}
				}

				fulfill({confirmed: confirmed, rejected: rejected, waiting: waiting || []});
			}).catch(reject);
		});
	}

	/**
	 * Deletes this event and every confirm asociated with it from the database.
	 *
	 * @return {Promise}
	 */
	deleteEvent() {
		return new Promise((fulfill, reject) => {
			var deleteEventPromise = db.events.deleteEvent(this.id);
			var deleteConfirmsPromise = db.confirms.deleteByEvent(this.id);

			Promise.all([deleteEventPromise, deleteConfirmsPromise]).then(fulfill).catch(reject);
		});
	}
}

module.exports = ScheduledEvent;