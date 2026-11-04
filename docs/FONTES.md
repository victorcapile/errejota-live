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

## Próximas fontes a pesquisar (não cadastradas)

- Página oficial de câmeras do Porto do Rio, se existir e permitir link.
- Página oficial de câmeras do Aeroporto Santos Dumont/Infraero.
- Câmeras públicas de Niterói (Nittrans) para uma futura expansão metropolitana.
- Dados de maré e vento com API documentada.
- Datasets de mobilidade do Data.Rio com licença explícita.
- Páginas de balneabilidade municipais, se houver.

**Não cadastrar** agregadores privados, listas sem licença ou endpoints descobertos por engenharia reversa.
