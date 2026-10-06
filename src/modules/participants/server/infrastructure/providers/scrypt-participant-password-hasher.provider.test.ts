import { describe, expect, it } from 'vitest';
import { ScryptParticipantPasswordHasher } from './scrypt-participant-password-hasher.provider';

describe('ScryptParticipantPasswordHasher', () => {
  it('armazena um hash com salt e valida somente a senha correspondente', async () => {
    const hasher = new ScryptParticipantPasswordHasher();
    const passwordHash = await hasher.hash({ password: 'senha-segura-123' });

    expect(passwordHash).toMatch(/^scrypt\$16384\$8\$1\$/);
    await expect(hasher.verify({ password: 'senha-segura-123', passwordHash })).resolves.toBe(true);
    await expect(hasher.verify({ password: 'senha-incorreta-123', passwordHash })).resolves.toBe(false);
  });

  it('recusa hashes ausentes ou malformados sem lançar erro', async () => {
    const hasher = new ScryptParticipantPasswordHasher();

    await expect(hasher.verify({ password: 'senha-segura-123', passwordHash: '' })).resolves.toBe(false);
    await expect(hasher.verify({ password: 'senha-segura-123', passwordHash: 'scrypt$invalido' })).resolves.toBe(false);
  });
});
