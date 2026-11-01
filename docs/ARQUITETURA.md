# Sauron — arquitetura do catálogo geográfico

**Status:** fundação aprovada para a fase 1  
**Cidade inicial:** Rio de Janeiro  
**Escopo desta fase:** catálogo, busca, filtros, proveniência e páginas de fonte. Players ficam para a fase 3.  
**Uso:** projeto de estudo, sem publicação.

---

## 1. O que o produto é

Um **catálogo geográfico de fontes públicas** de câmeras e contexto urbano. O produto organiza, descreve e liga para a fonte original. Ele não opera câmeras, não grava vídeo, não contorna autenticação e não tenta transformar uma imagem pública em vigilância de pessoas.

A inspiração é a **camada de organização** do CamerasRJ: bairros, corredores, categorias, estado da fonte, proveniência e leitura contextual. A implementação é independente e não reutiliza feeds, endpoints ou listas do site de referência.

### Regra de ouro

> Nenhum embed é exibido enquanto a permissão da fonte não estiver registrada como `verified`.

Na fase 1, todas as fontes são **link-only**. O botão principal sempre abre a página oficial em nova aba.

---

## 2. Decisões travadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Cidade inicial | Rio de Janeiro | Alinha com a referência e permite começar com bairros, corredores e dados estaduais. |
| Banco local | SQLite via libSQL + Drizzle | Zero infraestrutura, sem compilação nativa, fácil de testar. A camada de repositório permite migrar para Postgres/PostGIS. |
| Conteúdo inicial | Fontes oficiais reais, somente link | Evita construir a infraestrutura em torno de feeds que talvez não possam ser incorporados. |
| Entrega | Web primeiro, responsiva e instalável | O mesmo código atende desktop e navegador móvel; PWA fica preparado desde o início. |
| Players | Fase posterior, um tipo por vez | A permissão e o tipo de mídia precisam ser comprovados antes de qualquer embed. |
| REA | Auditoria de fontes e players | Ajuda a observar a página pública, registrar evidências e classificar a mídia sem inventar endpoints. |

---

## 3. Princípios de engenharia

1. **Proveniência antes de interface.** Toda fonte tem URL oficial, provedor, licença/condições e data de checagem.
2. **Permissão é um dado, não uma suposição.** `public_link_only` não vira embed por conveniência.
3. **Status honesto.** “Página respondeu” não é “vídeo ao vivo”. “HTTP 200” não é “player funcionando”.
4. **Link-only por padrão.** O embed é uma exceção documentada.
5. **Sem vigilância.** Nada de reconhecimento facial, OCR de placas, rastreamento ou histórico de pessoas/veículos.
6. **Sem vídeo armazenado.** O sistema guarda metadados e resultados técnicos mínimos.
7. **Mobile-first sem duplicar código.** Layout responsivo, alvos de toque grandes e manifest PWA.
8. **Evolução incremental.** Cada fase tem um critério de teste claro e não bloqueia a anterior.

---

## 4. Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components, Route Handlers e PWA manifest. |
| UI | React 19 + TypeScript | Tipagem do catálogo até a interface. |
| Estilo | Tailwind CSS 4 | Tokens no `globals.css`; sem dependência de biblioteca de componentes. |
| Ícones | lucide-react | Ícones acessíveis e tree-shaken. |
| Banco | SQLite (libSQL) | Arquivo local `data/catalog.db`. |
| ORM | Drizzle ORM | Schema tipado e consultas explícitas. |
| Validação | Zod | Validação de entrada da API e de importações futuras. |
| Mapa (home) | MapLibre GL + OpenFreeMap vector tiles | Mapa vetorial mais polido, suporte a estilo claro/escuro e atribuição OpenFreeMap/OpenStreetMap. |
| Testes | Vitest (fase 2) + testes manuais de rota | Começar pelo comportamento do catálogo antes de adicionar players. |

### Por que não Postgres agora

O volume inicial é pequeno e o objetivo é estudar o produto. SQLite elimina Docker, migrations pesadas e custo operacional. O schema evita depender de recursos exclusivos do PostGIS:

- latitude/longitude em colunas `real`;
- filtros por caixa geográfica e distância aproximada quando necessário;
- índices por bairro, região, categoria e status.

Quando houver necessidade real de consultas espaciais, a migração para Postgres/PostGIS troca o adapter, não o modelo de domínio.

