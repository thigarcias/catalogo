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

| Variável | Onde achar | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → Data API | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API Keys (publishable) | sim |
| `OPENAI_API_KEY` | platform.openai.com/api-keys | só para o botão Analisar |
| `JINA_API_KEY` | jina.ai (tier gratuito) | só para o botão Analisar |
| `OPENAI_MODEL` | opcional, default `gpt-5.4-mini` | não |

Sem `OPENAI_API_KEY` o app funciona normalmente; só o botão "Analisar" fica
indisponível e você preenche os itens à mão.

## Banco

O schema está em [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
Para aplicar num projeto novo, cole o arquivo no SQL Editor do Supabase.

Duas tabelas: `categories` (com `parent_id` auto-referencial, o que permite
quantos níveis de subcategoria você quiser) e `items`. RLS fica ligado com
política permissiva para a role `anon` — é o que dá acesso sem sessão.

## Extração de link e procedência dos dados

O botão "Analisar" tenta duas vias, em ordem ([`src/lib/extract.ts`](src/lib/extract.ts)):

1. **Leitura** — baixa a página via Jina Reader e passa o texto ao modelo.
2. **Busca** — só se a loja bloquear a leitura; o modelo pesquisa o produto.

A diferença entre as duas foi medida, mesmo link da Amazon, 3 chamadas cada:

| Via | Preços devolvidos | Correto |
|---|---|---|
| Leitura da página | `4419`, `4419`, `4419` | 3/3 |
| Busca web | `4119`, `4119`, `4419` | 1/3 |

O valor `4119` não existe em lugar nenhum da página. O modelo lê bem e lembra
mal, e a autoavaliação de confiança dele não distingue os dois casos — pediu
"alta confiança" nas duas vias. Por isso a procedência vem da **via usada**,
nunca do que o modelo diz sobre si:

- `extraido` — veio da leitura da página. Confiável.
- `estimado` — veio de busca. A UI mostra em cinza, com tooltip e aviso.
- `manual` — digitado por você.

Duas defesas que os testes exigiram: URL de imagem passa por `HEAD` e é
descartada se não responder como imagem (o modelo já devolveu
`.../71-placeholder.jpg` inventado), e o preço nunca sobrescreve o que você
já digitou.

Postura das lojas, medida: Amazon lê completa; Leroy Merlin lê parcialmente
(nome sim, preço não); Mercado Livre e Casas Bahia bloqueiam por login wall e
WAF. A API pública do Mercado Livre passou a exigir OAuth (403 `PolicyAgent`),
então não dá para usá-la sem registrar um app de desenvolvedor.

## Scripts

```bash
npm run dev     # desenvolvimento
npm run build   # build de producao
npm run lint    # eslint
```
