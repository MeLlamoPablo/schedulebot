"use strict";

const Heroku   = require("heroku-client")
	, inquirer = require("inquirer")
	, fs       = require("fs")
	, path     = require("path")
	, pg       = require("pg")
	, readEnv  = require("./readEnv")
	, server   = require("schedulebot-setup");

const port = process.env.PORT || 3000;

let detailsStructure = require("../scripts/shared/db-details")({});
let dbValues, projectRoot = path.join(__dirname, ".."), envExists = fs.existsSync(projectRoot + "/.ENV");

if (process.env.DATABASE_URL) {
	// We'll think that DATABASE_URL being set means that the code is running on Heroku.
	run(process.env.DATABASE_URL, true);
} else {
	// If the DB details are saved on an .ENV file, load them
	// Otherwise ask them and save them
	if (envExists) {

		let envFile = readEnv(projectRoot);

		if (envFile !== null) {

			run(envFile.url, envFile.useSSL);

		} else {

			askDbCredentials();

		}

	} else {

		askDbCredentials();

	}
}

function askDbCredentials() {

	console.log("Hello! Welcome to the ScheduleBot setup server.\n" +
		"Please enter your PostgreSQL database credentials.\n" +
		"Then, you will be able to visit the Setup server on http://localhost:" + port + "\n");

	inquirer.prompt(detailsStructure).then(values => {

		dbValues = values;
		run(generateDatabaseUrl(values), values.db_ssl);

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

			if (!envExists) {
				saveEnv(dbValues);
			}

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
				.then(result => afterRun(db, result))
				.then(() => {

					console.log("All good! You may now run the bot with:\n\n" +

						"npm run bot");
					process.exit(0);

				})
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

function afterRun(client, result) {
	return new Promise((fulfill, reject) => {
		if (result.heroku) {

			const hk = new Heroku({ token: result.heroku.key });

			hk.patch(`/apps/${result.heroku.app}/formation/web`, {
				quantity: 0
			})
				.then(() => applyNewConfig(client, result))
				.then(() => hk.patch(`/apps/${result.heroku.app}/formation/bot`, {
					quantity: 1
				}))
				.then(() => console.log("\nAll good! The setup page should shut down, and the " +
					"bot should boot automatically."))
				.catch(reject);

		} else {

			applyNewConfig(client, result).then(fulfill).catch(reject);

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
	    	"SELECT config.bot_token, config.settings, admins.userid AS adminid " +
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
		result.settings = rows[0].settings;

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

function applyNewConfig(client, newConfig) {
	return new Promise((fulfill, reject) => {

		let updateConfigPromise = new Promise((fulfill2, reject2) => {

			runQuery(client, "SELECT * FROM public.config").then(result => {

				if (result.rowCount === 0) {

					runQuery(
						client,
						"INSERT INTO public.config (bot_token, settings) " +
						"VALUES ($1, $2)",
						newConfig.discord.bot.token,
						newConfig.settings
					).then(() => fulfill2()).catch(reject2);

				} else {

					runQuery(
						client,
						"INSERT INTO public.config (bot_token, settings) " +
						"VALUES ($1, $2)",
						newConfig.discord.bot.token,
						newConfig.settings
					).then(() => fulfill2()).catch(reject2);

				}

			}).catch(reject2);

		});

		let updateAdminPromise = new Promise((fulfill2, reject2) => {

			runQuery(
				client,
				"SELECT userid FROM public.admins WHERE userid = $1",
				newConfig.discord.admin.id

			).then(result => {

				if (result.rowCount === 0) {

					runQuery(
						client,
						"INSERT INTO public.admins (userid, name) VALUES ($1, $2)",
						newConfig.discord.admin.id,
						newConfig.discord.admin.username
					).then(() => fulfill2()).catch(reject2);

				} else {

					fulfill();

				}

			}).catch(reject2);

		});

		let updateSteamBotsPromise = new Promise((fulfill2, reject2) => {

			let promises = [];

			for (let bot of newConfig.steamBots) {

				promises.push(new Promise((fulfill3, reject3) => {

					runQuery(
						client,
						"SELECT id FROM public.steam_bots WHERE username = $1",
						bot.username
					).then(result => {

						if (result.rowCount === 0) {

							runQuery(
								client,
								"INSERT INTO public.steam_bots (username, password, steam_guard, " +
								"steam_guard_code) VALUES ($1, $2, $3, $4)",
								bot.username,
								bot.password,
								bot.steamGuardEnabled,
								bot.steamGuardCode
							).then(() => fulfill3()).catch(reject3);

						} else {
							fulfill3();
						}

					}).catch(reject3);

				}));

			}

			Promise.all(promises).then(() => fulfill2()).catch(reject2);

		});

		Promise.all([
			updateConfigPromise,
			updateAdminPromise,
			updateSteamBotsPromise
		]).then(() => fulfill()).catch(reject);

	});
}

function runQuery(client, query, ...data) {
	return new Promise((fulfill, reject) => {

		if (data) {

			client.query(query, data, (err, result) => {
				if (err) {
					reject(err);
				} else {
					fulfill(result);
				}
			});

		} else {

			client.query(query, (err, result) => {
				if (err) {
					reject(err);
				} else {
					fulfill(result);
				}
			});

		}

	});
}

function saveEnv(dbDetails) {
	let file = "DATABASE_URL=" + generateDatabaseUrl(dbDetails);
	file += "\nDATABASE_USE_SSL=" + dbDetails.db_ssl;

	fs.writeFileSync(projectRoot + "/.ENV", file, { encoding: "utf-8" });
}

function generateDatabaseUrl(dbDetails) {
	return "postgres://" + dbDetails.db_user + ":" + dbDetails.db_password
		+ "@" + dbDetails.db_host + "/" + dbDetails.db_database + "";
}