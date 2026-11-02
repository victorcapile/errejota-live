# Catálogo — dicionário de dados e política editorial

Este documento descreve como uma fonte entra, é revisada e aparece no Sauron. Ele vale para o seed, para a API e para o futuro painel administrativo.

---

## 1. Unidade do catálogo: a fonte

Uma **fonte** é uma página pública oficial que publica ou organiza:

- câmera/vídeo ao vivo;
- imagem estática;
- mapa interativo;
- dados contextuais (clima, maré, balneabilidade, cheias, qualidade do ar, mobilidade);
- informações institucionais de um provedor.

Uma fonte **não** é:

- um endpoint privado descoberto por engenharia reversa;
- um stream sem página oficial;
- uma lista copiada de um agregador sem licença;
- uma câmera privada ou autenticada.

Cada fonte tem **uma URL oficial** e **um provedor identificável**. Várias câmeras do mesmo provedor podem ser fontes separadas no futuro, mas a fase 1 cataloga a página oficial que as publica.

---

## 2. Campos e regras de preenchimento

### Identificação

| Campo | Regra |
|---|---|
| `slug` | ASCII, minúsculo, estável. Não mudar depois de publicado. |
| `name` | Nome público, sem sensacionalismo. Pode incluir o provedor. |
| `short_description` | 1–2 frases, factuais, sem prometer “tempo real” se não verificado. |
| `category` | Uma das categorias controladas. |
| `provider_name` | Órgão, empresa ou instituição responsável. |
| `provider_kind` | `municipal`, `state`, `federal`, `university`, `concessionaire`, `private`, `ngo`, `other`. |

### Localização

| Campo | Regra |
|---|---|
| `scope` | `point`, `neighborhood`, `city`, `state`, `national`. |
| `region_id` | Região de navegação. Para escopo amplo, usar `cidade`, `estado` ou `nacional`. |
| `neighborhood_id` | Preencher quando a fonte tem relação clara com um bairro. |
| `latitude`, `longitude` | Só preencher se a fonte divulga ou se é um ponto público inequívoco. |
| `location_precision` | `exact` (coordenada divulgada), `approximate` (centro do bairro/ponto), `unknown`. |
| `address_hint` | Texto livre, sem complemento residencial. |

**Nunca** preencher coordenada exata de uma câmera que a fonte não divulgou. Para bairros, usar o centro aproximado e marcar `approximate`.

### Mídia e permissão

| Campo | Regra |
|---|---|
| `source_page_url` | URL oficial que um humano consegue abrir. Obrigatória. |
| `embed_url` | Só preencher com URL de incorporação **documentada e autorizada**. |
| `media_type` | `external_page`, `iframe_embed`, `hls`, `webrtc`, `image`, `other`. |
| `permission_status` | Ver tabela abaixo. |
| `availability_status` | Ver tabela abaixo. |
| `status_note` | O que foi checado, quando e com qual limitação. |
| `last_checked_at` | Data ISO da última checagem manual. |
| `license_notes` | Termos, licença, restrições de reuso e o que falta confirmar. |
| `terms_url` | URL de termos/política do provedor, quando existir. |
| `attribution` | Texto de atribuição exibido na interface. |

### Matriz de permissão

| Valor | Quando usar | Embed permitido |
|---|---|---|
| `verified` | Provedor documenta embed e autoriza a incorporação. | Sim |
| `public_link_only` | Página é pública, mas não há autorização de embed. | Não |
| `permission_required` | O uso depende de pedido formal ao provedor. | Não |
| `blocked` | Provedor/authority restringiu ou pediu remoção. | Não |
| `unknown` | Ainda não foi verificado. | Não |

**Regra de código:** `canEmbed(source) = permission_status === 'verified' && embed_url != null && media_type !== 'external_page'`.

### Matriz de disponibilidade

| Valor | Quando usar |
|---|---|
| `online` | A checagem confirmou o comportamento prometido (página acessível ou player iniciando). |
| `degraded` | Responde, mas com falha parcial (player intermitente, página lenta, dado incompleto). |
| `offline` | Não responde ou retorna erro persistente. |
| `unknown` | Não checado, bloqueado por WAF ou inconclusivo. |
| `suspended` | Exibição suspensa por decisão do provedor ou autoridade. |

**Nunca** converter `HTTP 200` em `online` para vídeo. Para `external_page`, `online` significa “página respondeu”, e a interface deve dizer isso.

### Proveniência

