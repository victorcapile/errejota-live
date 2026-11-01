# Auditoria — COR-Rio (app) / câmeras públicas

- URL oficial: https://cor.rio/ (portal) · app `bugarin.t.comando` (CORRIO/120)
- Data: 2026-11-01
- Dispositivo: iPhone (iOS 18.7) na mesma rede do Mac, proxy manual `mitmproxy 12.3.1`
- Método: captura passiva de tráfego do próprio aparelho + observação da página
  pública com Chrome headless e REA (`analyze-web-bundle`)
- Alvo: descobrir de onde o app carrega as imagens/streams das câmeras públicas

## Resultado em uma frase

O app **não tem API nativa de câmeras**: ele é um invólucro React Native em volta
do mapa web público `https://appcor.cor-rio.work/mapa/cameras/`, que carrega os
pontos de `GET /api/cameras/` e abre cada câmera numa página de player **WebRTC
(WHEP)** em `https://appcor.cor-rio.work/camera/<apiId>/?app=1`.

## Arquitetura observada

| Peça | Evidência |
| ---- | --------- |
| App nativo (React Native) | `window.ReactNativeWebView.postMessage` no script da página; UA `CORRIO/120 CFNetwork/...` nas chamadas nativas |
| Mapa público | `GET https://appcor.cor-rio.work/mapa/cameras/` → 200 `text/html`; Leaflet 1.9.4 + markercluster via unpkg |
| Lista de câmeras | `GET https://appcor.cor-rio.work/api/cameras/?limit=0` → JSON `[{apiId, cameraId, nome, lat, lon}]` |
| Filtro por área | `GET /api/cameras/?minLat=&maxLat=&minLon=&maxLon=&limit=100` (chamado pelo mapa a cada `moveend`, com debounce de 300 ms) |
| Player | `camera/<apiId>/?app=1` abre `<video>` e usa `POST /api/camera/player/session/start/<apiId>/` → `{sessionId}`; `POST /api/camera/player/whep/` com header `x-camera-session` → SDP 201 (`H265/90000`) |
| Página de transmissão web | `GET /mapa/cameras/transmissao/<apiId>/` → 200, `<title>Camera ao vivo</title>`, `<video>` + WHEP (mesmo backend) |
| Tiles do mapa | `GET /tiles/osm/{z}/{x}/{y}.png` (proxy do OpenStreetMap no próprio host) |
| Radar meteorológico | `GET /mapa/radar/quadro/<AAAAMMDDHHMM>_alertario_0NN.png` (sequência de quadros do Alerta Rio) |
| Alertas/estado da cidade | `GET /api/inicio/?_ts=...` a cada ~10 s, UA `CORRIO/120` |

## Números observados

- **7.571 câmeras** distintas no JSON (`apiId` únicos), todas com `nome`, `lat` e `lon`.
- Campos do JSON: `apiId`, `cameraId`, `nome`, `lat`, `lon` — sem URL de stream.
- O stream não é HLS/DASH: é **WebRTC (WHEP)**, um por sessão.

## Acesso ao endpoint

- `GET /api/cameras/?limit=0` sem cabeçalhos de navegador → **403** `{"detail":"Acesso não permitido."}`
- Com UA do app (`CORRIO/120 ...`) → 200
- Com UA de navegador + `Referer: https://appcor.cor-rio.work/mapa/cameras/` → 200

Ou seja: a página pública funciona no navegador, mas a API responde conforme
contexto (UA/referrer). Isso é um controle de acesso, ainda que simples — não é
para ser contornado nem raspado em massa.

## Limites respeitados

- Captura feita no aparelho do próprio usuário, com proxy e CA temporários.
- Nenhum bypass de autenticação, DRM, pinning, rate limit ou geobloqueio.
- Nenhuma mídia baixada/decodificada; sessões e credenciais efêmeras não foram
  registradas no repositório (captura bruta apagada após o resumo).
- Nenhum reconhecimento de pessoas, placas ou veículos.

## Conclusão de permissão

- **Não verificada para embed.** O endpoint é público na prática, mas sem
  documentação de uso, sem termos de API e com gate por UA/referrer.
- Portanto: **não importar as 7.571 câmeras** para o catálogo nem para o mapa do
  Sauron. Isso seria copiar o catálogo de outro serviço e contrariar as regras do
  projeto.
- O que foi feito: cadastrado **um** item link-only apontando para a página
  pública do mapa (`https://appcor.cor-rio.work/mapa/cameras/`), sem player, sem
  embed, com `permission_status: public_link_only`.

## Evidências técnicas

- Bundle da página: 1 script inline, 4.240 bytes, SHA-256
  `dec57990932e8e0af6ffccf4081f6212c93b1510aaef33f8b0674ed0a618540b`
  (REA `analyze-web-bundle`, `completeness: complete`, 595 nós de AST).
- `POST /api/camera/player/whep/` respondeu `201 application/sdp`; o SDP anuncia
  vídeo `H265/90000` com ICE/DTLS — player não implementado no Sauron.
- Captura bruta (`captura.mitm`) e derivados apagados; este documento é a única
  evidência mantida.

## Próximo passo

- [x] Cadastrar **um** item link-only "COR-Rio — Mapa de Câmeras" no catálogo
      (`external_page`, sem coordenadas, `public_link_only`).
- [ ] Se houver interesse em exibir os pontos, pedir autorização/documentação ao
      COR-Rio antes de qualquer coleta.
