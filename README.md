# RaroTickets

Plataforma de **gestão de eventos** da Raro: eventos, lotes, formulários dinâmicos,
inscrições (gratuitas e pagas), pagamentos via PagBank, lista de espera, check-in com
credencial QR, certificados, relatórios, usuários/permissões, auditoria e LGPD.

Implementação completa das regras de `agents/business-rules.md`, seguindo
`agents/ARCHITECTURE.md` (Clean Architecture + DDD, domínio isomórfico, Result Pattern)
e `agents/design-system.md` (identidade Raro, tema escuro padrão, mobile first).

---

## Stack

| Camada    | Tecnologia                                                                            |
| --------- | ------------------------------------------------------------------------------------- |
| Server    | Node + TypeScript, Express 5, `pg` (PostgreSQL), Zod-free (validações no domínio)      |
| Client    | React 19 + React Router 7 + Vite 8 + Tailwind 4                                        |
| Domínio   | TypeScript isomórfico (mesmas entidades/VOs no server e no client)                     |
| Banco     | PostgreSQL com migrations SQL versionadas (`migrations/`) e checksum SHA-256          |
| Pagamento | API oficial do PagBank (PIX, boleto e cartão) + provider simulado para desenvolvimento |
| Testes    | Vitest + scripts de verificação ponta a ponta (`scripts/tmp/`)                         |

Em desenvolvimento a aplicação sobe um **PostgreSQL embarcado** (porta 55432) quando
`DATABASE_EMBEDDED=true`, aplica as migrations pendentes e serve API + SPA na mesma
porta (`http://localhost:3000`).

---

## Como rodar

```bash
cp .env.example .env    # preencha os valores reais; o .env do repositório é fictício
npm install
npm run dev             # API + SPA em http://localhost:3000
```

Scripts disponíveis:

| Comando                   | O que faz                                                     |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev`             | Sobe API + SPA (Vite em modo middleware) com reload do server  |
| `npm run build`           | Gera o bundle do client em `dist/client`                       |
| `npm start`               | Executa em modo produção (serve `dist/client`)                 |
| `npm run typecheck`       | `tsc --noEmit` em todo o projeto                               |
| `npm run lint:architecture` | Verifica a matriz de importações entre camadas               |
| `npm run db:migrate`      | Aplica as migrations pendentes                                 |
| `npm run db:seed`         | Insere dados fictícios para visualização                       |
| `npm run db:reset`        | Recria o schema e roda migrations + seed                       |
| `npm test`                | Executa os testes (Vitest)                                     |

### Dados fictícios do seed

| Acesso                        | Perfil         | Senha            |
| ----------------------------- | -------------- | ---------------- |
| `admin@rarotickets.com.br`    | Administrador  | `RaroTickets2026` |
| `financeiro@rarotickets.com.br` | Financeiro   | `RaroTickets2026` |
| `checkin@rarotickets.com.br`  | Check-in       | `RaroTickets2026` |

O seed cria dois eventos publicados (um pago com dois lotes e cupons, um gratuito),
cupons (`RARO10`, `RARO50`, `CORTESIA-EQUIPE`), inscrições confirmadas/pendentes,
uma cobrança PIX paga, um boleto em aberto, um cancelamento, um check-in e um
certificado (`CERT-...`) — o suficiente para navegar por todas as telas.

A área do participante é acessada com **e-mail + CPF** de uma inscrição
(ex.: `diego.almeida@exemplo.com` / `390.533.447-05`).

---

## Estrutura

```
migrations/                 alterações de banco, uma por arquivo numerado
scripts/                    migrate, seed, reset, checagem de arquitetura
src/@core/                  domínio e contratos compartilhados (isomórficos)
  contracts/                ports entre módulos (payment, participant, event, ...)
  domain/                   value objects, validators, permissions, utils
