CREATE TABLE public.config
(
  bot_token TEXT,
  steam_username TEXT,
  steam_password TEXT,
  steam_guard_code TEXT
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
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT,
    time BIGINT,
    summary_msg_id TEXT,
    "limit" INTEGER DEFAULT 5,
    waiting JSON,
    inhouse JSON,
    lobby_ended BOOLEAN DEFAULT false NOT NULL
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