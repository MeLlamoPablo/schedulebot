module.exports = function(defaults) {
	return [
		{
			type: "input",
			name: "db_host",
			message: "Host",
			default: defaults.host || null
		},
		{
			type: "input",
			name: "db_database",
			message: "Database",
			default: defaults.database || null
		},
		{
			type: "input",
			name: "db_user",
			message: "User",
			default: defaults.user || null
		},
		{
			type: "password",
			name: "db_password",
			message: "Password",
			default: defaults.password || null
		},
		{
			type: "confirm",
			name: "db_ssl",
			message: "Use SSL?",
			default: true
		}
	];
};