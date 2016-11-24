module.exports = {

	// Your bot name. Typically, this is your bot's username without the discriminator.
	// i.e: if your bot's username is MemeBot#0420, then this option would be MemeBot.
	name: "ScheduleBot",

	// The bot's command prefix. The bot will recognize as command any message that begins with it.
	// i.e: "-schedulebot foo" will trigger the command "foo",
	//      whereas "ScheduleBot foo" will do nothing at all.
	prefix:  "-schedulebot", // Tip: If you use "<@YOUR_BOT_USER_ID>", you can have the prefix
	                         // be a mention to your bot.

	// Admin app settings
	admin_app: {
		desc: "ScheduleBot admin commands",
		prefix: "schedulebot-admin"
	},

	// The master channel
	// The bot will announce the events to this channel. It won't listen to other channels.
	master_channel: "YOUR_MASTER_CHANNEL",

	// Events are considered "happening" for a margin of time, where users can see that the event
	// is happening right now. During that time, the event is not considered expired yet.+
	// This config determines for how long.
	happening_margin: 60000 * 5, // In milliseconds

	// Update interval
	// Every X milliseconds, ScheduleBot will update all active summaries.
	update_interval: 60000, // In milliseconds

	// List of accepted timezones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
	default_timezone: "Europe/Madrid",

	// If this option is enabled, the bot will delete the message that triggered it, and its own
	// response, after the specified amount of time has passed.
	// Enable this if you don't want your channel to be flooded with bot messages.
	// ATTENTION! In order for this to work, you need to give your bot the following permission:
	// MANAGE_MESSAGES - 	0x00002000
	// More info: https://discordapp.com/developers/docs/topics/permissions
	delete_after_reply: {
		enabled: true,
		time: 60000, // In milliseconds
	},

	// If true, it will delete any message that is not a command from the master channel.
	// Leave this on to keep your master channel tidy.
	// This also requires the "manage messages" permission
	disallow_talking: true
};

// "Add to server" link:
// https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=0x00002000
