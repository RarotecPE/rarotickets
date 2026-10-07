# RaroTickets

Plataforma web responsiva para descoberta e gestão de eventos, inscrições, lotes, cupons, pagamentos PagBank, credenciamento por QR Code, certificados e relatórios. A arquitetura separa domínio isomórfico, casos de uso, API e infraestrutura conforme `AGENTS.md` e os documentos de `agents/`.

## Requisitos

- Node.js 20.9+ (recomendado Node 22)
- PostgreSQL 15+
- Aplicação cadastrada no RaroNexus para habilitar o painel administrativo

## Configuração local

```bash
cp .env.example .env
# Preencha DATABASE_URL e substitua os placeholders dos segredos por valores aleatórios.
openssl rand -base64 48 # gere valores diferentes para APP_SECRET_KEY e QR_SIGNING_SECRET
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

O seed exige `DATABASE_URL`, `APP_SECRET_KEY` e `QR_SIGNING_SECRET` válidos e é bloqueado quando `NODE_ENV=production`. Ele cria somente dados fictícios; não provisiona contas nem habilita login. Os links de demonstração da Área do Participante são impressos no terminal ao executar o seed. A vitrine e o fluxo público não exigem sessão administrativa; o painel requer SSO pelo RaroNexus, sem login local ou armazenamento de senhas.

## Banco de dados

As migrações SQL versionadas ficam em `src/server/infrastructure/persistence/migrations`. `npm run db:migrate` aplica as migrações e `npm run db:generate` gera novas migrações a partir do schema Drizzle. `npm run db:seed` é um script separado e idempotente que cria eventos em diferentes estados, lotes, cupons, programação, inscrições, pagamentos, check-ins, certificados e registros de auditoria fictícios. Reexecutar o seed atualiza os mesmos registros de demonstração. **Nunca execute o seed em produção.**

As datas são persistidas em UTC. Inscrições e certificados usam códigos públicos; tokens de acesso são armazenados somente como hash.

## Integrações

- **RaroNexus:** configure `RARONEXUS_BASE_URL`, `RARONEXUS_CLIENT_ID`, `RARONEXUS_CLIENT_SECRET`, `APP_BASE_URL` e as chaves de perfil. Cadastre exatamente `${APP_BASE_URL}/api/auth/raronexus/callback` em cada ambiente. O fluxo tenta SSO silencioso (`prompt=none`) e oferece entrada interativa; APIs protegidas validam a sessão no servidor. Perfis desconhecidos são negados. O logout sempre remove a sessão local e tenta revogação remota.
- **PagBank:** `PAYMENT_GATEWAY=mock` habilita o checkout de demonstração em desenvolvimento. Para produção, use `PAYMENT_GATEWAY=pagbank`, credenciais, ambiente e URL oficiais. O browser recebe uma URL de checkout para abrir em nova janela; o RaroTickets não recebe dados de cartão. Configure o webhook como `${APP_BASE_URL}/api/webhooks/pagbank` e valide a assinatura segundo o contrato habilitado na conta PagBank.
- **E-mail e WhatsApp:** mensagens entram na tabela outbox e são processadas por `POST /api/internal/maintenance` com `Authorization: Bearer ${CRON_SECRET}` (agende a chamada). Configure SMTP e, opcionalmente, Meta Cloud API. A convocação da lista de espera usa um template Meta aprovado separado, com cinco parâmetros (nome, evento, inscrição, link e prazo). Falha de WhatsApp não impede o fallback de e-mail.
- **Arquivos:** `STORAGE_DRIVER=local` é para desenvolvimento. Para produção, configure S3 compatível e política de acesso privado. Uploads privados usam URL temporária.

## SSO pendente de configuração

Os contratos usados são os documentados em `agents/authentication.md` (`/sso/authorize`, `/api/v1/sso/token`, `/api/v1/sessions/introspect`, `/api/v1/sessions/revoke` e catálogo de aplicativos). Cadastre `client_id`, segredo, callback e perfis da aplicação no RaroNexus. Credenciais reais não estão neste repositório; a validação ponta a ponta com a instância central permanece pendente até configurar esses valores.

## Rotas principais

- `/` e `/eventos/[slug]`: vitrine e inscrição pública; `/eventos` lista eventos.
- `/painel`: dashboard protegido por SSO.
- `/painel/eventos`, `/painel/eventos/novo` e `/painel/eventos/[eventId]`: listagem, criação e detalhes/gestão de eventos, incluindo transições de status.
- `/painel/inscricoes`, `/painel/credenciamento`, `/painel/relatorios` e `/painel/auditoria`: operação administrativa conforme as permissões do perfil.
- `/ingressos/[accessToken]`: Área do Participante acessível pelo link privado da inscrição.
- `/checkout/mock`: checkout fictício disponível somente com o gateway mock.
- `/certificados/[code]`: validação pública de autenticidade do certificado.

## Verificações

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
