# Organizador

Calendário, planner semanal e kanban num só lugar. HTML, CSS e JavaScript puros, sem instalar nada.

## Como abrir

Dê dois cliques em `site/index.html`. Abre em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).

## As três abas

- **Calendário**: o mês inteiro. Clique num dia para agendar (título, horário opcional e linha/categoria). Arraste um compromisso para outro dia para mudar a data. Ao lado, a *linha da semana* mostra a semana do dia escolhido.
- **Planner**: a semana de segunda a domingo, com as datas de verdade. Tudo o que você agenda no calendário aparece aqui no dia certo, junto com a **rotina semanal** (itens que se repetem, como "Academia, seg/qua/sex"). Marque cada item como feito no círculo à esquerda.
- **Kanban**: A fazer → Fazendo → Feito. Arraste os cartões ou use as setas. Independente do calendário.

As categorias são "linhas" com as cores do Metrô de SP: 1 Trabalho, 2 Contas, 3 Saúde, 4 Casa, 5 Pessoal, 15 Outros.

## Onde ficam os dados

No próprio navegador (`localStorage`, chave `organizador:v1`). Nada vai para a internet: até a fonte (Archivo) está dentro do projeto, então funciona offline.

- Os dados ficam só no navegador e no endereço onde foram criados: o arquivo aberto com dois cliques, o site publicado e o celular têm cada um os seus.
- Limpar os dados de navegação do site apaga tudo.

## Publicar na Cloudflare

Só a pasta `site/` vai para o ar. O resto (`.impeccable/`, os `.md`) é material de trabalho.

**Worker ligado ao GitHub (como está configurado):** o `wrangler.jsonc` na raiz manda publicar `site/` como site estático, no Worker `planner`. No painel, em *Settings → Build*:

- **Build command:** vazio
- **Deploy command:** `npx wrangler deploy`

A cada push na `main`, a Cloudflare publica sozinha.

**Do seu computador, sem GitHub:** `npx wrangler deploy` (pede login na primeira vez).

O arquivo `site/_headers` configura os cabeçalhos: o site só pode carregar arquivos dele mesmo (Content-Security-Policy) e a fonte fica em cache por um ano.

## Estrutura

```
wrangler.jsonc        configuração do Worker (publica a pasta site/)
site/                 tudo o que vai para o ar
  index.html
  _headers            cabeçalhos da Cloudflare (segurança e cache)
  css/styles.css
  fonts/              Archivo (woff2 variável) + licença OFL
  js/core.js          datas, feriados, linhas, ícones, armazenamento, arrastar
  js/composer.js      formulário de agendar e a "estação" (um dia da semana)
  js/calendar.js      aba Calendário
  js/planner.js       aba Planner + rotina semanal
  js/kanban.js        aba Kanban
  js/main.js          abas, rotas (#calendario, #planner, #kanban) e renderização
PRODUCT.md, DESIGN.md documentação do produto e do sistema visual
.impeccable/          esboços, capturas de revisão e configuração do design (não publicar)
```
