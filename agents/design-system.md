# Design system da Raro

Guia de referência para interfaces dos produtos Raro. Ele descreve a base visual usada neste projeto e pode ser aplicado com CSS puro, Tailwind ou outra biblioteca. O nome, o logo, o conteúdo e os destinos de navegação pertencem a cada produto.

## 1. Princípios de uso

- Use tokens semânticos (`primary`, `surface`, `danger`) em vez de cores soltas nos componentes. Assim, a mesma interface funciona nos temas escuro e claro.
- Mantenha controles compactos, texto legível e hierarquia discreta: a informação deve prevalecer sobre a decoração.
- Reutilize os mesmos padrões de estados (ativo, hover, foco, desabilitado, carregamento e vazio) em todas as telas.
- Preserve rótulos visíveis para ações importantes. Botões apenas com ícone precisam de nome acessível (`aria-label`) e dica (`title`).

## 2. Tokens fundamentais

### Cores

O tema escuro é o padrão. O tema claro é ativado pela classe `theme-light` no elemento raiz. Todos os valores abaixo são os usados em `src/app/globals.css`.

| Token CSS | Uso | Escuro | Claro |
| --- | --- | --- | --- |
| `--app-background` | Fundo da página | `#0B0F17` | `#F5F7FB` |
| `--app-surface` | Cards, painéis e barras | `#101726` | `#FFFFFF` |
| `--app-surface-elevated` | Áreas internas e hover | `#1A2236` | `#EEF2F7` |
| `--app-foreground` | Texto principal | `#E2E8F0` | `#1F2937` |
| `--app-muted-foreground` | Texto secundário | `#94A3B8` | `#64748B` |
| `--app-border` | Divisórias e contornos | `#1E293B` | `#CBD5E1` |
| `--app-primary` | Ação e seleção principal | `#2563EB` | `#2563EB` |
| `--app-primary-foreground` | Texto sobre a cor principal | `#FFFFFF` | `#FFFFFF` |
| `--app-success` | Confirmação e estado positivo | `#059669` | `#047857` |
| `--app-warning` | Atenção | `#D97706` | `#B45309` |
| `--app-danger` | Erro e ação destrutiva | `#E11D48` | `#BE123C` |

Base CSS para iniciar outro projeto:

```css
:root {
  color-scheme: dark;
  --app-background: #0b0f17;
  --app-surface: #101726;
  --app-surface-elevated: #1a2236;
  --app-foreground: #e2e8f0;
  --app-muted-foreground: #94a3b8;
  --app-border: #1e293b;
  --app-primary: #2563eb;
  --app-primary-foreground: #ffffff;
  --app-success: #059669;
  --app-warning: #d97706;
  --app-danger: #e11d48;
  --radius-app-sm: 6px;
  --radius-app-md: 8px;
  --radius-app-lg: 12px;
  --radius-app-pill: 999px;
  --shadow-app-elevated: 0 24px 70px rgba(15, 23, 42, 0.18);
  --blur-app-overlay: 18px;
  --font-app-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --font-app-mono: ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, "Liberation Mono", "Courier New", monospace;
}

.theme-light {
  color-scheme: light;
  --app-background: #f5f7fb;
  --app-surface: #ffffff;
  --app-surface-elevated: #eef2f7;
  --app-foreground: #1f2937;
  --app-muted-foreground: #64748b;
  --app-border: #cbd5e1;
  --app-primary: #2563eb;
  --app-primary-foreground: #ffffff;
  --app-success: #047857;
  --app-warning: #b45309;
  --app-danger: #be123c;
}

body {
  background: var(--app-background);
  color: var(--app-foreground);
  font-family: var(--font-app-sans);
  font-size: 14px;
}

:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}
```

No Tailwind 4, mapeie essas variáveis em `@theme inline` para usar classes como `bg-app-surface`, `text-app-foreground` e `border-app-border`. Modificadores de opacidade servem para estados suaves, por exemplo `bg-app-primary/15` em um badge; o texto continua com a cor semântica sólida. Aplique `theme-light` no `<html>` ao trocar o tema. Neste projeto, a preferência é armazenada na chave `theme` do `localStorage`.

