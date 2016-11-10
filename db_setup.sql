CREATE TABLE public.config
(
    bot_token TEXT
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
    waiting JSON
);

CREATE TABLE confirms
(
    id SERIAL PRIMARY KEY NOT NULL,
    event INTEGER,
    "user" TEXT,
    attends BOOLEAN,
    CONSTRAINT confirms_events_id_fk FOREIGN KEY (event) REFERENCES events (id) ON DELETE CASCADE
);