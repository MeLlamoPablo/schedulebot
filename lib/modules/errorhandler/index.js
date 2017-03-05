const Heroku = require('heroku-client');

function errorHandler(err) {
	console.error("A fatal error occurred!");
	console.error(err);

	if (process.env.HEROKU_API_KEY) {

		console.error("The bot will try to shut down and turn on the setup site automatically.\n" +
			"If everything goes well, you should see the setup site live on:\n" +
			`http://${process.env.HEROKU_APP_NAME}.herokuapp.com`);

		const hk = new Heroku({ token: process.env.HEROKU_API_KEY });

		hk.patch(`/apps/${process.env.HEROKU_APP_NAME}/formation/web`, {
			body: { quantity: 1 }
		})
			.then(hk.patch(`/apps/${process.env.HEROKU_APP_NAME}/formation/bot`, {
				body: { quantity: 0 }
			}))
			.catch(err2 => {
				console.error("Sorry, couldn't tell Heroku to shut the bot down or turn on the " +
					"Setup site, or both.");
				console.error(err2);
				console.error("Restarting the bot");
				process.exit(1);
			});

	} else {

		process.exit(1);

	}
}

module.exports = errorHandler;