### Tipografia

- Fonte de interface: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`.
- Fonte monoespaçada: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`.
- Corpo padrão da aplicação: `14px`, peso normal, `letter-spacing: 0` e antialiasing.
- Escala usada: `12px` para legendas e dicas; `14px` para controles e texto de interface; `16px` a `20px` para títulos locais; `24px` para métricas e títulos de destaque.
- Títulos e ações principais usam peso `600` ou `700`. Números de métricas usam alinhamento tabular (`tabular-nums`).

### Espaçamento, forma e efeitos

| Elemento | Padrão |
| --- | --- |
| Espaçamento entre campos e elementos próximos | `8–12px` |
| Espaçamento entre seções e painéis | `16–24px` |
| Área interna de painéis | `16px`; até `24px` em contextos amplos |
| Margem horizontal da página | `16px` no mobile, `24px` no tablet, `32px` no desktop |
| Margem vertical da página | `20px` no mobile, `24px` no desktop |
| Altura de controle padrão | `40px` (`h-10`) |
| Raio pequeno | `6px` (`rounded-app-sm`) |
| Raio médio | `8px` (`rounded-app-md`) |
| Raio grande | `12px` (`rounded-app-lg`) |
| Raio de pill | `999px` (`rounded-app-pill`) |

- Sombra elevada: `0 24px 70px rgba(15, 23, 42, 0.18)`; use em diálogos e superfícies flutuantes.
- Desfoque de overlay: `18px`; o backdrop de diálogos combina esse efeito com `rgba(2, 6, 23, 0.6)` (`bg-slate-950/60`).
- Transições de cor dos controles: `150ms`. Evite mudanças de tamanho entre estados.
- Foco visível: contorno sólido de `2px` na cor `--app-primary`, com distância de `2px`. Garanta esse foco também nos campos ao adaptar as classes, pois o helper de campos atual usa `focus-visible:outline-none`.
- Respeite a preferência por movimento reduzido em animações de carregamento (`motion-reduce:animate-none` no Tailwind).

## 3. Componentes

| Componente | Aparência e uso |
| --- | --- |
| Botão primário | `40px` de altura, fundo `primary`, texto `primary-foreground`, raio médio, texto de `14px` semibold; hover com brilho leve. Use para a ação principal do contexto. |
| Botão secundário | Mesma altura, fundo `surface-elevated`, borda `border` e texto `foreground`; hover em `surface`. |
| Botão ghost | Sem fundo ou borda em repouso, texto `muted-foreground`; hover em `surface-elevated` com texto `foreground`. |
| Botão destrutivo | Fundo `danger` e texto claro. Use texto explícito para a consequência da ação. |
| Botão compacto | `32px` de altura, raio pequeno e texto de `12px`; adequado a ações repetidas em listas. |
| Campo de texto ou seleção | Largura total, `40px` de altura, raio médio, fundo `surface`, borda `border`, padding horizontal de `12px` e texto de `14px`. Seleções reservam espaço para a seta. |
| Área de texto | Mesmas cores e borda do campo, com padding vertical de `8px`; a altura cresce conforme o caso. |
| Rótulo e dica | Rótulo de `14px` médio em `foreground`; dica de `12px` em `muted-foreground`. Associe o rótulo ao controle. |
| Badge | Pill com padding de `8px` horizontal e `2px` vertical, texto de `12px` semibold. Tons: `primary`, `success`, `warning` e `danger` com fundo translúcido e texto na cor semântica; o neutro usa `surface-elevated` e `muted-foreground`. |
| Painel | Fundo `surface`, borda `border` e raio grande. Cabeçalho com título de `14px` bold, descrição secundária e divisória inferior. |
| Cartão de métrica | Painel com padding de `16px`, rótulo de `12px`, valor de `24px` bold e dica opcional. |
| Diálogo | Overlay central, backdrop escuro com blur, painel `surface` com raio grande e sombra elevada; largura até `32rem` por padrão, margem externa de `16px` e corpo rolável até `75vh`. Fecha por botão, Escape ou clique no backdrop. |
| Estado vazio | Contorno tracejado, raio médio, padding de `24px`, título centralizado de `14px` semibold e descrição opcional de `12px`. |
| Carregamento | Preserve a geometria da tela com linhas ou cartões provisórios. Use spinner pequeno com texto acessível; sinalize a área carregando com `aria-busy` quando apropriado. |