src/modules/<contexto>/     um módulo por contexto de negócio
  domain/                   entidades, VOs, erros, repositórios (interfaces)
  application/              use cases (uma ação cada) + mappers
  server/                   controllers, rotas, persistência e adapters
  client/                   serviços HTTP e telas (nunca importa server/application)
src/server/                 config, infraestrutura, middlewares, DI e bootstrap
src/client/                 bootstrap da SPA, routing, layout, UI e estado global
src/shared/                 constantes e utilitários isomórficos
```

Regras inegociáveis aplicadas (ver `AGENTS.md` e `agents/ARCHITECTURE.md`):

- nenhuma regra de negócio fora do domínio; nenhuma API de runtime no domínio
  (`process.env`, `fs`, `fetch`, `crypto`, `window`, `document` são injetadas via ports);
- erros de negócio sempre pelo **Result Pattern**, nunca por `throw`;
- o client nunca importa `server/` ou `application/`;
- comunicação entre módulos por contrato/ACL (`src/@core/contracts`) e domain events;
- interfaces de repositório em `domain/repositories` (`*-repository.interface.ts`,
  `*-repository.base.ts`), implementações em
  `server/infrastructure/persistence/repositories`;
- modelos de persistência separados das entidades, com `*PersistenceMapper`;
- controllers finos estendendo `Controller<Request, Response>`;
- sufixos de arquivo conforme `ARCHITECTURE §2.3` e tokens em `Symbol('...')`.

---

## Funcionalidades

- **Eventos**: 7 status com transições validadas, GRATUITO/PAGO, capacidade com
  controle de concorrência (`SELECT ... FOR UPDATE`), reserva temporária de vaga com
  TTL configurável por evento e expiração automática.
- **Lotes**: seleção automática do lote vigente, preço congelado na inscrição,
  controle de quantidade vendida.
- **Formulários dinâmicos**: 13 tipos de campo, versionamento e preservação das
  respostas antigas.
- **Inscrições**: código único, estados PENDENTE/AGUARDANDO_PAGAMENTO/CONFIRMADA/
  CANCELADA/LISTA_ESPERA, promoção automática da fila, cancelamento liberando vaga.
- **Pagamentos**: PIX, boleto e cartão via PagBank, referência interna
  `EVENTO-<n>-INSCRICAO-<n>`, status internos mapeados do provedor, webhook
  idempotente com histórico de notificações, job de reconciliação, estorno e
  cancelamento com histórico. Nenhum PAN/CVV é armazenado.
- **Cupons**: PERCENTUAL, VALOR_FIXO e CORTESIA, com valor final nunca negativo.
- **Check-in**: credencial QR única e não sequencial, validação pelo código,
  registro de operador/data/hora, bloqueio de duplicidade e override auditado.
- **Certificados**: código de validação, consulta pública de autenticidade e
  elegibilidade por presença quando exigido.
- **Área do participante**: histórico de inscrições, credenciais, certificados,
  pagamentos e consentimentos LGPD.
- **Admin**: dashboard com os 10 indicadores, 13 relatórios, usuários com 6 perfis e
  18 permissões granulares, auditoria (quem/quando/valores antes-depois), cupons,
  credenciamento e financeiro.
- **Comunicações**: gatilhos de e-mail/WhatsApp registrados em `communication_logs`.
- **Expirações automáticas**: reserva de assento, PIX, boleto, período de inscrição,
  lote e inscrição pendente (scheduler configurável).

---

## Verificação

```bash
npm run typecheck
npm run lint:architecture

# com a API no ar (npm run dev), opcionalmente:
npx tsx scripts/tmp/e2e-smoke.ts    # fluxo público: inscrição → cupom → PIX → credencial → check-in
npx tsx scripts/tmp/admin-flow.ts   # fluxos administrativos: evento, lote, formulário, usuários
```

O PagBank em produção exige token, URL de notificação e segredo do webhook no `.env`.
Sem token válido a aplicação usa o **provider simulado**, que permite concluir o fluxo
de pagamento em desenvolvimento (`POST /api/v1/dev/payments/:id/simulate`).
