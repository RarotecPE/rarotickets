-- =============================================================================
-- 0002 — Participantes, consentimentos (LGPD) e acesso à área do participante
-- Regras de negócio: §6 (participantes), §32 (área do participante), §37 (LGPD)
-- =============================================================================

CREATE TABLE IF NOT EXISTS participants (
  id          uuid PRIMARY KEY,
  name        text        NOT NULL,
  cpf         text,
  cnpj        text,
  email       text        NOT NULL,
  phone       text,
  birth_date  date,
  company     text,
  job_title   text,
  city        text,
  state       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participants_cpf_digits_check CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
  CONSTRAINT participants_cnpj_digits_check CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$')
);

-- Um participante por CPF e por e-mail (quando informados): evita duplicidade
-- de cadastro principal (§6 e §41).
CREATE UNIQUE INDEX IF NOT EXISTS participants_cpf_unique ON participants (cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS participants_email_unique ON participants (lower(email));
CREATE INDEX IF NOT EXISTS participants_name_idx ON participants (name);
CREATE INDEX IF NOT EXISTS participants_city_state_idx ON participants (city, state);

-- Consentimentos guardados de forma separada e identificável (§37).
CREATE TABLE IF NOT EXISTS participant_consents (
  id              uuid PRIMARY KEY,
  participant_id  uuid        NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  type            text        NOT NULL,
  version         text        NOT NULL,
  accepted        boolean     NOT NULL,
  accepted_at     timestamptz,
  ip              text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participant_consents_type_check CHECK (
    type IN ('TERMOS_DE_USO', 'POLITICA_DE_PRIVACIDADE', 'COMUNICACAO_MARKETING')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS participant_consents_unique
  ON participant_consents (participant_id, type, version);
CREATE INDEX IF NOT EXISTS participant_consents_participant_idx ON participant_consents (participant_id);

-- Acesso do participante à própria área (identificação por e-mail + CPF).
CREATE TABLE IF NOT EXISTS participant_sessions (
  id              uuid PRIMARY KEY,
  participant_id  uuid        NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  token_hash      text        NOT NULL,
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS participant_sessions_token_unique ON participant_sessions (token_hash);
CREATE INDEX IF NOT EXISTS participant_sessions_participant_idx ON participant_sessions (participant_id);

-- Registro dos pedidos LGPD (consulta, exportação, correção, anonimização, exclusão).
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id              uuid PRIMARY KEY,
  participant_id  uuid        NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  type            text        NOT NULL,
  status          text        NOT NULL DEFAULT 'RECEBIDO',
  requested_at    timestamptz NOT NULL DEFAULT now(),
  fulfilled_at    timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_subject_requests_type_check CHECK (
    type IN ('CONSULTA', 'EXPORTACAO', 'CORRECAO', 'ANONIMIZACAO', 'EXCLUSAO')
  ),
  CONSTRAINT data_subject_requests_status_check CHECK (
    status IN ('RECEBIDO', 'EM_ANDAMENTO', 'CONCLUIDO', 'RECUSADO')
  )
);
