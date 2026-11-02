# Sauron

Mapa e catálogo de fontes públicas do Rio de Janeiro. O projeto usa Next.js, Drizzle ORM e PostgreSQL do Supabase. O banco SQLite local não é usado em produção.

## Desenvolvimento local

1. Crie um projeto Supabase e copie a URI do pooler de transação.
2. Copie `.env.example` para `.env.local` e preencha `DATABASE_URL` com a URI do projeto.
3. Instale dependências e prepare o banco e os dados iniciais:

```bash
npm install
npm run db:setup
npm run dev
```

O comando `db:setup` cria as tabelas, grava o catálogo inicial e importa os pontos de câmera de `data/cameras.json`.

## Publicação na Vercel

1. Configure `DATABASE_URL` na Vercel usando a URI do pooler de transação do Supabase (porta `6543`), com `workaround=supabase-pooler.vercel` e `sslmode=require`.
2. Rode `npm run db:setup` uma vez, apontando para esse mesmo banco Supabase.
3. Publique o repositório como um projeto Next.js na Vercel e configure `NEXT_PUBLIC_SITE_URL` com o domínio publicado.
4. Faça o deploy. O build não altera nem recria o banco.

Não use a senha do banco em variáveis `NEXT_PUBLIC_*`. Ela deve permanecer somente em `DATABASE_URL`, nos ambientes Development, Preview e Production que precisarem consultar o catálogo.
