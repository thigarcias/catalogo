-- Catalogo de mudanca: categorias em arvore + itens candidatos a compra.
--
-- Catalogo unico e compartilhado, sem login: as duas pessoas que usam o app
-- enxergam e editam os mesmos dados. RLS fica ligado, mas com politica
-- permissiva para a role anon -- e o que permite acesso sem sessao.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- categories: parent_id auto-referencial permite N niveis
-- (Eletrodomesticos -> Geladeira -> ...)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.categories (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 80),
  icon       text,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists categories_parent_idx on public.categories (parent_id);

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,

  name        text not null check (char_length(trim(name)) between 1 and 200),
  url         text,
  store       text,
  image_url   text,

  price       numeric(12, 2) check (price >= 0),
  currency    text not null default 'BRL',

  -- De onde veio cada dado, para saber em qual numero confiar.
  -- oficial  = API oficial da loja (ex: Mercado Livre)
  -- extraido = lido da pagina do produto
  -- estimado = inferido de busca web, pode estar desatualizado
  -- manual   = digitado a mao
  source       text not null default 'manual'
               check (source in ('oficial', 'extraido', 'estimado', 'manual')),
  price_source text not null default 'manual'
               check (price_source in ('oficial', 'extraido', 'estimado', 'manual')),

  rating      numeric(2, 1) check (rating between 0 and 5),
  value_score integer check (value_score between 0 and 10),

  notes       text,
  status      text not null default 'candidato'
              check (status in ('candidato', 'descartado', 'comprado')),
  is_favorite boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists items_category_idx on public.items (category_id);

-- ---------------------------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Acesso sem login
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.items      enable row level security;

drop policy if exists categories_open on public.categories;
create policy categories_open on public.categories
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists items_open on public.items;
create policy items_open on public.items
  for all to anon, authenticated
  using (true) with check (true);
