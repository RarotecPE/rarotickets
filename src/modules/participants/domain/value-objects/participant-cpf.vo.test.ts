import { describe, expect, it } from 'vitest';
import { ParticipantCpf } from './participant-cpf.vo';

describe('ParticipantCpf', () => {
  it('normaliza um CPF válido e mascara sua visualização', () => {
    const result = ParticipantCpf.create('529.982.247-25');

    expect(result.isSuccess).toBe(true);
    expect(result.value.value).toBe('52998224725');
    expect(result.value.maskedValue).toBe('***.***.***-25');
  });

  it('rejeita dígitos verificadores inválidos e sequências repetidas', () => {
    const invalidChecksum = ParticipantCpf.create('529.982.247-24');
    const repeatedDigits = ParticipantCpf.create('111.111.111-11');
    const unexpectedCharacters = ParticipantCpf.create('ABC529.982.247-25');

    expect(invalidChecksum.isFailure).toBe(true);
    expect(repeatedDigits.isFailure).toBe(true);
    expect(unexpectedCharacters.isFailure).toBe(true);
  });
});