---

## 5. Estrutura de pastas

```text
ABIN/
├── data/
│   └── catalog.db                 # gerado pelo seed; não versionar
├── docs/
│   ├── ARQUITETURA.md             # este documento
│   ├── CATALOGO.md                # dicionário de dados e política editorial
│   ├── FONTES.md                  # inventário inicial e verificação
│   └── REA.md                     # como usar o REA nas auditorias
├── public/
│   └── icon.svg                   # marca provisória / PWA
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # catálogo + busca + filtros
│   │   ├── globals.css
│   │   ├── manifest.ts
│   │   ├── bairros/page.tsx       # índice geográfico
│   │   ├── fontes/[slug]/page.tsx # detalhe da fonte
│   │   ├── sobre/page.tsx         # transparência e metodologia
│   │   └── api/
│   │       ├── sources/route.ts
│   │       ├── sources/[slug]/route.ts
│   │       ├── neighborhoods/route.ts
│   │       └── meta/route.ts
│   ├── components/
│   │   ├── catalog/
│   │   │   ├── CatalogFilters.tsx
│   │   │   ├── SourceCard.tsx
│   │   │   ├── SourceBadges.tsx
│   │   │   └── Pagination.tsx
│   │   └── layout/
│   │       ├── SiteHeader.tsx
│   │       └── SiteFooter.tsx
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   ├── seed.ts
│   │   └── seed-data/
│   │       ├── neighborhoods.ts
│   │       └── sources.ts
│   └── lib/
│       ├── catalog.ts             # consultas do catálogo
│       ├── constants.ts           # enums, rótulos e ordenação
│       ├── format.ts              # datas, números e classes
│       └── types.ts               # tipos de domínio/API
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── README.md
```

---

## 6. Modelo de dados

### 6.1 `regions`

Áreas de navegação e filtro.

- `id` text PK
- `slug` text único
- `name` text
- `description` text nullable
- `sort_order` integer

Valores iniciais: Centro, Zona Sul, Zona Norte, Zona Oeste, Ilhas, Cidade do Rio, Estado do Rio, Nacional.

### 6.2 `neighborhoods`

Bairros e áreas geográficas.

- `id` text PK
- `slug` text único
- `name` text
- `region_id` FK → `regions.id`
- `city` text (default “Rio de Janeiro”)
- `state` text (default “RJ”)
- `latitude`, `longitude` real nullable
- `location_precision` enum: `exact`, `approximate`, `unknown`
- `summary` text nullable
- `created_at` text

> Coordenadas de bairro são **aproximadas** e servem para orientação, não para localizar uma câmera específica.

### 6.3 `sources`

Entidade central.

- `id` text PK
- `slug` text único
- `name` text
- `short_description` text
- `search_text` text (nome + descrição + provedor + bairro + tags + categoria; alimenta a busca)
- `category` enum controlado
- `provider_name` text
- `provider_kind` enum: `municipal`, `state`, `federal`, `university`, `concessionaire`, `private`, `ngo`, `other`
- `source_page_url` text (URL oficial)
- `embed_url` text nullable (só preencher com autorização)
- `media_type` enum: `external_page`, `iframe_embed`, `hls`, `webrtc`, `image`, `other`
- `permission_status` enum: `verified`, `public_link_only`, `permission_required`, `blocked`, `unknown`
- `availability_status` enum: `online`, `degraded`, `offline`, `unknown`, `suspended`
- `status_note` text nullable (explica o que foi verificado)
- `scope` enum: `point`, `neighborhood`, `city`, `state`, `national`
- `city`, `state` text nullable
- `region_id` FK → `regions.id`
- `neighborhood_id` FK → `neighborhoods.id` nullable
- `latitude`, `longitude` real nullable
- `location_precision` enum: `exact`, `approximate`, `unknown`
- `address_hint` text nullable
- `license_notes` text
- `terms_url` text nullable
- `attribution` text
- `last_checked_at` text nullable (ISO 8601)
- `last_status_change_at` text nullable
- `is_featured` boolean
- `is_demo` boolean
- `provenance_dataset` text nullable
- `provenance_record_id` text nullable
- `imported_at` text nullable
- `created_at`, `updated_at` text

### 6.4 `tags` e `source_tags`

Tags normalizadas para busca e navegação.

