# RaroTickets

Sistema mobile-first para a operação de eventos Raro. A base atual inclui dashboard operacional, catálogo de eventos, criação de rascunhos, atualização de situação e autenticação SSO pelo RaroNexus para a equipe interna. Participantes têm cadastro e login próprios por e-mail e senha, independentes do RaroNexus. Inscrições em eventos, pagamentos, check-in e relatórios aparecem como áreas preparadas, mas ainda não são fluxos transacionais nesta versão.

## Stack e arquitetura

- React + TypeScript + Vite no client; Express + TypeScript no server.
- Clean Architecture/DDD: `@core`, `modules/*/domain`, `application`, `server` e `client` separados.
- Value Objects compartilhados entre validação de formulário e regras server-side; casos de uso retornam `Result`.
- O client conversa somente com a API local. Credenciais SSO e tokens ficam no server.
- API local: eventos e contas de participantes são persistidos em arquivos JSON dentro de `DATA_DIRECTORY` (`events.json` e `participants.json`), gravados atomicamente. É um adaptador simples para desenvolvimento; antes de operar em produção ou em múltiplas instâncias, substitua-o por banco transacional e implemente as proteções de concorrência, privacidade e auditoria adequadas.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run dev
```

O Vite atende a interface em `http://localhost:5173` e encaminha `/api` para a API em `http://localhost:3001`. A URL do navegador usa caminhos relativos; o client não chama `localhost` diretamente.

Sem credenciais do RaroNexus, o botão SSO ficará desabilitado. Para explorar a demonstração local, ajuste no `.env`:

```env
DEMO_LOGIN_ENABLED=true
DATA_DIRECTORY=.data-demo
```

A demonstração usa uma identidade sintética e eventos fictícios. Ela só é habilitada fora de `NODE_ENV=production`, não é uma forma de autenticação para usuários reais e não deve ser ligada em um ambiente compartilhado. Os arquivos `.data*` ficam fora do Git.

## SSO com RaroNexus

Cadastre o RaroTickets como aplicação no RaroNexus e configure, no server, os valores fornecidos pelo responsável pela instância:

```env
RARONEXUS_BASE_URL=https://<origem-raronexus>
RARONEXUS_CLIENT_ID=<client-id-cadastrado>
RARONEXUS_CLIENT_SECRET=<segredo-do-cliente>
APP_BASE_URL=https://<origem-publica-do-rarotickets>
RARONEXUS_SESSION_COOKIE_MAX_AGE_SECONDS=28800
RARONEXUS_REQUEST_TIMEOUT_MS=5000
```

`RARONEXUS_BASE_URL` e `APP_BASE_URL` devem ser origens, sem caminhos adicionais. Em produção, ambas precisam usar HTTPS. Registre em cada ambiente exatamente este callback:

```text
${APP_BASE_URL}/api/auth/raronexus/callback
```

Não invente host, `client_id` ou segredo: eles precisam ser confirmados na instância do RaroNexus. Mantenha o segredo em variáveis privadas do servidor/gerenciador de segredos — nunca em `VITE_*`, bundles, respostas HTTP ou logs.

### Fluxo implementado

1. `GET /api/auth/raronexus/start` gera `state` criptograficamente aleatório (24 bytes), guarda estado/destino/modo em cookies HttpOnly temporários de cinco minutos e redireciona a `/sso/authorize`.
2. A tentativa silenciosa usa `prompt=none`; `login_required` retorna à tela local com alternativa de login interativo.
3. O callback compara `state` em tempo constante, exige `code` e troca-o no backend em `POST /api/v1/sso/token`, usando a mesma `redirect_uri` cadastrada.
4. O perfil de `data.role.chave` é mapeado localmente. Perfis desconhecidos são recusados; autenticação no RaroNexus, por si só, não concede acesso.
5. O token `global_session_token` é mantido somente no cookie HttpOnly `rarotickets_global_session`. Não é armazenado em `localStorage` nem enviado à interface.
6. Cada rota protegida valida a sessão com `POST /api/v1/sessions/introspect` sem cache; sessão inativa, resposta inválida ou provedor indisponível nunca concede acesso por fallback.
7. `POST /api/auth/logout` sempre limpa a sessão local. `globalSessionRevoked` só será `true` quando a revogação remota responder HTTP de sucesso e `success: true`; a confirmação do formato de resposta deve ser verificada com a instância de destino.

Cookies usam `HttpOnly`, `Path=/`, `SameSite=Lax`, escopo restrito ao host e `Secure` em produção. Ajuste `RARONEXUS_SESSION_COOKIE_MAX_AGE_SECONDS` à política real do RaroNexus; cookie persistente não substitui introspecção.

### Rotas locais de autenticação

