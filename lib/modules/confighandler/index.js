"use strict";

/**
 * Static property for cfg
 *
 * @type {Configuration}
 * @private
 */
let _cfg = {};

class ConfigManager {

	/**
	 * @param {object} settings
	 * @return {Configuration}
	 */
	static initialize(settings) {

		_cfg = {
			name: settings.name,
			prefix: settings.prefix,
			readable_prefix: settings["readable-prefix"],
			admin_app: {
				desc: "ScheduleBot admin commands",
				prefix: settings["admin-app-prefix"]
			},
			master_channel: settings["master-channel"],
			happening_margin: 60000 * 5,
			update_interval: settings["update-interval"] * 1000,
			default_timezone: settings["default-timezone"],
			time_format: settings["time-format"],
			delete_after_reply: {
				enabled: settings["delete-after-reply"],
				time: settings["delete-after-reply-time"] * 1000
			},
			disallow_talking: settings["disallow-talking"],
			add_inhouse_is_admin_command: settings["add-inhouse-is-admin-command"],
			quick_inhouse: {
				enabled: settings["quick-inhouse-enabled"],
				command_name: settings["quick-inhouse-command-name"],
				event_name: settings["quick-inhouse-event-name"]
			},
			steam: {
				name: settings.name,
				profile_url: "Unknown"
			},
			dota: {
				default_server: settings["default-server"],
				disable_autostart: settings["disable-autostart"],
				ticketing: {
					enabled: settings["ticketing-enabled"],
					league_id: settings["ticketing-league-id"]
				},
				mmr: {
					enabled: settings["mmr-enabled"],
					enforce: settings["mmr-enforce"],
					update_interval: settings["mmr-update-interval"]
				},
				game_generic_name: settings["game-generic-name"]
			}
		};

		return _cfg;

	}

	/**
	 * @param {number} steamID
	 */
	static setSteamProfileURL(steamID) {
		_cfg.steam.profile_url = "http://steamcommunity.com/profiles/" + steamID;
	}

	/**
	 * @private
	 * @return {Configuration}
	 */
	static _getCfg() {
		return _cfg;
	}
}

module.exports = ConfigManager;