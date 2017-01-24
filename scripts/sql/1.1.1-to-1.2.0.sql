CREATE TABLE public.steam_bots
(
    id SERIAL PRIMARY KEY NOT NULL,
    username TEXT DEFAULT NULL,
    password TEXT DEFAULT NULL,
    steam_guard BOOLEAN DEFAULT false NOT NULL,
    steam_guard_code TEXT DEFAULT NULL,
    sentry_file BYTEA DEFAULT NULL
);

INSERT INTO
	steam_bots
	(username, password, steam_guard_code, sentry_file)
SELECT
	steam_username,
	steam_password,
	steam_guard_code,
	steam_sentry_file
FROM
	config;

ALTER TABLE public.config DROP steam_username;
ALTER TABLE public.config DROP steam_password;
ALTER TABLE public.config DROP steam_guard_code;
ALTER TABLE public.config DROP steam_sentry_file;

ALTER TABLE public.events ADD lobby_bot_id INT DEFAULT NULL  NULL;
ALTER TABLE public.events ADD dota_match_id TEXT DEFAULT NULL  NULL;

ALTER TABLE public.users ADD solo_mmr INT DEFAULT NULL  NULL;