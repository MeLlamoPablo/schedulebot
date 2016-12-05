const Clapp = require("../../../modules/clapp-discord/index");

module.exports = new Clapp.Argument({
	name: "id",
	desc: "The ID of the event",
	type: "number",
	required: true
});