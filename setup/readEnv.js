"use strict";

const fs = require("fs");

/**
 * @param {string} projectRoot
 * @return {EnvFile|null}
 *
 * @typedef {object} EnvFile
 * @property {string} url
 * @property {boolean} useSSL
 */
function readEnv(projectRoot) {

	let vars = (() => {
		let contents = fs.readFileSync(projectRoot + "/.ENV", { encoding: "utf-8" });

		let result = {};
		let arr = contents.split("\n").map(e => {
			let matches = e.match(/(.+)=(.+)/);

			return matches ? { key: matches[1], value: matches[2] } : null;
		}).filter(e => e !== null);

		for (let el of arr) {
			result[el.key] = el.value;
		}

		return result;
	})();

	if (vars.DATABASE_URL && vars.DATABASE_USE_SSL) {
		return {
			url: vars.DATABASE_URL,
			useSSL: vars.DATABASE_USE_SSL === "true"
		}
	} else {
		return null;
	}

}

module.exports = readEnv;