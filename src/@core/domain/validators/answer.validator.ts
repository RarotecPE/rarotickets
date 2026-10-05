import { Result } from '../result';
import { isValidCnpj, isValidCpf, onlyDigits } from './document.validator';

export type AnswerFieldType =
  | 'TEXTO' | 'TEXTO_LONGO' | 'NUMERO' | 'DATA' | 'EMAIL' | 'TELEFONE'
  | 'CPF' | 'CNPJ' | 'SELECAO' | 'ESCOLHA_UNICA' | 'MULTIPLA_ESCOLHA' | 'SIM_NAO' | 'ARQUIVO';

export type ValidateAnswerParams = {
  label: string;
  fieldType: AnswerFieldType;
  options: string[];
  isRequired: boolean;
  value: string | null | undefined;
};

/**
 * Fonte única de verdade da validação das respostas do formulário,
 * compartilhada pelo domínio do evento e pelo fluxo de inscrições.
 */
export function validateAnswerValue(params: ValidateAnswerParams): Result<string | null> {
  const value = (params.value ?? '').toString().trim();

  if (!value) {
    if (params.isRequired) {
      return Result.fail(new Error(`O campo "${params.label}" é obrigatório`));
    }
    return Result.ok(null);
  }
  if (value.length > 5000) {
    return Result.fail(new Error(`O campo "${params.label}" excede o tamanho máximo`));
  }

  const invalid = (message: string) => Result.fail<string | null>(new Error(message));

  switch (params.fieldType) {
    case 'NUMERO':
      return Number.isNaN(Number(value)) ? invalid(`O campo "${params.label}" deve conter um número`) : Result.ok(value);
    case 'DATA':
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())
        ? Result.ok(value)
        : invalid(`O campo "${params.label}" deve conter uma data válida`);
    case 'EMAIL':
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
        ? Result.ok(value)
        : invalid(`O campo "${params.label}" deve conter um e-mail válido`);
    case 'TELEFONE': {
      const digits = onlyDigits(value);
      return digits.length === 10 || digits.length === 11
        ? Result.ok(digits)
        : invalid(`O campo "${params.label}" deve conter DDD + telefone`);
    }
    case 'CPF':
      return isValidCpf(value) ? Result.ok(onlyDigits(value)) : invalid(`O campo "${params.label}" deve conter um CPF válido`);
    case 'CNPJ':
      return isValidCnpj(value) ? Result.ok(onlyDigits(value)) : invalid(`O campo "${params.label}" deve conter um CNPJ válido`);
    case 'SELECAO':
    case 'ESCOLHA_UNICA':
      return params.options.includes(value)
        ? Result.ok(value)
        : invalid(`O campo "${params.label}" deve conter uma das opções disponíveis`);
    case 'MULTIPLA_ESCOLHA': {
      const selected = value.split('|').map((item) => item.trim()).filter(Boolean);
      const hasInvalid = selected.some((item) => !params.options.includes(item));
      return hasInvalid ? invalid(`O campo "${params.label}" contém opções inválidas`) : Result.ok(selected.join('|'));
    }
    case 'SIM_NAO':
      return ['SIM', 'NAO'].includes(value.toUpperCase())
        ? Result.ok(value.toUpperCase())
        : invalid(`O campo "${params.label}" deve ser Sim ou Não`);
    case 'ARQUIVO':
      return value.length <= 500 ? Result.ok(value) : invalid(`O campo "${params.label}" contém referência de arquivo inválida`);
    default:
      return Result.ok(value);
  }
}
