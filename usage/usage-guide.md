# ScheduleBot: basic usage

*This guide assumes that you have the bot already running. If you haven't, check "[Local 
Installation](https://github.com/MeLlamoPablo/schedulebot#local-installation)" or 
"[Deploying to Heroku](https://github.com/MeLlamoPablo/schedulebot/tree/heroku-dota#heroku-deployment-guide)"*.

ScheduleBot's structure has two levels of access: the public level, which is accessed with the 
`congfig.js:prefix` prefix, and the admin level, which is accesses with the
`config.js:adminApp.prefix` prefix.

For this guide, let's say that our prefixes are `@ScheduleBot` for our public level (remember 
that you can configure your prefix to be a mention to your bot user by setting the prefix to be 
`@<MY_BOT_USER_ID>`), and `shedulebot-admin` for the admin level.

## The public level

The public bots has seven commands available:

### create

The `create` commands is used (you guessed it) to create events. It takes two arguments:

* `name` is the name of the event. It can be anything you want, but be careful: if you have 
spaces in your name, you must use either "double quotes" or 'single quotes'. Otherwise the bot 
would only recognize the first word as the name.
* `time` is the date and time of the event, in the format specified in `config.js:time_format`.
	* Instead of a time string, the keyword "now" can be used to create an instant event.

It also accepts the following flags:

