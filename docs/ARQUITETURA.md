# Arquitetura atual

Este documento descreve a aplicação que está no repositório hoje. O projeto começou como um catálogo e evoluiu para um mapa web responsivo conectado a PostgreSQL no Supabase. Para preparar o ambiente, veja o [README](../README.md); para enviar mudanças, veja [CONTRIBUTING.md](../CONTRIBUTING.md).

## Objetivo e limites

O Errejota organiza câmeras e outras fontes públicas por região e bairro, com links para as páginas oficiais e contexto sobre a origem dos dados. O mapa mostra pontos cadastrados e limites de bairros; selecionar um bairro abre o dossiê com as câmeras disponíveis naquela área.

O produto não opera câmeras, não baixa nem armazena vídeo e não incorpora transmissões. O botão de uma câmera leva à página do provedor. A localização de um ponto deve ser identificada como aproximada quando a origem não fornece precisão suficiente.

## Stack

| Parte | Tecnologia | Local principal |
|---|---|---|
| Aplicação web e rotas | Next.js 16 App Router | `src/app/` |
| Interface | React 19, TypeScript e Tailwind CSS 4 | `src/components/`, `src/app/globals.css` |
| Mapa | MapLibre GL | `src/components/map/` |
| Banco | PostgreSQL no Supabase; PGlite (PostgreSQL em WASM) no desenvolvimento local | `src/db/` |
| Acesso e schema | Drizzle ORM e `postgres` | `src/db/schema.ts`, `src/db/index.ts` |
| Importação de câmeras | JSON/CSV local | `scripts/import-cameras.ts` |
| Estado das câmeras | Checagem do endpoint público de sessão do provedor | `src/lib/camera-status.ts` |

No runtime, `src/db/index.ts` usa `DATABASE_URL` ou, como alternativa, `POSTGRES_URL`. Sem essas variáveis, o app usa o banco local em `data/pglite` (PGlite), criado por `npm run db:local`. A conexão é feita no servidor; valores de conexão não devem usar o prefixo `NEXT_PUBLIC_`.

## Organização do código

```text
src/app/                         páginas, metadados e endpoints HTTP
src/app/api/                     API de leitura do catálogo
src/components/catalog/          busca, filtros, cartões e paginação
src/components/map/              mapa, dossiê de bairro e controles
src/components/layout/           cabeçalho e navegação
src/db/schema.ts                 tabelas e relações Drizzle
src/db/seed.ts                   carga inicial idempotente
src/db/seed-data/                bairros, fontes e notícias curadas
src/lib/catalog.ts               consultas e transformação dos resultados
src/lib/catalog-params.ts        validação de parâmetros da API
src/lib/camera-status.ts         checagem online/offline das câmeras
src/lib/constants.ts             categorias, regiões, tags e rótulos
scripts/check-camera-status.ts   CLI que dispara a checagem em lotes
scripts/sync-rain.ts             ingestão de chuva (Alerta Rio)
scripts/sync-risk.ts             indicadores de risco por bairro (CPRM/ISMFI)
data/cameras.json                conjunto de câmeras usado na importação
public/bairros.geojson            polígonos de bairros para o mapa/importador
docs/                            proveniência, catálogo e guias de dados
```

## Dados e fluxo

1. `src/db/seed.ts` insere ou atualiza regiões, bairros, tags, fontes e notícias curadas.
2. `scripts/import-cameras.ts` lê o arquivo local (`data/cameras.csv` ou `data/cameras.json`), valida os registros e grava as câmeras. Quando o arquivo não informa bairro, o importador compara as coordenadas com os polígonos de `public/bairros.geojson`.
3. `src/lib/catalog.ts` consulta o Postgres e prepara os dados consumidos pelas páginas e endpoints.
4. `npm run db:status` (com o servidor rodando) chama `/api/cameras/status`, que consulta o endpoint público de sessão de cada câmera e grava `is_online`. Câmeras offline aparecem apagadas no mapa e no dossiê.
5. A interface do mapa busca as câmeras, renderiza pontos e limites geográficos e abre o dossiê ao selecionar um bairro.
6. Ao abrir uma câmera, a navegação segue para a página oficial indicada no dado.

`npm run db:setup` executa `db:push`, `db:seed` e a importação de câmeras com `--replace`. Este último modo remove câmeras do banco que não aparecem no arquivo. Use somente um banco de desenvolvimento que você controla e confira [docs/CAMERAS.md](CAMERAS.md) antes de importar. Para o banco local, use `npm run db:local`.

## Páginas e endpoints

