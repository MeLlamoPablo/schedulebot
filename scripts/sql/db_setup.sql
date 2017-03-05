CREATE TABLE public.config
(
  bot_token TEXT,
  settings JSON,
  db_version VARCHAR(6) NULL
);

INSERT INTO public.config (db_version) VALUES ('2.0.0');

CREATE TABLE public.steam_bots
(
    id SERIAL PRIMARY KEY NOT NULL,
    username TEXT DEFAULT NULL,
    password TEXT DEFAULT NULL,
    steam_guard BOOLEAN DEFAULT false NOT NULL,
    steam_guard_code TEXT DEFAULT NULL,
    sentry_file BYTEA DEFAULT NULL
);

CREATE TABLE public.admins
(
    userid TEXT PRIMARY KEY NOT NULL,
    name TEXT
);

CREATE TABLE public.blacklist
(
    userid TEXT PRIMARY KEY NOT NULL,
    name TEXT
);

CREATE TABLE events
(
    id SERIAL PRIMARY KEY NOT NULL,
    name TEXT,
    time BIGINT,
    summary_msg_id TEXT,
    "limit" INTEGER DEFAULT 5,
    waiting JSON,
    inhouse JSON,
    instant BOOLEAN DEFAULT FALSE NOT NULL,
    lobby_status INT DEFAULT 1 NOT NULL,
    lobby_bot_id INT DEFAULT NULL  NULL,
    dota_match_id TEXT DEFAULT NULL  NULL
);

CREATE TABLE confirms
(
    id SERIAL PRIMARY KEY NOT NULL,
    event INTEGER,
    "user" TEXT,
    attends BOOLEAN,
    CONSTRAINT confirms_events_id_fk FOREIGN KEY (event) REFERENCES events (id) ON DELETE CASCADE
);

CREATE TABLE public.users
(
  discord_id TEXT PRIMARY KEY NOT NULL,
  steam_id TEXT,
  solo_mmr INT DEFAULT NULL  NULL
);
