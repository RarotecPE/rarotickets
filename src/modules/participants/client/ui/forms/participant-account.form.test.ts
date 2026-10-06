import { describe, expect, it } from 'vitest';
import { validateLoginParticipantForm, validateRegisterParticipantForm } from './participant-account.form';
import type { LoginParticipantFormValues, RegisterParticipantFormValues } from './participant-account.form';

describe('validateRegisterParticipantForm', () => {
  it('normaliza os dados válidos para cadastro sem incluir a confirmação de senha', () => {
    const values: RegisterParticipantFormValues = {
      name: '  Ana   Silva  ',
      email: ' ANA@EXAMPLE.COM ',
      cpf: '529.982.247-25',
      password: 'senha-segura-123',
      confirmPassword: 'senha-segura-123',
    };
    const result = validateRegisterParticipantForm({ values });

    expect(result.errors).toEqual({});
    expect(result.payload).toEqual({
      name: 'Ana Silva',
      email: 'ana@example.com',
      cpf: '52998224725',
      password: 'senha-segura-123',
    });
  });

  it('exige confirmação igual e dados de cadastro válidos', () => {
    const values: RegisterParticipantFormValues = {
      name: 'A',
      email: 'email inválido',
      cpf: '111.111.111-11',
      password: 'curta',
      confirmPassword: 'diferente',
    };
    const result = validateRegisterParticipantForm({ values });

    expect(result.payload).toBeNull();
    expect(result.errors).toMatchObject({
      name: expect.any(String),
      email: expect.any(String),
      cpf: expect.any(String),
      password: expect.any(String),
      confirmPassword: expect.any(String),
    });
  });
});

describe('validateLoginParticipantForm', () => {
  it('aceita e normaliza e-mail e senha', () => {
    const values: LoginParticipantFormValues = { email: ' ANA@EXAMPLE.COM ', password: 'senha-segura-123' };
    const result = validateLoginParticipantForm({ values });

    expect(result.errors).toEqual({});
    expect(result.payload).toEqual({ email: 'ana@example.com', password: 'senha-segura-123' });
  });
});
