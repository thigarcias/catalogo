# Catálogo

Catálogo de itens para comprar numa mudança. Categorias e subcategorias em
árvore (Eletrodomésticos → Geladeira → …), com os candidatos de cada
subcategoria em cards para comparar preço, loja e avaliação antes de decidir.

Sem login: catálogo único, compartilhado por quem tiver a URL.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind 4 + shadcn/ui
- Supabase (Postgres)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as duas variaveis do Supabase
npm run dev
```

`.env.local`:

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API Keys (publishable) |

## Banco

O schema está em [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
Para aplicar num projeto novo, cole o arquivo no SQL Editor do Supabase.

Duas tabelas: `categories` (com `parent_id` auto-referencial, o que permite
quantos níveis de subcategoria você quiser) e `items`. RLS fica ligado com
política permissiva para a role `anon` — é o que dá acesso sem sessão.

## Procedência dos dados

Cada item guarda `source` e `price_source` (`oficial` / `extraido` /
`estimado` / `manual`), e a UI mostra preço estimado em cinza com aviso.

Isso existe porque a extração automática de link não é uniformemente
confiável: as varejistas brasileiras variam muito na postura antibot. Amazon
lê bem; Mercado Livre bloqueia scraping mas tem API oficial; Casas Bahia e
Leroy Merlin bloqueiam. Busca web identifica bem o produto, mas devolve preço
inconsistente (às vezes parcela em vez do valor à vista). Por isso o item é
sempre um formulário editável, e a extração só pré-preenche.

## Scripts

```bash
npm run dev     # desenvolvimento
npm run build   # build de producao
npm run lint    # eslint
```
