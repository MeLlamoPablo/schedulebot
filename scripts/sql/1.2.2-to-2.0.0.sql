ALTER TABLE public.config ADD COLUMN settings JSON;
ALTER TABLE public.config ADD COLUMN db_version VARCHAR(6) NULL;
UPDATE public.config SET db_version = '2.0.0';