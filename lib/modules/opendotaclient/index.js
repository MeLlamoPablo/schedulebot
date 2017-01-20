"use strict";

const request = require("request-promise")
	, SteamID = require("steamid")
;

const BASE_URL = "https://api.opendota.com/api";

/**
 * @class OpenDotaClient
 *
 * An OpenDota API client that implements some methods.
 */
class OpenDotaClient {

	/**
	 * @param {string} id The user's Steam ID. For example: 76561198041415108.
	 * @returns {Promise}
	 * @example
	 * See https://docs.opendota.com/#tag/players%2Fpaths%2F~1players~1%7Baccount_id%7D%2Fget
	 */
	static getPlayer(id) {
		let sID = new SteamID(id);

		return request(BASE_URL + "/players/" + sID.accountid);
	}

	/**
	 * @param {string} id The game's match ID. For example: 2927308329.
	 * @example
	 * See https://docs.opendota.com/#tag/matches%2Fpaths%2F~1matches~1%7Bmatch_id%7D%2Fget
	 */
	static getMatch(id) {
		return request(BASE_URL + "/matches/" + id);
	}

}

module.exports = OpenDotaClient;