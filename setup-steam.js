const fs       = require("fs");
const inquirer = require("inquirer");
const pg       = require("pg");
let cfg        = require("./config");

// So that we don't get a "can't read property of undefined" error
cfg.db = cfg.db || {};

console.log("Hello! Welcome to the ScheduleBot setup script - Steam edition!\n" +
	"This script assumes that you've already created your database structure with:\n\n" +

	"npm run setup\n\n" +

	"If you haven't, please run that script first.\n\n" +

	"This script will store your Steam bot credentials in the database,\n" +
	"so first we need to connect to it.\n");

inquirer.prompt([
	{
		type: "input",
		name: "db_host",
		message: "Host",
		default: cfg.db.host || null
	},
	{
		type: "input",
		name: "db_database",
		message: "Database",
		default: cfg.db.database || null
	},
	{
		type: "input",
		name: "db_user",
		message: "User",
		default: cfg.db.user || null
	},
	{
		type: "password",
		name: "db_password",
		message: "Password",
		default: cfg.db.password || null
	},
	{
		type: "confirm",
		name: "db_ssl",
		message: "Use SSL?",
		default: true
	}
]).then(answers => {

	pg.defaults.ssl = answers.db_ssl;

	let conStr = "postgres://" + answers.db_user + ":" + answers.db_password
		+ "@" + answers.db_host + "/" + answers.db_database;

	let client = new pg.Client(conStr);

	client.connect(err => {
		if (!err) {

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
			});

		} else {
			console.error(err);
			process.exit();
		}
	});

}).catch(console.error);

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

		client.query("UPDATE public.config SET steam_username = $1, steam_password = $2," +
			" steam_guard_code = $3", [
				answers.steam_username,
				answers.steam_password,
				answers.steam_guard_code
		], err => {
			if (!err) {

				console.log("\nYour Steam credentials have been inserted to the database.\n" +
					"Now you have to run your bot (if you're running locally) or\n" +
					"deploy it as soon as posible, before the Steam Guard Code expires\n" +
					"(I don't know how long does it take for it to expire, or even if it does\n" +
					"expire, but just in case).\n\n" +

					"When you run the bot, the Steam Guard Code will be used and deleted from\n" +
					"the database, since after that it becomes useless. If login is " +
					"successful,\n" +
					"a sentry file which allows the bot to log in without Steam Guard will be\n" +
					"created in the bot's directory.");

			} else {
				console.error(err);
			}

			process.exit();
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

		client.query("UPDATE public.config SET steam_username = $1, steam_password = $2", [
			answers.steam_username,
			answers.steam_password
		], err => {
			if (!err) {

				console.log("\nYour Steam credentials have been inserted to the database.\n" +
					"You may now run or deploy your bot.");

			} else {
				console.error(err);
			}

			process.exit();
		});

	});
}