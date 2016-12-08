# ScheduleBot | Dota Edition
> A Discord bot that makes scheduling easy

*Note: you're currently viewing the Dota version. This version support Dota 2 inhouses and it's 
configuration is a bit trickier because you need a Steam Bot.
If you're looking for the standard version,
[go here](https://github.com/MeLlamoPablo/schedulebot#schedulebot)*

ScheduleBot is a bot that manages events, such as a practice game with your team, or a league
inhouse, or a tournament match.

## Features

* **Dota inhouses**: the Dota version makes it easy to create inhouses, as you can link an event 
to an inhouse. A Dota bot will automatically create a lobby and invite every player who have 
confirmed their attendance.
* **Time zone handling**: ScheduleBot manages timezons for you. If there are European and
American people on your team, if an European creates an event, Americans will be able to convert
it to their timezone with the `convert` command.
* **Confirm and reject handling**: ScheduleBot allows users to confirm or deny their attendance
to an event, so you can see who and how many people are you gonna play with. ScheduleBot can also
 limit how many people can attend an event.
* **Admin commands**: ScheduleBot allows elevated privilege commands with `schedulebot-admin`.
Admins can perform actions such as removing events, or blacklisting an user to prevent them to
use the bot.
* **Linking an event to a role**: ScheduleBot allows events to be linked to a role, so that
members of that role can be notified when they are required to confirm or deny attendance to an
event.

## Local installation

To run ScheduleBot Dota Edition locally, you will need:

* [NodeJS](https://nodejs.org/en/download/) 6 or above.
* [PostgreSQL](https://www.postgresql.org/download/).
	* You'll need to create an empty database for ScheduleBot.
* [git](https://git-scm.com/downloads), so you can easily clone this repo (optional).
* A second [Steam](http://steamcommunity.com/) account for your bot.

Start by cloning this repo, and then install the dependencies:

```sh
$ git clone https://github.com/MeLlamoPablo/schedulebot.git
$ cd schedulebot
$ npm install
```

And edit the bot's settings in `config.js`. You can edit or leave whatever you want, but you
should at least edit:

* `master_channel` with the Discord channel where your bot will operate.
	* If you don't know how to get it, go to Discord's settings, then `Appearance`, then check
	`Developer Mode`. After that, right click on your channel, and click `Copy ID`.
* `default_timezone` with the time zone which will be used by the bot.
* `db` with yout postgres database settings.
* `steam.profile_url` with your Steam bot's profile URL.

Now, make sure that your postgres server is running, and run the database setup script:

```sh
$ npm run setup
```

The script will take your database settings from `config.js`, so you can just go ahead and press
enter. When asked if you want to connect over SSL, unless you have configured your postgres
server to use it, you should say no. Then follow the script's instructions to finish the setup.

After that, you need to configure your Steam credentials:

```sh
$ npm run setup-steam
```

Follow the script's instructions and you're good to go. You can run then your bot with:

```sh
$ npm run bot
```

## Usage guide

After installing your bot, you might want to check out the
[usage guide](https://github.com/MeLlamoPablo/schedulebot/blob/master/usage/usage-guide.md).

## Deploying to Heroku

If you wanted to host ScheduleBot locally, you'd need to have your computer on 24/7 to have your bot
always online. To avoid that, we could use a PaaS provider, such as Heroku. Heroku's free plan is
good enough for hosting our bot. To learn how to deploy the bot to heroku,
[go here](https://github.com/MeLlamoPablo/schedulebot/tree/heroku#heroku-deployment-guide).

## License

Apache-2.0 © [Pablo Rodríguez](https://github.com/MeLlamoPablo)
