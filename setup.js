const fs       = require("fs");
const inquirer = require("inquirer");
const pg       = require("pg");
var cfg        = require("./config");


// So that we don't get a "can't read property of undefined" error
cfg.db = cfg.db || {};

console.log("Hello! Welcome to the ScheduleBot setup script.\n" +
	"This script will create your database structure to get ScheduleBot working.\n" +
	"First, let's connect to your postgres database. Enter your db info:\n");

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

	var conStr = "postgres://" + answers.db_user + ":" + answers.db_password
		+ "@" + answers.db_host + "/" + answers.db_database;

	var client = new pg.Client(conStr);

	client.connect(err => {
		if (!err) {
			client.query("select * from information_schema.tables where table_schema = 'public'",
				(err, result) => {
				if (!err) {
					if (result.rowCount === 0) {
						console.log("\nAwesome! We can begin with the creation of the" +
							" structure.\n");

						inquirer.prompt({
							type: "confirm",
							name: "continue",
							message: "Do you want to procceed?",
							default: true
						}).then(answers => {
							if (answers.continue) {
								createDbStructure(client).then(() => {
									console.log("\nAlright, database schema created!\n" +
										"Now we just need your bot's token." +
										"\nFor security reasons," +
										" this is not stored on your config.js file;" +
										" it's stored on the database.\n\n" +

										"You can get your bot's token at the following address:\n" +
										"https://discordapp.com/developers/applications/me\n");

									inquirer.prompt({
										type: "text",
										name: "bot_token",
										message: "Your bot's token"
									}).then(answers => {
										client.query("INSERT INTO public.config (bot_token)" +
											"VALUES ($1);", [answers.bot_token], (err) => {
											if (!err) {
												console.log("\nJust one more thing:\n" +
													"We need to set up the bot's admin. More" +
													" people can be added later,\n" +
													"but we need at least one right now so the" +
													" bot can be used.\n\n" +
													"Please, enter the admin's discord's user" +
													" ID\n" +
													"To get that, go to Discord's user settings," +
													" then appearance, then check \"Developer" +
													" Mode\".\n" +
													"After that, right click on your username," +
													" and click \"Copy ID\"\n");

												inquirer.prompt([{
													type: "text",
													name: "admin_id",
													message: "Admin's discord user ID"
												}, {
													type: "text",
													name: "admin_name",
													message: "Admin's discord user name (used to" +
													" label the database entry)"
												}]).then(answers => {
													client.query("INSERT INTO public.admins" +
														" (userid, name) VALUES ($1, $2)",
														[answers.admin_id, answers.admin_name],
														err => {
															if (!err) {
																console.log("\nThat's it! We're" +
																	" done!\nYou can run" +
																	" ScheduleBot with npm run" +
																	" bot\n\nHave fun!");
															} else {
																console.error(err);
															}
															process.exit();
														});

												}).catch(console.error);
											} else {
												console.error(err);
												process.exit();
											}
										})
									}).catch(console.error);
								}).catch(console.error);
							} else {
								console.log("See ya!");
								process.exit();
							}
						}).catch(console.error);
					} else {
						console.error("Sorry, but your database is not empty. You'll need to" +
							" either empty it or modify whant you need manually.");
						process.exit();
					}
				} else {
					console.error(err);
					process.exit();
				}
			});
		} else {
			console.error(err);
			process.exit();
		}
	});
}).catch(console.error);

function createDbStructure(client) {
	return new Promise((fulfill, reject) => {
		try {
			var sql = fs.readFileSync("./db_setup.sql", {encoding: "utf-8"});
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