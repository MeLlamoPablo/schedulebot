"use strict";

const Heroku          = require("heroku-client")
	, inquirer        = require("inquirer")
	, fs              = require("fs")
	, getUpdateScript = require("./getUpdateScript")
	, path            = require("path")
	, pg              = require("pg")
	, knex            = require("knex")
	, readEnv         = require("./readEnv")
	, server          = require("schedulebot-setup");

const port = process.env.PORT || 3000;
const GITHUB_TARBALL_URL = "https://api.github.com/repos/MeLlamoPablo/schedulebot/tarball/dota";

let detailsStructure = require("../scripts/shared/db-details")({});
let dbValues,
	client,
	projectRoot = path.join(__dirname, ".."),
	envExists = fs.existsSync(projectRoot + "/.ENV");

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

	client = new knex({
		connection: connStr,
		client: "pg"
	});


	let existingData = {};

	// Only save the .ENV file if it doesn't exist and we're not on Heroku.
	if (!envExists && !process.env.DATABASE_URL) {
		saveEnv(dbValues);
	}

	dbStructureExists()
		.then(exists => {

			console.log(""); // Newline

			if (exists) {
				return getConfigFromDb()
					.then(data => existingData = data);
			} else {
				return createDbStructure();
			}

		})
		// If running on heroku, add the heroku data to existingData
		.then(() => {
			if (process.env.DATABASE_URL) {
				existingData.heroku = {
					enabled: true
				};

				if (process.env.HEROKU_API_KEY) {
					existingData.heroku.key = process.env.HEROKU_API_KEY;
				}
			}
		})
		.then(() => server.run(port, existingData))
		.then(afterRun)
		.then(() => {

			console.log("\nAll good! You may now run the bot with:\n\n" +

				"npm run bot");
			process.exit(0);

		})
		.catch(err => {

			console.error("An unexpected error occurred!\n");
			console.error(err);
			process.exit(1);

		});
}

function afterRun(result) {
	return new Promise((fulfill, reject) => {
		if (result.action === "setup") {

			if (result.data.heroku) {

				const hk = new Heroku({ token: result.data.heroku.key });

				applyNewConfig(result.data)
					.then(() => hk.patch(`/apps/${result.data.heroku.appName}/formation/bot`, {
						body: { quantity: 1 }
					}))
					.then(hk.patch(`/apps/${result.data.heroku.appName}/formation/web`, {
						body: { quantity: 0 }
					}))
					.then(() => console.log("\nAll good! The setup page should shut down, and the "
						+ "bot should boot automatically."))
					.catch(reject);

			} else {

				applyNewConfig(result.data).then(fulfill).catch(reject);

			}

		} else if (result.action === "update") {

			getUpdateScript(result.data.currentVersion, result.data.newVersion)
				.then(script => {

					if (script !== null) {

						return client.raw(script)
							.then(() =>
								console.log("The database has been updated to v" +
								result.data.nextVersion));

					}

				}).then(() => {

					if (process.env.HEROKU_APP_ID) {

						const hk = new Heroku({ token: process.env.HEROKU_API_KEY });

						return hk.patch(`/apps/${process.env.HEROKU_APP_ID}/formation/bot`, {
							body: { quantity: 1 }
						})
						.then(hk.patch(`/apps/${process.env.HEROKU_APP_ID}/formation/web`, {
							body: { quantity: 0 }
						}))
						.then(hk.post(`/apps/${process.env.HEROKU_APP_ID}/builds`, {
							body: {
								source_blob: { url: GITHUB_TARBALL_URL }
							}
						}))
						.then(() => console.log("All good! The update should begin now"));

					}

				}).then(fulfill).catch(reject);

		}
	});
}

function dbStructureExists() {
	return client("information_schema.tables").select().where({
		table_schema: "public"
	}).then(rows => rows.length !== 0);
}

function createDbStructure() {
	return new Promise((fulfill, reject) => {
		let sql;
		try {
			sql = fs.readFileSync(
				path.join(__dirname, "../scripts/sql/db_setup.sql"),
				{encoding: "utf-8"});
		} catch (err) {
			reject(err);
		}

		client.raw(sql).then(fulfill).catch(reject);
	});
}

