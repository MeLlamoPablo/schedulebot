"use strict";

const dbDetailsGen = require("./shared/db-details");
const fs       = require("fs");
const inquirer = require("inquirer");
const pg       = require("pg");
let cfg        = require("../config");

// So that we don't get a "can't read property of undefined" error
cfg.db = cfg.db || {};
let dbDetails = dbDetailsGen(cfg.db);

console.log("Hello! Welcome to the ScheduleBot setup script - Steam edition!\n" +
	"This script assumes that you've already created your database structure with:\n\n" +

	"npm run setup\n\n" +

	"If you haven't, please run that script first.\n\n" +

	"This script will store your Steam bot credentials in the database,\n" +
	"so first we need to connect to it.\n");

inquirer.prompt(dbDetails).then(answers => {

	pg.defaults.ssl = answers.db_ssl;

	let conStr = "postgres://" + answers.db_user + ":" + answers.db_password
		+ "@" + answers.db_host + "/" + answers.db_database;

	let client = new pg.Client(conStr);

	client.connect(err => {
		if (!err) {

			client.query("SELECT * FROM steam_bots", (err, result) => {

				if (!err) {

					if (result.rows.length > 0) {

						// The user doesn't have a Steam bot configured, so just prompt them to
						// configure their first bot.
						let options = [];

						options.push("Add an additional Steam Bot");

						for (let i = 0; i < result.rows.length; i++) {
							let bot = result.rows[i];
							let option = `Remove bot #${bot.id} - Username '${bot.username}'`;

							if (bot.steam_guard) {
								option += " - Using Steam Guard";
							}

							options.push(option);
						}

						console.log(); // Newline
						inquirer.prompt({
							type: "list",
							name: "action",
							message: "What do you want to do?",
							choices: options,
							filter:  input => new Promise((fulfill, reject) => {
								let matches = input.match(/Remove bot #([0-9]+)(?:.+)/);

								if (matches) {
									fulfill({
										action: "remove",
										bot: matches[1]
									});
								} else if (input === "Add an additional Steam Bot") {
									fulfill({ action: "add" })
								} else {
									reject(new Error("Unknown action: " + input));
								}
							})
						}).then(answers => answers.action).then(answer => {

							switch (answer.action) {
								case "add":

									addBot(client);

									break;
								case "remove":

									removeBot(answer.bot, client);

									break;
							}

						}).catch(err => {
							console.error(err);
							process.exit(1);
						});

					} else {

						// Let the user decide if they want to configure another bot or just
						// remove an existing one
						addBot(client);

					}

				} else {
					console.error(err);
					process.exit(1);
				}

			});

		} else {
			console.error(err);
			process.exit(1);
		}
	});

}).catch(console.error);

function addBot(client) {
	inquirer.prompt({
		 type: "confirm",
		 name: "steam_guard",
		 message: "Does your bot have Steam Guard enabled?",
		 default: true
	}).then(answers => {
		 if (answers.steam_guard) {
		 	steamGuard(client);
		 } else {
		 	noSteamGuard(client);
		 }
	 }).catch(err => {
		console.error(err);
		process.exit(1);
	});
}

function steamGuard(client) {
	console.log("\nOkay, here's how it works:\n" +
		"You need to open up a Firefox private/Chrome incognito window, and go to:\n\n" +

		"https://steamcommunity.com/login/home/\n\n" +

		"And login as your bot. Then, go to your email and grab your Steam Guard code.\n" +
		"After you have it, enter your login credentials and the code here:\n");

	inquirer.prompt([
		{
			type: "input",
			name: "steam_username",
			message: "Steam Username"
		},
		{
			type: "password",
			name: "steam_password",
			message: "Steam Password"
		},
		{
			type: "input",
			name: "steam_guard_code",
			message: "Steam Guard Code"
		}
	]).then(answers => {

		client.query("INSERT INTO public.steam_bots (username, password, steam_guard_code, " +
			"steam_guard) VALUES ($1, $2, $3, $4)", [
				answers.steam_username,
				answers.steam_password,
				answers.steam_guard_code,
				true
		], err => {
			if (!err) {

				console.log("\nYour Steam credentials have been inserted to the database.\n" +
					"Now you have to run your bot (if you're running locally) or\n" +
					"deploy it as soon as possible, before the Steam Guard Code expires\n" +
					"(I don't know how long does it take for it to expire, or even if it does\n" +
					"expire, but just in case).\n\n" +

					"When you run the bot, the Steam Guard Code will be used and deleted from\n" +
					"the database, since after that it becomes useless. If login is " +
					"successful,\n" +
					"a sentry file which allows the bot to log in without Steam Guard will be\n" +
					"created in the bot's directory.");
				process.exit();

			} else {
				console.error(err);
				process.exit(1);
			}
		});

	});
}

function noSteamGuard(client) {

	inquirer.prompt([
		{
			type: "input",
			name: "steam_username",
			message: "Steam Username"
		},
		{
			type: "password",
			name: "steam_password",
			message: "Steam Password"
		}
	]).then(answers => {

		client.query("INSERT INTO public.steam_bots (username, password) VALUES ($1, $2)", [
			answers.steam_username,
			answers.steam_password
		], err => {
			if (!err) {

				console.log("\nYour Steam credentials have been inserted to the database.\n" +
					"You may now run or deploy your bot.");
				process.exit();

			} else {
				console.error(err);
				process.exit(1);
			}
		});

	});
}

function removeBot(id, client) {

	inquirer.prompt({
		type: "confirm",
		name: "continue",
		message: "This bot will be removed. Do you want to proceed?",
		default: true
	}).then(answers => {

		if (answers.continue) {

			client.query("DELETE FROM steam_bots WHERE id = $1", [id], err => {

				if (!err){

					client.query("SELECT * FROM steam_bots", (err, result) => {

						if (err) {
							console.error(err);
							process.exit(1);
						}

						// If there are no more bots, restart the sequences, so the next bot
						// is assigned ID 1.
						if (result.rows.length === 0) {
							client.query("TRUNCATE TABLE public.steam_bots" +
								" RESTART IDENTITY RESTRICT;", err => {

								if (err) {
									console.error(err);
									process.exit(1);
								}

								console.log("\nThis bot has been successfully removed from the " +
									"database.");
								process.exit();

							});
						} else {
							console.log("\nThis bot has been successfully removed from the " +
								"database.");
							process.exit();
						}

					});



				}else {
					console.error(err);
					process.exit(1);
				}

			});

		} else {

			console.log("\nSee ya!");
			process.exit();

		}

	}).catch(err => {
		console.error(err);
		process.exit(1);
	});

}