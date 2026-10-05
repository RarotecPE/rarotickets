# Migrations

Toda alteração de banco de dados deve ser adicionada como um **novo arquivo
numerado** nesta pasta, nunca editando um arquivo já aplicado.

## Convenção

```
NNNN_descricao_curta.sql
```

- `NNNN` — número sequencial com 4 dígitos (`0001`, `0002`, ...).
- `descricao_curta` — descrição em `snake_case`.
- Os arquivos são aplicados em ordem alfabética, cada um dentro de uma
  transação, e registrados na tabela `schema_migrations` (com checksum
  SHA-256 para detectar alterações indevidas em migrations já aplicadas).

## Comandos

```bash
npm run db:migrate   # aplica as migrations pendentes
npm run db:seed      # insere dados fictícios para visualização
npm run db:reset     # recria o banco do zero (migrations + seed)
```

## Histórico

| Arquivo                                   | Conteúdo                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `0001_users_and_sessions.sql`             | Usuários internos, perfis/permissões e sessões de acesso                  |
| `0002_participants_and_consents.sql`      | Participantes, consentimentos LGPD, acesso do participante, pedidos LGPD  |
| `0003_events.sql`                         | Eventos, lotes, palestrantes, programação e formulário configurável       |
| `0004_registrations.sql`                  | Inscrições, reserva de vaga, respostas, lista de espera, check-in         |
| `0005_payments_and_coupons.sql`           | Cupons, pagamentos, histórico financeiro e notificações do PagBank        |
| `0006_certificates_audit_communications.sql` | Certificados, auditoria e comunicações                                 |
| `0007_seat_control_and_indexes.sql`       | Visões de ocupação de vagas/lotes e índices de apoio                      |
