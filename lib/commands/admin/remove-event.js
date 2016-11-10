"use strict";

const Clapp  = require('../../modules/clapp-discord/index');
const cfg    = require('../../../config');
const db     = require('../../modules/dbhandler/index').events;

module.exports = new Clapp.Command({
	name: "remove-event",
	desc: "Removes the specified event. This action can't be undone.",
	fn: (argv, context, cb) => {
		db.get(argv.args.id).then(event => {
			if (event !== null) {
				var eventName = event.name;
				var deleteSummaryPromise = context.summaryHandler.deleteSummary(event);
				var deleteEventPromise = event.deleteEvent();

				Promise.all([deleteSummaryPromise, deleteEventPromise]).then(() => {
					cb("The event `" + eventName+ "` was successfully deleted.");
				}).catch(err => {
					console.error(err);
					cb("Sorry, an internal error occurred. Please talk to my author.");
				});
			} else {
				cb("Error: the specified event `" + argv.args.id + "` doesn't exist.");
			}
		}, err => {
			console.error(err);
			cb("Sorry, an internal error occurred. Please talk to my author.");
		})
	},
	args: [
		{
			name: "id",
			desc: "The ID of the event",
			type: "number",
			required: true
		}
	],
	async: true
});