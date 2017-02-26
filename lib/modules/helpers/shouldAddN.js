const cfg = require("../../modules/confighandler/cfg")();

function shouldAddN(word = cfg.dota.game_generic_name) {
	return ["a", "e", "i", "o", "u"].indexOf(word.charAt(0).toLocaleLowerCase()) !== -1;
}

module.exports = shouldAddN;