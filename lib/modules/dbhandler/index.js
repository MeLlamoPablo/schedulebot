/**
 * The purpose of this file is to avoid a recursive require between dbhandler and ScheduledEvent.
 * dbhandler needs ScheduledEvent to return the ScheduledEvent object. ScheduledEvent needs
 * dbhandler for some of its methods to work, as they interact with the database.
 *
 * Without this file, the dependency schema would look like this:
 *
 * dbhandler/core.js <-> ScheduledEvent.js
 *
 * which woldn't work. With this file, it looks like this:
 *
 * dbhandler/core.js --> ScheduledEvent.js
 *      |                        |
 *      V                        |
 * dbhandler/index.js <-----------
 *
 * I'm not sure this is the best solution, but it works.
 */

"use strict";

const core           = require('./core.js');
const ScheduledEvent = require('../../structures/ScheduledEvent.js');

// TODO make this export a modified version of core
module.exports = {
	events: {
		/**
		 * Retrieves a single row from the events table
		 * @param {number} id                 The row to get.
		 * @returns {Promise<ScheduledEvent>} Resolves with the event  if found, or null if it
		 *                                    doesn't exist, or rejects with the error.
		 */
		get: function(id) {
			return new Promise((fulfill, reject) => {
				core.events.get(id).then(
					evtObj => {
						fulfill(
							evtObj !== null
								? new ScheduledEvent(
									evtObj.id, evtObj.name, evtObj.time, evtObj.limit
								)
								: null
						);
					}, err => {
						reject(err);
					}
				);
			});
		},

		/**
		 * Returns every active row in the events table, understanding by active every future event.
		 *
		 * @return {Promise<ScheduledEvent[]>}
		 */
		getAllActive: function() {
			return new Promise((fulfill, reject) => {
				core.events.getAllActive().then(
					events => {
						var scheduledEvents = [];
						for (var i = 0; i < events.length; i++) {
							scheduledEvents.push(
								new ScheduledEvent(
									events[i].id, events[i].name, events[i].time, events[i].limit
								)
							);
						}
						fulfill(scheduledEvents);
					}, reject
				);
			});
		},

		getWaiting: core.events.getWaiting,
		add: core.events.add,
		updateWaiting: core.events.updateWaiting,
		deleteEvent: core.events.deleteEvent
	},

	confirms: core.confirms,
	config: core.config
};