alter table public.reports drop constraint reports_language_check;
alter table public.reports add constraint reports_language_check check (char_length(language) between 2 and 35 and language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$');
