"use strict";

const OpenDotaClient = require("../opendotaclient");

/**
 * Retrieves a player's solo MMR.
 *
 * @param {string} playerID The user's Steam ID. For example: 76561198041415108.
 * @returns {Promise<number|null>} Resolves with the MMR or null if OpenDota doesn't know it.
 */
function getMmr(playerID) {
	return new Promise((fulfill, reject) => {
	    OpenDotaClient.getPlayer(playerID)
			.then(data => JSON.parse(data)["solo_competitive_rank"])
			// This casts to number. Null is casted to 0. 0 evaluates to false, so null is returned.
			.then(mmr => fulfill(+mmr || null))
			.catch(reject);
	});
}

module.exports = getMmr;