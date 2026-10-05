-- =============================================================================
-- 0001 — Usuários internos, perfis de acesso e sessões
-- Regras de negócio: §35 (usuários e permissões), §36 (auditoria)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY,
  name            text        NOT NULL,
  email           text        NOT NULL,
  password_hash   text        NOT NULL,
  role            text        NOT NULL,
  permissions     text[]      NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  last_login_at   timestamptz,
  created_by      uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (
    role IN ('ADMINISTRADOR', 'GERENTE_EVENTO', 'FINANCEIRO', 'ATENDIMENTO', 'CHECKIN', 'CONSULTA')
  )
);

-- E-mail de usuário interno é único, sem diferenciar maiúsculas/minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  id          uuid PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  user_agent  text,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_unique ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
