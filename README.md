# RaroTickets

Sistema web completo de gestão de eventos, inscrições, pagamentos via PagBank (popup/lightbox), credenciamento (QR Code) e certificados. Desenvolvido seguindo Clean Architecture + DDD Isomórfico, design system Raro e autenticação SSO via RaroNexus.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Estilização:** Tailwind CSS 4 com tokens Raro (dark por padrão, com light mode)
- **Banco de dados:** PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **Pagamentos:** integração com PagBank v4 (popup/lightbox) + adaptador Mock para desenvolvimento
- **Autenticação:** SSO RaroNexus (com fallback Mock para demonstração)
- **QR Code:** credenciais com token opaco assinado

## Estrutura do projeto

```
rarotickets/
├── agents/                  # Documentos de arquitetura, design system, regras de negócio e auth
├── migrations/              # Migrations SQL versionadas
├── scripts/                 # Seed e jobs de rotina
│   ├── seed.ts
│   └── jobs/                # Expiração de reservas e virada de lotes
├── public/                  # Assets estáticos
└── src/
    ├── @core/               # Classes base isomórficas (Entity, VO, Result, UseCase, etc.)
    ├── lib/                 # Domínio isomórfico (entidades, VOs, tipos e erros)
    ├── server/              # Camada Server: DB, sessão, integrações e middlewares
    │   ├── config/          # Configurações de ambiente
    │   ├── db/              # Conexão, schema Drizzle e repositórios
    │   ├── infrastructure/  # Clientes RaroNexus e PagBank (mock + real)
    │   └── session/         # Sessões via cookie HttpOnly + JWT
    ├── components/          # UI primitives, shell, header, dialogs e auth-provider
    ├── shared/              # Utilitários isomórficos (formatação, cn, paginação)
    └── app/                 # Rotas Next.js App Router (páginas + APIs)
```

## Configuração inicial

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

```bash
cp .env.example .env
```

As variáveis principais:

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | URL do PostgreSQL |
| `APP_BASE_URL` | Origem pública da aplicação |
| `APP_SESSION_SECRET` | Segredo para assinar cookies/JWT |
| `RARONEXUS_*` | Credenciais do SSO |
| `PAGBANK_*` | Credenciais do PagBank (token, public key, webhook secret) |

> **Modo demonstração**: enquanto `RARONEXUS_CLIENT_SECRET` e `PAGBANK_TOKEN` estiverem com os placeholders, o sistema entra automaticamente em modo mock: o login entra como "Administrador (Mock)" e os pagamentos são confirmados pelo adapter simulação ao clicar em "Pagar com PagBank".

### 3. Subir o banco e aplicar migrations

```bash
# Com PostgreSQL rodando (ex.: local ou Docker), crie o banco:
# createdb rarotickets

npm run db:migrate
```

### 4. Popular dados fictícios

```bash
npm run db:seed
```

O seed cria:
- Usuário Administrador Mock (para login sem RaroNexus configurado)
- 4 eventos (um aberto pago, um agendado, um gratuito, um finalizado com certificado)
- Lotes e um cupom `BEMVINDO20` (20% off)
- 5 participantes com inscrições em vários estados (confirmada, aguardando pagamento, lista de espera, gratuita, certificado emitido)

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## Módulos e regras de negócio implementadas

### Eventos (`events`)
- Ciclo de vida (Rascunho → Agendado → Inscrições abertas → Encerradas → Em andamento → Finalizado → Cancelado)
- Modalidade presencial/online, capacidade, endereço/stream
- Auto-transição de status por rotina

### Lotes (`lots`)
- Nome, valor (centavos), período, vagas, ativo/inativo
- Lote vigente calculado automaticamente
- Virada automática de lotes (job `npm run jobs:lot-transitions`)

### Inscrições (`registrations`)
- Participante reutilizável por CPF/e-mail
- Reserva temporária de 15 minutos em eventos pagos
- Fluxo: Pendente → Aguardando Pagamento / Lista de Espera / Confirmada / Cancelada
- Controle atômico de vagas (sem overbooking)
- Snapshot de formulário e consentimentos LGPD
- Job de expiração: `npm run jobs:expire-reservations`

