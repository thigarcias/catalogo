-- Prós e contras por item, preenchidos pela analise de IA ou a mao.
-- Arrays em vez de texto corrido para a UI listar item a item.

alter table public.items
  add column if not exists pros text[] not null default '{}',
  add column if not exists cons text[] not null default '{}';

comment on column public.items.pros is
  'Pontos positivos. Vindos da analise do link ou digitados.';
comment on column public.items.cons is
  'Pontos negativos e ressalvas.';
