# Design System — Guia Completo de Layout e Componentes Visuais

> **Referência para construir sistemas com a mesma aparência. Preserve os tokens, as proporções do shell e os componentes compartilhados, sobretudo o cabeçalho de tema, aplicativos e conta. A marca, os destinos internos e os dados de cada produto podem mudar; a estrutura visual compartilhada deve permanecer igual.**

Este documento tem três tipos de conteúdo: **implementação atual** (código transcrito do projeto), **exemplo de composição** (uso dos componentes existentes) e **requisito para novas implementações** (comportamento a verificar ou completar ao transportar o padrão). Os requisitos não significam que todos os recursos já estejam implementados neste repositório.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Bibliotecas e Dependências](#2-bibliotecas-e-dependências)
3. [Design Tokens](#3-design-tokens)
4. [Tipografia](#4-tipografia)
5. [Cores](#5-cores)
6. [Espaçamentos e Layout](#6-espaçamentos-e-layout)
7. [Estrutura de Pastas do Client](#7-estrutura-de-pastas-do-client)
8. [Arquivos de Configuração](#8-arquivos-de-configuração)
9. [Componentes de Layout](#9-componentes-de-layout)
10. [Componentes de UI](#10-componentes-de-ui)
11. [Formulários](#11-formulários)
12. [Modais e Dialogs](#12-modais-e-dialogs)
13. [Tabelas e Listas](#13-tabelas-e-listas)
14. [Feedback e Notificações](#14-feedback-e-notificações)
15. [Responsividade](#15-responsividade)
16. [Dark Mode](#16-dark-mode)
17. [Acessibilidade](#17-acessibilidade)
18. [Animações e Transições](#18-animações-e-transições)
19. [Anti-Patterns de UI](#19-anti-patterns-de-ui)
20. [Apêndice A: Checklist de Nova Tela](#apêndice-a-checklist-de-nova-tela)
21. [Apêndice B: Resumo Visual](#apêndice-b-resumo-visual)

---

## 1. Visão Geral

### 1.1 Filosofia de Design

- **Uma família visual Raro:** superfícies discretas, azul para ações, informação compacta e os mesmos controles globais em todos os sistemas.
- **Densidade administrativa:** corpo de 14px, controles de 40px, painéis com borda de 1px e títulos locais de 14–20px. Não ampliar a interface para a escala de uma landing page.
- **Escuro por padrão:** o claro é uma alternativa completa baseada nos mesmos tokens.
- **Composição reutilizável:** páginas combinam `Panel`, `PanelHeader`, `Stat`, `Badge`, `Empty`, campos e dialogs; não reinventam estilos por domínio.
- **Navegação separada por finalidade:** sidebar/bottom navigation são do produto; o menu Aplicativos conecta os sistemas da conta.
- **Cabeçalho compartilhado:** a ordem visual é tema → aplicativos → avatar. Perfil, papel de acesso e saída ficam dentro do menu da conta.
- **Acessibilidade verificável:** conservar o desenho e completar a semântica, o foco e o teclado quando necessário. Ver seção 17 para lacunas atuais.

### 1.2 Stack de UI do Projeto

Versões declaradas em [package.json](../package.json); não são uma indicação de versões mais recentes.

| Camada | Implementação do raroclients | Regra para reprodução |
| --- | --- | --- |
| Framework | Next.js `16.2.6`, App Router | Rotas e layouts em `src/app` |
| Interface | React e React DOM `19.2.6` | Server Components para páginas; Client Components para interação |
| Linguagem | TypeScript `5.9.3`, `strict: true` | Props e contratos de dados tipados |
| Estilização | Tailwind CSS `4.1.17` | CSS-first, `@theme` e `@theme inline` |
| Ícones | `lucide-react` declarado como `^1.33.0` | Mesma família, tamanhos de 16px e 20px |
| Componentes | Componentes próprios em `src/components` | Reutilizar as APIs deste guia |
| Formulários | HTML nativo, React e Server Actions | `DialogForm`, `SubmitButton`, `FormData` |
| Dados | PostgreSQL + Drizzle; consultas no servidor | Manter banco e regras de negócio fora dos componentes visuais compartilhados |
| Tema | CSS + estado React + `localStorage` | Classe `theme-light`, chave `theme` |
| Datas/números | Utilitários em `src/lib/utils.ts` e `Intl` | Formatação brasileira consistente |

shadcn/ui, Radix, React Hook Form, Zod, TanStack Query/Table, Sonner, Zustand, Framer Motion e next-themes **não fazem parte da implementação atual**. O modelo menciona essas bibliotecas, mas elas não são necessárias para reproduzir esta interface.

## 2. Bibliotecas e Dependências

### 2.1 Instalação Base

No repositório existente, conservar o lockfile:

```bash
npm ci
npm run dev
```

Para transportar a UI para outro projeto Next.js/React compatível, copiar os componentes e o CSS indicados neste guia e declarar as mesmas dependências de UI. Não transportar dependências de banco, PDF ou armazenamento só para obter a aparência.

```bash
npm install next@16.2.6 react@19.2.6 react-dom@19.2.6 lucide-react@1.33.0
npm install -D tailwindcss@4.1.17 @tailwindcss/postcss@4.1.17 postcss@8.5.8 typescript@5.9.3 @types/react@19.2.14 @types/react-dom@19.2.3 @types/node@22.19.15
```

Esse comando é uma referência de dependências para a cópia de UI, não um scaffold completo nem uma migração automática de um sistema existente. O lockfile do raroclients determina as versões efetivamente instaladas aqui.

### 2.2 Dependências Opcionais

Novas bibliotecas só devem ser incluídas por necessidade funcional. Uma tabela simples usa `<table>`; uma lista usa HTML; uma transição usa CSS. Se outro produto adotar uma biblioteca de UI, seus componentes devem receber os tokens Raro e manter as medidas documentadas, inclusive no cabeçalho.

### 2.3 Dependências de Desenvolvimento

O projeto usa ESLint 9 com `eslint-config-next` e verificação pelo TypeScript. Scripts disponíveis:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Ao modificar apenas documentação, conferir conteúdo, links e fidelidade dos exemplos. Ao implementar ou alterar componentes, executar as verificações pertinentes e a revisão visual da seção 15.

## 3. Design Tokens

### 3.1 Arquivo de Tokens

Fonte executável: [src/app/globals.css](../src/app/globals.css). Fonte descritiva dos fundamentos: [styling.schema.json](./styling.schema.json). O JSON é um blueprint visual; não é carregado em runtime e não substitui o CSS.

**Implementação atual completa.** Copiar este arquivo ao reproduzir a identidade. Os nomes reais das fontes no Tailwind são `--font-sans` e `--font-mono`.

```css
@import "tailwindcss";

/* ------------------------------------------------------------------ */
/* Styling base — docs/styling.schema.json                             */
/* Tema dark por padrão; aplique a classe .theme-light no <html>       */
/* para trocar todos os tokens de superfície para o modo claro.        */
/* ------------------------------------------------------------------ */

@custom-variant light (&:where(.theme-light, .theme-light *));

:root {
  color-scheme: dark;

  /* Superfícies e texto — dark (padrão) */
  --app-background: #0b0f17;
  --app-surface: #101726;
  --app-surface-elevated: #1a2236;
  --app-foreground: #e2e8f0;
  --app-muted-foreground: #94a3b8;
  --app-border: #1e293b;

  /* Semânticas */
  --app-primary: #2563eb;
  --app-primary-foreground: #ffffff;
  --app-success: #059669;
  --app-warning: #d97706;
  --app-danger: #e11d48;
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

/* Cores mapeadas como utilitários bg-app-*, text-app-*, border-app-*.
   `inline` faz o utilitário referenciar a variável, então a troca de
   tema via .theme-light reflete automaticamente em todos os usos. */
@theme inline {
  --color-app-background: var(--app-background);
  --color-app-surface: var(--app-surface);
  --color-app-surface-elevated: var(--app-surface-elevated);
  --color-app-foreground: var(--app-foreground);
  --color-app-muted-foreground: var(--app-muted-foreground);
  --color-app-border: var(--app-border);
  --color-app-primary: var(--app-primary);
  --color-app-primary-foreground: var(--app-primary-foreground);
  --color-app-success: var(--app-success);
  --color-app-warning: var(--app-warning);
  --color-app-danger: var(--app-danger);
}

/* Forma, efeitos e tipografia — tokens fixos do schema */
@theme {
  --radius-app-sm: 6px;
  --radius-app-md: 8px;
  --radius-app-lg: 12px;
  --radius-app-pill: 999px;

  --shadow-app-elevated: 0 24px 70px rgba(15, 23, 42, 0.18);
  --blur-app-overlay: 18px;

  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}

@layer base {
  html {
    @apply h-full antialiased;
  }

  body {
    @apply min-h-screen bg-app-background font-sans text-app-foreground antialiased;
    font-size: 14px;
    letter-spacing: 0;
    text-rendering: optimizeLegibility;
  }

  /* Borda padrão derivada do tema */
  *,
  ::before,
  ::after {
    border-color: var(--app-border);
  }

  /* Anel de foco: 2px solid primary com offset de 2px (válido nos dois temas) */
  :focus-visible {
    outline: 2px solid var(--app-primary);
    outline-offset: 2px;
  }

  ::selection {
    background: color-mix(in srgb, var(--app-primary) 32%, transparent);
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--app-surface-elevated);
    border-radius: var(--radius-app-pill);
    border: 2px solid var(--app-background);
  }
}
```

### 3.2 Tailwind 4 com Tokens

O raroclients não usa `tailwind.config.ts` nem diretivas `@tailwind base/components/utilities`. As cores ficam em `:root`/`.theme-light` e são expostas por `@theme inline`; raios, fontes e efeitos ficam em `@theme`.

| Token | Utilitário | Exemplo |
| --- | --- | --- |
| `--app-surface` | `bg-app-surface` | Painel, header, dropdown |
| `--app-foreground` | `text-app-foreground` | Texto principal |
| `--app-border` | `border-app-border` | Borda e divisória |
| `--app-primary` | `bg-app-primary`, `text-app-primary` | Ação ou seleção |
| `--radius-app-md` | `rounded-app-md` | Campos, botões, itens de navegação |
| `--shadow-app-elevated` | `shadow-app-elevated` | Dialog e feedback flutuante |
| `--blur-app-overlay` | `backdrop-blur-app-overlay` | Overlay de dialog/operação |

As dimensões de layout atuais são classes compartilhadas (`h-16`, `w-64`, `max-w-6xl`), não variáveis `--header-height` ou `--sidebar-width`. Preservar os valores e a composição do `Shell`.

## 4. Tipografia

### 4.1 Famílias de Fonte

Usar a pilha de fontes do sistema definida no CSS. Não há `next/font`, Inter ou JetBrains Mono instaladas/configuradas. A aparência exata dos glifos varia por sistema operacional; a pilha e a escala permanecem iguais entre produtos.

### 4.2 Escala Tipográfica

| Elemento | Classe | Tamanho |
| --- | --- | --- |
| Marca na sidebar | `text-xl font-bold tracking-tight` | 20px |
| Título do header | `text-base font-bold lg:text-lg` | 16px / 18px |
| Título de detalhe | `text-xl font-bold` | 20px |
| Título de painel | `text-sm font-bold` | 14px |
| Título de dialog | `text-base font-bold` | 16px |
| Valor de métrica | `text-2xl font-bold tabular-nums` | 24px |
| Corpo/campo/botão | `text-sm`; botão `font-semibold` | 14px |
| Descrição/label auxiliar/badge | `text-xs` | 12px |
| Marca mobile e bottom navigation | `text-[11px]` | 11px |
| Legenda do papel no menu da conta | `text-[10px] uppercase tracking-wider` | 10px |

Os tamanhos de 10–11px são detalhes do shell, não o padrão para parágrafos. Dados numéricos usam `tabular-nums`; códigos podem usar `font-mono`.

### 4.3 Componente de Título de Página

O título da seção atual já está no header do `Shell`. As páginas de listagem usam `PanelHeader`, sem repetir um H1 grande acima do painel.

```tsx
import { Panel, PanelHeader } from "@/components/ui";

export function ListaPage() {
  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader title="Clientes" description="Cadastro principal e vínculos" />
        <div className="p-4 sm:p-5">Conteúdo da página</div>
      </Panel>
    </div>
  );
}
```

### 4.4 Componente de Título de Seção

Reutilizar `PanelHeader` dentro de painéis. Para um detalhe sem divisória, reproduzir a escala local:

```tsx
<div className="min-w-0">
  <h2 className="break-words text-xl font-bold text-app-foreground">Nome do cliente</h2>
  <p className="mt-1 text-xs text-app-muted-foreground">Município, UF e informações auxiliares</p>
</div>
```

## 5. Cores

### 5.1 Paleta Semântica

| Token CSS | Escuro | Claro | Função |
| --- | --- | --- | --- |
| `--app-background` | `#0B0F17` | `#F5F7FB` | Fundo da aplicação |
| `--app-surface` | `#101726` | `#FFFFFF` | Painéis, sidebar, header, menus |
| `--app-surface-elevated` | `#1A2236` | `#EEF2F7` | Hover e áreas internas destacadas |
| `--app-foreground` | `#E2E8F0` | `#1F2937` | Texto principal |
| `--app-muted-foreground` | `#94A3B8` | `#64748B` | Texto secundário |
| `--app-border` | `#1E293B` | `#CBD5E1` | Contorno e divisória |
| `--app-primary` | `#2563EB` | `#2563EB` | Destaque/ação principal |
| `--app-primary-foreground` | `#FFFFFF` | `#FFFFFF` | Texto sobre botão preenchido |
| `--app-success` | `#059669` | `#047857` | Estado positivo |
| `--app-warning` | `#D97706` | `#B45309` | Atenção |
| `--app-danger` | `#E11D48` | `#BE123C` | Erro/ação destrutiva |

### 5.2 Regras de Uso de Cores

- Fundo estrutural: `bg-app-background`; conteúdo: `bg-app-surface`; realce: `bg-app-surface-elevated`.
- Seleção de navegação: `bg-app-primary/10 text-app-primary`.
- Badge semântico: fundo da cor a 15% e texto da mesma cor; incluir sempre um rótulo.
- Divisórias: `border-app-border`; evitar sombras em cada painel.
- Overlays atuais usam `bg-slate-950/60` ou `/55`; a base branca atrás do logo preserva o próprio asset. São exceções localizadas do desenho.
- A paleta existente não representa uma certificação de contraste. Validar combinações de texto/cor/transparência nos dois temas, especialmente texto azul e badges no escuro.

### 5.3 Customização por Sistema

Podem mudar nome, descrição, logo, favicon, rotas, labels, ícones da navegação interna, dados e permissões. Para conservar a mesma aparência, não mudar paleta, fonte, escala, raios, larguras estruturais ou o bloco de ações globais por preferência individual de um produto.

### 5.4 Identidade Visual da Rede

Raroclients usa `/raroclients-logo.jpeg` e `/raroclients-favicon-circle.png`, existentes em `public/`. O logotipo na sidebar é apresentado em caixa branca de 36px com padding de 4px; no header mobile, a caixa tem 32px. O nome visual da sidebar é `Raro` + `Clients`, com o sufixo azul.

Os aplicativos do menu vêm da conta no RaroNexus. O produto atual é filtrado pela API; o RaroNexus é acrescentado quando necessário. Não substituir essa lista por atalhos internos fixos.

## 6. Espaçamentos e Layout

### 6.1 Grid Base

| Uso | Classes | Medida |
| --- | --- | --- |
| Gaps internos pequenos | `gap-1.5`, `gap-2`, `gap-3` | 6px, 8px, 12px |
| Separação entre blocos | `gap-5` | 20px |
| Interior de card | `p-4` | 16px |
| Interior de painel amplo | `p-4 sm:p-5` | 16px / 20px |
| Página horizontal | `px-4 sm:px-6 lg:px-8` | 16px / 24px / 32px |
| Página vertical | `py-5 lg:py-6` | 20px / 24px |
| Métricas atuais | `grid grid-cols-2 gap-3 sm:grid-cols-4` | 2 / 4 colunas |
| Painéis lado a lado | `grid grid-cols-1 gap-5 xl:grid-cols-2` | 1 / 2 colunas |

### 6.2 Layout Padrão da Aplicação

```text
DESKTOP (>= 1024px)
┌────────────────┬──────────────────────────────────────────────┐
│ Marca          │ Título atual          [tema] [apps] [avatar]  │ 64px
├────────────────┼──────────────────────────────────────────────┤
│ Navegação      │ Área de conteúdo centralizada                │
│ fixa           │ max-w-6xl + padding responsivo               │
│ 256px          │ Painéis / métricas / filtros / tabelas       │
│                │                                              │
└────────────────┴──────────────────────────────────────────────┘

MOBILE / TABLET (< 1024px, implementação atual)
┌───────────────────────────────────────────────────────────────┐
│ Logo / marca / título             [tema] [apps] [avatar]       │ 64px
├───────────────────────────────────────────────────────────────┤
│ Conteúdo com padding lateral de 16px ou 24px                   │
│ Reserva inferior para navegação e safe area                   │
├───────────────────────────────────────────────────────────────┤
│ Dashboard | Clientes | Propostas | Contratos | Pendências | … │ 64px
└───────────────────────────────────────────────────────────────┘
```

### 6.3 Componente de Layout Principal

`src/app/layout.tsx` importa o CSS e envolve as rotas com `Shell`. O `Shell` renderiza `AuthProvider` → `OperationLoadingProvider` → sidebar/header/main/bottom navigation. `/login` é a exceção atual: recebe apenas o conteúdo da página, sem shell autenticado.

O código completo do shell está na seção 9.1.3. Cada página retorna **somente seu conteúdo**, sem montar outro header, outra sidebar ou outro `<main>` dentro do shell.

### 6.4 Contrato de Dimensionamento do Layout

| Elemento | Contrato atual |
| --- | --- |
| Sidebar | `fixed inset-y-0 left-0`, `w-64`, visível em `lg`, borda direita |
| Header | `sticky top-0`, `h-16`, offset `lg:ml-64`, borda inferior |
| Wrapper de conteúdo | `lg:pl-64` |
| Main | `mx-auto w-full max-w-6xl` (máximo de 1152px incluindo padding) |
| Bottom navigation | `fixed inset-x-0 bottom-0 h-16 lg:hidden` |
| Reserva mobile | `pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)]` |
| Reserva desktop | `lg:pb-8` |

O header sticky participa do fluxo; não somar mais 64px de margem superior. A sidebar é fixa e exige o offset de 256px. Tabelas largas rolam dentro do painel. Não transformar todo o documento em uma área com rolagem horizontal.

## 7. Estrutura de Pastas do Client

O raroclients não possui `src/client`, `src/shared` ou arquitetura `src/modules/**/client` do modelo. A organização real é:

```text
raroclients/
├── docs/
│   ├── design-system-model.md        # modelo de organização documental
│   ├── design-system.md              # identidade visual geral existente
│   ├── design-system-v2.md           # este guia de reprodução da UI
│   └── styling.schema.json           # blueprint descritivo de estilos
├── public/
│   ├── raroclients-logo.jpeg
│   └── raroclients-favicon-circle.png
├── src/
│   ├── app/
│   │   ├── globals.css               # tokens e base CSS
│   │   ├── layout.tsx                # metadata e RootLayout
│   │   ├── page.tsx                  # entrada da aplicação
│   │   ├── login/page.tsx            # acesso RaroNexus, sem shell
│   │   ├── dashboard/               # indicadores
│   │   ├── clientes/                # listagem e [id]
│   │   ├── propostas/               # listagem, nova, [id], [id]/editar
│   │   ├── contratos/               # listagem e [id]
│   │   ├── pendencias/              # acompanhamento
│   │   ├── relatorios/              # relatórios
│   │   ├── municipios/              # rotas de município
│   │   └── api/                     # auth, documentos, IBGE, health, PDFs
│   ├── components/
│   │   ├── shell.tsx                # estrutura e NAV_ITEMS
│   │   ├── header-actions.tsx       # tema, aplicativos e conta
│   │   ├── header-dropdown.tsx      # HeaderIconButton e HeaderDropdown
│   │   ├── auth-provider.tsx        # sessão e useAuth
│   │   ├── operation-loading.tsx    # operações em andamento
│   │   ├── data-loading.tsx         # carregamento de páginas
│   │   ├── ui.tsx                   # primitives e classes compartilhadas
│   │   ├── dialog.tsx               # Dialog, DialogForm, SubmitButton
│   │   ├── file-input.tsx           # campo de arquivo
│   │   ├── cnpj-input.tsx           # campo de CNPJ
│   │   ├── phone-input.tsx          # campo de telefone
│   │   └── *-form.tsx / *-dialogs.tsx # formulários e fluxos de domínio
│   ├── lib/
│   │   ├── constants.ts             # APP, Tone, opções e catálogo
│   │   ├── utils.ts                 # cn e formatação
│   │   ├── auth-types.ts            # contratos de sessão
│   │   ├── auth.ts / auth-permissions.ts
│   │   ├── actions.ts / proposal-actions.ts # Server Actions
│   │   ├── domain.ts e demais módulos de negócio
│   │   └── reports/pdf.ts           # geração de relatórios
│   ├── db/                          # conexão, schema, saúde, seed
│   └── proxy.ts                     # integração de requisições/acesso
├── migrations/                      # SQL versionado
├── scripts/                         # execução e manutenção
├── package.json / package-lock.json
├── postcss.config.mjs
├── next.config.ts
├── eslint.config.mjs
├── drizzle.config.ts
└── tsconfig.json
```

`loading.tsx` nas rotas que já o possuem monta `DataPageLoading`. Componentes globais ficam em `components`; lógica específica fica em `lib`; endpoints ficam em `app/api`. UI de cliente não importa conexão de banco nem configuração privada.

Para iniciar outro produto, copiar a base de UI e adaptar seu domínio; não copiar migrações, consultas ou regras de clientes para obter o mesmo desenho.

## 8. Arquivos de Configuração

### 8.1 Configuração de Fontes

Centralizada em `@theme` no CSS da seção 3. Nenhum arquivo extra de fontes é necessário.

### 8.2 Configuração do Tema

Tema padrão `dark`; chave de persistência `theme`; valor aceito `dark` ou `light`. O código atual alterna `theme-light` em `html` e `body` e ajusta `document.documentElement.style.colorScheme`. A seção 9.1.5 contém as funções completas.

### 8.3 Configuração do Layout

`NAV_ITEMS` está em `shell.tsx`. A regra de item ativo é igualdade de pathname ou prefixo `href + "/"`. Isso mantém `/clientes/[id]` na seção Clientes e evita selecionar rotas de nomes apenas parecidos.

PostCSS atual:

```js
// postcss.config.mjs
const postcssConfig = {
  plugins: { "@tailwindcss/postcss": {} },
};
export default postcssConfig;
```

O alias de imports em `tsconfig.json` é `"@/*": ["./src/*"]`, com `baseUrl: "."`. Preservá-lo ou adaptar todos os imports ao copiar os componentes.

### 8.4 Providers Globais

```tsx
// Composição do Shell; não envolver o mesmo conteúdo duas vezes.
<AuthProvider>
  <OperationLoadingProvider>
    {/* sidebar, header com HeaderActions, main e navegação inferior */}
  </OperationLoadingProvider>
</AuthProvider>
```

`HeaderActions` depende de `useAuth`; montá-lo fora de `AuthProvider` lança erro. `SubmitButton` usa o status do formulário ancestral e registra o estado no provider de operação.

### 8.5 Root Layout (Next.js App Router)

**Implementação atual completa:**

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { APP } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: APP.name,
  description: APP.description,
  icons: {
    icon: [{ url: "/raroclients-favicon-circle.png", type: "image/png" }],
    shortcut: "/raroclients-favicon-circle.png",
    apple: [{ url: "/raroclients-favicon-circle.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-app-background font-sans text-app-foreground antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
```

Cada produto troca metadata e assets mantendo `lang="pt-BR"`, CSS global, tipografia e composição. Não há manifest/PWA nem service worker implementados no raroclients atual; os exemplos de PWA do schema são referências, não arquivos existentes.

### 8.6 Composição de Classes

```ts
// src/lib/utils.ts — implementação atual
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
```

`cn` apenas concatena classes. Não resolve conflitos de utilitários como `tailwind-merge`. Evitar acrescentar duas classes para a mesma propriedade esperando que a última string vença; escolher uma variante sem conflito.

## 9. Componentes de Layout

### 9.1 Header — Contrato Compartilhado Obrigatório

O setor global de tema, plataformas e perfil é a parte mais restrita deste padrão. Em todo produto, usar a mesma composição de `HeaderActions`, `HeaderIconButton` e `HeaderDropdown`, com o mesmo desenho e a mesma ordem.

#### 9.1.1 Anatomia, Ordem e Medidas

```text
Header: h-16, sticky, superfície 95%, borda inferior, backdrop blur
├── Identificação da página
│   ├── Logo de 32px (apenas abaixo de lg)
│   └── Marca auxiliar mobile + título da seção
└── HeaderActions: flex items-center gap-1.5 sm:gap-2
    ├── Tema: Sun no escuro / Moon no claro
    ├── Aplicativos: Grid2X2 → lista de plataformas
    └── Conta: avatar circular → identidade / papel / perfil / saída
```

| Parte | Especificação exata do código atual |
| --- | --- |
| Header externo | `sticky top-0 z-[45] flex h-16 items-center justify-between gap-3 border-b border-app-border bg-app-surface/95 px-4 backdrop-blur sm:px-6 lg:ml-64 lg:pl-6 lg:pr-8` |
| Grupo de ações | `flex items-center gap-1.5 sm:gap-2` |
| Botão tema/apps | 36 × 36px abaixo de `sm`; 40 × 40px a partir de `sm`; `rounded-lg` |
| Ícone tema/apps | 20 × 20px (`h-5 w-5`) |
| Hover do botão | Borda do tema + superfície elevada + texto principal |
| Botão ativo de apps | `border-app-primary/40 bg-app-primary/15 text-app-primary` |
| Botão da conta | 40 × 40px, circular, `hover:opacity-85` |
| Avatar | 36 × 36px, circular, borda do tema, superfície elevada |
| Logo de aplicativo | 36 × 36px, `rounded-lg`, borda, imagem `object-cover` |
| Âncora do menu | Wrapper `relative`; dropdown `absolute top-full right-0 mt-2` |
| Camada do dropdown | `z-[60]` |
| Largura do dropdown | `w-[min(calc(100vw-1.5rem),20rem)]`: até 320px, limitado pelo viewport |
| Altura do dropdown | `max-h-[70dvh]`, scroll vertical, sem scroll horizontal |
| Superfície do dropdown | `rounded-xl border border-app-border bg-app-surface shadow-2xl` |
| Lista de aplicativos | `max-h-80 overflow-y-auto p-2` |
| Linha de aplicativo | `flex items-center gap-3 rounded-lg px-3 py-2.5` + hover elevado |
| Ícone de saída/link | 16 × 16px (`h-4 w-4`) |

`rounded-lg` e `rounded-xl` nos componentes do header são os raios padrão de 8px e 12px do Tailwind usado aqui. O header conserva `shadow-2xl` e `backdrop-blur`; os dialogs usam os tokens específicos de sombra/blur. Ao copiar, preservar essa diferença.

Não inserir um botão Sair, nome completo ou papel na faixa principal. Eles pertencem ao dropdown da conta. O componente `UserMenu` ainda existe em `auth-provider.tsx`, mas **não é o menu montado pelo Shell**; ele não deve substituir `HeaderActions` em novos sistemas.

#### 9.1.2 Estados e Comportamento

| Interação | Comportamento atual a preservar |
| --- | --- |
| Clique no tema | Alterna os tokens e persiste `theme` no `localStorage` |
| Clique no botão de menu | Abre o menu ou fecha se já estiver aberto |
| Troca entre menus | `openMenu` único: `applications`, `account` ou `null`; só um aberto |
| Clique fora | Fecha o dropdown |
| Escape | Fecha o dropdown |
| Mudança de rota | Fecha via `usePathname` |
| Sessão carregando | Avatar com spinner, nome/dados com mensagem de carregamento |
| Foto ausente/falhou | Primeira letra do nome, ou `U` para usuário |
| Logo ausente/falhou | Primeira letra do aplicativo |
| Apps carregando | “Carregando aplicativos...” |
| Apps com erro | Mensagem em `text-app-danger` + “Tentar novamente” |
| Apps vazios | “Nenhum outro aplicativo disponível.” |
| Clique em app | Link `target="_blank" rel="noreferrer"` com `ExternalLink` |
| Editar perfil | URL retornada por `nexusProfileUrl`; navegação na mesma aba no código atual |
| Perfil ainda sem URL | Botão “Carregar perfil” que repete a consulta |
| Sair | Chama `auth.logout()` |

A consulta aos aplicativos é feita ao abrir Aplicativos **ou** Conta quando não há URL de perfil carregada e não existe requisição em curso. No código atual, `nexusProfileUrl` funciona como sinal de carga: uma resposta sem essa URL pode ser consultada novamente ao reabrir. Não há cache entre sistemas nem persistência da lista.

O fallback de falha de imagem é local ao componente e não é reiniciado explicitamente quando a URL muda. Em adaptações com troca de usuário sem remontagem, reiniciar esse estado ao mudar a imagem, preservando o mesmo desenho.

#### 9.1.3 Código do Shell e do Header Externo

**Implementação atual completa** de [shell.tsx](../src/components/shell.tsx). Ela fornece o header externo, a sidebar e a navegação inferior; usar em conjunto com os dois arquivos seguintes.

```tsx
"use client";

import {
  AlertTriangle,
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  Send,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { HeaderActions } from "@/components/header-actions";
import { OperationLoadingProvider } from "@/components/operation-loading";
import { APP } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/propostas", label: "Propostas", icon: Send },
  { href: "/contratos", label: "Contratos", icon: FileText },
  { href: "/pendencias", label: "Pendências", icon: AlertTriangle },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

/** Ativo quando o path é igual ao href ou começa com href + "/" (schema). */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((i) => isActive(pathname, i.href));

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <OperationLoadingProvider>
      {/* Sidebar fixa — desktop (16rem, w-64) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-app-border bg-app-surface lg:flex">
        <Link
          href="/dashboard"
          aria-label="Ir para o dashboard"
          className="flex h-16 items-center gap-2.5 border-b border-app-border px-5 transition-colors hover:bg-app-surface-elevated/40"
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-app-md bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/raroclients-logo.jpeg" alt="Raroclients" className="h-full w-full object-contain" />
          </span>
          <div className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-app-foreground">
                  Raro<span className="text-app-primary">Clients</span>
            </span>
            <p className="text-[11px] text-app-muted-foreground">Gestão de clientes</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-app-md px-3 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-app-primary/10 text-app-primary"
                    : "text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-app-border p-3">
          <p className="px-2 text-[11px] leading-relaxed text-app-muted-foreground">
            Fonte única de informação: clientes, bases, módulos, contratos e histórico.
          </p>
        </div>
      </aside>

      {/* Header sticky (4rem, h-16) */}
      <header className="sticky top-0 z-[45] flex h-16 items-center justify-between gap-3 border-b border-app-border bg-app-surface/95 px-4 backdrop-blur sm:px-6 lg:ml-64 lg:pl-6 lg:pr-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Ir para o dashboard"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-app-md bg-white p-1 transition-opacity hover:opacity-85 lg:hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/raroclients-logo.jpeg" alt="Raroclients" className="h-full w-full object-contain" />
          </Link>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-app-muted-foreground lg:hidden">{APP.name}</p>
            <h1 className="text-base font-bold text-app-foreground lg:text-lg">{current?.label ?? APP.name}</h1>
          </div>
        </div>
        <HeaderActions />
      </header>

      {/* Conteúdo — spacing do schema; espaço reservado para a bottom nav no mobile */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Navegação inferior fixa — mobile */}
      <nav
        aria-label="Navegação inferior"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-app-border bg-app-surface lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[40px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                active ? "text-app-primary" : "text-app-muted-foreground hover:text-app-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      </OperationLoadingProvider>
    </AuthProvider>
  );
}
```

Ao adaptar para outro produto, trocar `NAV_ITEMS`, textos da marca, caminho do logo e o conteúdo contextual do rodapé da sidebar. Manter a seção de `<header>` e `<HeaderActions />`, suas classes e a ordem dos controles. Requisitos para títulos longos e a regra de seis destinos estão na seção 15.

#### 9.1.4 Código de HeaderIconButton e HeaderDropdown

**Implementação atual completa** de [header-dropdown.tsx](../src/components/header-dropdown.tsx). Inclui acessibilidade (`aria-controls`, `aria-expanded`), fechamento correto por navegação de rota e prevenção do bug de fechamento prematuro no clique fora.

```tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HeaderIconButtonProps = {
  label: string;
  active?: boolean;
  expanded?: boolean;
  controls?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export type HeaderDropdownProps = {
  id: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: "right" | "center";
};

export function HeaderIconButton({
  label,
  active = false,
  expanded,
  controls,
  children,
  onClick,
  className,
}: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      onClick={handleToggle({ onClick })}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-app-muted-foreground transition-colors hover:text-app-foreground sm:h-10 sm:w-10",
        active
          ? "border-app-primary/40 bg-app-primary/15 text-app-primary"
          : "border-transparent hover:border-app-border hover:bg-app-surface-elevated",
        className,
      )}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      title={label}
    >
      {children}
    </button>
  );
}

export function HeaderDropdown({
  id,
  open,
  onClose,
  children,
  className,
  align = "right",
}: HeaderDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      const trigger = document.querySelector(`[aria-controls="${id}"]`);
      if (trigger?.contains(target)) return;
      onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose, id]);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      if (open) onClose();
    }
  }, [pathname, open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={containerRef}
      id={id}
      className={cn(
        "absolute top-full z-[60] mt-2 max-h-[70dvh] w-[min(calc(100vw-1.5rem),20rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-app-border bg-app-surface shadow-2xl",
        align === "right" ? "right-0" : "right-1/2 translate-x-1/2",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ToggleHandlerParams = { onClick?: () => void };
type ButtonMouseHandler = (event: MouseEvent<HTMLButtonElement>) => void;
function handleToggle(params: ToggleHandlerParams): ButtonMouseHandler {
  return (event) => {
    event.stopPropagation();
    params.onClick?.();
  };
}
```

##### 9.1.4.1 Regras Críticas de Ciclo de Vida: Prevenção do Bug "Abre e Fecha Imediatamente"

Ao construir ou refatorar qualquer dropdown ou menu flutuante neste padrão, dois erros graves de ciclo de vida **NUNCA** devem ser cometidos:

1. **Rastreamento de mudança de rota via `useRef(pathname)` (NUNCA disparar `onClose` na montagem):**
   - ❌ **ERRADO:** `useEffect(() => { onClose(); }, [pathname, onClose])` ou `useEffect(() => { if (open) onClose(); }, [open, onClose, pathname])`.
     No React, efeitos executam após a renderização. Se o efeito observar `open` ou rodar na montagem/alteração do estado de abertura, ele executará `onClose()` no **mesmo milissegundo em que o menu se abre**, fazendo com que o dropdown pisque na tela e suma instantaneamente.
   - ✅ **CORRETO:** Manter uma referência da rota anterior com `const previousPathnameRef = useRef(pathname)`. O `onClose()` só deve ser invocado se e somente se a rota atual for diferente da rota armazenada na referência (`previousPathnameRef.current !== pathname`).

2. **Detecção de clique fora com exclusão do botão disparador (`aria-controls`):**
   - ❌ **ERRADO:** `if (!containerRef.current?.contains(target)) onClose();` sem verificar se o clique ocorreu no botão disparador.
     O evento `pointerdown` do documento dispara **antes** do evento `click` do botão disparador. Se o clique no botão for interpretado como "clique fora do painel", o `pointerdown` chamará `onClose()` (fechando o menu), e logo em seguida o evento `click` do botão disparará o handler de abertura/toggle (reabrindo-o), ou o estado ficará desincronizado.
   - ✅ **CORRETO:** O listener de `pointerdown` deve consultar `document.querySelector('[aria-controls="' + id + '"]')` e ignorar o fechamento caso o `target` pertença ao botão disparador (`if (trigger?.contains(target)) return;`). Dessa forma, o clique no ícone fecha ou abre o menu de forma limpa via seu próprio handler de alternância (`toggle`).

3. **Acessibilidade bidirecional obrigatória (`id` e `aria-controls`):**
   - O `HeaderDropdown` deve sempre possuir uma prop `id: string`.
   - O `HeaderIconButton` que o controla deve receber `controls={id}` (que se traduz em `aria-controls={id}`) e `expanded={isOpen}` (que se traduz em `aria-expanded={isOpen}`).

`align="right"` é o padrão para apps e conta. A opção `center` existe na API, mas não é usada nesse header. Não centralizar os menus da direita ao transportar o padrão.

#### 9.1.5 Código de HeaderActions, Avatar, Logos e Tema

**Implementação atual completa** de [header-actions.tsx](../src/components/header-actions.tsx). O código mantém inclusive os textos atuais; as instruções de adaptação estão abaixo.

```tsx
"use client";

import { ExternalLink, Grid2X2, Grid3X3, LoaderCircle, LogOut, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { HeaderDropdown, HeaderIconButton } from "@/components/header-dropdown";
import { useAuth } from "@/components/auth-provider";

type ColorTheme = "dark" | "light";
type OpenMenu = "applications" | "account" | null;

type HeaderApplication = {
  nome: string;
  client_id: string;
  logo_url: string | null;
  homepage_url: string;
};

type ApplicationsPayload = {
  applications?: HeaderApplication[];
  nexusProfileUrl?: string;
  error?: string;
};

const THEME_STORAGE_KEY = "theme";

function applyColorTheme(theme: ColorTheme) {
  document.body.classList.toggle("theme-light", theme === "light");
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

function getStoredColorTheme(): ColorTheme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function storeColorTheme(theme: ColorTheme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyColorTheme(theme);
}

function HeaderUserAvatar() {
  const auth = useAuth();
  const [failed, setFailed] = useState(false);
  const avatarUrl = auth.user?.avatar_url || "";
  const showImage = avatarUrl && !failed;
  const fallback = auth.user?.nome?.trim().charAt(0).toUpperCase() || "U";

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-border bg-app-surface-elevated text-sm font-semibold text-app-foreground">
      {auth.loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-label="Carregando dados do usuario" />
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        fallback
      )}
    </span>
  );
}

function ApplicationLogo({ application }: { application: HeaderApplication }) {
  const [failed, setFailed] = useState(false);
  const showImage = application.logo_url && !failed;

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-app-border bg-app-surface-elevated text-xs font-semibold text-app-foreground">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={application.logo_url!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        application.nome.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function HeaderActions() {
  const auth = useAuth();
  const [theme, setTheme] = useState<ColorTheme>(() => getStoredColorTheme());
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [applications, setApplications] = useState<HeaderApplication[]>([]);
  const [nexusProfileUrl, setNexusProfileUrl] = useState("");
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");
  const displayName = auth.loading ? "Carregando..." : auth.user?.nome || "Usuario";

  useEffect(() => {
    applyColorTheme(theme);
  }, [theme]);

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    setAppsError("");

    try {
      const response = await fetch("/api/auth/applications", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApplicationsPayload | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel carregar os aplicativos.");
      }

      setApplications(payload?.applications ?? []);
      setNexusProfileUrl(payload?.nexusProfileUrl ?? "");
    } catch (error) {
      setAppsError(error instanceof Error ? error.message : "Nao foi possivel carregar os aplicativos.");
    } finally {
      setAppsLoading(false);
    }
  }, []);

  function openDropdown(menu: Exclude<OpenMenu, null>) {
    setOpenMenu((current) => {
      const next = current === menu ? null : menu;
      if ((menu === "applications" || menu === "account") && next === menu && !appsLoading && !nexusProfileUrl) {
        void loadApplications();
      }
      return next;
    });
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    storeColorTheme(next);
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <HeaderIconButton
        label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        onClick={toggleTheme}
      >
        {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </HeaderIconButton>

      <div className="relative">
        <HeaderIconButton
          label="Aplicativos"
          active={openMenu === "applications"}
          onClick={() => openDropdown("applications")}
        >
          <Grid2X2 className="h-5 w-5" />
        </HeaderIconButton>

        <HeaderDropdown open={openMenu === "applications"} onClose={closeMenu}>
          <div className="border-b border-app-border px-4 py-3">
            <h3 className="font-semibold text-app-foreground">Aplicativos</h3>
            <p className="text-xs text-app-muted-foreground">Sistemas disponíveis para sua conta</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {appsLoading ? (
              <p className="px-3 py-4 text-sm text-app-muted-foreground">Carregando aplicativos...</p>
            ) : appsError ? (
              <div className="space-y-3 px-3 py-4">
                <p className="text-sm text-app-danger">{appsError}</p>
                <button
                  className="inline-flex min-h-9 items-center rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-muted-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-foreground"
                  type="button"
                  onClick={() => void loadApplications()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : applications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-app-muted-foreground">Nenhum outro aplicativo disponível.</p>
            ) : (
              applications.map((application) => (
                <a
                  key={application.client_id}
                  href={application.homepage_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-app-surface-elevated"
                >
                  <ApplicationLogo application={application} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-app-foreground">{application.nome}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-app-muted-foreground" aria-hidden="true" />
                </a>
              ))
            )}
          </div>
        </HeaderDropdown>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openDropdown("account");
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-85"
          aria-label="Conta do usuario"
          title="Conta do usuario"
        >
          <HeaderUserAvatar />
        </button>

        <HeaderDropdown open={openMenu === "account"} onClose={closeMenu}>
          <div className="border-b border-app-border px-4 py-4">
            <div className="flex items-center gap-3">
              <HeaderUserAvatar />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-foreground">{displayName}</p>
                <p className="truncate text-xs text-app-muted-foreground">{auth.loading ? "Carregando dados..." : auth.user?.email}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-app-border bg-app-surface-elevated/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-app-muted-foreground">Perfil no Raroclients</p>
              <p className="text-sm font-medium text-app-foreground">{auth.loading ? "Carregando..." : auth.label}</p>
            </div>
          </div>
          <div className="space-y-2 p-2">
            {nexusProfileUrl ? (
              <a
                href={nexusProfileUrl}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-app-muted-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-foreground"
              >
                Editar perfil
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <button
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-app-muted-foreground transition-colors hover:bg-app-surface-elevated hover:text-app-foreground"
                type="button"
                onClick={() => void loadApplications()}
              >
                {appsLoading ? "Carregando perfil..." : "Carregar perfil"}
              </button>
            )}
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-app-danger transition-colors hover:bg-app-danger/10"
              type="button"
              onClick={() => void auth.logout()}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </HeaderDropdown>
      </div>
    </div>
  );
}
```

Este arquivo já contém as peças necessárias para reproduzir visualmente o setor: tema, gatilhos, menus, avatar, logo, identificação e ações. Não criar versões particulares dessas peças em cada página.

#### 9.1.6 Contratos de Sessão e Plataformas

O cabeçalho lê o contexto `useAuth()` de [auth-provider.tsx](../src/components/auth-provider.tsx). Para um novo sistema com outra autenticação, oferecer um adaptador com os mesmos campos consumidos pela UI:

```ts
// Contrato mínimo consumido por HeaderActions (exemplo de adaptação).
export interface HeaderAuth {
  loading: boolean;
  user: {
    nome: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  label: string | null; // nome legível do papel no produto
  logout: () => Promise<void>;
}

export interface HeaderApplication {
  nome: string;
  client_id: string;
  logo_url: string | null;
  homepage_url: string;
}

export interface ApplicationsPayload {
  applications?: HeaderApplication[];
  nexusProfileUrl?: string;
  error?: string;
}
```

| Endpoint local | Contrato utilizado |
| --- | --- |
| `GET /api/auth/session` | `SessionResponse`: `authenticated`, `role`, `label`, `user`, `permissions`; sem cache |
| `GET /api/auth/applications` | `applications` e `nexusProfileUrl`; em erro, `error`; sem cache |
| `POST /api/auth/logout` | Usado pelo provider antes do redirecionamento para login |

O provider atual também fornece `authenticated`, `role`, `permissions` e `refresh`. Os papéis atuais são `usuario`/`gestor`; rótulos e permissões são do produto, não estilos visuais. O `label` exibido no dropdown deve vir da sessão, sem inferir um papel pela aparência.

Fluxo da lista: browser → endpoint local → RaroNexus → normalização → browser. A rota atual aceita nomes de campos snake_case/camelCase, remove aplicações inativas, exclui o `client_id` atual, exige homepage e inclui o acesso RaroNexus quando ausente. A UI exibe a ordem retornada.

**Responsabilidade do servidor:** obter a sessão, chamar o serviço de identidade, filtrar aplicativos e devolver URLs autorizadas. Não colocar tokens de sessão ou configuração privada no `HeaderActions`. Ao implementar outro backend, validar também os esquemas/origens das URLs devolvidas.

O fallback do RaroNexus referencia `/raronexus-logo.png` na origem local, mas esse asset não consta em `public/` nesta revisão. O componente cai para a inicial `R`. Para exibir o logo em outros produtos, disponibilizar o asset aprovado ou fornecer uma URL válida pelo adaptador.

#### 9.1.7 Receita de Reprodução em Outro Sistema

1. Copiar `globals.css`, mantendo tokens e mapeamento Tailwind 4.
2. Copiar `header-dropdown.tsx` e `header-actions.tsx` para `src/components`.
3. Copiar/adaptar `Shell` e `RootLayout`; ajustar apenas marca, rotas e conteúdo específico.
4. Implementar `AuthProvider`/`useAuth` e os três endpoints locais, ou adaptar sua autenticação aos contratos acima.
5. Trocar somente “Perfil no Raroclients” pelo nome do novo produto; manter posição, classes, estrutura do bloco e origem do rótulo de papel.
6. Disponibilizar logo/favicon do produto e logos válidos dos aplicativos; preservar dimensões e fallbacks.
7. Confirmar todos os estados da tabela 9.1.2 nos dois temas e em mobile/desktop.
8. Completar os requisitos de foco, teclado e ARIA da seção 17 sem alterar o desenho.

Não há um pacote compartilhado de UI publicado neste repositório. Os blocos são snapshots copiáveis dos arquivos reais. Toda evolução aprovada do header deve ser propagada a esses arquivos e aos sistemas que usam a cópia; não manter variações independentes.

### 9.2 Sidebar

Implementada no `Shell`: largura 256px, fundo `app-surface`, borda direita, marca de 64px de altura e itens de 40px. Ícones da navegação desktop têm 16px; itens usam `rounded-app-md`, `gap-3`, `px-3`, `text-sm font-medium`.

O estado ativo recebe `aria-current="page"` e `bg-app-primary/10 text-app-primary`. O hover inativo usa superfície elevada e texto principal. `nav` tem `aria-label="Navegação principal"` e scroll interno.

Não há sidebar recolhível, grupos expansíveis, tabs centrais ou persistência de expansão implementados aqui, apesar das possibilidades descritas no modelo/schema.

### 9.3 Footer

Não há footer horizontal global. A sidebar tem um bloco contextual inferior com borda superior e texto de 11px. No mobile, a faixa inferior é navegação, não footer. Não acrescentar um rodapé fixo concorrendo com ela.

### 9.4 Page Container

O `<main>` do Shell é o único container global. Páginas normalmente começam com `flex flex-col gap-5`. Usar painéis, grids e scroll locais no interior; não repetir `max-w-6xl`/padding global em cada tela.

## 10. Componentes de UI

### 10.1 Primitives e Stat Card

**Implementação atual completa** de [ui.tsx](../src/components/ui.tsx). Para reproduzir o conjunto, copiar também o tipo `Tone` (`"primary" | "success" | "warning" | "danger" | "muted"`) e o `cn` da seção 8.6.

```tsx
import type { ReactNode } from "react";
import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* Botões — variantes do styling schema */
export const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-app-primary-foreground transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground transition-colors duration-150 hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md px-3 text-sm font-semibold text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-danger px-4 text-sm font-semibold text-app-primary-foreground transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const btnXs =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm border border-app-border bg-app-surface-elevated px-2.5 text-xs font-semibold text-app-foreground transition-colors duration-150 hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50";
export const btnXsGhost =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50";

/* Campos */
export const inputCls =
  "flex h-10 w-full rounded-app-md border border-app-border bg-app-surface px-3 text-sm text-app-foreground placeholder:text-app-muted-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
export const selectCls = cn(inputCls, "appearance-none pr-8");
export const textareaCls =
  "flex w-full rounded-app-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-foreground placeholder:text-app-muted-foreground transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
export const labelCls = "text-sm font-medium text-app-foreground";
export const hintCls = "text-xs text-app-muted-foreground";

const TONE_CLS: Record<Tone, string> = {
  primary: "bg-app-primary/15 text-app-primary",
  success: "bg-app-success/15 text-app-success",
  warning: "bg-app-warning/15 text-app-warning",
  danger: "bg-app-danger/15 text-app-danger",
  muted: "bg-app-surface-elevated text-app-muted-foreground",
};

export function Badge({
  tone = "muted",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-app-pill px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-app-lg border border-app-border bg-app-surface", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  right,
  description,
}: {
  title: string;
  right?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-sm font-bold text-app-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-app-muted-foreground">{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "muted",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-app-lg border border-app-border bg-app-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-app-muted-foreground">{label}</p>
        {icon ? <span className={cn("rounded-app-sm p-1.5", TONE_CLS[tone])}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-app-foreground tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-app-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-app-md border border-dashed border-app-border p-6 text-center">
      <p className="text-sm font-semibold text-app-foreground">{title}</p>
      {description ? <p className="text-xs text-app-muted-foreground">{description}</p> : null}
    </div>
  );
}

/** Chip Sim/Nao usado na visao consolidada do cliente. */
export function YesNo({ yes, label }: { yes: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={cn("h-1.5 w-1.5 rounded-full", yes ? "bg-app-success" : "bg-app-muted-foreground/40")} />
      <span className="text-app-muted-foreground">{label}:</span>
      <span className={cn("font-semibold", yes ? "text-app-success" : "text-app-muted-foreground")}>
        {yes ? "Sim" : "Não"}
      </span>
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className={labelCls}>{label}</span>
      {children}
      {hint ? <span className={hintCls}>{hint}</span> : null}
    </div>
  );
}
```

Exemplo de composição de métricas, usando as APIs existentes:

```tsx
import { Building2, FileText } from "lucide-react";
import { Stat } from "@/components/ui";

export function Indicadores() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Clientes" value={120} hint="Cadastros ativos" tone="primary"
        icon={<Building2 className="h-4 w-4" aria-hidden="true" />} />
      <Stat label="Contratos" value={42} tone="success"
        icon={<FileText className="h-4 w-4" aria-hidden="true" />} />
      <Stat label="Pendências" value={8} tone="warning" />
      <Stat label="Receita" value="R$ 15.000,00" />
    </div>
  );
}
```

`Stat` não colore o número pela variante; o valor fica em foreground e a variante aplica-se ao bloco de ícone.

### 10.2 Empty State

```tsx
import { Empty } from "@/components/ui";

<div className="p-5">
  <Empty title="Nenhum registro encontrado" description="Revise os filtros ou crie um registro." />
</div>
```

Preservar borda tracejada, centralização e escala de texto. Não tratar falha de consulta como lista vazia.

### 10.3 Loading Skeleton

Usar [data-loading.tsx](../src/components/data-loading.tsx). O carregamento preserva painéis e métricas; as linhas têm placeholders estáticos e indicador de status.

```tsx
// Exemplo para src/app/clientes/loading.tsx
import { DataPageLoading } from "@/components/data-loading";

export default function Loading() {
  return <DataPageLoading stats={["Clientes", "Bases", "Contratos", "Pendências"]} panels={["Clientes"]} />;
}
```

Props existentes: `stats?: string[]`, `panels: string[]`, `detailTitle?: string`. O container tem `aria-busy="true"`; `DataLoadingIcon` usa `role="status"` e texto `sr-only`.

### 10.4 Input de Busca Padronizado

Exemplo de composição com a geometria da busca em Clientes e foco explícito para novas telas:

```tsx
import { Search } from "lucide-react";

<form method="get" className="relative w-full sm:max-w-xs">
  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted-foreground" />
  <input name="q" aria-label="Buscar registros" placeholder="Buscar..."
    className="h-10 w-full rounded-app-md border border-app-border bg-app-surface pl-9 pr-3 text-sm text-app-foreground placeholder:text-app-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary" />
</form>
```

Preservar filtros adicionais como inputs hidden quando necessário. O ícone não recebe eventos; o campo tem 36px de respiro à esquerda.

### 10.5 Regras de Inputs, Botões e Ícones

| Controle | Implementação |
| --- | --- |
| Primário | `btnPrimary`: 40px, azul preenchido, texto branco, semibold |
| Secundário | `btnSecondary`: 40px, borda, superfície elevada |
| Ghost | `btnGhost`: 40px, sem preenchimento até hover |
| Perigo | `btnDanger`: 40px, perigo preenchido |
| Compacto | `btnXs` / `btnXsGhost`: 32px, texto 12px; ações locais densas |
| Input/select | `inputCls` / `selectCls`: 40px, raio 8px, borda do tema |
| Textarea | `textareaCls`: padding 12px × 8px; altura por `rows` |
| Ícone de ação | 16px junto ao texto; 20px nos controles globais |

Botões de ícone devem ter `aria-label` e `title`; ícones decorativos, `aria-hidden="true"`. Campos usam `w-full` e labels acessíveis. Não usar placeholder como único nome.

`selectCls` remove a aparência nativa (`appearance-none`) e reserva padding à direita, mas não desenha uma seta. Para novos campos, envolver o select em `relative` e desenhar `ChevronDown` com `pointer-events-none` quando uma affordance explícita for necessária.

## 11. Formulários

### 11.1 Padrão Real: HTML, FormData e Server Actions

Os formulários atuais utilizam `DialogForm`, campos nativos, estado React para dependências e Server Actions. Não usar o exemplo React Hook Form/Zod do modelo sem uma decisão explícita de adicionar essas dependências.

**Exemplo de composição** completo de um formulário visual; o pai fornece uma Server Action compatível. Os nomes dos campos e a validação de negócio ficam a cargo do produto.

```tsx
"use client";

import { Save } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { Field, btnPrimary, inputCls, textareaCls } from "@/components/ui";

const fieldFocus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary";
const accessibleInputCls = inputCls.replace("focus-visible:outline-none", fieldFocus);
const accessibleTextareaCls = textareaCls.replace("focus-visible:outline-none", fieldFocus);

export function CadastroDialog({ trigger, action }: {
  trigger: ReactNode;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Dialog trigger={trigger} title="Novo registro" description="Preencha os dados principais.">
      <DialogForm action={action}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" hint="Informe o nome completo.">
            <input name="nome" required aria-label="Nome"
              className={accessibleInputCls} />
          </Field>
          <Field label="E-mail">
            <input name="email" type="email" required aria-label="E-mail"
              className={accessibleInputCls} />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <textarea name="observacoes" rows={3} aria-label="Observações"
              className={accessibleTextareaCls} />
          </Field>
        </div>
        <div className="flex justify-end border-t border-app-border pt-4">
          <SubmitButton className={btnPrimary}>
            <Save className="h-4 w-4" aria-hidden="true" /> Salvar
          </SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
```

Os estilos de foco adicionados nos exemplos corrigem a supressão presente nas classes atuais de campos. O componente `Field` atual usa `<span>` para o label; o `aria-label` no exemplo fornece o nome ao campo. Para descrições/erros, associar seus IDs com `aria-describedby`; ver seção 17.

### 11.2 Regras de Formulários

- Campos em coluna no mobile; duas colunas para dados curtos em `sm`; observações ocupam a largura inteira.
- Espaço de 6px entre rótulo e campo; 16px entre campos/grupos (`gap-4`).
- Validar no servidor, além de `required`/`type` no browser. Mostrar erro próximo ao campo e mensagem geral quando necessário.
- Usar `aria-invalid` e `aria-describedby` para erros; preservar dados digitados após falha.
- `SubmitButton` deve ser descendente do form para `useFormStatus` funcionar; fica desabilitado durante `pending`.
- Reutilizar `CnpjInput`, `PhoneInput` e `FileInput` dos arquivos existentes para esses controles.
- Campo de arquivo: 40px, ícone Paperclip de 16px, nome truncado, botão visual de escolha, foco do input refletido pelo `peer` no label.
- Permissões controlam as ações disponíveis, mas o servidor deve autorizar cada alteração. Ocultar um botão não substitui autorização.

## 12. Modais e Dialogs

### 12.1 Dialog de Confirmação

API real de [dialog.tsx](../src/components/dialog.tsx): `trigger`, `title`, `description?`, `children`, `maxWidth?` (padrão `max-w-lg`). Não há prop pública `open`/`onOpenChange` nem componente shadcn.

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { Dialog, DialogForm, SubmitButton } from "@/components/dialog";
import { btnDanger, btnXsGhost } from "@/components/ui";

export function ExcluirDialog({ id, action }: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Dialog title="Excluir registro" description="Confirme a exclusão deste registro."
      trigger={<button type="button" className={btnXsGhost}><Trash2 className="h-4 w-4" aria-hidden="true" /> Excluir</button>}>
      <DialogForm action={action}>
        <input type="hidden" name="id" value={id} />
        <p className="text-sm text-app-muted-foreground">Esta ação remove o registro selecionado.</p>
        <div className="flex justify-end">
          <SubmitButton className={btnDanger}>Confirmar exclusão</SubmitButton>
        </div>
      </DialogForm>
    </Dialog>
  );
}
```

### 12.2 Regras de Modais

| Parte | Estilo/comportamento atual |
| --- | --- |
| Container | `fixed inset-0 z-50 grid place-items-center p-4` |
| Overlay | `bg-slate-950/60 backdrop-blur-app-overlay` |
| Janela | `relative w-full rounded-app-lg border border-app-border bg-app-surface shadow-app-elevated` |
| Cabeçalho | `border-b`, `px-5 py-4`, título 16px, descrição 12px |
| Corpo | `max-h-[75vh] overflow-y-auto px-5 py-4` |
| Fechar | Botão X de 32px; Escape e clique no overlay |
| Semântica | `role="dialog" aria-modal="true" aria-label={title}` |

`DialogForm` fecha quando observa `pending` passar de verdadeiro para falso após envio; não inspeciona um resultado estruturado de sucesso. Para fluxos que precisam permanecer abertos após erro, implementar estado de resultado explícito antes de reutilizar esse fechamento automático.

O dialog atual não implementa contenção/restauração de foco nem bloqueio de scroll do documento. Essas são exigências para novos componentes acessíveis (seção 17). Validar também a altura total de header + corpo em viewports baixos, pois `75vh` limita só o corpo.

## 13. Tabelas e Listas

### 13.1 Data Table com HTML Nativo

Exemplo de composição seguindo a tabela de Clientes, sem biblioteca adicional:

```tsx
import Link from "next/link";
import { Badge, Empty, Panel, PanelHeader } from "@/components/ui";

export function ListaRegistros({ rows }: {
  rows: { id: string; nome: string; ativo: boolean; total: number }[];
}) {
  return (
    <Panel>
      <PanelHeader title="Registros" description="Informações consolidadas" />
      {rows.length === 0 ? (
        <div className="p-5"><Empty title="Nenhum registro encontrado" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <caption className="sr-only">Registros e sua situação atual</caption>
            <thead>
              <tr className="border-b border-app-border">
                {["Nome", "Situação", "Total"].map((label) => (
                  <th key={label} scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted-foreground sm:px-5">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-app-border transition-colors last:border-0 hover:bg-app-surface-elevated/50">
                  <td className="px-4 py-3 sm:px-5">
                    <Link href={`/registros/${row.id}`} className="font-semibold text-app-foreground hover:text-app-primary hover:underline">{row.nome}</Link>
                  </td>
                  <td className="px-4 py-3 sm:px-5"><Badge tone={row.ativo ? "success" : "muted"}>{row.ativo ? "Ativo" : "Inativo"}</Badge></td>
                  <td className="px-4 py-3 text-sm text-app-muted-foreground tabular-nums sm:px-5">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
```

`/registros/[id]` é uma rota ilustrativa, a ser implementada no produto de destino. A tabela real de Clientes usa `min-w-[860px]` devido às sete colunas; não impor essa largura a toda tabela.

### 13.2 Regras de Tabelas

- Cabeçalhos em 12px, uppercase, semibold; células com padding de 16/20px lateral e 12px vertical.
- Linhas com borda inferior e hover a 50% da superfície elevada; última linha sem borda.
- Link principal em foreground semibold; metadados em muted; estado via `Badge`.
- Scroll horizontal no wrapper, nunca no shell inteiro.
- Filtros acima da tabela, com chips pill e estado ativo `bg-app-primary/15 text-app-primary`.
- Paginação, ordenação e seleção não são fornecidas por um componente genérico neste projeto; se necessárias, conservar o mesmo desenho de botões/campos.

## 14. Feedback e Notificações

### 14.1 Padrão Real de Feedback

Não há Sonner nem provider de toast. O projeto usa mensagens inline, status de carregamento e [OperationLoadingProvider](../src/components/operation-loading.tsx). Há fluxos legados com `window.alert`; não adotá-los como componente visual da família.

| Situação | Padrão |
| --- | --- |
| Carregamento de rota | `DataPageLoading`: estrutura semelhante ao conteúdo final |
| Carregamento localizado | `DataLoadingIcon`, `role="status"`, texto acessível |
| Envio de form | `SubmitButton`: spinner e disabled |
| Operação global | Overlay `z-[80]`, `bg-slate-950/55`, blur 18px, caixa `max-w-xs` |
| Erro recuperável | Mensagem em perigo + botão de tentar novamente |
| Lista sem itens | `Empty` com título e orientação |

Exemplo de feedback inline para novos componentes:

```tsx
import { AlertTriangle } from "lucide-react";

<div role="alert" className="flex items-start gap-2 rounded-app-md border border-app-danger/30 bg-app-danger/10 p-3 text-sm text-app-danger">
  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
  <p>Não foi possível salvar. Revise os dados e tente novamente.</p>
</div>
```

### 14.2 Regras de Feedback

Não apresentar sucesso antes da confirmação do servidor. Liberar o estado de carregamento em `finally`. Diferenciar loading, vazio, sucesso e erro. Se uma operação for rastreada manualmente, liberar o contador mesmo após falha:

```tsx
// Dentro de um Client Component descendente de OperationLoadingProvider.
const loading = useOperationLoading();
async function executar() {
  const release = loading?.start();
  try {
    await operacao(); // função do produto de destino
  } finally {
    release?.();
  }
}
```

Esse é um fragmento ilustrativo; importar `useOperationLoading` de `@/components/operation-loading` e implementar `operacao`. O overlay atual informa processamento, mas não oferece cancelamento nem isolamento completo do foco; não presumir que ele substitui o `disabled` dos controles.

## 15. Responsividade

### 15.1 Breakpoints

| Faixa | Largura | Comportamento atual |
| --- | --- | --- |
| Base/mobile | < 640px | Padding 16px, header compacto, bottom navigation |
| `sm` | ≥ 640px | Padding 24px, botões globais 40px, mais colunas |
| `md` | ≥ 768px | Disponível para telas específicas; sem troca do shell |
| `lg` | ≥ 1024px | Sidebar visível, bottom nav oculta, offsets de 256px |
| `xl` | ≥ 1280px | Painéis podem passar a duas colunas |
| `2xl` | ≥ 1536px | Conteúdo continua limitado a `max-w-6xl` |

### 15.2 Regras de Responsividade

O bloco tema/apps/avatar deve continuar visível em todas as larguras. Para novos produtos com títulos longos, manter as medidas e acrescentar `min-w-0` ao grupo da esquerda, `truncate` ao título e `shrink-0` ao grupo de ações. O shell atual não aplica essas três proteções explicitamente.

**Divergência existente de navegação:** [design-system.md](./design-system.md) determina hamburger à esquerda e menu lateral no mobile com seis ou mais destinos. O `Shell` atual tem seis itens e continua exibindo bottom navigation. Este guia registra a implementação real sem declarar essa migração concluída. Novos produtos devem seguir a regra do guia geral: até cinco destinos podem usar a barra inferior; seis ou mais devem usar hamburger/menu lateral, mantendo **intacto o bloco de ações à direita**. A alteração deste projeto exige uma implementação específica, fora da criação deste documento.

Não contar aplicativos do RaroNexus como destinos da navegação interna. Em viewports com safe area, confirmar que a altura útil da navegação atual não comprime labels/ícones: o código reserva padding de safe area dentro de `h-16`, sem somá-lo à altura externa.

### 15.3 Verificação Visual Obrigatória

Para novas telas ou implementação de componentes, revisar em 360px, 390px, 640px, 1024px e 1440px, nos dois temas. Conferir:

- Nenhuma rolagem horizontal fora das tabelas.
- Header íntegro com título longo, avatar sem imagem e menus abertos.
- Menus inteiramente dentro do viewport, com scroll quando a lista for grande.
- Sidebar, header, modal e overlay sem sobreposição indevida.
- Conteúdo inferior acessível acima da navegação e safe area.
- Forms e dialogs utilizáveis com viewport baixo e zoom de 200%.
- Contraste, teclado, foco e preferência de movimento reduzido.

Esta é a rotina exigida ao implementar UI; a criação deste guia não constitui execução desses testes visuais do aplicativo.

### 15.4 Grid de Cards Responsivo

O padrão atual de métricas é duas colunas no mobile e quatro em `sm`. Para valores extensos que não caibam nessa geometria, usar uma coluna na menor faixa em novas telas:

```tsx
<div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 sm:grid-cols-4">
  {/* Stat, mantendo a mesma aparência */}
</div>
```

## 16. Dark Mode

### 16.1 Configuração

O CSS inicia em dark. `getStoredColorTheme()` devolve light apenas se `localStorage.theme === "light"`; os demais valores resultam em dark. `applyColorTheme()` alterna a classe em html/body; `storeColorTheme()` persiste e aplica a escolha. O ícone representa a próxima ação: Sun para ativar claro, Moon para ativar escuro.

O layout atual usa `suppressHydrationWarning` no html, mas não há script de inicialização anterior à hidratação. Assim, a preferência clara pode ser aplicada apenas quando o componente cliente inicia; não documentar ausência de flash como uma garantia já implementada.

### 16.2 Regras de Dark Mode

- Utilizar os tokens `app-*` em todos os componentes; a troca ocorre pelos valores das variáveis.
- A variante personalizada é `light:`; não presumir uma classe `.dark` do modelo.
- Não adicionar next-themes nem um segundo armazenamento de tema para o mesmo shell.
- Preservar a mesma hierarquia de superfícies, raios e tamanhos nos dois modos.
- A chave `theme` é local à origem do browser. Sistemas em origens diferentes não sincronizam a preferência automaticamente.
- Em novas implementações, proteger acesso ao storage quando indisponível e, se necessário, aplicar tema antes da primeira pintura; manter classe e chave compatíveis.

## 17. Acessibilidade

### 17.1 Regras Mínimas e Lacunas Atuais

Objetivo para novas implementações: WCAG AA, revisão de teclado e leitor de tela. O código atual oferece nomes para controles globais, `aria-current`, foco global, alguns status acessíveis e semântica de dialog. Isso não equivale a conformidade completa.

| Ponto | Estado atual | Requisito para reprodução acessível |
| --- | --- | --- |
| Gatilhos de dropdown | `aria-label` e `title`; sem `aria-expanded`/`aria-controls` | Expor abertura e ID do painel |
| Painel de dropdown | Div comum; links e botões nativos | Tratar como disclosure com navegação por Tab; se usar `role="menu"`, implementar todo o teclado desse padrão |
| Fechamento por Escape | Fecha, sem restaurar foco explicitamente | Devolver foco ao gatilho quando apropriado |
| Dialog | `role="dialog"`, `aria-modal`, Escape/overlay | Foco inicial, contenção de foco, retorno ao gatilho e isolamento do conteúdo de fundo |
| Field | Rótulo visual em `span` | Associar `label htmlFor` ao input ou fornecer `aria-label`/`aria-labelledby` |
| Input/textarea padrão | `focus-visible:outline-none` suprime o outline global | Acrescentar foco visível explícito, como nos exemplos 10.4 e 11.1 |
| Erros/carregamento | Alguns textos sem live region; loading de página tem status | `role="alert"` para erro, status anunciado sem repetição excessiva |
| Alvos compactos | Header 36/40px; botões XS 32px | Preservar desenho e avaliar área de toque/espaçamento no mobile; não alegar mínimo universal de 44px |
| Cores semânticas | Texto colorido e fundos com alpha | Medir contraste por combinação nos dois temas; acompanhar estado com texto |

Exemplo **proposto**, a acrescentar ao contrato dos gatilhos em uma evolução compartilhada do header:

```tsx
// A API atual de HeaderIconButton não recebe essas props.
// Acrescentá-las à tipagem e encaminhá-las ao <button> antes de usar.
<button type="button" aria-label="Aplicativos"
  aria-expanded={openMenu === "applications"}
  aria-controls="header-applications-panel">
  <Grid2X2 className="h-5 w-5" aria-hidden="true" />
</button>
// O painel correspondente recebe id="header-applications-panel".
```

Esse fragmento demonstra a semântica; o estilo continua sendo o de `HeaderIconButton`. Não substituir o botão estilizado por este fragmento sem incorporar suas classes. Evoluções de acessibilidade devem ocorrer no componente compartilhado e ser propagadas aos produtos.

## 18. Animações e Transições

### 18.1 Padrões de Animação

| Uso | Padrão atual |
| --- | --- |
| Navegação/botões de UI | `transition-colors duration-150` |
| Header e itens de apps | `transition-colors`, duração padrão do Tailwind |
| Avatar/logo clicáveis | `transition-opacity hover:opacity-85` |
| Carregamento de dados/avatar | `animate-spin motion-reduce:animate-none` |
| Envio/operação global | Spinner de borda com `animate-spin` |
| Menus e dialogs | Montagem condicional; sem animação de entrada/saída dedicada |

### 18.2 Regras de Animação

Preservar mudanças sutis de cor/opacidade sem alterar dimensões. Não adicionar bounce, escala, deslocamento de layout ou animações decorativas. Para novos spinners/transições, aplicar `motion-reduce:animate-none` e `motion-reduce:transition-none` quando pertinente. Os spinners de `SubmitButton` e do overlay global ainda não têm a proteção de movimento reduzido presente em `DataLoadingIcon`.

## 19. Anti-Patterns de UI

- Montar um header diferente por página ou trocar tema/apps/avatar por `UserMenu`.
- Mudar a ordem dos controles globais, usar ícones de outra família ou expor Sair fora do menu da conta.
- Fixar a lista de plataformas no JSX ou levar autenticação do RaroNexus para o browser.
- Mudar a paleta por produto, criar cores soltas em cada tela ou definir tokens paralelos de mesmo significado.
- Copiar Tailwind 3, shadcn ou imports `@/shared` do modelo para esta base Tailwind 4.
- Usar títulos enormes, sombras em todos os cards e espaçamentos de landing page em telas administrativas.
- Duplicar providers, `<main>` ou offsets do shell.
- Fechamento imediato de dropdown por efeito de rota ingênuo: Nunca chamar `onClose()` em `useEffect` observando `open` ou `pathname` sem comparar com uma referência anterior (`previousPathnameRef.current !== pathname`). Isso faz com que o dropdown execute `onClose` logo após abrir, piscando na tela e fechando instantaneamente.
- Listener de clique externo capturando o próprio botão disparador: Nunca registrar fechamento externo no documento sem verificar se o alvo (`target`) pertence ao botão disparador (`[aria-controls="${id}"]`). Sem essa proteção, o `pointerdown` no botão fecha o menu antes que o evento `click` do botão possa executar a alternância (`toggle`), impedindo o fechamento por clique no ícone ou causando reabertura involuntária.
- Remover o foco, usar somente cor como status ou tratar `Field` visual como label acessível automático.
- Declarar sucesso sem retorno do servidor; mostrar lista vazia quando houve erro.
- Afirmar que ARIA, foco de modal, contraste, PWA ou sincronização de tema entre origens já estão completos.
- Copiar ações, banco e migrações do raroclients para outro produto apenas para reproduzir a UI.

## Apêndice A: Checklist de Nova Tela

- [ ] Usa o `Shell` global e retorna apenas o conteúdo da página.
- [ ] Mantém o mesmo bloco tema → apps → avatar e o contrato da seção 9.1.
- [ ] Usa tokens `app-*`, fontes e raios deste guia nos dois temas.
- [ ] Compõe `Panel`, `PanelHeader`, `Stat`, `Badge` e `Empty` quando aplicável.
- [ ] Mantém `gap-5` entre blocos e padding padrão dos painéis.
- [ ] Distingue carregando, vazio, erro e conteúdo; oferece recuperação quando possível.
- [ ] Fields têm nome acessível, foco visível e erros associados ao campo.
- [ ] Form usa validação no servidor, pending e autorização real das alterações.
- [ ] Tabela rola localmente e possui cabeçalhos semânticos.
- [ ] Menus suportam Escape/clique fora, estado acessível e teclado.
- [ ] Dialog mantém foco, permite fechamento e cabe na altura do viewport.
- [ ] Revisou 360px, 390px, 640px, 1024px e 1440px nos dois temas.
- [ ] Não oculta conteúdo atrás de barras fixas e safe area.
- [ ] Segue a regra geral de navegação mobile por quantidade de destinos.
- [ ] Verificou contraste, zoom e movimento reduzido.
- [ ] Executou lint/typecheck e verificações pertinentes ao código alterado.

Checklist extra ao transportar o cabeçalho:

- [ ] Copiou os dois arquivos de header, CSS e shell mantendo classes e medidas.
- [ ] Implementou o adaptador `useAuth` e endpoints locais compatíveis.
- [ ] Testou loading, erro, retry, vazio, lista longa e fallbacks de imagens.
- [ ] Excluiu o próprio produto da lista de apps e confirmou o acesso ao RaroNexus.
- [ ] Ajustou “Perfil no …” e manteve o papel vindo da sessão.
- [ ] Confirmou Editar perfil, logout e persistência do tema.
- [ ] Completou as lacunas de acessibilidade sem mudar a aparência.

## Apêndice B: Resumo Visual

| Aspecto | Padrão Raroclients |
| --- | --- |
| Identidade | Azul `#2563EB`, superfícies neutras, escuro por padrão |
| Tipografia | Fonte do sistema; corpo 14px; métricas 24px |
| Estrutura desktop | Sidebar 256px + header sticky 64px + main até 1152px |
| Estrutura mobile atual | Header 64px + conteúdo + bottom navigation 64px |
| Ações globais | Sun/Moon → Grid2X2 → avatar circular |
| Menus globais | Superfície do tema, raio 12px, até 320px, scroll, camada 60 |
| Avatar e logos de apps | 36px; avatar circular; logo com raio 8px |
| Painéis | Superfície + borda de 1px + raio 12px |
| Botões/campos | Altura 40px + raio 8px; variantes compactas de 32px |
| Badges | Pill, 12px semibold, fundo semântico a 15% |
| Espaçamentos | Página 16/24/32px lateral; blocos separados por 20px |
| Dialog | Overlay escuro com blur 18px, superfície e sombra elevada |
| Camadas | Sidebar/bottom nav 40; header 45; dialog 50; dropdown 60; operação 80 |
| Tema | `theme-light` em html/body, `localStorage.theme` |

### Mapa de Fontes e Manutenção

| Conteúdo | Fonte local |
| --- | --- |
| Organização deste documento | [design-system-model.md](./design-system-model.md) |
| Diretrizes gerais da família e navegação mobile | [design-system.md](./design-system.md) |
| Blueprint visual genérico | [styling.schema.json](./styling.schema.json) |
| Tokens executáveis | [globals.css](../src/app/globals.css) |
| Estrutura e navegação real | [shell.tsx](../src/components/shell.tsx) |
| Ações globais, avatar e plataformas | [header-actions.tsx](../src/components/header-actions.tsx) |
| Gatilhos e menus | [header-dropdown.tsx](../src/components/header-dropdown.tsx) |
| Contexto de sessão | [auth-provider.tsx](../src/components/auth-provider.tsx) |
| Tipos de sessão | [auth-types.ts](../src/lib/auth-types.ts) |
| Adaptador de aplicativos | [applications/route.ts](../src/app/api/auth/applications/route.ts) |
| Primitives e classes | [ui.tsx](../src/components/ui.tsx) |
| Modais e envio | [dialog.tsx](../src/components/dialog.tsx) |
| Estados de dados | [data-loading.tsx](../src/components/data-loading.tsx) |
| Operações globais | [operation-loading.tsx](../src/components/operation-loading.tsx) |

Ao alterar um componente compartilhado, atualizar os blocos transcritos, contratos e checklist juntos. Divergências entre a intenção dos guias e o código devem continuar explícitas até a implementação correspondente ser concluída.
