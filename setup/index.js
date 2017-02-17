"use strict";

const inquirer = require("inquirer")
	, fs       = require("fs")
	, path     = require("path")
	, pg       = require("pg")
	, server   = require("schedulebot-setup");

const port = process.env.PORT || 3000;

let detailsStructure = require("../scripts/shared/db-details")({});

if (process.env.DATABASE_URL) {
	run(process.env.DATABASE_URL, true);
} else {
	console.log("Hello! Welcome to the ScheduleBot setup server.\n" +
		"Please enter your PostgreSQL database credentials.\n" +
		"Then, you will be able to visit the Setup server on http://localhost:" + port + "\n");

	inquirer.prompt(detailsStructure).then(values => {

		let connStr = "postgres://" + values.db_user + ":" + values.db_password
			+ "@" + values.db_host + "/" + values.db_database + "";

		run(connStr, values.db_ssl);

	}).catch(console.error);
}

function run(connStr, ssl) {
	if (ssl) {
		pg.defaults.ssl = true;
	}

	let db = new pg.Client(connStr);

	db.connect(err => {

		if (!err) {

			let existingData = {};

			dbStructureExists(db)
				.then(exists => {

					console.log(""); // Newline

					if (exists) {
						return getConfigFromDb(db)
							.then(parseConfig)
							.then(data => existingData = data);
					} else {
						return createDbStructure(db);
					}

				})
				.then(() => server.run(port, existingData))
				.then(console.log)
				.catch(err => {

					console.error("An unexpected error occurred!\n");
					console.error(err);
					process.exit(1);

				});

		} else {
			console.error("Couldn't connect to the database!\n");
			console.error(err);
			process.exit(1);
		}

	});

}

function dbStructureExists(client) {
	return new Promise((fulfill, reject) => {
		client.query("select * from information_schema.tables where table_schema = 'public'",
			(err, result) => {
				if (!err) {

					fulfill(result.rowCount !== 0);

				} else {
					reject(err);
				}
			});
	});
}

function createDbStructure(client) {
	return new Promise((fulfill, reject) => {
		let sql;
		try {
			sql = fs.readFileSync(
				path.join(__dirname, "../scripts/sql/db_setup.sql"),
				{encoding: "utf-8"});
		} catch (err) {
			reject(err);
		}

		client.query(sql, err => {
			if (!err) {
				fulfill();
			} else {
				reject(err);
			}
		});
	});
}

function getConfigFromDb(client) {
	return new Promise((fulfill, reject) => {
	    client.query(
	    	"SELECT config.bot_token, config.config, admins.userid AS adminid " +
			"FROM config INNER JOIN admins ON 1=1 LIMIT 1;" +
			"SELECT * FROM steam_bots",
			(err, result) => {
	    		if (!err) {
	    			fulfill(result.rows);
				} else {
	    			reject(err);
				}
			}
		)
	});
}

function parseConfig(rows) {
	let result = {
		discord: {
			bot: {},
			admin: {}
		},
		settings: {},
		steamBots: []
	};

	if (rows[0]) {
		result.discord.bot.token = rows[0].bot_token;
		result.discord.admin.id = rows[0].adminid;
		result.settings = rows[0].config;

		if (rows[1]) {
			for (let i = 1; i < rows.length; i++) {
				result.steamBots.push({
					username: rows[i].username,
					password: rows[i].password,
					steamGuardEnabled: rows[i].steam_guard,
					setamGuardCode: rows[1].steam_guard_code
				});
			}
		}
	}

	return result;
}