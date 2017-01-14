-- TODO MODIFY THIS FILE AS WELL
CREATE TABLE public.config
(
  bot_token TEXT,
  steam_username TEXT,
  steam_password TEXT,
  steam_guard_code TEXT,
  steam_sentry_file BYTEA
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
    lobby_status INT DEFAULT 1 NOT NULL
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
  steam_id TEXT
);