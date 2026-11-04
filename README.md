# Errejota

**Mapa colaborativo de câmeras e catálogo de fontes públicas do Rio de Janeiro.** O Errejota organiza informações por região e bairro, mostra onde há câmeras cadastradas e direciona cada pessoa à página oficial da fonte. O projeto também reúne referências de serviços e informações públicas úteis para acompanhar a cidade.

O Errejota não transmite nem grava vídeo. O mapa armazena pontos e metadados; ao selecionar uma câmera, a pessoa abre o endereço oficial do provedor.

**Site:** [errejota.live](https://errejota.live)

**Contribuições:** veja [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir uma proposta.

## O que você encontra

- Mapa responsivo com câmeras cadastradas e limites dos bairros.
- Dossiê de cada bairro com as câmeras disponíveis naquele local.
- Catálogo pesquisável de fontes públicas, com categoria, abrangência e proveniência.
- Links para as páginas originais dos provedores.
- Interface em português, com suporte a tema claro e escuro.

## Tecnologias

- Next.js 16, React 19 e TypeScript.
- Tailwind CSS 4 e MapLibre GL.
- PostgreSQL no Supabase, acessado no servidor com Drizzle ORM. Sem `DATABASE_URL`, o desenvolvimento usa um PostgreSQL local em WASM (PGlite).
- Dados iniciais mantidos em `src/db/seed-data/`; câmeras importadas de `data/cameras.json`.

## Rodar localmente

Você precisa de Node.js e npm. O banco pode ser local ou um projeto Supabase seu.

Para desenvolver sem configurar nada, use o banco local (PGlite), que é criado dentro de `data/pglite`:

```bash
git clone https://github.com/victorcapile/errejota.git
cd errejota
npm ci
npm run db:local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Para usar o Supabase, copie `.env.example` para `.env.local` e preencha `DATABASE_URL` (ou `POSTGRES_URL`) com a URL PostgreSQL do seu projeto. Mantenha senhas e URLs privadas fora de `NEXT_PUBLIC_*` e nunca as envie em commits ou issues.

```bash
cp .env.example .env.local
npm run db:setup
npm run dev
```

> `db:setup` aplica o schema com Drizzle, grava os dados iniciais e importa `data/cameras.json`. A importação de câmeras usa `--replace`: remove do banco câmeras ausentes do arquivo. Use um banco de desenvolvimento seu e confira o conteúdo do arquivo antes de rodar o comando.

> O PGlite grava no sistema de arquivos e aceita apenas um processo por vez. Pare `npm run dev` antes de rodar `db:local`, `db:seed` ou `db:cameras` no banco local.

> `npm run build` precisa de `DATABASE_URL`/`POSTGRES_URL`: o build usa vários workers em paralelo e o banco local (PGlite) é apenas para desenvolvimento.

> Local e produção são bancos **separados**: o local é o PGlite (`data/pglite`) e a produção é o Postgres do Supabase. Para espelhar a produção (fonte da verdade) no local:

```bash
# pare o `npm run dev` antes (o PGlite aceita um processo por vez)
PRODUCTION_DATABASE_URL="postgresql://..." npm run db:sync
```

> `db:sync` apaga as tabelas locais e recarrega tudo da produção. O caminho inverso (local → produção) não é feito por esse comando: alterações locais devem ser aplicadas via seed/import ou manualmente, com cuidado.

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia o ambiente de desenvolvimento. |
| `npm run lint` | Executa o ESLint. |
| `npm run typecheck` | Verifica os tipos TypeScript. |
| `npm run build` | Gera a compilação de produção. |
| `npm run db:push` | Sincroniza o schema Drizzle com o banco configurado. |
| `npm run db:local` | Cria o banco local (PGlite), aplica o schema, grava os seeds e importa as câmeras. |
| `npm run db:seed` | Grava ou atualiza regiões, bairros, fontes, tags e notícias curadas. |
| `npm run db:cameras` | Importa câmeras sem remover as existentes. |
| `npm run db:cameras -- --replace` | Importa câmeras e remove as que não estão no arquivo de entrada. |
| `npm run db:status` | Verifica no provedor quais câmeras estão online/offline e grava o estado. |
| `npm run db:camera:set -- 004827 offline` | Marca uma câmera manualmente como `online`, `offline` ou `unknown`. Use `--search="nome"` para descobrir o ID. |
| `npm run db:sync` | Espelha o banco de produção (Supabase) no banco local (PGlite). Requer `PRODUCTION_DATABASE_URL`. |
| `npm run db:camera:set -- --all=online` | Marca todas as câmeras como online de uma vez. |

## Estrutura do projeto

```text
src/app/                 Páginas, layout e endpoints HTTP
src/components/catalog/  Busca, filtros e resultados do catálogo
src/components/map/      Mapa, navegação e dossiê do bairro
src/db/                  Conexão PostgreSQL, schema, seeds e notícias
src/lib/                 Consultas, validações, formatos e tipos
data/cameras.json        Dados de câmeras usados pelo importador
public/bairros.geojson   Limites geográficos exibidos no mapa
docs/                    Arquitetura, fontes, catálogo e dados de câmera
```

## Endpoints de leitura

- `GET /api/cameras?region=<slug>&neighborhood=<slug>` — câmeras do mapa.
- `GET /api/cameras/status` — resumo de câmeras online, offline e sem status.
- `POST /api/cameras/status` — verifica um lote de câmeras no provedor (usado por `npm run db:status`).
- `GET /api/sources` — lista paginada de fontes; aceita busca e filtros documentados em `src/lib/catalog-params.ts`.
- `GET /api/sources/<slug>` — detalhe de uma fonte.
- `GET /api/neighborhoods?region=<slug>&q=<texto>` — bairros e contagem de fontes.
- `GET /api/meta` — metadados do catálogo.

## Como contribuir

Correções, melhorias de acessibilidade, documentação, dados com fonte verificável e ajustes de desempenho são bem-vindos. Para começar:

1. Leia [CONTRIBUTING.md](CONTRIBUTING.md) e os documentos relacionados à mudança.
2. Abra uma issue para discutir alterações grandes ou novos dados.
3. Crie uma branch, implemente a mudança e descreva como verificá-la.
4. Abra um pull request pequeno e explique o contexto, o resultado esperado e eventuais limitações.

As contribuições precisam preservar a origem dos dados e o princípio de link para a página oficial. Não adicione reconhecimento de pessoas ou veículos, gravação de vídeo, extração de feeds privados ou meios de contornar controles de acesso. Consulte `docs/FONTES.md`, `docs/CAMERAS.md` e [CONTRIBUTING.md](CONTRIBUTING.md).

## Publicação

O repositório está conectado à Vercel pelo GitHub. A aplicação consulta o Supabase usando `DATABASE_URL` ou `POSTGRES_URL` configurada no ambiente da Vercel; a credencial deve ficar no servidor. Commits na branch de produção disparam novos deploys. Para configurar uma instalação própria, consulte as instruções acima e a documentação oficial de [deploy do Next.js na Vercel](https://vercel.com/docs/frameworks/nextjs).

## Dados e atribuição

Dados de terceiros mantêm as licenças, atribuições e condições indicadas em suas fontes originais. Consulte `docs/FONTES.md` antes de reutilizar dados e confirme os termos aplicáveis ao código antes de redistribuí-lo.