Para botões desabilitados, reduza a opacidade a `50%` e use cursor de indisponibilidade; campos desabilitados usam `60%`. O estado de envio mantém a altura do botão e pode mostrar um spinner antes do rótulo. Para erros de formulário, combine texto claro e breve com `danger`; a cor sozinha não deve carregar a mensagem.

Exemplo de composição independente da biblioteca:

```html
<section class="painel">
  <header class="painel__cabecalho">
    <h2>Visão geral</h2>
    <p>Resumo das informações desta área.</p>
  </header>
  <div class="painel__conteudo">
    <span class="badge badge--success">Ativo</span>
    <button class="botao botao--primary" type="button">Criar item</button>
  </div>
</section>
```

Os nomes das classes do exemplo são ilustrativos; os valores e estados da tabela definem o padrão visual.

## 4. Layout e navegação

- Breakpoints de referência: mobile abaixo de `640px`; tablet de `640px` a `1023px`; desktop a partir de `1024px`. O conteúdo principal pode chegar a `72rem` (`max-w-6xl`).
- No desktop, use sidebar fixa de `16rem` (`w-64`), header sticky de `4rem` (`h-16`) e conteúdo com margem correspondente à sidebar. A sidebar contém marca e navegação principal.
- No mobile, use header compacto e navegação inferior fixa de `4rem` para os destinos principais. Reserve no conteúdo o espaço da barra e da safe area (`env(safe-area-inset-bottom)`).
- O item ativo usa texto `primary` e, no desktop, fundo `primary` com cerca de `10%` de opacidade. Um destino está ativo quando o caminho atual é igual ao seu endereço ou começa com esse endereço seguido de `/`.
- Itens da sidebar têm cerca de `40px` de altura; na navegação inferior, ícone acima do rótulo. Mantenha alvos interativos com pelo menos `40px` sempre que o espaço permitir.
- Telas públicas podem usar um painel centralizado sobre `background`, com largura máxima de `28rem`, raio grande, borda e sombra elevada. A marca exibida ali é a do produto que usa o sistema.
- Menus flutuantes devem caber na viewport pequena, ter rolagem quando necessário e fechar ao clicar fora ou pressionar Escape.

## 5. Adoção em outro produto

1. Copie os tokens de cor, tipografia, forma e efeitos deste guia para a base de estilos do novo projeto. Se usar Tailwind 4, replique o mapeamento `@theme` de `src/app/globals.css`.
2. Implemente primeiro os controles e superfícies compartilhados; depois componha telas com eles. Os exemplos de Tailwind estão em `src/components/ui.tsx`, `src/components/dialog.tsx` e `src/components/shell.tsx` deste projeto.
3. Substitua nome, logo, ícones de produto, textos, conteúdo e destinos de navegação. Mantenha os tokens de cor e as regras de composição para conservar a identidade Raro.
4. Confira uma tela pública, uma tela com dados, um formulário e um diálogo nos dois temas e nos três tamanhos de viewport. Verifique foco por teclado, texto legível, menus dentro da viewport e ausência de conteúdo coberto pela navegação móvel.

O arquivo `docs/styling.schema.json` contém também ideias para evolução, como PWA, drawer móvel, grupos de navegação, paginação e alguns componentes de feedback. Esses itens são **opcionais**: não são exigências deste guia nem devem ser tratados como já implementados no projeto de referência.