| Caminho | Uso |
|---|---|
| `/` | Catálogo de fontes com busca, filtros e paginação. |
| `/bairros` | Índice geográfico dos bairros. |
| `/fontes/<slug>` | Detalhe e proveniência de uma fonte. |
| `/sobre` | Método, limites do projeto e descrição da API. |
| `GET /api/cameras?region=&neighborhood=` | Câmeras filtradas por região ou bairro. |
| `GET /api/cameras/status` | Resumo de câmeras online, offline e sem status. |
| `POST /api/cameras/status` | Verifica um lote de câmeras no provedor e grava `is_online`. |
| `POST /api/cameras/status/manual` | Marca uma câmera manualmente como online, offline ou sem status. |
| `GET /api/sources` | Fontes; parâmetros são validados em `src/lib/catalog-params.ts`. |
| `GET /api/sources/<slug>` | Detalhe de uma fonte. |
| `GET /api/neighborhoods?region=&q=` | Bairros filtrados por região e busca textual. |
| `GET /api/meta` | Metadados e estatísticas do catálogo. |
| `GET /api/rain` | Pluviômetros com a leitura mais recente (filtros `region`, `neighborhood`, `metric`, `limit`). |
| `GET /api/conditions` | Condições por bairro: chuva e risco (ISMFI); inclui estágio manual. |
| `GET /api/stage` | Estágio operacional atual (manual). |

## Chuva e alagamentos

Tabelas: `rain_stations`, `rain_observations` (detalhe com retenção de 90 dias), `rain_daily` (agregado diário permanente), `risk_indicators` (um indicador por bairro e fonte), `city_stages` (estágio operacional manual) e `ingest_runs` (monitoramento das ingestões).

- `scripts/sync-rain.ts` (`npm run db:rain`): baixa `mc.json`, valida, grava estações/observações e atualiza o agregado diário.
- `scripts/sync-risk.ts` (`npm run db:risk`): consulta o ISMFI via ArcGIS REST e grava o indicador por bairro (sem armazenar geometria). A camada da CPRM não entra no score por sobreposição de polígonos.
- Agendamento por GitHub Actions (`.github/workflows/`), com `DATABASE_URL` em secrets; não usamos o cron da Vercel (limite do plano Hobby).

Os endpoints retornam JSON. Parâmetros inválidos recebem `400`; item inexistente recebe `404`; falhas de consulta recebem `500`.

## Publicação e ambiente

O repositório GitHub está conectado a um projeto Vercel. A Vercel compila o Next.js e fornece as variáveis de ambiente. O banco de produção Supabase é compartilhado com o runtime por uma URL PostgreSQL privada ao servidor.

Sem `DATABASE_URL`, o runtime usa PGlite em `data/pglite`; esse caminho é pensado para desenvolvimento. Em produção, a rota `POST /api/cameras/status` exige `CAMERA_STATUS_TOKEN` e o cabeçalho `x-status-token`.

Variáveis locais estão descritas em [.env.example](../.env.example). Em produção, configure a variável de conexão no painel da Vercel e nunca a adicione ao Git. O build normal não deve executar seed nem importar arquivos: a carga de dados é uma operação separada.

## Segurança do banco

As consultas do aplicativo usam conexão PostgreSQL do lado do servidor. No estado atual do banco, Row Level Security (RLS) está desativado nas tabelas públicas. Não use uma chave pública do Supabase para acessar essas tabelas pelo navegador nem acrescente acesso Supabase client-side até que RLS e políticas apropriadas sejam configuradas. RLS sem política de leitura também pode bloquear clientes que precisem consultar o catálogo; qualquer política precisa permitir somente as operações necessárias.

## Proveniência e segurança dos dados

- Para cada fonte, registre provedor, URL oficial, data de verificação, escopo e condições de uso em `docs/FONTES.md` ou na auditoria correspondente.
- Não trate uma resposta HTTP 200 como prova de que existe vídeo ao vivo ou permissão de incorporação.
- Não adicione reconhecimento facial, OCR de placas, reidentificação ou histórico de deslocamento.
- Não raspe feeds privados, extraia tokens, contorne autenticação, DRM, CORS ou limites do provedor.
- Não armazene imagens ou vídeos. O registro da câmera guarda coordenadas, identificador e link para a fonte oficial.
- Respeite as atribuições e licenças dos dados geográficos e dos provedores.

## Verificações locais

Antes de abrir um pull request, rode os comandos adequados à mudança:

```bash
npm run lint
npm run typecheck
npm run build
```

Para mudanças visuais, confira o mapa em tela desktop e móvel, incluindo seleção de bairro, abertura do dossiê e clique numa câmera. O guia completo está em [CONTRIBUTING.md](../CONTRIBUTING.md).
