# Câmeras no mapa — importação local

O Sauron exibe **pontos de câmera** a partir de um arquivo local (CSV ou JSON).
O importador não acessa o COR-Rio, não chama a API do app, não contorna o gate
de acesso e não baixa vídeo. Ele lê o arquivo e grava os pontos no PostgreSQL
Supabase configurado por `DATABASE_URL` ou `POSTGRES_URL`.

Cada ponto guarda uma **URL da página oficial** do provedor. Clicar no ponto
abre essa página em nova aba. Nenhum vídeo é embutido, gravado ou reproduzido
dentro do Sauron.

> O arquivo atual do repositório contém 7.571 câmeras: 7.555 associadas a um
> bairro do recorte e 16 em vias (Linha Vermelha e Radar Mendanha) fora dos
> contornos disponíveis. Consulte `docs/FONTES.md` para a proveniência e a
> licença dos dados.

---

## 1. Formato do arquivo

### JSON (recomendado para listas grandes)

`data/cameras.json` pode ser um array de objetos:

```json
[
  {
    "apiId": "000001",
    "cameraId": 192793,
    "nome": "AV. PRES. VARGAS X RUA 1º DE MARÇO",
    "lat": -22.900259,
    "lon": -43.177031
  }
]
```

ou um objeto com a chave `cameras`:

```json
{
  "fonte": "COR.Rio",
  "dataExportacao": "2026-11-01T18:55:42.872Z",
  "totalCameras": 7571,
  "cameras": [ { "apiId": "000001", "nome": "...", "lat": -22.9, "lon": -43.17 } ]
}
```

O importador reconhece os apelidos `apiId`, `id`, `cameraId`, `nome`, `name`,
`lat`, `latitude`, `lon`, `lng`, `longitude`, `page_url`, `url`, `provider_name`,
`provedor`, `neighborhood_slug`, `bairro`.

Sem `page_url`, o ponto abre o mapa público do COR-Rio
(`https://appcor.cor-rio.work/mapa/cameras/`).

### CSV

Crie `data/cameras.csv`. A primeira linha é o cabeçalho. Separador `,` ou `;` —
o importador detecta automaticamente.

| Coluna | Obrigatória | Descrição |
|---|---|---|
| `external_id` | sim | Identificador único da câmera no arquivo. Não pode repetir. |
| `name` | recomendada | Nome exibido no mapa e na lista do bairro. |
| `latitude` | sim | Latitude em graus decimais (ex.: `-22.9111`). |
| `longitude` | sim | Longitude em graus decimais (ex.: `-43.1755`). |
| `page_url` | opcional | Página oficial da câmera. Precisa ser `https`. |
| `provider_name` | opcional | Provedor exibido. Padrão: `COR-Rio`. |
| `neighborhood_slug` | opcional | Slug do bairro (`centro`, `copacabana`, ...). Se vazio, o bairro é descoberto pelo ponto. |

```csv
external_id,name,latitude,longitude,page_url,provider_name,neighborhood_slug
cor-0001,Cinelândia — Praça Floriano,-22.9111,-43.1755,https://appcor.cor-rio.work/mapa/cameras/,COR-Rio,centro
cor-0002,Copacabana — Av. Atlântica,-22.9711,-43.1857,,COR-Rio,
cor-0003,Tijuca — Saens Peña,-22.9248,-43.2344,https://appcor.cor-rio.work/mapa/cameras/,COR-Rio,tijuca
```

Arquivo de exemplo: `docs/cameras-exemplo.csv`.

---

## 2. O que o importador faz

1. Lê o arquivo local (`.json` ou `.csv`). Não faz nenhuma requisição de rede.
2. Valida `external_id`, latitude e longitude; descarta duplicados.
3. Preenche o bairro e a região a partir de `public/bairros.geojson` quando o
   slug não foi informado (ponto dentro do contorno).
4. Exige `https` em `page_url`. URLs inválidas, `http` ou esquemas perigosos são
   substituídas pela página pública do COR-Rio, com aviso.
5. Grava ou atualiza por `external_id` em lotes (idempotente).
6. Opcionalmente remove do banco as câmeras que não estão no arquivo atual
   (`--replace`).

### Comandos

```bash
# Usa data/cameras.csv ou, se ele não existir, data/cameras.json
npm run db:cameras

# Usa outro arquivo
npm run db:cameras -- --file=data/cameras.json

# Torna o arquivo a fonte da verdade e remove os pontos ausentes
npm run db:cameras -- --replace
```

O relatório final mostra quantas linhas foram lidas, importadas, quantas
ficaram sem bairro, quantas estão fora do recorte do Rio e os primeiros avisos.

---

## 3. Na interface

- **Bolinha âmbar** no mapa = câmera importada de um arquivo local.
- **Triângulo** = fonte catalogada que tem coordenada própria (poucas).
- Clicar na bolinha abre `page_url` em nova aba, com
  `rel="noopener noreferrer"`.
- Ao selecionar um bairro, o painel lista as câmeras daquele bairro com link
  direto para a página oficial.
- O cartão inferior do mapa mostra quantas câmeras estão visíveis e permite
  ocultar os pontos ou os contornos dos bairros.
- A API pública é `GET /api/cameras`, com filtros opcionais
  `?region=centro` e `?neighborhood=copacabana`.

---

## 4. Limites deliberados

- O Sauron **não** raspa a lista do COR-Rio, **não** usa UA do app, **não**
  contorna o `Referer` e **não** acessa endpoints internos. A lista só entra
  porque foi fornecida pelo usuário em arquivo local.
- O Sauron **não** incorpora o vídeo WebRTC do COR-Rio nem tenta reproduzi-lo.
- Uma câmera importada não recebe selo de “verificada” nem aparece como “ao
  vivo”. O estado é sempre “link para página oficial”.
- Dados de localização são os que você forneceu. Não há geocodificação externa
  nem inferência de endereço além do contorno do bairro.
