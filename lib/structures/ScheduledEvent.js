"use strict";

const getCfgValue = require('../modules/confighandler/getValue');
const moment      = require('moment');
const db          = require('../modules/dbhandler/core.js'); /* Please see the file
                                                                dbhandler/index.js for more info on
                                                                why core.js is being required
                                                                instead of index.js */

/**
 * @class ScheduledEvent
 *
 * @property {number} id   The event id
 * @property {string} name The event name
 * @property {Moment} time The event time
 * @property {number} limit The limit of people who can attend the event
 * @property {boolean} instant Whether or not the event was created as an instant event
 */
class ScheduledEvent {

	/**
	 * @param {number} id    The event id
	 * @param {string} name  The event name
	 * @param {number} time  The event time, in UNIX timestamp
	 * @param {number} limit The limit of people who can attend the event
	 * @param {boolean} [instant=false] Whether or not the event was created as an instant event
	 */
	constructor(id, name, time, limit, instant = false) {
		this.id = id;
		this.name = name;
		this.time = !instant ? moment.unix(time).tz(getCfgValue("default_timezone")) : null;
		this.limit = limit;
		this.instant = instant;
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
		if (this.instant) {
			return "expired";
		}

		if(this.time.diff(moment()) > 0) {
			return "pending";
		} else if (this.time.diff(moment() - getCfgValue("happening_margin")) > 0) {
			return "happening";
		} else {
			return "expired";
		}
	}

	/**
	 * Determines the status of the lobby associated with this event.
	 *
	 * @return {Promise.<ELobbyStatus>}
	 */
	getLobbyStatus() {
		return db.events.getLobbyStatus(this);
	}

	/**
	 * Determines the match id associated with this event.
	 *
	 * @return {Promise.<string>}
	 */
	getMatchId() {
		return db.events.getDotaMatchId(this);
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
	 * Updates the status for the lobby associated with this event.
	 *
	 * @param {ELobbyStatus} status The lobby status.
	 * @return {Promise}
	 */
	setLobbyStatus(status) {
		return new Promise((fulfill, reject) => {
			db.events.updateLobbyStatus(this, status).then(fulfill).catch(reject);
		});
	}

	/**
	 * Gets every confirm for the event.
	 * @returns {Promise<people>}     Resolves on success with the people object, or rejects
	 *                                with the error.
	 *
	 * @typedef  {Object} people
	 *
	 * @property {userConfirm[]} confirmed
	 * @property {userConfirm[]} rejected
	 * @property {string[]}      waiting
	 */
	getConfirms() {
		return new Promise((fulfill, reject) => {
			let getConfirmsPromise = db.confirms.getByEvent(this);
			let getWaitingPromise = db.events.getWaiting(this);

			Promise.all([getConfirmsPromise, getWaitingPromise]).then(vals => {
				let confirms = vals[0];
				let waiting = vals[1];

				let confirmed = [], rejected = [];

				if (confirms !== null) {
					for (let i = 0; i < confirms.length; i++) {
						if (confirms[i].attends) {
							confirmed.push(confirms[i]);
						} else {
							rejected.push(confirms[i]);
						}
					}
				}

				fulfill({confirmed: confirmed, rejected: rejected, waiting: waiting || []});
			}).catch(reject);
		});
	}

	getInhouseProperties() {
		return db.events.getInhouse(this);
	}

	/**
	 * Deletes this event and every confirm associated with it from the database.
	 *
	 * @return {Promise}
	 */
	deleteEvent() {
		return new Promise((fulfill, reject) => {
			let deleteEventPromise = db.events.deleteEvent(this.id);
			let deleteConfirmsPromise = db.confirms.deleteByEvent(this.id);

			Promise.all([deleteEventPromise, deleteConfirmsPromise]).then(fulfill).catch(reject);
		});
	}
}

module.exports = ScheduledEvent;