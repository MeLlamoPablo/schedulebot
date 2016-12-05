"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    = require('../../../config');
const db     = require('../../modules/dbhandler/index').events;

module.exports = new Clapp.Command({
	name: "remove-event",
	desc: "Removes the specified event. This action can't be undone.",
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			db.get(argv.args.id).then(event => {
				if (event !== null) {
					let eventName = event.name;
					let deleteSummaryPromise = context.summaryHandler.deleteSummary(event);
					let deleteEventPromise = event.deleteEvent();

					Promise.all([deleteSummaryPromise, deleteEventPromise]).then(() => {
						fulfill("The event `" + eventName+ "` was successfully deleted.");
					}).catch(err => {
						console.error(err);
						fulfill("Sorry, an internal error occurred. Please talk to my author.");
					});
				} else {
					fulfill("Error: the specified event `" + argv.args.id + "` doesn't exist.");
				}
			}).catch(reject);
		});
	},
	args: [
		{
			name: "id",
			desc: "The ID of the event",
			type: "number",
			required: true
		}
	]
});