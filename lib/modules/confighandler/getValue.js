"use strict";

const ConfigManager = require("./");

/**
 * Gets a single item from the configuration object.
 * @param {string} key The key, in the form of: "foo.bar.biz"
 * @return {string|boolean|number|object}
 */
module.exports = key => {

	//noinspection JSAccessibilityCheck
	const cfg = ConfigManager._getCfg();

	for (let i = 0, current = cfg, keys = key.split("."); i < keys.length; i++) {

		if (i !== keys.length - 1) {
			current = current[keys[i]];
		} else {
			return current[keys[i]];
		}

	}

};