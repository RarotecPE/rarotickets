import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { ValidationError } from "@/@core/domain/errors/validation.error";

// ---------------------------------------------------------------------------
// CPF (brasileiro) ou passaporte (estrangeiro)
// ---------------------------------------------------------------------------
export type DocumentKind = "CPF" | "PASSAPORTE";
export type DocumentProps = { kind: DocumentKind; value: string };

export class Document extends ValueObject<DocumentProps> {
  private constructor(props: DocumentProps) {
    super(props);
  }

  get kind(): DocumentKind {
    return this.props.kind;
  }

  get value(): string {
    return this.props.value;
  }

  private static validateCpf(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;
    const dv1 = (() => {
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    })();
    const dv2 = (() => {
      let sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    })();
    return dv1 === parseInt(clean[9]) && dv2 === parseInt(clean[10]);
  }

  public static create(kind: DocumentKind, raw: string): Result<Document> {
    const value = raw.trim();
    if (!value) {
      return Result.fail(
        new ValidationError({ code: "DOC_REQUIRED", message: "Documento é obrigatório" }),
      );
    }
    if (kind === "CPF") {
      if (!this.validateCpf(value)) {
        return Result.fail(
          new ValidationError({ code: "CPF_INVALIDO", message: "CPF inválido" }),
        );
      }
      return Result.ok(new Document({ kind, value: value.replace(/\D/g, "") }));
    }
    if (value.length < 4) {
      return Result.fail(
        new ValidationError({ code: "PASS_INVALIDO", message: "Passaporte inválido" }),
      );
    }
    return Result.ok(new Document({ kind, value }));
  }

  public static reconstitute(kind: DocumentKind, value: string): Document {
    return new Document({ kind, value });
  }
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------
export type EmailValue = string;
export type EmailProps = { value: EmailValue };

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  private static isValid(email: EmailValue): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  public static create(email: EmailValue): Result<Email> {
    const normalized = (email || "").trim().toLowerCase();
    if (!normalized) {
      return Result.fail(
        new ValidationError({ code: "EMAIL_REQUIRED", message: "Email é obrigatório" }),
      );
    }
    if (!this.isValid(normalized)) {
      return Result.fail(
        new ValidationError({ code: "EMAIL_INVALIDO", message: "Formato de email inválido" }),
      );
    }
    if (normalized.length > 255) {
      return Result.fail(
        new ValidationError({ code: "EMAIL_LONGO", message: "Email muito longo" }),
      );
    }
    return Result.ok(new Email({ value: normalized }));
  }

  public static reconstitute(value: EmailValue): Email {
    return new Email({ value });
  }
}

// ---------------------------------------------------------------------------
// Nome curto
// ---------------------------------------------------------------------------
export type NameProps = { value: string };

export class Name extends ValueObject<NameProps> {
  private constructor(props: NameProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<Name> {
    const trimmed = (value || "").trim();
    if (!trimmed || trimmed.length < 2) {
      return Result.fail(
        new ValidationError({ code: "NOME_CURTO", message: "Nome deve ter pelo menos 2 caracteres" }),
      );
    }
    if (trimmed.length > 160) {
      return Result.fail(
        new ValidationError({ code: "NOME_LONGO", message: "Nome muito longo" }),
      );
    }
    return Result.ok(new Name({ value: trimmed }));
  }

  public static reconstitute(value: string): Name {
    return new Name({ value });
  }
}

// ---------------------------------------------------------------------------
// Valor monetário em centavos (inteiro) para evitar pontos flutuantes
// ---------------------------------------------------------------------------
export type MoneyProps = { cents: number };

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get cents(): number {
    return this.props.cents;
  }

  public static create(cents: number): Result<Money> {
    if (!Number.isInteger(cents) || cents < 0) {
      return Result.fail(
        new ValidationError({
          code: "VALOR_INVALIDO",
          message: "Valor monetário deve ser um inteiro não-negativo em centavos",
        }),
      );
    }
    return Result.ok(new Money({ cents }));
  }

  public static zero(): Money {
    return new Money({ cents: 0 });
  }

  public static reconstitute(cents: number): Money {
    return new Money({ cents });
  }

  public add(other: Money): Money {
    return new Money({ cents: this.cents + other.cents });
  }

  public subtractOrZero(other: Money): Money {
    return new Money({ cents: Math.max(0, this.cents - other.cents) });
  }

  public percent(rate: number): Money {
    return new Money({ cents: Math.round((this.cents * rate) / 100) });
  }

  public isZero(): boolean {
    return this.cents === 0;
  }
}

// ---------------------------------------------------------------------------
// Percentual
// ---------------------------------------------------------------------------
export type PercentProps = { value: number };

export class Percent extends ValueObject<PercentProps> {
  private constructor(props: PercentProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  public static create(value: number): Result<Percent> {
    if (value < 0 || value > 100) {
      return Result.fail(
        new ValidationError({
          code: "PERCENTUAL_INVALIDO",
          message: "Percentual deve estar entre 0 e 100",
        }),
      );
    }
    return Result.ok(new Percent({ value }));
  }

  public static reconstitute(value: number): Percent {
    return new Percent({ value });
  }
}

// ---------------------------------------------------------------------------
// Período de tempo (início/fim)
// ---------------------------------------------------------------------------
export type DateRangeProps = { startsAt: Date; endsAt: Date };

export class DateRange extends ValueObject<DateRangeProps> {
  private constructor(props: DateRangeProps) {
    super(props);
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }
  get endsAt(): Date {
    return this.props.endsAt;
  }

  public static create(startsAt: Date, endsAt: Date): Result<DateRange> {
    if (!(startsAt instanceof Date) || !(endsAt instanceof Date)) {
      return Result.fail(
        new ValidationError({ code: "DATA_INVALIDA", message: "Datas inválidas" }),
      );
    }
    if (endsAt.getTime() < startsAt.getTime()) {
      return Result.fail(
        new ValidationError({
          code: "PERIODO_INVALIDO",
          message: "Data de término deve ser maior ou igual à data de início",
        }),
      );
    }
    return Result.ok(new DateRange({ startsAt, endsAt }));
  }

  public static reconstitute(startsAt: Date, endsAt: Date): DateRange {
    return new DateRange({ startsAt, endsAt });
  }

  public contains(date: Date): boolean {
    return date.getTime() >= this.startsAt.getTime() && date.getTime() <= this.endsAt.getTime();
  }
}

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------
export type PhoneProps = { value: string };

export class Phone extends ValueObject<PhoneProps> {
  private constructor(props: PhoneProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(raw: string): Result<Phone> {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      return Result.fail(
        new ValidationError({ code: "TEL_INVALIDO", message: "Telefone inválido" }),
      );
    }
    return Result.ok(new Phone({ value: digits }));
  }

  public static reconstitute(value: string): Phone {
    return new Phone({ value });
  }
}
