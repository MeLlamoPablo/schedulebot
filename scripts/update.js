const dbDetailsGen = require("./shared/db-details")
	, fs           = require("fs")
	, inquirer     = require("inquirer")
	, pg           = require("pg")
	, semver       = require("semver")
	, versions     = require("./shared/versions.json");

if (versions.length < 2) {
	console.log("Sorry, the updater doesn't support enough versions yet.\n");
	process.exit(0);
}

let cfg = require("../config");
let finalSql; // The final SQL that will be executed

// So that we don't get a "can't read property of undefined" error
cfg.db = cfg.db || {};
let dbDetails = dbDetailsGen(cfg.db);

console.log(`Hello! Welcome to the ScheduleBot update script.
This script will update your current database to a more recent version,
withour having to delete your entire database and run the setup script again.\n`);

inquirer.prompt([
	{
		type: "list",
		name: "from",
		message: "CURRENT ScheduleBot version",
		choices: versions
	},
	{
		type: "list",
		name: "to",
		message: "Version you want to update to",
		choices: versions
	}
])
	// Determine whether or not the desired version is more recent than the current
	.then(answers => {
		// 	                                   This reges removes the "-dota" suffix
		let from = semver.parse(answers.from).version.match(/(.+)-(?:.+)/)[1];
		let to   = semver.parse(answers.to  ).version.match(/(.+)-(?:.+)/)[1];
		if (semver.satisfies(to, `> ${from}`)) {
			return { from: from, to: to };
		} else {
			console.error("\nError: the version you want to update to isn't more recent than the" +
				" current version.");
			process.exit(1);
		}
	})
	// Determine which scripts must be executed
	.then(answers => {
		let ascendingVersions = versions
			// Sort in ascending order
			.sort((a, b) => semver.compare(a, b))
			// Remove the "-dota" suffix
			.map(e => e.match(/(.+)-(?:.+)/)[1])
			// Parse the versions
			.map(e => semver.parse(e));

		let currentIndex = ascendingVersions.map(e => e.version).indexOf(answers.from);
		let current = ascendingVersions[currentIndex];
		let next = ascendingVersions[currentIndex + 1];
		let scripts = [];

		while (currentIndex !== -1 && semver.lt(current, answers.to)) {
			scripts.push(`${current.version}-to-${next.version}.sql`);

			currentIndex++;
			current = ascendingVersions[currentIndex];
			next = ascendingVersions[currentIndex + 1];
		}

		return scripts;
	})
	.then(loadScripts)
	// Exit if no update is needed
	.then(scripts => {
		if (scripts.length === 0) {
			console.log("\nNo database update is needed! :)");
			process.exit(0);
		} else {
			return scripts;
		}
	})
	.then(scripts => scripts.join("\n"))
	// Prompt the user
	.then(sql => {
		finalSql = sql; // Make sql global

		console.log("\nThe following SQL will be executed in your database:\n\n" + finalSql +

			"\n\nIf you want to continue, insert your database credentials:\n" +
			"Otherwise, exit this script by pressing Ctrl + C.\n");

		return inquirer.prompt(dbDetails);
	})
	// Execute the query
	.then(details => {
		pg.defaults.ssl = details.db_ssl;

		let conStr = "postgres://" + details.db_user + ":" + details.db_password
			+ "@" + details.db_host + "/" + details.db_database;

		let client = new pg.Client(conStr);

		client.connect(err => {
			if (!err) {
				client.query(finalSql, err => {
					if (!err) {
						console.log("\nYour database was updated to the version you selected!");
						process.exit(0);
					} else {
						throw err;
					}
				})
			} else {
				throw err;
			}
		})
	})
	.catch(console.error);

function loadScripts(fileNames) {
	let readFile = function(file) {
		return new Promise((fulfill, reject) => {
			fs.readFile(file, {encoding: "utf-8"}, (err, data) => {
				if (!err) {
					fulfill(data);
				} else {
					reject(err);
				}
			})
		});
	};

	return new Promise((fulfill, reject) => {
		let readScriptPromisess = [];
		for (let i = 0; i < fileNames.length; i++) {
			readScriptPromisess.push(readFile("./scripts/sql/" + fileNames[i]));
		}

		Promise.all(readScriptPromisess).then(scripts => {
			// Remove any noop script (= the update doesn't modify the database)
			fulfill(scripts.filter(e => e !== "--noop"));
		}).catch(reject);
	});
}