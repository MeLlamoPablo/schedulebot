"use strict";

const Clapp      = require('../../modules/clapp-discord/index')
	, cfg        =  require('../../modules/confighandler/cfg')()
	, db         = require('../../modules/dbhandler')
	, shouldAddN = require('../../modules/helpers/shouldAddN')
;

module.exports = new Clapp.Command({
	name: cfg.quick_inhouse.command_name,
	desc: `Quickly creates a${shouldAddN() ? "n" : ""} ${cfg.dota.game_generic_name} with the ` +
		`default values. This is the equivalent of running ` +
		`\`${cfg.readable_prefix} create ${cfg.quick_inhouse.event_name} now\` and then ` +
		`\`${cfg.readable_prefix} add-${cfg.dota.game_generic_name} (id)\`.` ,
	fn: (argv, context) => {
		return new Promise((fulfill, reject) => {
			let inhouseProps = {
				gameMode: "captainsmode",
				server: cfg.dota.default_server.toLowerCase().replace(" ", ""),
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
					fulfill(`Your ${cfg.quick_inhouse.event_name} has been created ` +
						`with id \`#${id}\`.`);
				}).catch(reject);
		});
	}
});