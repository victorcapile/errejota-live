# Inventário inicial de fontes

**Data da revisão manual:** 31/10/2026  
**Cidade:** Rio de Janeiro  
**Modo:** todas as fontes em `public_link_only` ou `permission_required`; nenhum embed.

> “Página respondeu” significa que a URL foi aberta em checagem manual e retornou conteúdo. Não significa que exista câmera ao vivo, player funcional ou autorização de incorporação.

## Fontes de trânsito, câmeras e mobilidade

| Slug | Nome | Provedor | Categoria | Escopo | Permissão | Checagem |
|---|---|---|---|---|---|---|
| `cor-rio` | COR-Rio — Centro de Operações e Resiliência | Prefeitura do Rio | emergency | city | public_link_only | Página respondeu; mapa de câmeras em entrada própria |
| `cor-rio-cameras` | COR-Rio — Mapa de Câmeras | Prefeitura do Rio | traffic | city | public_link_only | Página pública respondeu (01/11/2026); lista do app não importada (gate de acesso); vídeo WebRTC não incorporado |
| `cet-rio` | CET-Rio — Companhia de Engenharia de Tráfego | CET-Rio | traffic | city | public_link_only | Página respondeu; sem página pública de câmeras identificada |
| `ecovias-ponte` | Ecovias Ponte — condições da via | Ecovias Ponte | traffic | point | public_link_only | Bloqueio automatizado (HTTP 403); abrir manualmente |
| `ufrj-zet` | UFRJ ZET — câmeras do Rio (legado) | SMT/UFRJ | traffic | point | permission_required | Página legada; redistribui imagens do COR/G1 |
| `portosrio` | PortosRio — Porto do Rio de Janeiro | PortosRio | port | point | public_link_only | Página respondeu |
| `riogaleao` | RIOgaleão — Aeroporto Internacional do Galeão | RIOgaleão | airport | point | public_link_only | Página respondeu |
| `metro-rio` | MetrôRio | MetrôRio | mobility | city | public_link_only | Página respondeu |
| `brt-rio` | BRT Rio | BRT Rio | mobility | city | public_link_only | Página respondeu |

## Clima, mar, praias e alertas

| Slug | Nome | Provedor | Categoria | Escopo | Permissão | Checagem |
|---|---|---|---|---|---|---|
| `inmet` | INMET — Instituto Nacional de Meteorologia | INMET | weather | national | public_link_only | Página respondeu |
| `chm-marinha` | CHM — Centro de Hidrografia da Marinha | Marinha do Brasil | sea | national | public_link_only | Bloqueio automatizado (HTTP 403); abrir manualmente |
| `inea-balneabilidade` | INEA — Balneabilidade das praias | INEA | beach | state | public_link_only | Página respondeu |
| `inea-seirhi` | SEIRHI — balneabilidade georreferenciada | INEA | beach | state | public_link_only | Página respondeu |
| `inea-alerta-cheias` | INEA — Alerta de Cheias | INEA | flood | state | public_link_only | Página respondeu |
| `inea-qualidade-ar` | INEA — Qualidade do Ar | INEA | air | state | public_link_only | Página respondeu |
| `defesa-civil-rj` | Defesa Civil do Estado do Rio de Janeiro | SEDEC-RJ/CBMERJ | emergency | state | public_link_only | Página respondeu |
| `defesa-civil-municipal` | Defesa Civil Municipal do Rio | Prefeitura do Rio | emergency | city | public_link_only | Página respondeu |
| `alerta-rio` | Alerta Rio — Sistema de Alerta de Chuvas e Deslizamentos | Sistema Alerta Rio / Geo-Rio | flood | city | public_link_only | JSON de chuva verificado (04/11/2026); exibimos indicadores derivados |
| `geo-rio` | Geo-Rio — Fundação Instituto de Geotécnica | Geo-Rio | flood | city | public_link_only | Serviços ArcGIS públicos verificados (04/11/2026) |
| `cprm` | CPRM — Serviço Geológico do Brasil | CPRM/SGB | flood | national | public_link_only | Cartas de suscetibilidade a inundação (2014); camada via Geo-Rio |
| `coppe-ufrj` | COPPE/UFRJ — ISMFI | COPPE/UFRJ | flood | city | public_link_only | Índice por setor censitário; serviço público via Geo-Rio |

## Governo, dados e infraestrutura

| Slug | Nome | Provedor | Categoria | Escopo | Permissão | Checagem |
|---|---|---|---|---|---|---|
| `prefeitura-rio` | Prefeitura do Rio de Janeiro | Prefeitura do Rio | government | city | public_link_only | Página respondeu |
| `rio-1746` | Rio 1746 — central de atendimento | Prefeitura do Rio | government | city | public_link_only | Bloqueio automatizado (HTTP 403); abrir manualmente |
| `data-rio` | Data.Rio — dados abertos municipais | Prefeitura do Rio | open_data | city | public_link_only | Página respondeu |
| `aguas-do-rio` | Águas do Rio | Águas do Rio | infrastructure | city | public_link_only | Página respondeu |
| `light` | Light — energia elétrica | Light | infrastructure | city | public_link_only | Página respondeu |
| `naturgy` | Naturgy — gás natural | Naturgy | infrastructure | city | public_link_only | Página respondeu |

---

