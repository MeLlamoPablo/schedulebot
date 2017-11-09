module.exports = {

	// Your bot name. Typically, this is your bot's username without the discriminator.
	// i.e: if your bot's username is MemeBot#0420, then this option would be MemeBot.
	name: "D2CI-H bot",

	// The bot's command prefix. The bot will recognize as command any message that begins with it.
	// i.e: "-schedulebot foo" will trigger the command "foo",
	//      whereas "ScheduleBot foo" will do nothing at all.
	//
	// If you replace YOUR_BOT_USER_ID with your bot's user ID, the prefix will be a mention to
	// your bot. You can get that ID in https://discordapp.com/developers/applications/me/
	// (click on your application, and find it under "App Details" > "Client ID"
	prefix:  "377973608804253698",

	// This is a readable version of the prefix. Generally, this is the same as prefix, but if
	// you set prefix to be in the form of "<@YOUR_BOT_USER_ID>", you'd need to set readable_prefix
	// to be "@ScheduleBot" (or however your bot user is named).
	//
	// This is because when you use the characters `` in Discord (to highlight a command, in
	// ScheduleBot's case), the string "<@YOUR_BOT_USER_ID>" doesn't get parsed as a mention.
	// So in order not to mislead the user, we have a separate option for a readable version of
	// our prefix.
	readable_prefix: "D2CIH bot#069",

	// Admin app settings
	admin_app: {
		desc: "ScheduleBot admin commands",
		prefix: "schedulebot-admin"
	},

	// The master channel
	// The bot will announce the events to this channel. It won't listen to other channels.
	master_channel: "366993171319750657",

	// Events are considered "happening" for a margin of time, where users can see that the event
	// is happening right now. During that time, the event is not considered expired yet.+
	// This config determines for how long.
	happening_margin: 60000 * 5, // In milliseconds

	// Update interval
	// Every X milliseconds, ScheduleBot will update all active summaries.
	update_interval: 60000, // In milliseconds

	// List of accepted timezones: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
	default_timezone: "America/Bogota",

	// The time format that will be used for the create command. The bot will read a date string
	// and will attempt to interpret it as the following format. If the passed time doesn't
	// match the format, the command will result in an error.
	//
	// A list of valid format tokens can be found at:
	// http://momentjs.com/docs/#year-month-and-day-tokens
	time_format: "DD/MM/YYYY HH:mm",

	// If this option is enabled, the bot will delete the message that triggered it, and its own
	// response, after the specified amount of time has passed.
	// Enable this if you don't want your channel to be flooded with bot messages.
	// ATTENTION! In order for this to work, you need to give your bot the following permission:
	// MANAGE_MESSAGES - 	0x00002000
	// More info: https://discordapp.com/developers/docs/topics/permissions
	delete_after_reply: {
		enabled: true,
		time: 60000 // In milliseconds
	},

	// If true, it will delete any message that is not a command from the master channel.
	// Leave this on to keep your master channel tidy.
	// This also requires the "manage messages" permission
	disallow_talking: true,

	// If false, all (non-blacklisted) users will be able to add inhouses to created events.
	// If true, only admins will be able to do so.
	add_inhouse_is_admin_command: false,

	// quick-inhouse command
	// This command creates an instant lobby and adds an inhouse with the default values.
	// It is the equivalent of running "@ScheduleBot create (event_name) now" and
	// "@ScheduleBot add-inhouse (id)".
	quick_inhouse: {
		// If false, the command won't be included in the bot, and won't even show on the help.
		enabled: true,

		// The command name. If you changed this to "qh", the command would be executed as
		// @ScheduleBot qh
		command_name: "quick-inhouse",

		// The created event's name, which is then used as a lobby name. (So you could customize
		// this with your guild's name, for instance)
		event_name: "Inhouse"
	},

	db: {
		"user": "",
		"password": "",
		"host": "",
		"database": ""
	},

	steam: {
		// The name that the Steam bots will take. It will be appended with "#id" as in "#1".
		name: "ScheduleBot",

		// The first bot's profile URL. It's needed to redirect users to it.
		profile_url: "http://steamcommunity.com/profiles/76561198442978152/"
	},

	dota: {
		// The default inhouse server, which will be used if the user doesn't pass the
		// --server flag to the add-inhouse command.
		// Go to that command's file (Or type -schedulebot add-inhouse --help)
		// to see possible values.
		default_server: "US East",

		// If false, lobbies will be started automatically when ten people join it
		// (spectators, casters and unassigned players not counted).
		// If true, the games will only be able to be started with the admin command
		// schedulebot-admin force-lobby-start (event)
		disable_autostart: false,

		// If enabled is true, the bot will ticket any lobbies using the provided league id.
		// Make sure that the steam bot is an admin of that league.
		ticketing: {
			enabled: false,
			league_id: 12345
		},

		// If enabled is true, the bot will fetch MMR from OpenDota for every user that links
		// their Steam account, and display it in event summaries.
		//
		// The user must have the "Expose Public Match Data" option enabled, must be displaying
		// their MMR on their Dota profile, and must have signed in OpenDota at least once, using
		// Steam. If OpenDota doesn't know the user MMR, ScheduleBot won't either, and will display
		// a "MMR Unknown message"
		mmr: {
			enabled: true,

			// If enforce is true, the bot will only allow people who have their MMR publicly
			// exposed in OpenDota to confirm any events. This is useful for competitive leagues
			// who need to control MMR; it's recommended to leave it false otherwise.
			enforce: false,

			// ScheduleBot will update all users' MMR on each interval.
			update_interval: 8 // In hours
		},

		// In a competitive league, you might want to change this with "match" or "game",
		// since it's not technically an inhouse.
		//
		// CAREFUL! This will change the name of the command "add-inhouse"
		// to "add-whatever_you_write"
		game_generic_name: "inhouse"
	}
};

// "Add to server" link:
// https://discordapp.com/oauth2/authorize?client_id=3377973608804253698&scope=bot&permissions=0x00002000
