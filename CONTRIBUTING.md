# Como contribuir

Obrigado por querer ajudar no Sauron. Este guia reúne o fluxo para preparar o ambiente, propor uma mudança e manter o mapa confiável.

## Antes de começar

- Leia o [README](README.md) para instalar o projeto.
- Consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md) para entender a aplicação.
- Para dados de câmeras, leia [docs/CAMERAS.md](docs/CAMERAS.md) e [docs/FONTES.md](docs/FONTES.md).
- Para o significado e a manutenção dos campos do catálogo, consulte [docs/CATALOGO.md](docs/CATALOGO.md).
- Abra uma issue antes de mudanças grandes, novos provedores, alterações de schema ou mudanças na experiência principal do mapa.

## Fluxo recomendado

1. Atualize sua branch local a partir de `master`.
2. Crie uma branch com nome curto, por exemplo `docs/guia-instalacao`, `fix/mapa-mobile` ou `feat/filtro-regiao`.
3. Faça uma mudança focada e mantenha a documentação em sincronia com o comportamento.
4. Rode as verificações adequadas à mudança:

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

5. Abra um pull request para `master` com contexto, resumo e passos para conferir o resultado.

Não inclua `.env.local`, credenciais, tokens, dumps de banco ou dados pessoais nos commits. Use um banco Supabase de desenvolvimento que você controla.

## Contribuir com dados e fontes

Cada registro precisa ter uma origem verificável. No pull request, informe:

- nome do provedor e página oficial;
- que informação pública a fonte oferece e sua abrangência geográfica;
- a data em que a página foi consultada;
- origem e licença dos dados usados;
- precisão das coordenadas (exata, aproximada ou desconhecida);
- se a fonte permite apenas link ou documenta permissão explícita para incorporação.

Não deduza nem publique endpoints privados, tokens, URLs de streams descobertas por inspeção, dados pessoais, placas, imagens ou históricos de pessoas e veículos. Não contorne login, DRM, CORS, bloqueios geográficos ou limites do provedor. O comportamento padrão é abrir a página oficial em nova aba, sem reproduzir ou armazenar vídeo.

### Câmeras

Os pontos importados ficam em `data/cameras.json`; as regras e formatos aceitos estão em [docs/CAMERAS.md](docs/CAMERAS.md). Cada ponto precisa ter identificador estável e coordenadas válidas. Não associe um ponto a um bairro sem base geográfica suficiente. O importador já encontra o bairro pelo limite quando o arquivo não fornece essa informação.

Antes de substituir a lista, confira o diff do arquivo e a quantidade de registros. `npm run db:cameras -- --replace` remove do banco de desenvolvimento os pontos que não aparecem no arquivo atual.

### Fontes, regiões e notícias

- Fontes e tags iniciais: `src/db/seed-data/sources.ts`.
- Notícias curadas e links de serviço: `src/db/seed-data/news-curated.ts`.
- Regiões e rótulos do produto: `src/lib/constants.ts`.
- Limites de bairros no mapa: `public/bairros.geojson`.
- Histórico e atribuições: `docs/FONTES.md` e `docs/auditorias/`.

Atualize os documentos de proveniência junto com os dados. Não trate uma página acessível ou resposta HTTP 200 como evidência de que uma transmissão está ativa ou de que um embed é permitido.

## Interface e mapa

- Verifique tanto o desktop quanto uma viewport móvel.
- Garanta que controles essenciais funcionem por toque e teclado; não dependa de hover no celular.
- Preserve o foco visível, nomes acessíveis nos botões e contraste suficiente.
- Ao alterar a navegação do mapa, confira seleção de bairro, dossiê, câmeras, localização do usuário, zoom e estados de carregamento/erro.
- Não adicione filtros redundantes nem camadas no mapa sem explicar o valor para quem usa.

## Banco de dados

- Schema: `src/db/schema.ts`.
- Consultas: `src/lib/catalog.ts`.
- Seeds idempotentes: `src/db/seed.ts` e `src/db/seed-data/`.
- Conexão: `src/db/index.ts` (`DATABASE_URL` ou `POSTGRES_URL`).

Mudanças de schema precisam atualizar o código que lê e grava os campos e qualquer documentação afetada. O banco de produção não deve ser usado para experimentos locais. Nunca cole uma URI de conexão ou saída que contenha credenciais em uma issue ou pull request.

## Pull request

Inclua no texto do PR:

- **Motivação:** que problema resolve ou que necessidade atende.
- **Mudança:** o que foi alterado e onde.
- **Verificação:** comandos executados e passos manuais relevantes.
- **Interface:** capturas de tela antes/depois para mudanças visuais, quando ajudarem.
- **Dados:** fontes e método de verificação para qualquer dado novo.

Mantenha PRs pequenos quando possível e indique explicitamente o que ainda precisa ser verificado.
