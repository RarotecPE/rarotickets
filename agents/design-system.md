# Identidade visual Raro

Este guia define a base visual compartilhada pelos produtos Raro. Pode ser aplicado com CSS puro, Tailwind ou outra tecnologia. Cada produto define seu próprio nome, logo, conteúdo, componentes e navegação.

## Princípios

- Use os tokens semânticos de cor em vez de valores isolados. Isso mantém a mesma hierarquia visual nos temas escuro e claro.
- Priorize informação legível, controles compactos e decoração discreta. Use cor e peso tipográfico para indicar hierarquia sem depender apenas de tamanho.
- Mantenha o significado das cores consistente: azul para destaque e ação principal, verde para sucesso, âmbar para atenção e rosa avermelhado para erro ou perigo.
- Aplique estados visuais de interação de forma consistente. Preserve foco visível, contraste legível e indicações que não dependam somente de cor.
- Respeite a preferência do usuário por movimento reduzido; animações devem ser sutis e nunca impedir a compreensão do conteúdo.

## Cores e temas

O tema escuro é o padrão. Para o tema claro, aplique a classe `theme-light` ao elemento raiz. Os nomes dos tokens são uma convenção compartilhada; outras tecnologias podem reproduzir os mesmos valores e significados.

| Token CSS | Uso | Escuro | Claro |
| --- | --- | --- | --- |
| `--app-background` | Fundo da página | `#0B0F17` | `#F5F7FB` |
| `--app-surface` | Superfícies de conteúdo | `#101726` | `#FFFFFF` |
| `--app-surface-elevated` | Superfícies em destaque | `#1A2236` | `#EEF2F7` |
| `--app-foreground` | Texto principal | `#E2E8F0` | `#1F2937` |
| `--app-muted-foreground` | Texto secundário | `#94A3B8` | `#64748B` |
| `--app-border` | Divisórias e contornos | `#1E293B` | `#CBD5E1` |
| `--app-primary` | Destaque e ação principal | `#2563EB` | `#2563EB` |
| `--app-primary-foreground` | Texto sobre a cor principal | `#FFFFFF` | `#FFFFFF` |
| `--app-success` | Estado positivo | `#059669` | `#047857` |
| `--app-warning` | Atenção | `#D97706` | `#B45309` |
| `--app-danger` | Erro e perigo | `#E11D48` | `#BE123C` |

Esta base CSS contém todos os tokens necessários para reproduzir os dois temas:

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
  letter-spacing: 0;
}

:focus-visible {
  outline: 2px solid var(--app-primary);
  outline-offset: 2px;
}
```

As superfícies usam `--app-background`, `--app-surface` e `--app-surface-elevated` conforme sua posição na hierarquia. Para realces suaves, use uma transparência da cor semântica sobre a superfície; mantenha texto e ícones com contraste suficiente em ambos os temas. Quando uma cor indicar estado, acompanhe-a de texto ou outro sinal perceptível.

Em Tailwind 4, o uso é opcional: mapeie as variáveis de cor em `@theme inline`, por exemplo `--color-app-surface: var(--app-surface)` e `--color-app-foreground: var(--app-foreground)`. Repita a correspondência para os demais tokens da tabela. Assim, utilitários como `bg-app-surface` e `text-app-foreground` seguem a troca de tema automaticamente. Em outras ferramentas, faça a mesma correspondência entre tokens semânticos e estilos.

## Tipografia, espaçamento e efeitos

- Fonte de interface: `var(--font-app-sans)`; fonte monoespaçada: `var(--font-app-mono)`.
- Corpo padrão: `14px`, peso normal, espaçamento entre letras `0` e suavização de texto quando disponível.
- Escala de referência: `12px` para informação auxiliar; `14px` para texto de interface; `16px` a `20px` para títulos locais; `24px` para destaques. Use pesos `600` ou `700` nos títulos e nas ações principais. Para colunas numéricas, use algarismos tabulares.
- Ritmo de espaçamento: `8–12px` entre elementos próximos; `16–24px` entre grupos; `16px` de respiro interno, podendo chegar a `24px` em áreas amplas.
- Respiro das páginas: `16px` nas laterais em telas pequenas, `24px` em telas médias e `32px` em telas largas; na vertical, `20px` em telas pequenas e `24px` em telas largas.
- Raios: `6px` para detalhes pequenos, `8px` para uso geral, `12px` para superfícies maiores e `999px` para formas arredondadas por completo.
- Elevação: sombra `0 24px 70px rgba(15, 23, 42, 0.18)` em superfícies flutuantes. Sobreposições podem usar desfoque de `18px` e fundo `rgba(2, 6, 23, 0.6)`.
- Transições de cor podem durar `150ms`. Evite mudanças de tamanho entre estados e reduza ou elimine animações quando `prefers-reduced-motion: reduce` estiver ativo.
- O foco por teclado usa contorno sólido de `2px` em `--app-primary`, afastado `2px` do elemento. Não remova esse sinal sem substituí-lo por outro igualmente visível.

## Menu superior e navegação

- Crie um cabeçalho no topo da aplicação com a identidade do produto, o título da página atual e as ações da conta. Adapte a disposição desses elementos ao espaço disponível sem perder a identificação da página nem o acesso às ações.
- Inclua no cabeçalho o botão **Aplicativos** para conectar os sistemas disponíveis à conta no RaroNexus. Ao acioná-lo, abra um menu com os sistemas autorizados; cada opção deve mostrar o nome do sistema e levar ao respectivo endereço. Esse menu reúne acessos entre sistemas e é separado da navegação interna do produto.
- Use `--app-surface` no cabeçalho e no menu aberto, `--app-border` nas divisórias, `--app-foreground` no texto principal e `--app-muted-foreground` nos elementos secundários. Destaque a página ativa e as ações selecionadas com `--app-primary`. Garanta nomes acessíveis para os botões, foco visível e estados de abertura perceptíveis por teclado e leitor de tela.
- No mobile, conte apenas os destinos da navegação principal do produto; os sistemas exibidos em **Aplicativos** não entram nessa contagem. Com **até 5 destinos**, pode ser mantido o padrão atual de navegação. Com **6 ou mais destinos**, use um botão hamburger à esquerda do cabeçalho para abrir a navegação principal em um menu lateral. Nesse caso, a navegação inferior deixa de apresentar esses destinos.

## Aplicação em outros produtos

1. Incorpore a base CSS acima ou reproduza seus valores em tokens equivalentes na tecnologia escolhida.
2. Use os tokens semânticos na interface inteira e preserve seus significados nos dois temas. A alternância de tema deve trocar o conjunto de cores de forma coerente.
3. Defina componentes, estrutura de páginas, marca e navegação de acordo com o produto, aplicando a mesma tipografia, escala, espaçamento, forma e linguagem de cores.
4. Revise telas representativas nos temas escuro e claro e em larguras pequenas e grandes. Confira legibilidade, contraste, foco por teclado, estados comunicados além da cor e preferência por movimento reduzido.
