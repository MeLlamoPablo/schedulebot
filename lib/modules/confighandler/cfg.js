"use strict";

const ConfigManager = require("./index");

/**
 * @typedef {object} Configuration
 *
 * @property {boolean} add_inhouse_is_admin_command
 *
 * @property {object}  admin_app
 * @property {string}  admin_app.desc
 * @property {string}  admin_app.prefix
 *
 * @property {string}  default_timezone
 *
 * @property {object}  delete_after_reply
 * @property {boolean} delete_after_reply.enabled
 * @property {number}  delete_after_reply.time
 *
 * @property {boolean} disallow_talking
 *
 * @property {object}  dota
 * @property {boolean} dota.disable_autostart
 * @property {object}  dota.mmr
 * @property {boolean} dota.mmr.enabled
 * @property {number}  dota.mmr.league_id
 * @property {object}  dota.ticketing
 * @property {string}  dota.game_generic_name
 *
 * @property {number}  happening_margin
 *
 * @property {string}  master_channel
 *
 * @property {string}  name
 *
 * @property {string}  prefix
 *
 * @property {object}  quick_inhouse
 * @property {string}  quick_inhouse.command_name
 * @property {boolean} quick_inhouse.enabled
 * @property {string}  quick_inhouse.event_name
 *
 * @property {string}  readable_prefix
 *
 * @property {object}  steam
 * @property {string}  steam.name
 * @property {string}  steam.profile_url
 *
 * @property {string}  time_format
 *
 * @property {number}  update_interval
 */
module.exports = ConfigManager._getCfg;