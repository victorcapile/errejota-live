# Fase 3 — progresso

Atualizado em: 07/11/2026, 02:40 (America/Sao_Paulo)

## Concluído

- [x] Report de câmera reformulado
  - [x] Ícone de bandeira mais destacado (âmbar)
  - [x] Opções: Câmera offline / Câmera online / Outro problema
  - [x] Campo de observação mantido
  - [x] Aviso de privacidade removido
- [x] Tabela `safety_facilities` (pontos de apoio, abrigos e hospitais)
- [x] Tabela `system_state` (estado do modo crítico)
- [x] Migration `db:migrate-safety` + workflow manual
- [x] Script `db:safety` (Defesa Civil + CNES)
  - [x] 189 pontos de apoio
  - [x] 12 abrigos
  - [x] 76 hospitais **somente da rede pública** (natureza jurídica 1xxx e empresa pública; particulares desativados)
  - [x] Paginação do CNES corrigida (offset de 20 em 20)
  - [x] Registros que saem da fonte são desativados automaticamente
  - [x] Coordenadas corrigidas: Data.Rio para unidades municipais e
        Nominatim/OSM para as demais quando o CNES diverge
  - [x] Equipamentos fora dos bairros do município não são plotados
- [x] API `/api/safety`
- [x] Layout do admin revisado
  - [x] Conteúdo em largura total (antes encolhia e deixava margens vazias)
  - [x] Estados vazios com ícone e texto nos painéis
  - [x] Painéis de moderação/câmeras/auditoria preenchendo a altura
  - [x] Chuva em duas colunas (ingestão + estações)
  - [x] Auditoria em tabela
  - [x] Rodapé fixo no fim da página
- [x] Camada de equipamentos no mapa (triângulos por tipo, com cores fora da paleta das regiões + destaque de risco alto)
- [x] Dossiê de equipamentos no lugar do dossiê de câmeras quando "Ajuda" está ativo
  - [x] Filtros por tipo dentro do dossiê
  - [x] Lista filtrada pelo bairro selecionado no sidebar
  - [x] Clique no equipamento abre o painel específico; ao fechar, a lista volta
  - [x] Dossiê de câmeras nunca aparece no modo Ajuda (estado é limpo ao entrar/sair)
  - [x] Sidebar continua mostrando Situação, Região e Bairros como na visão normal
- [x] Filtros por tipo (Todos / Pontos de ajuda / Abrigos / Hospitais)
- [x] Câmeras desligadas por padrão ao ligar Ajuda; botão permanece visível e permite sobrepor as duas camadas
- [x] Clique 1: voa até o equipamento; clique 2: abre Google Maps
- [x] Card do equipamento no mesmo painel do dossiê
  - [x] Ao clicar, o dossiê do bairro é aberto e o painel do equipamento entra no lugar
  - [x] Ao fechar (X), o dossiê volta
- [x] Modo avançado automático
  - [x] Ativado quando o estágio oficial é 3, 4 ou 5 (sem histerese/estado)
  - [x] Chuva, risco por bairro e ajuda ligados; câmeras desligadas
  - [x] Atualização de condições a cada 60s
  - [x] Volta ao normal quando o estágio fica abaixo de 3
  - [x] Banner usa a cor oficial do estágio (sem "modo crítico")
- [x] Faixa do estágio visível no mobile, acima do mapa e do botão de menu
  - [x] Faixa compacta de 32px, colada no topo, com fallback "Estágio indisponível"
  - [x] Header desktop (logo/menu/tema) oculto no mobile apenas na página do mapa
  - [x] Painel "Modo avançado" no admin (somente status)
  - [x] Override manual de estágio substitui o COR-Rio até ser removido
    - [x] Botão "Voltar ao COR-Rio" no admin
    - [x] Valor lido do `system_state` a cada consulta (efeito imediato)
- [x] Risco de chuva do bairro no dossiê
  - [x] Nível (baixo/médio/alto/não avaliado) visível no cabeçalho do dossiê
  - [x] Cruzamento chuva × território (ISMFI): sem chuva = Baixo; com chuva = matriz; sem dados = Não avaliado

## Pendente

- [ ] Pintura do prédio 3D do equipamento com a cor da região
- [ ] Atualizar `/sobre` (remover roadmap antigo, explicar as camadas novas)
- [ ] Validação final (typecheck, lint, dev, mobile/desktop)

## Antes do deploy (banco real)

A validação local usa PGlite. Antes de publicar, repetir no banco de produção:

- [ ] Rodar as migrations manuais: `db:migrate-safety` e `db:migrate-reports`.
- [ ] Rodar o sync `db:safety` (Defesa Civil + CNES) e conferir:
  - [ ] 189 pontos de ajuda, 12 abrigos e 76 hospitais públicos;
  - [ ] nenhum hospital particular ativo;
  - [ ] nenhum equipamento fora dos bairros do município.
- [ ] Validar o override de estágio no banco real:
  - [ ] salvar estágio 3 → banner e modo avançado ativos;
  - [ ] “Voltar ao COR-Rio” → estágio oficial volta a valer;
  - [ ] conferir a chave `system_state.stage_override`.
- [ ] Validar o modo avançado com o estágio real 3+ (chuva, risco por bairro e ajuda ligados; câmeras desligadas).
- [ ] Validar o dossiê de bairro com “Risco de alagamento” usando dados reais.
- [ ] Rodar o build com `DATABASE_URL` real.
- [ ] Não commitar/pushar sem pedido explícito.

## Próximos passos

- [ ] Terminar a validação local (typecheck, lint, fluxos mobile/desktop).
- [ ] Validar tudo contra o banco real de produção antes do deploy (ver seção acima).
- [ ] Depois: transformar o projeto em app **React Native** e testar com **Expo**.
  - Reaproveitar as APIs (`/api/stage`, `/api/safety`, `/api/conditions`, `/api/cameras` etc.).
  - Planejar equivalentes nativos para mapa, dossiê, filtros, lista de ajuda e modo avançado.
  - Manter as mesmas regras: sem inventar dados, sem rastrear visitantes e com fontes/atribuições visíveis.

## Como acompanhar

- **Progresso geral:** este arquivo (`FASE-3.md`).
- **Dev server:** `tail -f /tmp/errejota-dev.log`.
- **Arquivos alterados:** `git status --short` e `git diff --stat`.
- **Banco local:** `npm run db:safety` (sincroniza) e
  `npm run db:migrate-safety` (cria tabelas).