- `tags`: `id`, `slug`, `label`
- `source_tags`: `source_id`, `tag_id`, PK composta

### 6.5 `source_status_checks`

Histórico técnico mínimo, sem conteúdo audiovisual.

- `id` text PK
- `source_id` FK
- `checked_at` text
- `status` enum: `online`, `degraded`, `offline`, `unknown`, `suspended`
- `http_status` integer nullable
- `error_code` text nullable
- `latency_ms` integer nullable
- `notes` text nullable

> A fase 1 não roda monitor automático. A tabela existe para a fase 4 e para registros manuais.

### 6.6 `editorial_pages` (fase 3)

Páginas de corredor, bairro ou praia. Não serão criadas agora para evitar conteúdo editorial sem revisão.

---

## 7. Enums e semântica

### Categorias

`traffic`, `weather`, `sea`, `beach`, `flood`, `air`, `emergency`, `mobility`, `port`, `airport`, `infrastructure`, `open_data`, `government`.

### Permissão

| Valor | Significado | Pode embed? |
|---|---|---|
| `verified` | Permissão de incorporação documentada. | Sim |
| `public_link_only` | Página pública; só link. | Não |
| `permission_required` | Uso depende de autorização. | Não |
| `blocked` | Provedor restringiu ou solicitou remoção. | Não |
| `unknown` | Não verificado. | Não |

### Disponibilidade

| Valor | Significado |
|---|---|
| `online` | Última checagem confirmou o que a fonte promete (página ou player). |
| `degraded` | Responde, mas com falha parcial. |
| `offline` | Não responde. |
| `unknown` | Não checado ou checagem inconclusiva. |
| `suspended` | Exibição suspensa por decisão do provedor ou autoridade. |

**Regra de interface:** o selo “Ao vivo” só aparece quando `availability_status = online`, `media_type` é de vídeo e `permission_status = verified`. Para `external_page`, o selo é “Link externo” ou “Página respondeu”.

---

## 8. API

### `GET /api/sources`

Parâmetros:

- `q` — busca textual
- `category`
- `region`
- `neighborhood`
- `permission`
- `availability`
- `media`
- `tag`
- `scope`
- `sort` — `relevance`, `name`, `updated`, `region`
- `page` — 1-based
- `pageSize` — 1–50, default 12

