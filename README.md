# Errejota

**Mapa público do Rio de Janeiro em camadas de dados.** O Errejota reúne câmeras públicas, chuva observada, risco de alagamento, equipamentos públicos e uma leitura 3D da cidade por região e bairro.

O projeto não transmite nem grava vídeo. Ao selecionar uma câmera, a pessoa é levada à página oficial do provedor.

**Site:** [errejota.live](https://errejota.live)

## O que você encontra

- Mapa responsivo com câmeras públicas e limites dos bairros.
- Dossiê do bairro com câmeras, chuva e risco de alagamento.
- Camada de chuva observada, com estação mais próxima e horário da leitura.
- Equipamentos públicos: pontos de ajuda, abrigos e hospitais públicos.
- Relatos de problemas em câmeras, enviados para moderação.
- Leitura 3D opcional dos prédios.
- Tema claro e escuro, em português.

## Princípios

- Apenas dados públicos, com fonte e atribuição visíveis.
- Sem contas de visitante, sem métricas de uso e sem rastreamento de terceiros.
- Nada de reconhecimento de pessoas ou veículos, gravação de vídeo ou extração de feeds privados.
- Falha de fonte aparece como **dados indisponíveis**, nunca como “normal” ou “sem risco”.
- Cada câmera e cada camada apontam para a origem oficial.

## Tecnologias

Next.js, React, TypeScript, Tailwind CSS, MapLibre GL, PostgreSQL e Drizzle ORM.

## Rodar localmente

Pré-requisitos: Node.js e npm.

```bash
git clone https://github.com/victorcapile/errejota-live.git
cd errejota
npm ci
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Para preparar o banco local, os dados de exemplo e as variáveis de ambiente, siga o [CONTRIBUTING.md](CONTRIBUTING.md). Nunca envie credenciais, dados pessoais ou detalhes de infraestrutura em commits, issues ou pull requests.

## Contribuir

Correções, acessibilidade, documentação, dados com fonte verificável e melhorias de desempenho são bem-vindos.

1. Leia o [CONTRIBUTING.md](CONTRIBUTING.md).
2. Abra uma issue para discutir mudanças grandes ou novos dados.
3. Envie um pull request pequeno, explicando o contexto e como verificar.

As contribuições precisam preservar a origem dos dados e o princípio de link para a página oficial.

## Dados e atribuição

Dados de terceiros mantêm as licenças, atribuições e condições das fontes originais. Consulte [docs/FONTES.md](docs/FONTES.md) antes de reutilizar ou redistribuir.