### Cupons (`coupons`)
- Tipos `PERCENTUAL`, `VALOR_FIXO`, `CORTESIA`
- Invariante `preço ≥ 0` cortesias (valor zero) pulam o checkout

### Pagamentos (`payments`)
- PagBank em popup/lightbox por porta de domínio (`PaymentGatewayPort`)
- Adapter Mock embutido (sem credenciais)
- Idempotência de webhook e armazenamento integral do payload bruto
- De-para de status PagBank → status interno
- Preparado para PIX, Cartão e Boleto

### Check-in (`checkin`)
- QR Code por token opaco (sem IDs sequenciais)
- Validação de inscrição confirmada, evento em andamento e duplicidade
- Registro de operador e auditoria

### Certificados (`certificates`)
- Código alfanumérico único
- Página pública de validação em `/certificado/[code]`

### Auditoria (`compliance`)
- Log de ações (eventos, inscrições, pagamentos, check-in) com usuário, IP e estados

## Perfis de acesso

Perfis mapeados a partir do RaroNexus (`data.role.chave`):

- `ADMINISTRADOR`: gestão total
- `GERENTE_EVENTO`: criação/edição/publicação de seus eventos
- `FINANCEIRO`: relatórios e estornos
- `ATENDIMENTO`: consulta de participantes e cortesias
- `CHECKIN`: leitura de QR Code
- `CONSULTA`: leitura de relatórios

## Rotas principais

| Caminho | Finalidade |
| --- | --- |
| `/login` | Entrada via SSO RaroNexus |
| `/dashboard` | Indicadores gerais |
| `/eventos` | Lista de eventos |
| `/eventos/novo` | Criar evento |
| `/eventos/[id]` | Detalhe, lotes e inscrições |
| `/inscricoes/novo` | Formulário público de inscrição |
| `/inscricoes/[id]` | Detalhe da inscrição |
| `/inscricoes/[id]/pagamento` | Checkout PagBank |
| `/meus-ingressos` | Área do participante (consulta por e-mail/documento) |
| `/checkin` | Credenciamento por QR Code |
| `/relatorios` | Indicadores operacionais |
| `/certificado/[code]` | Validação pública de certificado |

## Variáveis de ambiente (.env.example)

```env
APP_BASE_URL="http://localhost:3000"
NODE_ENV="development"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rarotickets"
RARONEXUS_BASE_URL="http://localhost:3001"
RARONEXUS_CLIENT_ID="rarotickets"
RARONEXUS_CLIENT_SECRET="sua-chave-secreta-aqui"
PAGBANK_ENV="sandbox"
PAGBANK_BASE_URL="https://sandbox.api.pagseguro.com"
PAGBANK_TOKEN="seu-token-pagbank"
PAGBANK_PUBLIC_KEY="sua-public-key"
PAGBANK_WEBHOOK_SECRET="webhook-secret"
APP_SESSION_SECRET="gere-uma-chave-aleatoria-forte-aqui-de-32-bytes-ou-mais"
APP_SESSION_DAYS="7"
```

## Scripts

| Comando | Ação |
| --- | --- |
| `npm run dev` | Inicia em modo desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Inicia build de produção |
| `npm run typecheck` | Verificação TypeScript |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Aplica migrations |
| `npm run db:seed` | Insere dados fictícios |
| `npm run jobs:expire-reservations` | Expira reservas de 15 min (agendar a cada 1 min) |
| `npm run jobs:lot-transitions` | Ativa/desativa lotes por data (agendar periodicamente) |

## Observações importantes

1. **Zero retenção de dados sensíveis de pagamento:** todo checkout é feito no popup/lightbox do PagBank; o RaroTickets apenas inicia a sessão e recebe webhooks.
2. **Mock automático:** enquanto as credenciais do RaroNexus e PagBank não forem preenchidas, o sistema usa adaptadores mock para permitir total desenvolvimento e teste local.
3. **Idempotência:** o endpoint de webhook armazena todos os payloads e só processa cada transição uma vez.
4. **Isomorfismo:** o domínio (`src/lib/domain`) roda tanto no servidor quanto no cliente, garantindo as mesmas validações (CPF, e-mail, preço, período, etc.) nas duas pontas.

Consulte a pasta `agents/` para as regras completas de arquitetura, UI e negócio que guiaram a implementação.
