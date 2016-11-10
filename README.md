# ScheduleBot
> A Discord bot that makes scheduling easy

ScheduleBot is a bot that manages events, such as a practice game with your team, or a league
inhouse, or a tournament match.

## Features

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

To run ScheduleBot locally, you will need:

* [NodeJS](https://nodejs.org/en/download/) 6 or above.
* [PostgreSQL](https://www.postgresql.org/download/).
	* You'll need to create an empty database for ScheduleBot.
* [git](https://git-scm.com/downloads), so you can easily clone this repo (optional).

Start by cloning this repo:

```sh
$ git clone https://github.com/MeLlamoPablo/schedulebot.git
$ cd schedulebot
```

And edit the bot's settings in `config.js`. You can edit or leave whatever you want, but you
should at least edit:

* `master_channel` with the Discord channel where your bot will operate.
	* If you don't know how to get it, go to Discord's settings, then `Appearance`, then check
	`Developer Mode`. After that, right click on your channel, and click `Copy ID`.
* `default_timezone` with the time zone which will be used by the bot.
* `db` with yout postgres database settings.

Now, make sure that your postgres server is running, and run the database setup script:

```sh
$ npm run setup
```

The script will take your database settings from `config.js`, so you can just go ahead and press
enter. When asked if you want to connect over SSL, unless you have configured your postgres
server to use it, you should say no. Then follow the script's instructions to finish the setup.

After that, you just need to install the dependencies, and you're good to go.

```sh
$ npm install
```

You can run your bot with:

```sh
$ npm run bot
```
## License

Apache-2.0 © [Pablo Rodríguez](https://github.com/MeLlamoPablo)
