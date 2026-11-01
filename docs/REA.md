# REA no fluxo de auditoria de fontes

O [REA](https://github.com/morluto/rea) é usado neste projeto como ferramenta de **observação e documentação** da página pública, não como atalho para contornar restrições.

## Onde o REA ajuda

1. **Observação de página** — estrutura, iframes, elementos `<video>`, scripts e rotas.
2. **Observação de rede** — tipo de requisição, headers, presença de playlist HLS, sinalização WebRTC ou embed de terceiros.
3. **Auditoria de compatibilidade** — codecs anunciados, comportamento por navegador.
4. **Evidência reproduzível** — registrar o que foi visto, com data e limitações.

## Onde o REA não será usado

- Contornar login, paywall, DRM, CORS, geoblocking ou rate limit.
- Descobrir endpoints privados, tokens ou APIs não documentadas.
- Baixar ou decodificar streams para “testar se funcionam”.
- Copiar o catálogo de outro site.
- Identificar pessoas, placas ou veículos.

## Fluxo proposto para cada fonte

### 1. Preparar

```bash
# Na raiz do projeto, quando o REA for usado pela primeira vez:
npx rea-agents setup
# reiniciar o agente depois da configuração
```

O REA exige Node.js compatível e, para observação de sites, um navegador da família Chrome. A instalação não é necessária para a fase 1 do catálogo.

### 2. Observar

Pedir ao agente algo específico e limitado:

```text
Use o REA para observar a página oficial <URL>.
Quero saber apenas:
- se existe iframe, <video> ou player incorporado;
- quais requisições de rede indicam o tipo de mídia;
- se há termos ou instruções de embed na própria página;
- quais limitações foram encontradas.
Não baixe o stream, não tente contornar bloqueios e não acesse endpoints privados.
```

### 3. Registrar evidência

Criar `docs/auditorias/<slug>.md` com:

```md
# Auditoria — <nome da fonte>

- URL oficial:
- Data:
- Navegador/versão:
- Tipo de página:
- Iframe/<video>/player:
- Requisições relevantes (sem baixar mídia):
- Termos/embed encontrados:
- Conclusão de permissão:
- Limitações:
- Próximo passo:
```

### 4. Atualizar o catálogo

Somente depois da auditoria:

- `media_type` — classificação comprovada;
- `permission_status` — `verified` apenas com autorização documentada;
- `embed_url` — apenas URL oficial de incorporação;
- `license_notes` — o que foi lido e o que falta;
- `last_checked_at` — data da auditoria.

Se a evidência for inconclusiva, manter `unknown` e link-only.

## Critério de aceite

Uma fonte só recebe player quando:

- [ ] a página oficial documenta o embed;
- [ ] os termos permitem a incorporação;
- [ ] a URL de embed é oficial e estável;
- [ ] o tipo de mídia foi identificado;
- [ ] o comportamento de erro foi testado;
- [ ] a auditoria está registrada em `docs/auditorias/`;
- [ ] o player não inicia sozinho em listas.

## Quando o alvo é um app (WebView ou nativo)

Capturar o tráfego do próprio aparelho costuma responder mais rápido do que
decompilar o binário. Passo a passo usado na auditoria do COR-Rio:

```bash
# 1. Proxy local com gravação (fora do repositório)
mitmweb --listen-port 8080 --web-port 8081 -w "$TMPDIR/captura.mitm"

# 2. No aparelho: Wi-Fi → Proxy manual → IP do Mac:8080
#    Safari → http://mitm.it → instalar perfil → confiar no certificado

# 3. Usar o app normalmente por 1–2 minutos

# 4. Resumir sem expor corpos/tokens
REA_FLOWS_OUT=resumo.json mitmdump -nr "$TMPDIR/captura.mitm" -q \
  -s scripts/rea/summarize_flows.py

# 5. Apagar a captura bruta e remover proxy/certificado do aparelho
```

Regras:

- capturar só o aparelho do próprio usuário, com consentimento;
- não guardar corpos de requisição no repositório (só host, caminho, status e
  content-type);
- nunca contornar pinning, autenticação, DRM ou rate limit — se o TLS falhar,
  registrar o host via `CONNECT` e parar;
- se o app for uma WebView de uma página pública, usar a página como fonte
  (link-only) e não a API interna do app.
