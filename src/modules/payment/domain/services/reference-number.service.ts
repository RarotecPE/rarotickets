/**
 * Deriva números estáveis e não sequenciais a partir de identificadores
 * internos (UUID). Usado para montar a referência `EVENTO-n-INSCRICAO-n` (§17)
 * sem expor a ordem real de criação no banco.
 */
export function referenceNumberFromId(id: string): number {
  const hex = id.replace(/[^0-9a-f]/gi, '').slice(-6);
  const parsed = Number.parseInt(hex || '1', 16);
  return (parsed % 900_000) + 1_000;
}
