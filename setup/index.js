"use strict";

const inquirer = require("inquirer")
	, fs       = require("fs")
	, path     = require("path")
	, pg       = require("pg")
	, server   = require("schedulebot-setup");

let detailsStructure = require("../scripts/shared/db-details")({});

if (process.env.DATABASE_URL) {
	run(process.env.DATABASE_URL, true);
} else {
	console.log("Hello! Welcome to the ScheduleBot setup server.\n" +
		"Please enter your PostgreSQL database credentials.\n" +
		"Then, you will be able to visit the Setup server on http://localhost:3000\n");

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

			// TODO check if db structure is already created, etc
			server.run(3000).then(console.log).catch(console.error);

		} else {
			console.error("Couldn't connect to the database!\n");
			console.error(err);
			process.exit(1);
		}

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