## Observações de segurança e licença

1. **Nenhuma** dessas fontes foi marcada como `verified` para embed. O padrão é abrir a página oficial em nova aba.
2. `ufrj-zet` é uma página legada que declara redistribuir imagens do COR-Rio e de terceiros. Por isso, `permission_required`.
3. `ecovias-ponte`, `chm-marinha` e `rio-1746` bloquearam a checagem automatizada com HTTP 403. A URL continua sendo oficial, mas o estado fica `unknown` até abertura manual.
4. As fontes do INEA são estaduais e cobrem todo o RJ; não devem gerar pinos de câmera na cidade.
5. `inmet` e `chm-marinha` são nacionais; entram como contexto, não como câmera.
6. `cor-rio` e `cet-rio` são portais institucionais. O fato de o COR operar câmeras não autoriza incorporar imagens.
7. `cor-rio-cameras` é link-only para o mapa público do COR-Rio. A lista interna de câmeras (7.571 pontos) responde apenas a pedidos do app ou da própria página e **não foi importada** pelo Errejota; o vídeo é WebRTC por sessão e não é incorporado. Ver `docs/auditorias/cor-rio.md`. Pontos individuais só entram se o usuário fornecer um arquivo local (CSV ou JSON); ver `docs/CAMERAS.md`.
8. `data-rio` pode conter datasets úteis, mas cada dataset tem licença própria. Não importar em massa sem revisar.

## Chuva e alagamentos — notas de ingestão (04/11/2026)

Fontes verificadas e decisões registradas:

1. **Alerta Rio — chuva em tempo real**
   - Página: <https://alertario.rio.rj.gov.br/mapa-de-chuvas/>
   - Endpoint público usado pela página: `https://alertario.rio.rj.gov.br/upload/Mapa/mc.json`
   - Formato JSON; 33 estações; campos `ch05m`, `ch10m`, `ch15m`, `ch01h`, `ch04h`, `ch24h`, `ch96h`, `mes` (mm), `lat`, `long`, `horaLeitura`.
   - Atualização: ~5 minutos (`horaLeitura`/`Last-Modified`).
   - **Termos de uso:** acesso público, vedado uso comercial e reprodução em meios de divulgação sem autorização expressa; atribuição obrigatória ao “Sistema Alerta Rio, da Prefeitura do Rio de Janeiro” (<https://alertario.rio.rj.gov.br/institucional/termos-de-uso/>).
   - Uso no Errejota: apenas indicadores derivados (chuva por estação/bairro) com atribuição e link; o conjunto bruto não é redistribuído.
2. **Estações pluviométricas — Geo-Rio/Data.Rio**
   - FeatureServer: `https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Geotecnia/Estacoes_AlertaRio/FeatureServer/0`
   - 33 estações (nome, endereço, código). Licença declarada no Data.Rio: **CC BY 4.0**.
3. **Suscetibilidade a inundação — CPRM**
   - FeatureServer: `.../Hosted/Suscetibilidade_à_Inundação___CPRM/FeatureServer/0`
   - 3.756 polígonos, classes Alta/Média/Baixa (cartas de 2014).
   - Licença: **não declarada** no serviço.
   - **Não usada no score por bairro**: os polígonos se sobrepõem e cruzam limites de bairro, o que distorceria a agregação. Fica disponível como camada visual de contexto em fase futura.
4. **ISMFI — COPPE/UFRJ**
   - FeatureServer: `.../Estudos/ISMFI_Indice_de_Suscetibilidade_do_Meio_Fisico_a_Inundacoes/FeatureServer/0`
   - 10.504 setores censitários; campos `nm_bairro`, `ismfi_v45` (0–97), `ind_dec`, `ind_imp`, `ind_cota`, `ind_prox`.
   - Licença: **não declarada** no serviço; agregação por bairro.
5. **Pontos de drenagem supervisionados — Geo-Rio (avaliado, não utilizado)**
   - FeatureServer: `.../Hosted/Pontos_de_Drenagem_Supervisionados/FeatureServer/0`
   - 558 pontos com bairro, bacia e classe. Licença **não declarada**. A camada foi avaliada, mas não entrou no produto.
6. **Chamados 1746 — fora desta fase**
   - O acesso documentado é via BigQuery (`datario.adm_central_atendimento_1746.chamado`), que exige projeto GCP/credencial; o link de CSV estava quebrado em 04/11/2026.
   - Licença do dataset no Data.Rio: **CC BY-ND 3.0** (sem obras derivadas) — mais um motivo para manter fora até haver uma base agregada oficial.
7. **Estágio operacional da cidade**
   - Não há endpoint público estável; o painel do COR exige login. O Errejota não exibe estágio automático; haverá atualização manual por portal admin.

## Próximas fontes a pesquisar (não cadastradas)

- Página oficial de câmeras do Porto do Rio, se existir e permitir link.
- Página oficial de câmeras do Aeroporto Santos Dumont/Infraero.
- Câmeras públicas de Niterói (Nittrans) para uma futura expansão metropolitana.
- Dados de maré e vento com API documentada.
- Datasets de mobilidade do Data.Rio com licença explícita.
- Páginas de balneabilidade municipais, se houver.

**Não cadastrar** agregadores privados, listas sem licença ou endpoints descobertos por engenharia reversa.
