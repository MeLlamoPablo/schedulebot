"use strict";

const Clapp  = require('../../modules/clapp-discord/index');

module.exports = new Clapp.Command({
	name: "timezones",
	desc: "Displays a link with every available time zone.",
	fn: () => {
		return "Here's a list of all valid time zones:\n"
			+ "https://en.wikipedia.org/wiki/List_of_tz_database_time_zones (column `TZ`)";
	}
});