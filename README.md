# Heroku deployment guide

*Note: you're currently viewing the Dota version. This version supports Dota 2 inhouses and its
configuration is a bit trickier because you need a Steam Bot. If you're looking for the standard
version, go
[here](https://github.com/MeLlamoPablo/schedulebot/tree/heroku#heroku-deployment-guide).*

*If you're looking for the local installation instructions, go
[here](https://github.com/MeLlamoPablo/schedulebot/tree/dota#schedulebot--dota-edition).*

If you wanted to host ScheduleBot locally, you'd need to have your computer on 24/7 to have your
bot always online. To avoid that, we could use a PaaS provider, such as
[Heroku](https://www.heroku.com/). Heroku's free plan is good enough for hosting our bot.

## Deployment instructions

To deploy ScheduleBot to Heroku, you will need:

* [NodeJS](https://nodejs.org/en/download/) 6 or above.
* [git](https://git-scm.com/downloads).

First, [sign up to Heroku](https://signup.heroku.com/), and create an app. You may deploy your
bot using the Heroku CLI, or GitHub. I recommend GitHub, as it's easier. If you choose Heroku
CLI, follow the instructions there. If you choose GitHub, first fork this repository. Then, clone
your fork and checkout the `heroku-dota` branch, and install the dependencies:

```sh
$ git clone https://github.com/<your_github_username>/schedulebot.git
$ cd schedulebot
$ git checkout heroku-dota
$ npm install
```

The `heroku-dota` branch is ready to be compatible with Heroku. The differences from `dota` are:

* The database settings are no longer stored in `config.js`, as they are provided by Heroku through
an environment variable.
* The `package.json` file is modified to tell Heroku to use Node 6.
* A `Procfile` with your bot's process is included.

Now edit the bot's settings in `config.js`. You can edit or leave whatever you want, but you should
at least edit:

* `master_channel` with the Discord channel where your bot will operate.
	* If you don't know how to get it, go to Discord's settings, then `Appearance`, then check
	`Developer Mode`. After that, right click on your channel, and click `Copy ID`.
* `default_timezone` with the time zone which will be used by the bot.

Next step is configuring your database. In your app's dashboard, go to `Resources`, and under
`Add-ons`, click `Find more add-ons`. Then search `Heroku Posgres` and add it to your app. The
free version is good enough for personal use.

After adding it, you'll find it under the `Add-ons` section. Click on it to your Heroku Postgres
dashboard, and then click on your newly created Datastore. Scroll down to `Database Credentials`,
 and click `View Credentials`. Now run the setup script entering those credentials:

```sh
$ npm run setup
```

After that, you need to configure your Steam credentials. You'll need to re-enter your Heroku 
Postgres database credentials on the Steam setup script.

```sh
$ npm run setup-steam
```

Follow the script's instructions. After you're done, you're ready to push your repo to GitHub:

```sh
$ git add .
git commit -m "Ready to deploy"
$ git push --all
```

Before deploying your bot, let's add your bot user to your Discord server. In order to do so, go 
to the [Discord dev center](https://discordapp.com/developers/applications/me/) and click on your
application, then grab your Client ID. Then go to the following link in your browser:
 
```
https://discordapp.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=0x00002000
```

Replace `YOUR_CLIENT_ID` by your bot's client ID. Don't forget to grant the "Manage Messages" 
permission.

Now, in your Heroku dashboard, go to `Deploy`, select `GitHub`, connect your account, and add
your fork. Be sure to select the `heroku-dota` branch.

The first build should be triggered. When it's done, navigate to `Resources`, and, if everything
went right, you should see two Dynos: `web`, and `bot`. Shutdown `web`, as we don't need it, and
turn on `bot`. After that, your bot will be loaded. Go to the top right corner, under `More`,
then `View Logs` to see the console log. If you see the message
`[INFO] ScheduleBot finished loading.`, the bot is live. Congratulations!

# Usage guide

After deploying your bot, you might want to check out the
[usage guide](https://github.com/MeLlamoPablo/schedulebot/blob/dota/usage/usage-guide.md).

## Updating

Updating your bot is easy. First, you need to know which version you have installed. To do so, go
to Discord and run the command:

```
@ScheduleBot --help
```

*Note: replace `@ScheduleBot` with your app's prefix*. Take note of the current version.

After that, stop your bot. Then, replace your current files with the latest version files. If you
used `git` to clone the repository, this is easy:

```sh
$ git pull --all
```

If you forked this repo to deploy to Heroku, this will not work, because it's pulling from your
repo, and not from this one. To solve that, first [configure this repo (MeLlamoPablo/schedulebot)
as a remote for your fork (YOUR_GITHUB_USERNAME/schedulebot)](https://help.github.com/articles/configuring-a-remote-for-a-fork/).
Then, [fetch this repo](https://help.github.com/articles/syncing-a-fork/)
*(change `master` to `dota` or `heroku-dota`, depending on what branch you're working with)*.

After that, perform another npm install to make sure that you get any new dependencies or update
existing ones:

```
$ npm install
```

However, after all of this your bot is not ready yet. A database update is also required:

```sh
$ npm run update
```

When prompted to select the current version, select the version you took note of. When prompted 
to select the target version, you generally want to select the latest. After that, enter your 
database credentials, and your database will also be updated to the selected version.

You're now ready to run your bot again.