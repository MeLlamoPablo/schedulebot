"use strict";

const Clapp = require('clapp')
	, Table = require('cli-table2')
	, str   = require('./str-en.js');

class App extends Clapp.App {
constructor(options) {
	super(options);
}

_getHelp() {
	const LINE_WIDTH = 175;

	let response = [];

	var r =
			this.name + (typeof this.version !== 'undefined' ? ' v' + this.version : '') + '\n' +
			this.desc + '\n\n' +

			str.help_usage + this.prefix + ' ' + str.help_command + '\n\n' +

			str.help_cmd_list + '\n\n'
		;

	response.push(r);

	// Command list
	var table = new Table({
		chars: {
			'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
			'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
			'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
			'middle': ''
		},
		colWidths: [
			Math.round(0.13*LINE_WIDTH), // We round it because providing a decimal number would
			Math.round(0.67*LINE_WIDTH)  // break cli-table2
		],
		wordWrap: true
	});

	for (var i in this.commands) {
		table.push([i, this.commands[i].desc]);
	}

	response.push(...divideTable(table));
	response.push(str.help_further_help + this.prefix + ' ' + str.help_command + ' --help');

	return response;
}
}

/**
 * Divides the table so that the final message isn't longer than 2000 chars.
 *
 * If the message isn't, it simply returns an array with the table string.
 * If it is, it returns a table string for each table element, separated in an awway.
 *
 * @param {Table} mainTable
 * @return {string[]}
 */
function divideTable(mainTable) {

	let string = mainTable.toString();

	if (string.length <= 2000 - 6) { // -6 because we account the ``` characters twice.
		return ["```" + string + "```"];
	} else {
		let tables = [];

		for (let el of mainTable) {
			let table = new Table({
				chars: mainTable.options.chars,
				colWidths: mainTable.options.colWidths,
				wordWrap: mainTable.options.wordWrap
			});

			table.push(el);
			tables.push(table);
		}

		return tables.map(table => "```" + table.toString() + "```");
	}

}

class Command extends Clapp.Command {
constructor(options) {
	super(options);
}

_getHelp(app) {
	const LINE_WIDTH = 175;
	let response = [];

	var r = str.help_usage + ' ' + app.prefix + ' ' + this.name;

	// Add every argument to the usage (Only if there are arguments)
	if (Object.keys(this.args).length > 0) {
		var args_table = new Table({
			chars: {
				'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
				'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
				'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
				'middle': ''
			},
			head: ['Argument', 'Description', 'Default'],
			colWidths: [
				Math.round(0.10*LINE_WIDTH),
				Math.round(0.45*LINE_WIDTH),
				Math.round(0.25*LINE_WIDTH)
			],
			wordWrap: true
		});
		for (var i in this.args) {
			r += this.args[i].required ? ' (' + i + ')' : ' [' + i + ']';
			args_table.push([
				i,
				typeof this.args[i].desc !== 'undefined' ?
					this.args[i].desc : '',
				typeof this.args[i].default !== 'undefined' ?
					this.args[i].default : ''
			]);
		}
	}

	r += '\n' + this.desc;

	if (Object.keys(this.args).length > 0)
		r += '\n\n' + str.help_av_args + ':\n\n```' + args_table.toString() + '```';

	response[0] = r;
	r = "";

	// Add every flag, only if there are flags to add
	if (Object.keys(this.flags).length > 0) {
		var flags_table = new Table({
			chars: {
				'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '', 'bottom': '' ,
				'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '', 'left': '' ,
				'left-mid': '' , 'mid': '' , 'mid-mid': '', 'right': '' , 'right-mid': '' ,
				'middle': ''
			},
			head: ['Option', 'Description', 'Default'],
			colWidths: [
				Math.round(0.10*LINE_WIDTH),
				Math.round(0.45*LINE_WIDTH),
				Math.round(0.25*LINE_WIDTH)
			],
			wordWrap: true
		});
		for (i in this.flags) {
			flags_table.push([
				(typeof this.flags[i].alias !== 'undefined' ?
				'-' + this.flags[i].alias + ', ' : '') + '--' + i,
				typeof this.flags[i].desc !== 'undefined' ?
					this.flags[i].desc : '',
				typeof this.flags[i].default !== 'undefined' ?
					this.flags[i].default : ''
			]);
		}

		r += '\n\n' + str.help_av_options + ':\n\n```' + flags_table.toString() + '```';
	}

	if (Object.keys(this.args).length > 0)
		r += '\n\n' + str.help_args_required_optional;

	response[1] = r;

	return response;
}
}

module.exports = {
	App: App,
	Argument: Clapp.Argument,
	Command: Command,
	Flag: Clapp.Flag
};
