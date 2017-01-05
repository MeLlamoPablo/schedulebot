ALTER TABLE public.events ADD instant BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.events DROP lobby_ended;
ALTER TABLE public.events ADD lobby_status INT DEFAULT 1 NOT NULL;