Resposta:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 12,
  "total": 23,
  "totalPages": 2
}
```

### `GET /api/sources/[slug]`

Retorna a fonte, bairro, região e tags. `404` se não existir.

### `GET /api/neighborhoods`

Parâmetros: `region`, `q`. Retorna bairros com contagem de fontes.

### `GET /api/meta`

Retorna categorias, regiões, bairros, tags e estatísticas do catálogo.

---

## 9. Renderização e cache (Next.js 16)

O projeto usa `cacheComponents: true` e `partialPrefetching: true` (padrão do create-next-app 16).

- Páginas que leem `searchParams` ou `params` ficam dentro de `<Suspense>`.
- Consultas ao SQLite são feitas no servidor e não são cacheadas por padrão.
- A página inicial tem shell estático (cabeçalho, hero, filtros) e a lista de resultados faz streaming.
- O detalhe da fonte usa `generateStaticParams` para os slugs conhecidos; slugs novos caem no App Shell e são resolvidos em runtime.
- Route Handlers são dinâmicos por padrão.

Isso mantém a navegação rápida sem esconder que o catálogo muda.

---

## 10. Mapa (fase 2)

- Leaflet + `leaflet.markercluster` ou MapLibre GL + clustering.
- Apenas fontes com `scope = point` ou `neighborhood` e coordenadas aparecem.
- Fontes `city`, `state` e `national` aparecem em um painel “Cobertura ampla”, não como pinos falsos.
- Coordenadas de bairro são visualmente marcadas como aproximadas.
- Filtros do mapa e da lista compartilham a mesma URL (`?category=&region=...`).
- Tiles: OSM padrão para estudo, com atribuição visível. Antes de publicar, revisar termos e escolher provedor.
- Clustering no cliente, com limite de marcadores e carregamento sob demanda.

**Critério de teste:** ao filtrar “Zona Sul + praias”, a lista e o mapa mostram o mesmo conjunto; fontes sem coordenada não geram pinos inventados.

---

## 11. Players (fase 3)

Ordem de implementação, do mais simples ao mais complexo:

1. **Link externo** — já implementado na fase 1.
2. **Iframe oficial** — somente com `permission_status = verified` e URL de embed documentada.
3. **Imagem estática** — somente se a fonte documentar atualização e permitir.
4. **HLS** — testar suporte nativo; usar hls.js apenas se o provedor permitir.
5. **WebRTC/WHEP** — somente com especificação pública do provedor; não inventar sinalização.

Cada player deve distinguir:

- aguardando carregamento;
- conectando;
- ao vivo (somente com confirmação do player);
- fonte indisponível;
- embed bloqueado;
- codec incompatível;
- transmissão suspensa;
- link externo.

**Nunca** exibir “ao vivo” para um link, um frame antigo ou uma página que apenas respondeu 200.

### Como o REA entra

Antes de implementar um player, usar o REA para observar a página oficial e registrar:

- estrutura da página e presença de iframe/video;
- requisições de rede e tipo de mídia (sem baixar/decodificar stream);
- headers e restrições;
- evidência de termos/embed.

O resultado vira um arquivo em `docs/auditorias/<slug>.md` e só então o `media_type`/`permission_status` é atualizado. O REA não será usado para contornar autenticação, DRM, CORS, geoblocking ou rate limits.

---

## 12. Mobile e PWA

- Layout mobile-first: filtros em bloco colapsável, cards em coluna, botões com no mínimo 44 px.
- Manifest PWA com `display: standalone`, tema e ícone.
- Sem dependência de hover para funções essenciais.
- Mapa com controles grandes e gesto de arrastar nativo.
- Players futuros usarão `playsInline` e carregamento manual para evitar consumo de dados.
- A API é a mesma; um app móvel futuro pode consumir os Route Handlers.

---

## 13. Fases e critérios de teste

### Fase 1 — fundação + catálogo (atual)

- [x] Schema e seed com regiões, bairros e fontes.
- [x] Busca textual, filtros e paginação.
- [x] Página de detalhe com proveniência e status.
- [x] Índice de bairros.
- [x] API de catálogo.
- [x] PWA manifest e layout responsivo.
- [ ] Revisão manual do usuário.

**Teste:** buscar “praia”, filtrar por Zona Sul e abrir uma fonte; conferir que o botão leva à URL oficial e que nenhum player é carregado.

### Fase 2 — mapa

- [ ] Marcadores e clustering.
- [ ] Sincronização lista/mapa via URL.
- [ ] Distinção visual de localização aproximada.
- [ ] Painel de fontes de cobertura ampla.

**Teste:** filtrar e comparar contagens; nenhum pino para fonte `state`/`national`.

### Fase 3 — players

- [ ] Um tipo de player por vez.
- [ ] Permissão verificada antes do embed.
- [ ] Estados de erro e carregamento manual.
- [ ] Testes em Chrome, Firefox, Safari e mobile.

**Teste:** cada player informa corretamente quando reproduz e quando falha; nenhum embed sem permissão.

### Fase 4 — operação

- [ ] Importador CSV idempotente.
- [ ] Painel administrativo de revisão.
- [ ] Monitor de disponibilidade conservador.
- [ ] Histórico de status sem conteúdo audiovisual.

---

## 14. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| URL oficial muda | `source_page_url` + checagem manual + status `unknown` quando inconclusivo. |
| Provedor proíbe incorporação | `permission_status` bloqueia embed; link-only permanece. |
| Coordenada aproximada induz a erro | `location_precision` visível; sem pinos para escopo amplo. |
| Catálogo parece “ao vivo” sem ser | Semântica de status separada de HTTP 200. |
| Dados pessoais em imagens | Nenhuma análise de pessoas; sem gravação; aviso de limitação. |
| Dependência de tiles externos | Atribuição, limite de uso e plano de troca de provedor. |
| Crescimento do SQLite | Migração planejada para Postgres/PostGIS via repository. |

---

## 15. O que não será feito

- Reconhecimento facial, OCR de placas, reidentificação ou rastreamento.
- Gravação, transcodificação ou proxy de streams sem autorização.
- Coleta de endpoints ocultos, tokens ou APIs privadas.
- Scraping agressivo ou contorno de rate limit.
- Publicação automática de fontes importadas.
- Exibição de coordenadas exatas quando a fonte não as divulga.
