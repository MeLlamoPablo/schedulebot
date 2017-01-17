"use strict";

const Clapp = require('../../modules/clapp-discord/index')
	, cfg   = require('../../../config')
	, db    = require('../../modules/dbhandler');

module.exports = new Clapp.Command({
	name: cfg.quick_inhouse.command_name,
	desc: "Quickly creates an inhouse with the default values. This is the equivalent of running " +
		`\`${cfg.readable_prefix} create ${cfg.quick_inhouse.event_name} now\` and then ` +
		`\`${cfg.readable_prefix} add-inhouse (id)\`.` ,
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let inhouseProps = {
				gameMode: "captainsmode",
				server: cfg.dota.defaultServer.toLowerCase().replace(" ", ""),
				cmPick: "random",
				autoBalance: true
			};

			db.events.addInstant(cfg.quick_inhouse.event_name, 10)
				.then(id => db.events.get(id))
				.then(event => new Promise((fulfill2, reject2) => {
					db.events.addInhouse(event, inhouseProps)
						.then(() => context.summaryHandler.updateSummary(event))
						.then(msgId => event.updateMsgId(msgId))
						.then(() => fulfill2(event.id)).catch(reject2);
				})).then(id => {
					fulfill(`Your inhouse has been created with id \`#${id}\`.`);
				}).catch(reject);
		});
	}
});