* `--limit` (alias `-l`) determines the maximum number of people that can attend the event. Once 
the limit has been reached, further sign ups are rejected. An event must have a limit of 10 or 
greater to be eligible for hosting an inhouse.
* `--timezone` (alias `-t`) determines the time zone in which the `time` argument is being 
specified.
* `--timestamp` (alias `-u`), if passed, determines that the `time` is being passed as an
[UNIX Timestamp](https://en.wikipedia.org/wiki/Unix_time) instead of a date string.

Examples:

* Creating an event for a given time:
	```
	@ScheduleBot create Test "01/01/2016 15:00"
	```
* Creating an event with a name containing spaces:
	```
	@ScheduleBot create "My Custom Event" "01/01/2016 15:00"
	```
* Creating an event with a custom limit.
	```
	@ScheduleBot create "My Custom Event" "01/01/2016 15:00" --limit 15
	```
* Creating an instant event
	```
	@ScheduleBot create "My Custom Event" now
	```
* Creating an event in a custom time zone:
	```
	@ScheduleBot create "My Custom Event" "01/01/2016 15:00" --timezone "America/New_York"
	```
	Click [here](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) for a list of 
	accepted time zones (column `TZ`).
* Creating an event with an UNIX Timestamp:
	```
	@ScheduleBot create "My Custom Event" 1451606400 --timestamp
	```

### confirm

The `confirm` command is used to confirm or deny attendance to an event. It takes two arguments:

* `id` is the ID of the event you are referring to.
* `attendance` is either `yes` or `no` (if not provided, defaults to `yes`). Use `yes` to confirm
 or `no` to deny.
 
Example:

```
> @ScheduleBot create Test "01/01/2016 15:00"
> @DearUser,
  Your event Test was created with ID #1.
> @ScheduleBot confirm 1
> @DearUser,
  Your attendance status was updated.
```

### link-steam

*(Dota Edition only)*

The `link-steam` command, used without any arguments, replies with a link to the Steam Bot's 
profile. When you add the bot as a friend on Steam, it will send you a code. After that, you can 
run this command again with your code.

Example:

```
@ScheduleBot link-steam MY_CODE
```

Your Steam account will then be verified, and you'll be able to join inhouse events.

### add-inhouse

*(Dota Edition only)*

The `add-inhouse` command is used to link an event to an inhouse Dota 2 lobby. When the event 
time comes, the lobby will automatically be created by the bot, and every user who has confirmed 
their attendance will be automatically invited.

The preferred method for joining is through a bot invite, because only the people who have 
confirmed their attendance are eligible for one. This way, the people who sign up first are the 
ones who have the guarantee to play, because further sign ups would be rejected for exceeding the
limit.
 
However, if for some reason there are players who can't join, a bot admin can retrieve the lobby 
password by using the admin command `get-lobby`.

Once an inhouse has been added to an event, every attendant is required to have its Steam account
linked through `link-steam`, so that the Dota bot can invite them to the lobby. Anyone who hasn't
linked their Steam account, but confirmed their attendance would be removed from the attendant 
list, and anyone who hasn't linked their Steam account and attempts to sign up for an inhouse event
would receive an error.

**Note: remember to set the `--limit` of the event you are adding an inhouse to to 10!**

The `add-inhouse` command takes one argument:

* `id` is the ID of the event you are referring to.

It also accepts the following flags:

* `--gamemode` (alias `-g`) determines the game mode of the inhouse lobby. Run the command with 
the `--help` flag to see a list containing all the possible options.
* `--server` (alias `-s`) determines the server of the inhouse lobby. Run the command with 
the `--help` flag to see a list containing all the possible options.
* `--cmpick` (alias `-p`) determines which side gets the first pick in Captains Mode. It can be
either `Radiant`, `Dire`, or `Random` (default value). This only works if `--gamemode` is set to
`Captains Mode`, otherwise it's ignored.
* `--nobalance` (alias `-n`) disables, if passed, the automatic team balance that occurs before 
game launch.

The `add-inhouse` command can also be run over an event with an already defined inhouse to edit 
its parameters.

Example:

```
> @ScheduleBot create Test "01/01/2016 15:00"
> @DearUser,
  Your event Test was created with ID #1.
> @Schedulebot add-inhouse 1 --gamemode "All Pick" --server "Luxembourg" --nobalance
```

### resend-invite

*(Dota Edition only)*

The `resend-invite` command is used to resend an invite to the current lobby to the player 
invoking the command. This is to be used in case the invite wasn't sent automatically for some 
reason. It takes one argument:

* `id` is the ID of the event you are referring to.

Example:

```
@ScheduleBot resend-invite 1
```

### convert

The `convert` command is used to convert an event's time to a specified time zone. It takes two 
arguments:

* `id` is the ID of the event you are referring to.
* `timezone` is the time zone you want the time to be displayed in.

Example:

```
@ScheduleBot convert 1 Europe/Madrid
```

### timezones

The `timezones` command doesn't take any arguments, and simply links to 
[this](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) article for a list of all 
accepted time zones.

## The admin level

The admin level is only accessible for bot admins. The first bot admin is configured when you run
 `npm run setup`. Additional admins can be added with `add-admin`.

### add-admin / remove-admin

These commands, as their name says, add or remove admins to/from the admin list. They only take 
one argument:

* `user` is the user you want added/removed. You must **mention** the user, meaning that you'd 
have to type their name like this: `@User#1234`.

Examples:

```
schedulebot-admin add-admin @NewAdmin#1234
schedulebot-admin remove-admin @OldAdmin#9876
```

### blacklist-add / blacklist-remove

These commands add or remove users to the blacklist. Blacklisted users are banned from using the 
bot, and won't be able to execute any commands. Be careful, if you blacklist an admin, they will
still be able to execute admin commands, so you should also run `remove-admin`.
 
As the previous commands, these also take only one argument:

* `user` is the user you want added/removed. You must **mention** the user, meaning that you'd 
have to type their name like this: `@User#1234`.

Example

```
schedulebot-admin blacklist-add @IDontLikeThisGuy#1234
schedulebot-admin blacklist-remove @PromiseToBeGood#9876
```

### config-mode

If you're running the bot on Heroku, this will shut down the bot and turn on the setup site so you
can make changes to the configuration.

If you're not, this has no effect. Shutdown the bot manually and turn it on with `npm run setup`.

### kick

The `kick` command is used to force an user to deny their attendance for an event. This is useful
to keep unwanted players from certain events. Please bear in mind that:

* The kicked user will be notified.
* The kicked user can rejoin at any time. To prevent them from doing so, blacklist them with the 
`blacklist-add` command.

The `kick` commands takes two arguments:

* `user` is the user you want added/removed. You must **mention** the user, meaning that you'd 
have to type their name like this: `@User#1234`.
* `id` is the ID of the event you are referring to.

Example

```
schedulebot-admin kick @FuckOff#1234 1
```


### remove-event

The `remove-event` command is used to permanently delete an event and all of its associated 
confirms. It only takes one argument:

* `id` is the ID of the event you are referring to.

Example:

```
schedulebot-admin remove-event 1
```

### link

The link command is useful when you require a group of users to either confirm or deny attendance.
For instance, suppose that you have a Discord server for your videogame team, but there are also 
friends of yours on the server that aren't part of the team. You'd create a role for team members.
With `link`, you can link that role to any event, so that every user that belongs to that role is
mentioned in the event summary.

`link` takes two arguments:

* `id` is the ID of the event you are referring to.
* `role` is a mention to the role you want linked. As you guessed, the role must be mentionable 
for the command to work. You can make a role mentionable in Discord in `Server Settings > 
Roles`.

Example: 

```
schedulebot-admin link 1 @team-members
```

### get-lobby

*(Dota Edition only)*

The `get-lobby` command is used get the current lobby details (lobby name and password) sent 
to you in a direct messsage. It takes one argument:

* `id` is the ID of the event you are referring to.

Example:

```
schedulebot-admin get-lobby 1
```

### force-lobby-start

*(Dota Edition only)*

The `force-lobby-start` command is used to force a start on the current lobby. Normally, lobbies 
start automatically when 10 players have joined. However, lobbies can be started with less than 
10 with this command.

Example:

```
schedulebot-admin force-lobby-start
```

### status

*(Dota Edition only)*

The `status` command is used to get relevant information about the bot. Currently it shows the
Discord bot's uptime, and the Dota bots' status (In lobby/Not in lobby).

```
schedulebot-admin status
```