"use strict";

const request = require("request-promise")
	, semver  = require("semver");

const VERSION_LIST_URL =
"https://raw.githubusercontent.com/MeLlamoPablo/schedulebot/dota/scripts/shared/versions.json";
const SCRIPTS_FOLDER_URL =
"https://raw.githubusercontent.com/MeLlamoPablo/schedulebot/dota/scripts/sql/";

/**
 * Retrieves the script needed to update from currentVersion to newVersion from GitHub.
 *
 * @param {string} currentVersion
 * @param {string} newVersion
 *
 * @return {Promise<string|null>}
 *
 * Returns the script on success, or null if no database update is needed.
 */
module.exports = (currentVersion, newVersion) => getVersions()
	.then(versions => determineScriptNames(versions, currentVersion, newVersion))
	// If there are no scripts, no update is needed. Stop working and fulfill.
	.then(scriptNames => {
		if (scriptNames.length > 0) {
			return downloadScripts(scriptNames);
		} else {
			return null;
		}
	});

/**
 * @return {Promise<SemVer[]>}
 * A list of all versions, retrieved from GitHub, and sorted in ascending order.
 */
const getVersions = () => request({
	uri: VERSION_LIST_URL,
	method: "GET",
	headers: {
		"User-Agent": "MeLlamoPablo/schedulebot"
	},
	json: true
})
	.then(r => r.map(version => version.replace("-dota", ""))
		.sort(semver.compare)
		.map(semver.parse));

/**
 * Determines the file names of the scripts that need to be executed in order to upgrade from
 * currentVersion to newVersion.
 *
 * @param {SemVer[]} versions
 * @param {string}   currentVersion
 * @param {string}   newVersion
 *
 * @return {string[]} An array of strings with the following structure: a.b.c-to-d.e.f.sql
 */
const determineScriptNames = (versions, currentVersion, newVersion) => {

	let newSemver = versions.find(sv => sv.version === newVersion);
	let currentSemver = versions.find(sv => sv.version === currentVersion);
	let currentIndex = versions.indexOf(currentSemver);
	let next = versions[currentIndex + 1];

	let scriptNames = [];

	while (currentIndex !== -1 && semver.lt(currentSemver, newSemver)) {
		scriptNames.push(`${currentSemver.version}-to-${next.version}.sql`);

		currentIndex++;
		currentSemver = versions[currentIndex];
		next = versions[currentIndex + 1];
	}

	return scriptNames;

};

/**
 * @param {string} fileName
 * @return {Promise<string>}
 */
const downloadScript = fileName => request({
	uri: SCRIPTS_FOLDER_URL + fileName,
	method: "GET",
	headers: {
		"User-Agent": "MeLlamoPablo/schedulebot"
	}
});

/**
 * @param {string[]} fileNames
 * @return {Promise<string>} The concatenation of all scripts
 */
const downloadScripts = fileNames =>
	Promise.all(fileNames.map(downloadScript))
		// Filter "empty" scripts (they contain a "noop" comment)
		.then(scripts => scripts.filter(body => body !== "--noop").join("\n"));
