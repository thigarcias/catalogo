-- Configuracao do app: modelo de IA em uso (extracao, chat, comparacao).
-- Editavel pelo menu oculto (clique 3x no titulo "Catálogo"). Sem login,
-- entao e uma unica configuracao valendo para os dois usuarios do catalogo.

create table if not exists public.app_settings (
  id         boolean primary key default true,
  model      text not null default 'gpt-5.4-nano',
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

insert into public.app_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists app_settings_open on public.app_settings;
create policy app_settings_open on public.app_settings
  for all to anon, authenticated
  using (true) with check (true);