/**
 * @return {Promise<Config>}
 *
 * @typedef {object} Config
 * @property {object} discord
 * @property {object} discord.bot
 * @property {string} discord.bot.token
 * @property {object} discord.admin
 * @property {string} discord.admin.id
 * @property {object} settings
 * @property {SteamBotData[]} steamBots
 *
 * @typedef {object} SteamBotData
 * @property {string} username
 * @property {string} password
 * @property {boolean} steamGuardEnabled
 * @property {string} steamGuardCode
 */
function getConfigFromDb() {
	let getConfAndAdminPromise = client.select(
		"config.bot_token",
		"config.settings",
		"config.db_version",
		"admins.userid AS adminid"
	)
		.from("config")
		.innerJoin("admins", /* on */ 1, "=", 1)
		.limit(1);

	let getSteamBotsPromise = client.select().from("steam_bots");

	return Promise.all([getConfAndAdminPromise, getSteamBotsPromise]).then(rows => {

		let result = {
			discord: {
				bot: {},
				admin: {}
			},
			settings: {},
			steamBots: []
		};

		if (rows[0]) {
			if (rows[0][0]) {
				result.discord.bot.token = rows[0][0].bot_token;
				result.discord.admin.id = rows[0][0].adminid;
				result.settings = rows[0][0].settings;
				result.currentVersion = rows[0][0].db_version;
			}

			if (rows[1]) {
				for (let bot of rows[1]) {
					result.steamBots.push({
						username: bot.username,
						password: bot.password,
						steamGuardEnabled: bot.steam_guard,
						setamGuardCode: bot.steam_guard_code
					});
				}
			}
		}

		return result;

	});
}

function applyNewConfig(newConfig) {

	let updateConfigPromise = client("config")
		.update({
			bot_token: newConfig.discord.bot.token,
			settings: newConfig.settings
		});

	let updateAdminPromise = client("admins")
		.select("userid")
		.where({ userid: newConfig.discord.admin.id })
		.then(rows => {
			if (rows.length === 0) {
				return client("admins").insert({
					userid: newConfig.discord.admin.id,
					name: newConfig.discord.admin.username
				});
			}
		});

	let updateSteamBotsPromise = new Promise((fulfill2, reject2) => {
		client("steam_bots").select("username")
			.then(rows => rows.map(bot => bot.username))
			.then(existingBots => {
				let promises = [];

				// Three scenarios:
				// 1.- A bot is present in newConfig.steamBots but not in existingBots
				// ---> Add it to the database (it's a new bot)
				// 2.- A bot is present in both newConfig.steamBots and existingBots
				// ---> Update the row (the user modified it)
				// 3.- A bot is present in existingBots but not in newConfig.steamBots
				// ---> Delete it from the database (The user deleted it)

				function scenario1(newBot) {
					return client("steam_bots")
						.insert({
							username: newBot.username,
							password: newBot.password,
							steam_guard: newBot.steamGuardEnabled,
							steam_guard_code: newBot.steamGuardCode
						});
				}

				function scenario2(newBot) {
					return client("steam_bots")
						.update({
							password: newBot.password,
							steam_guard: newBot.steamGuardEnabled,
							steam_guard_code: newBot.steamGuardCode
						})
						.where({ username: newBot.username });
				}

				function scenario3(existingBotUsername) {
					return client("steam_bots")
						.del()
						.where({ username: existingBotUsername });
				}

				for (let existingBotUsername of existingBots) {
					let newBot = newConfig.steamBots
						.find(bot => existingBotUsername === bot.username);

					if (newBot) {
						promises.push(scenario2(newBot));
					} else {
						promises.push(scenario3(existingBotUsername));
					}
				}

				for (let newBot of newConfig.steamBots) {
					if (existingBots.indexOf(newBot.username) === -1) {
						promises.push(scenario1(newBot));
					}
				}

				Promise.all(promises).then(() => fulfill2()).catch(reject2);
		});
	});

	return Promise.all([updateConfigPromise, updateAdminPromise, updateSteamBotsPromise]);

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