| Rota | Finalidade |
| --- | --- |
| `GET /api/auth/raronexus/start` | Inicia SSO interativo ou silencioso (`?mode=silent`). |
| `GET /api/auth/raronexus/callback` | Valida callback, troca o código e grava o cookie local. |
| `GET /api/auth/session` | Informa sessão, perfil e permissões, sem token. |
| `GET /api/auth/applications` | Busca o catálogo autorizado do RaroNexus pelo backend. |
| `POST /api/auth/logout` | Limpa a sessão local e solicita revogação global. |

O catálogo é consultado sem cache em `GET /api/v1/applications`, pelo backend, com `Cookie: raronexus_global_session=<token-codificado>`. Aplicativos inativos, sem destino HTTP(S) ou que correspondem ao próprio cliente são excluídos. O token não chega ao navegador. Os links de início e perfil central são derivados de `${RARONEXUS_BASE_URL}/home` e `${RARONEXUS_BASE_URL}/profile`.

### Perfis locais

As chaves abaixo são mapeadas para permissões do RaroTickets, conforme os perfis previstos no domínio. Confirme que a instância do RaroNexus fornece estas chaves exatas antes da ativação; toda chave não reconhecida resulta em `403`.

- `ADMINISTRADOR`: acesso completo.
- `GERENTE_EVENTO`: gestão de eventos, inscrições, participantes e relatórios.
- `FINANCEIRO`: leitura de eventos/inscrições, financeiro e relatórios.
- `ATENDIMENTO`: leitura de eventos, inscrições e participantes.
- `CHECKIN`: leitura de eventos e operação de check-in.
- `CONSULTA`: leitura de eventos, inscrições, participantes e relatórios.

A verificação de permissão ocorre no server em cada operação protegida; ocultar uma ação na interface não é a barreira de segurança.

## Conta de participante (sem RaroNexus)

A autenticação da equipe e a conta de participante são fluxos separados:

- **Equipe interna:** entra em `/login` por meio do SSO RaroNexus. A criação e a operação de eventos continuam protegidas pelas permissões locais derivadas do perfil interno.
- **Participantes e público:** acessam `/account/register`, informam nome, e-mail, CPF e senha e entram em `/account/login` com e-mail e senha. Não precisam de conta RaroNexus. O login não usa nem consulta as credenciais do SSO.

O cadastro valida os mesmos Value Objects no client e no server, normaliza e-mail/CPF e não mostra o CPF integral na tela da conta. As senhas são derivadas com scrypt e salt aleatório; o servidor cria a sessão em um cookie HttpOnly separado (`rarotickets_participant_session`). O prazo dessa sessão é configurado independentemente pelo `PARTICIPANT_SESSION_COOKIE_MAX_AGE_SECONDS`. Os endpoints locais são:

| Rota | Finalidade |
| --- | --- |
| `POST /api/participants/auth/register` | Cria a conta e inicia uma sessão de participante. |
| `POST /api/participants/auth/login` | Autentica com e-mail e senha. |
| `GET /api/participants/auth/session` | Consulta a sessão própria, sem expor senha, hash ou CPF integral. |
| `POST /api/participants/auth/logout` | Revoga a sessão local do participante. |

**Limites importantes:** o adaptador atual grava nome, e-mail e CPF em texto no arquivo local `DATA_DIRECTORY/participants.json`; somente as senhas ficam protegidas por hash. Esse armazenamento é apenas para desenvolvimento/demonstração e não deve receber dados reais em produção. Antes de abrir o cadastro ao público, migre para armazenamento apropriado, estabeleça controles de acesso/criptografia, retenção e exclusão de dados conforme a LGPD, além de verificação de e-mail, recuperação de senha, proteção contra abuso e testes de sessão. O histórico da conta ainda não lista inscrições, pagamentos, credenciais/QR Codes ou certificados; esses fluxos permanecem pendentes.

## Escopo desta entrega e próximos passos

- **Pronto nesta base:** SSO RaroNexus para equipe (dependente de cadastro/credenciais externos), sessão HttpOnly, introspecção, autorização local, catálogo Aplicativos, dashboard mobile-first, gestão básica de eventos e cadastro/login/conta de participante por e-mail e senha.
- **Estrutura visual, ainda sem operações reais:** inscrições em eventos, gestão/lista de participantes, pagamentos, check-in e relatórios. O histórico na conta de participante também aguarda esses fluxos.
- **Ainda necessário antes de produção:** credenciais e callback por ambiente; confirmação das chaves de perfil e do formato de sucesso de revogação no RaroNexus; banco transacional, proteção adequada dos dados pessoais, auditoria e controle concorrente de vagas; formulários/inscrições; integração PagBank baseada na documentação oficial vigente; check-in/QR code; recuperação e verificação de conta, LGPD e testes operacionais.

Não considere o SSO validado ponta a ponta até testar com uma instância, callback, perfil e credenciais reais cadastrados pelo responsável pelo RaroNexus.

## Verificações

```bash
npm test
npm run build
```