| Campo | Regra |
|---|---|
| `provenance_dataset` | Nome do dataset/planilha de origem, se houver. |
| `provenance_record_id` | ID do registro original. |
| `imported_at` | Data da importação. |
| `is_demo` | `true` apenas para registros fictícios de teste. |
| `is_featured` | Destaque editorial explícito, não “melhor” ou “mais confiável”. |

---

## 3. Como adicionar uma fonte (manual)

1. Abrir a página oficial em um navegador comum.
2. Ler termos, política de privacidade e instruções de incorporação.
3. Confirmar se o provedor oferece embed ou apenas link.
4. Identificar o tipo de mídia pela documentação pública. Não tentar descobrir endpoints ocultos.
5. Registrar a localização no nível que o provedor divulga.
6. Preencher `license_notes` com o que foi lido e o que falta confirmar.
7. Testar a URL manualmente.
8. Adicionar ao seed ou ao painel administrativo com `permission_status` conservador.
9. Rodar `npm run db:seed` e conferir a listagem.
10. Revisar o texto e a atribuição antes de considerar publicado.

### Checklist de aprovação

- [ ] URL oficial abre sem login.
- [ ] Provedor identificado.
- [ ] Categoria correta.
- [ ] Permissão registrada (na dúvida: `unknown`).
- [ ] Nenhum `embed_url` sem autorização.
- [ ] Localização proporcional ao que a fonte divulga.
- [ ] `license_notes` e `attribution` preenchidos.
- [ ] `last_checked_at` preenchido.
- [ ] Nenhum dado pessoal, placa, rosto ou rastreamento.

---

## 4. Política de seed

O seed inicial usa **fontes oficiais reais**, todas em modo link-only. Ele é idempotente: pode ser executado várias vezes sem duplicar registros.

- IDs e slugs são determinísticos.
- O seed não apaga fontes adicionadas manualmente; ele faz upsert das fontes do arquivo.
- Fontes com `is_demo = true` devem ser claramente rotuladas na interface.
- Dados de exemplo nunca podem simular uma câmera real ou uma autorização inexistente.
- A data de checagem é a data em que a URL foi aberta manualmente, não a data do seed.

### O que o seed **não** faz

- Não baixa streams.
- Não faz scraping de listas de câmeras.
- Não copia o catálogo do CamerasRJ.
- Não inventa coordenadas exatas.
- Não marca permissão como `verified`.

---

## 5. Busca e filtros

A busca usa `search_text`, um campo derivado e normalizado com:

```text
nome + descrição + provedor + bairro + região + categoria + tags
```

Isso mantém a consulta simples e previsível no PostgreSQL. Se a busca textual mudar, preserve os parâmetros e o formato da API ou documente a mudança junto com o código.

### Ordenações

| Valor | Comportamento |
|---|---|
| `relevance` | Nome e destaque editorial primeiro; empate por nome. |
| `name` | Alfabética. |
| `updated` | Última checagem/atualização. |
| `region` | Região e depois nome. |

### Paginação

- `page` começa em 1.
- `pageSize` padrão 12, máximo 50.
- A URL é a fonte de verdade (`?q=&category=&region=&page=`), o que permite compartilhar e voltar pelo histórico.

---

## 6. Exemplo de registro

```json
{
  "slug": "inea-balneabilidade",
  "name": "INEA — Balneabilidade das praias",
  "short_description": "Boletins semanais e dados brutos de balneabilidade das praias do Estado do Rio de Janeiro.",
  "category": "beach",
  "provider_name": "Instituto Estadual do Ambiente (INEA)",
  "provider_kind": "state",
  "source_page_url": "https://www.inea.rj.gov.br/balneabilidade",
  "embed_url": null,
  "media_type": "external_page",
  "permission_status": "public_link_only",
  "availability_status": "online",
  "scope": "state",
  "region_id": "estado",
  "neighborhood_id": null,
  "latitude": null,
  "longitude": null,
  "location_precision": "unknown",
  "license_notes": "Dados públicos institucionais. Citar INEA e a data do boletim. Verificar termos de reuso antes de redistribuir em massa.",
  "attribution": "Instituto Estadual do Ambiente (INEA)",
  "last_checked_at": "2026-10-31",
  "is_demo": false,
  "is_featured": true
}
```

---

## 7. O que ainda não entra

- Páginas editoriais de corredor sem revisão.
- Alertas próprios ou “previsão de trânsito”.
- Histórico de vídeo.
- Qualquer forma de identificação de pessoas ou veículos.
- Embed de fonte com permissão `unknown`.
- Coordenadas de câmeras privadas ou sensíveis.
