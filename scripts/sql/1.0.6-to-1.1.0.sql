-- !!! WARNING !!!
--
-- By updating to v1.1.0-dota, all your events (and therefore, all confirms) will be removed. If
-- you want to keep them, backup your database first. The rest of your data will be fine.

TRUNCATE TABLE public.events
    RESTART IDENTITY
    CASCADE;

ALTER TABLE public.events ADD instant BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.events DROP lobby_ended;
ALTER TABLE public.events ADD lobby_status INT DEFAULT 1 NOT NULL;