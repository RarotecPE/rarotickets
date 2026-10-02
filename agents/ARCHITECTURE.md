# Architecture — Guia Completo de Arquitetura

> **Este documento é a fonte única de verdade para a arquitetura de todos os
> sistemas deste ecossistema. Todo agente de IA e todo desenvolvedor DEVE
> seguir estas regras à risca. Sem exceções.**

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Camada de Domínio](#3-camada-de-domínio)
4. [Camada de Aplicação](#4-camada-de-aplicação)
5. [Camada Server](#5-camada-server)
6. [Camada Client](#6-camada-client)
7. [Regras de Importação](#7-regras-de-importação)
8. [Isomorfismo](#8-isomorfismo)
9. [SOLID](#9-solid)
10. [Design Patterns](#10-design-patterns)
11. [Clean Code](#11-clean-code)
12. [Comunicação Client-Server](#12-comunicação-client-server)
13. [Criando Novos Módulos](#13-criando-novos-módulos)
14. [Anti-Patterns](#14-anti-patterns)
15. [Apêndice A: Glossário](#apêndice-a-glossário)
16. [Apêndice B: Resumo Visual Rápido](#apêndice-b-resumo-visual-rápido)

---

## 1. Visão Geral da Arquitetura

### 1.1 Filosofia

A arquitetura é baseada em **Clean Architecture** (Robert C. Martin) combinada com **Domain-Driven Design** (Eric Evans), adaptada para um contexto **full-stack isomórfico** onde o domínio é compartilhado entre client e server.

### 1.2 Princípios Fundamentais

- **O domínio é o coração**: Toda regra de negócio vive exclusivamente na
  camada de domínio. Nenhuma outra camada contém lógica de negócio.
- **O domínio é isomórfico**: O código de domínio roda tanto no client quanto
  no server. Ele possui zero dependências de runtime (nem Node.js, nem Browser,
  nem qualquer framework).
- **A regra de dependência é sagrada**: Camadas internas NUNCA conhecem camadas
  externas. A dependência sempre aponta para dentro (em direção ao domínio).
- **O client fala com o server via API**: A camada client nunca importa a
  camada server ou application diretamente. A comunicação é sempre via
  chamadas HTTP à API do próprio projeto.
- **Validação duplicada por design**: As mesmas validações de domínio rodam
  no client (para UX) e no server (para segurança). O código é o mesmo.

### 1.3 Diagrama de Camadas

```text
┌─────────────────────────────────────────────────────────────┐
│                    O DOMÍNIO É A VERDADE                    │
│                                                             │
│   ┌─────────────┐                        ┌───────────────┐  │
│   │   CLIENT     │                        │    SERVER     │  │
│   │              │                        │               │  │
│   │  UI Forms    │                        │  API Routes   │  │
│   │     │        │                        │      │        │  │
│   │     ▼        │                        │      ▼        │  │
│   │  Validação   │    MESMAS REGRAS       │  Validação    │  │
│   │  instantânea │◄─── DO DOMÍNIO ───────►│  segura       │  │
│   │  (UX)        │    (isomórfico)        │  (segurança)  │  │
│   │     │        │                        │      │        │  │
│   │     ▼        │                        │      ▼        │  │
│   │  API Client ─┼──── HTTP/Interno ──────┼─► Use Cases   │  │
│   │              │                        │      │        │  │
│   └─────────────┘                        │      ▼        │  │
│                                          │   Domain      │  │
│                                          │      │        │  │
│                                          │      ▼        │  │
│                                          │  Repository   │  │
│                                          │      │        │  │
│                                          │      ▼        │  │
│                                          │   Database    │  │
│                                          └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Agnosticismo de Stack

Esta arquitetura **não define** stack tecnológica. Cada sistema do ecossistema pode utilizar:

- **Linguagem:** TypeScript, JavaScript, ou outra (adaptando os conceitos)
- **Framework Server:** NestJS, Express, Fastify, Hono, Elysia, etc.
- **Framework Client:** React, Vue, Svelte, Angular, etc.
- **ORM/Database:** Prisma, TypeORM, Drizzle, Knex, Mongoose, etc.
- **Testes:** Jest, Vitest, Bun Test, etc.

O que **NÃO muda** entre sistemas é a estrutura de camadas, as regras de importação, os padrões de design e os princípios SOLID.

---

## 2. Estrutura de Pastas

### 2.1 Template Completo

```text
src/
│
├── @core/                              # BASE ISOMÓRFICA
│   ├── domain/
│   │   ├── entity.base
│   │   ├── value-object.base
│   │   ├── aggregate-root.base
│   │   ├── domain-service.base
│   │   ├── factory.base
│   │   ├── domain-event.base
│   │   ├── identifier
│   │   ├── result
│   │   ├── guard
│   │   └── errors/
│   │       ├── domain-error.base
│   │       ├── not-found.error
│   │       ├── conflict.error
│   │       └── validation.error
│   ├── application/
│   │   ├── application-service.base
│   │   ├── use-case.base
│   │   ├── mapper.base
│   │   ├── persistence-mapper.base
│   │   ├── use-case.interface
│   │   ├── dto.base
│   │   ├── mapper.interface
│   │   ├── pagination
│   │   └── events/
│   │       ├── event-handler.interface
│   │       └── event-bus.interface
│   └── types/
│       ├── primitives
│       └── nullable
│
├── modules/                            # BOUNDED CONTEXTS
│   └── [nome-do-modulo]/
│       ├── domain/                     # 🟢 ISOMÓRFICO
│       │   ├── entities/
│       │   ├── value-objects/
│       │   ├── aggregates/
│       │   ├── events/
│       │   ├── services/
│       │   ├── repositories/
│       │   ├── factories/
│       │   └── errors/
│       ├── application/                # 🟡 USE CASES
│       │   ├── use-cases/
│       │   │   └── [nome-da-acao]/
│       │   │       ├── [nome-da-acao].use-case
│       │   │       ├── [nome-da-acao].input.dto
│       │   │       └── [nome-da-acao].output.dto
│       │   ├── mappers/
│       │   └── services/
│       ├── server/                     # 🔴 BACK-END ONLY
│       │   ├── infrastructure/
│       │   │   ├── persistence/
│       │   │   │   ├── repositories/
│       │   │   │   ├── models/
│       │   │   │   └── mappers/
│       │   │   ├── providers/
│       │   │   └── events/
│       │   └── api/
│       │       ├── controllers/
│       │       ├── routes/
│       │       ├── middlewares/
│       │       └── dtos/
│       └── client/                     # 🔵 FRONT-END ONLY
│           ├── ui/
│           │   ├── components/
│           │   ├── pages/
│           │   └── forms/
│           ├── services/
│           └── state/
│
├── shared/                             # UTILITÁRIOS ISOMÓRFICOS
│   ├── utils/
│   ├── constants/
│   └── types/
│
├── server/                             # CONFIG GLOBAL DO SERVER
│   ├── api/
│   │   └── controller.base
│   ├── config/
│   ├── bootstrap/
│   ├── middlewares/
│   └── di/
│
└── client/                             # CONFIG GLOBAL DO CLIENT
    ├── services/
    │   └── api-service.base
    ├── config/
    ├── bootstrap/
    ├── layouts/
    ├── routing/
    └── providers/
```

### 2.2 Regras de Nomenclatura de Pastas

| Tipo     | Convenção                  | Exemplo                         |
| -------- | -------------------------- | ------------------------------- |
| Pastas   | `kebab-case`               | `value-objects/`, `use-cases/`  |
| Módulos  | `kebab-case` singular      | `user/`, `order/`, `product/`   |
| Arquivos | `kebab-case.tipo.extensão` | `user.entity.ts`, `email.vo.ts` |

### 2.3 Sufixos de Arquivo Obrigatórios

| Sufixo          | Uso                                | Exemplo                        |
| --------------- | ---------------------------------- | ------------------------------ |
| `.entity`       | Entidades de domínio               | `user.entity.ts`               |
| `.vo`           | Value Objects                      | `email.vo.ts`                  |
| `.aggregate`    | Aggregate Roots                    | `order.aggregate.ts`           |
| `.event`        | Domain Events                      | `user-created.event.ts`        |
| `.error`        | Erros de domínio                   | `user-not-found.error.ts`      |
| `.use-case`     | Use Cases                          | `create-user.use-case.ts`      |
| `.input.dto`    | DTOs de entrada                    | `create-user.input.dto.ts`     |
| `.output.dto`   | DTOs de saída                      | `create-user.output.dto.ts`    |
| `.request.dto`  | DTOs de request HTTP               | `create-user.request.dto.ts`   |
| `.response.dto` | DTOs de response HTTP              | `user.response.dto.ts`         |
| `.mapper`       | Mappers                            | `user.mapper.ts`               |
| `.repository`   | Implementação de repositório       | `user.repository.impl.ts`      |
| `.interface`    | Interfaces de repositório          | `user-repository.interface.ts` |
| `.model`        | Modelos de persistência/ORM        | `user.model.ts`                |
| `.provider`     | Providers de infraestrutura        | `hash.provider.ts`             |
| `.controller`   | Controllers HTTP                   | `user.controller.ts`           |
| `.routes`       | Rotas HTTP                         | `user.routes.ts`               |
| `.middleware`   | Middlewares                        | `auth.middleware.ts`           |
| `.service`      | Services (application ou client)   | `user-api.service.ts`          |
| `.store`        | State management                   | `user.store.ts`                |
| `.component`    | Componentes UI                     | `user-card.component.ts`       |
| `.page`         | Páginas                            | `user-list.page.ts`            |
| `.form`         | Formulários                        | `create-user.form.ts`          |
| `.factory`      | Factories de domínio               | `user.factory.ts`              |
| `.config`       | Configurações                      | `database.config.ts`           |
| `.util`         | Utilitários                        | `date.util.ts`                 |
| `.types`        | Types de parâmetros e dependências | `create-user.types.ts`         |
| `.base`         | Classes base abstratas             | `entity.base.ts`               |

### 2.4 Classes Abstratas Obrigatórias

Toda classe com um papel arquitetural DEVE herdar, direta ou indiretamente, de uma classe abstrata que defina esse papel. Implementar uma interface preserva o contrato de integração, mas não substitui essa herança.

| Papel                 | Classe abstrata                                                | Local da base                                                            |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Entity                | `Entity<Props>`                                                | `@core/domain/entity.base.ts`                                            |
| Aggregate Root        | `AggregateRoot<Props>` → `Entity<Props>`                       | `@core/domain/aggregate-root.base.ts`                                    |
| Value Object          | `ValueObject<Props>`                                           | `@core/domain/value-object.base.ts`                                      |
| Domain Event          | `DomainEvent`                                                  | `@core/domain/domain-event.base.ts`                                      |
| Erro de domínio       | `DomainError` → `Error`                                        | `@core/domain/errors/domain-error.base.ts`                               |
| Domain Service        | `DomainService<Input, Output>`                                 | `@core/domain/domain-service.base.ts`                                    |
| Factory dedicada      | `Factory<Input, Output>`                                       | `@core/domain/factory.base.ts`                                           |
| Application Service   | `ApplicationService<Input, Output>`                            | `@core/application/application-service.base.ts`                          |
| Use Case              | `UseCase<Input, Output>` → `ApplicationService<Input, Output>` | `@core/application/use-case.base.ts`                                     |
| Mapper                | `Mapper<Input, Output>`                                        | `@core/application/mapper.base.ts`                                       |
| Persistence Mapper    | `PersistenceMapper<Domain, Model, Data>`                       | `@core/application/persistence-mapper.base.ts`                           |
| Repository concreto   | Base específica, como `UserRepository`                         | `modules/[modulo]/domain/repositories/user-repository.base.ts`           |
| Provider concreto     | Base específica, como `HashProvider`                           | `modules/[modulo]/server/infrastructure/providers/hash-provider.base.ts` |
| Controller            | `Controller<Request, Response>`                                | `server/api/controller.base.ts`                                          |
| API Service do client | `ApiService`                                                   | `client/services/api-service.base.ts`                                    |

As bases devem definir operações abstratas ou comportamentos compartilhados reais. Não crie bases vazias apenas para marcar categorias. Use construtores `protected` nas bases e composição para as dependências. Bases especializadas podem herdar das bases comuns.

Bases em `@core/domain/` e `@core/application/` permanecem isomórficas. Bases que dependem de HTTP, banco, browser ou bibliotecas de infraestrutura ficam no respectivo `server/` ou `client/`. O domínio nunca importa bases da aplicação.

A obrigação se aplica a classes com papéis arquiteturais. Types, interfaces, funções de UI, utilitários como `Result` e `Identifier` e modelos definidos pelo ORM não precisam de herança artificial. Classes de UI seguem os contratos do framework.

### 2.5 Types Nomeados para Parâmetros

1. **Todo construtor, método ou função com parâmetros DEVE usar types nomeados**. Nunca declare estruturas de objetos, uniões ou assinaturas de callbacks diretamente na lista de parâmetros.
2. **Use `type` para parâmetros e dependências**: `UserProps`, `UserConstructorParams`, `CreateUserParams`, `CreateUserDependencies`, `ChangeUserNameParams`. DTOs de entrada também são types nomeados.
3. **Construtores recebem um único type de propriedades ou dependências**. Declare os atributos no corpo da classe e atribua-os no construtor; nunca declare propriedades com `private`, `protected`, `public` ou `readonly` na lista de parâmetros.
4. **Métodos com múltiplos dados recebem um objeto com type nomeado**. Para um único valor, use um type semântico, como `type EmailValue = string`. Types já existentes, classes do domínio usadas como tipos e tipos genéricos nomeados (`Props`, `Input`, `T`) também são válidos; reutilize-os em vez de criar aliases redundantes.
5. **Callbacks possuem um type próprio**, incluindo seus parâmetros. Desestruturação é permitida quando utiliza um type nomeado: `constructor({ props, id }: UserConstructorParams)`.
6. **Declare types antes da classe** ou em arquivo `.types.ts` ao lado dela. Exporte apenas contratos consumidos por outros arquivos e respeite as regras de importação da camada proprietária. Não centralize types de negócio em `shared/`.
7. **Interfaces continuam definindo contratos de comportamento**, como `IUserRepository`; estruturas de parâmetros e DTOs usam `type`.
8. **Métodos sem parâmetros continuam sem argumentos**. Objetos literais nas chamadas (`User.create({ ... })`) são permitidos; a proibição é definir a tipagem inline na assinatura.

---

## 3. Camada de Domínio

> **A camada mais importante. Contém TODA a lógica de negócio. É isomórfica.
> Possui ZERO dependências externas.**

### 3.1 Regras Absolutas do Domínio

1. **Nenhum import de frameworks**, bibliotecas de I/O, ou código de
   infraestrutura.
2. **Nenhum import de `server/`, `client/`, ou `application/`**.
3. **Apenas imports de `@core/`** (base classes) e de **outros arquivos do
   mesmo módulo de domínio**.
4. **Toda validação de regra de negócio** acontece aqui.
5. **Entidades não são anêmicas**: possuem comportamentos, não apenas getters
   e setters.
6. **Value Objects são imutáveis**: uma vez criados, não mudam.
7. **Agregados protegem invariantes**: garantem consistência do grupo.
8. **Erros são tipados**: cada erro de domínio é uma classe específica.
9. **Nunca lance exceptions para erros de negócio**: use o `Result<T, E>`.
10. **Factories encapsulam criação complexa**: use métodos estáticos `create()`
    nas entidades ou classes Factory dedicadas.
11. **Classes de domínio herdam da base abstrata de seu papel** e usam types nomeados para propriedades, construtores e métodos.

### 3.2 Entity Base

```typescript
// @core/domain/entity.base.ts
import { Identifier } from './identifier';

export type EntityConstructorParams<Props> = { props: Props; id?: Identifier };
export type EntityEqualsParams<Props> = { entity?: Entity<Props> };

export abstract class Entity<Props> {
  protected readonly _id: Identifier;
  protected readonly props: Props;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  protected constructor(params: EntityConstructorParams<Props>) {
    this._id = params.id ?? Identifier.create();
    this.props = params.props;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  get id(): Identifier { return this._id; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  public equals({ entity }: EntityEqualsParams<Props>): boolean {
    if (!entity || !(entity instanceof Entity)) return false;
    return this._id.equals(entity._id);
  }
}
```

### 3.3 Value Object Base

```typescript
// @core/domain/value-object.base.ts
export type ValueObjectEqualsParams<Props> = { vo?: ValueObject<Props> };

export abstract class ValueObject<Props> {
  protected readonly props: Props;

  protected constructor(props: Props) {
    this.props = Object.freeze(props); // Imutável!
  }

  public equals({ vo }: ValueObjectEqualsParams<Props>): boolean {
    if (!vo) return false;
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
```

### 3.4 Aggregate Root Base

```typescript
// @core/domain/aggregate-root.base.ts
import { Entity } from './entity.base';
import { DomainEvent } from './domain-event.base';

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
```

### 3.5 Result Pattern

```typescript
// @core/domain/result.ts
export type ResultConstructorParams<T, E> = { isSuccess: boolean; value?: T; error?: E };

export class Result<T, E = Error> {
  private readonly _isSuccess: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(params: ResultConstructorParams<T, E>) {
    this._isSuccess = params.isSuccess;
    this._value = params.value;
    this._error = params.error;
  }

  get isSuccess(): boolean { return this._isSuccess; }
  get isFailure(): boolean { return !this._isSuccess; }

  get value(): T {
    if (this.isFailure) throw new Error('Cannot get value of a failed result');
    return this._value as T;
  }

  get error(): E {
    if (this.isSuccess) throw new Error('Cannot get error of a successful result');
    return this._error as E;
  }

  public static ok<T>(value?: T): Result<T> {
    return new Result<T, Error>({ isSuccess: true, value });
  }

  public static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>({ isSuccess: false, error });
  }
}
```

### 3.6 Exemplo Completo: Value Object

```typescript
// modules/user/domain/value-objects/email.vo.ts
import { ValueObject } from '@core/domain/value-object.base';
import { Result } from '@core/domain/result';

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
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      return Result.fail(new Error('Email é obrigatório'));
    }
    if (!this.isValid(normalized)) {
      return Result.fail(new Error('Formato de email inválido'));
    }
    if (normalized.length > 255) {
      return Result.fail(new Error('Email muito longo'));
    }

    return Result.ok(new Email({ value: normalized }));
  }

  // Use somente para dados confiáveis, já validados na persistência.
  public static reconstitute(value: EmailValue): Email {
    return new Email({ value });
  }
}
```

### 3.7 Exemplo Completo: Entity com Comportamento

```typescript
// modules/user/domain/entities/user.entity.ts
import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { Email } from '../value-objects/email.vo';
import { UserName } from '../value-objects/user-name.vo';
import { UserCreatedEvent } from '../events/user-created.event';

export type UserProps = {
  name: UserName;
  email: Email;
  passwordHash: string;
  isActive: boolean;
};
export type UserConstructorParams = EntityConstructorParams<UserProps>;
export type CreateUserParams = { name: string; email: string; passwordHash: string };
export type ReconstituteUserParams = UserConstructorParams & {
  id: NonNullable<UserConstructorParams['id']>;
};
export type ChangeUserNameParams = { name: string };

export class User extends AggregateRoot<UserProps> {
  private constructor(params: UserConstructorParams) {
    super(params);
  }

  get name(): UserName { return this.props.name; }
  get email(): Email { return this.props.email; }
  get isActive(): boolean { return this.props.isActive; }
  get passwordHash(): string { return this.props.passwordHash; }

  public static create(params: CreateUserParams): Result<User> {
    const nameResult = UserName.create(params.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    const emailResult = Email.create(params.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);
    const user = new User({ props: {
      name: nameResult.value,
      email: emailResult.value,
      passwordHash: params.passwordHash,
      isActive: true,
    } });
    user.addDomainEvent(new UserCreatedEvent({
      userId: user.id.toString(), email: user.email.value,
    }));
    return Result.ok(user);
  }

  // Reconstituição de dados confiáveis, sem emitir eventos de criação.
  public static reconstitute(params: ReconstituteUserParams): User {
    return new User(params);
  }

  public deactivate(): Result<void> {
    if (!this.props.isActive) {
      return Result.fail(new Error('Usuário já está inativo'));
    }
    this.props.isActive = false;
    this.touch();
    return Result.ok();
  }

  public changeName(params: ChangeUserNameParams): Result<void> {
    const nameResult = UserName.create(params.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    this.props.name = nameResult.value;
    this.touch();
    return Result.ok();
  }
}
```

### 3.8 Exemplo: Domain Event

```typescript
// @core/domain/domain-event.base.ts
export type DomainEventConstructorParams = { name: string };

export abstract class DomainEvent {
  public readonly name: string;
  public readonly occurredAt: Date;

  protected constructor(params: DomainEventConstructorParams) {
    this.name = params.name;
    this.occurredAt = new Date();
  }
}

// modules/user/domain/events/user-created.event.ts
import { DomainEvent } from '@core/domain/domain-event.base';

export type UserCreatedEventParams = { userId: string; email: string };

export class UserCreatedEvent extends DomainEvent {
  public readonly userId: string;
  public readonly email: string;

  constructor(params: UserCreatedEventParams) {
    super({ name: 'user.created' });
    this.userId = params.userId;
    this.email = params.email;
  }
}
```

### 3.9 Exemplo: Erro de Domínio Tipado

```typescript
// @core/domain/errors/domain-error.base.ts
export type DomainErrorParams = { message: string; code: string };

export abstract class DomainError extends Error {
  public readonly code: string;

  protected constructor(params: DomainErrorParams) {
    super(params.message);
    this.code = params.code;
  }
}

// @core/domain/errors/not-found.error.ts
import { DomainError } from './domain-error.base';
import type { DomainErrorParams } from './domain-error.base';

export abstract class NotFoundError extends DomainError {
  protected constructor(params: DomainErrorParams) {
    super(params);
  }
}

// modules/user/domain/errors/user-not-found.error.ts
import { NotFoundError } from '@core/domain/errors/not-found.error';

export type UserNotFoundErrorParams = { userId: string };

export class UserNotFoundError extends NotFoundError {
  constructor(params: UserNotFoundErrorParams) {
    super({
      message: `Usuário com ID "${params.userId}" não encontrado`,
      code: 'USER_NOT_FOUND',
    });
    this.name = 'UserNotFoundError';
  }
}
```

### 3.10 Exemplo: Interface de Repository

```typescript
// modules/user/domain/repositories/user-repository.interface.ts
import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';

export type UserId = string;

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
  exists(email: Email): Promise<boolean>;
}

// Token para injeção de dependência
export const USER_REPOSITORY = Symbol('IUserRepository');

// modules/user/domain/repositories/user-repository.base.ts
// Importe User, Email, UserId e IUserRepository dos contratos do domínio.
export abstract class UserRepository implements IUserRepository {
  abstract findById(id: UserId): Promise<User | null>;
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract save(user: User): Promise<void>;
  abstract update(user: User): Promise<void>;
  abstract delete(id: UserId): Promise<void>;
  abstract exists(email: Email): Promise<boolean>;
}
```

**IMPORTANTE:** A interface de repositório vive no `domain/`, mas a **implementação** vive no `server/infrastructure/`. O domínio define o contrato, a infraestrutura cumpre.

### 3.11 Bases de Domain Service e Factory

```typescript
// @core/domain/domain-service.base.ts
import { Result } from './result';

export abstract class DomainService<Input, Output> {
  abstract execute(params: Input): Result<Output>;
}

// @core/domain/factory.base.ts
import { Result } from './result';

export abstract class Factory<Input, Output> {
  abstract create(params: Input): Result<Output>;
}
```

Domain Services concentram regras que envolvem múltiplas entidades ou Value Objects. Factories dedicadas implementam `create()` como método de instância. O Factory Method estático de uma Entity continua permitido, pois a própria Entity já herda de uma base abstrata.

### 3.12 Exemplo: Domain Service com Parâmetros Nomeados

```typescript
import { DomainService } from '@core/domain/domain-service.base';
import { Result } from '@core/domain/result';

type CalculatePriceParams = { quantity: number; unitPrice: number };
type CalculatedPrice = { total: number };

export class CalculatePriceService extends DomainService<CalculatePriceParams, CalculatedPrice> {
  execute(params: CalculatePriceParams): Result<CalculatedPrice> {
    if (params.quantity <= 0 || params.unitPrice < 0) {
      return Result.fail(new Error('Quantidade ou preço inválido'));
    }
    return Result.ok({ total: params.quantity * params.unitPrice });
  }
}
```

---

## 4. Camada de Aplicação

> **Orquestra os casos de uso. Chama o domínio e os repositórios.
> Não contém lógica de negócio — apenas coordenação.**

### 4.1 Regras da Camada de Aplicação

1. **Um Use Case = Uma ação do usuário**. Nunca agrupe múltiplas ações.
2. **Use Cases herdam de `UseCase<Input, Output>`**, que herda de `ApplicationService<Input, Output>` e implementa `IUseCase<Input, Output>`.
3. **Use Cases recebem e retornam DTOs**, nunca entidades diretamente para
   fora da camada.
4. **Use Cases dependem de interfaces** (repositórios, providers), nunca de
   implementações concretas.
5. **Use Cases retornam `Result<T, E>`**, não lançam exceptions para erros
   de negócio.
6. **Mappers herdam de `Mapper<Input, Output>`** e convertem entre Entidades de domínio e DTOs.
7. **Application Services herdam de `ApplicationService<Input, Output>`** e orquestram operações sem regras de negócio. Construtores usam types de dependências nomeados.

### 4.2 Contratos e Classes Base de Aplicação

```typescript
// @core/application/use-case.interface.ts
import { Result } from '@core/domain/result';

export interface IUseCase<Input, Output> {
  execute(input: Input): Promise<Result<Output>>;
}

// @core/application/application-service.base.ts
import { Result } from '@core/domain/result';

export abstract class ApplicationService<Input, Output> {
  abstract execute(input: Input): Promise<Result<Output>>;
}

// @core/application/use-case.base.ts
import { ApplicationService } from './application-service.base';
import type { IUseCase } from './use-case.interface';

export abstract class UseCase<Input, Output>
  extends ApplicationService<Input, Output>
  implements IUseCase<Input, Output> {}
```

### 4.3 Exemplo Completo: Use Case

```typescript
// modules/user/application/use-cases/create-user/create-user.use-case.ts
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user-repository.interface';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import type { IHashProvider } from '../../../domain/services/hash-provider.interface';
import { CreateUserInputDto } from './create-user.input.dto';
import { CreateUserOutputDto } from './create-user.output.dto';

export type CreateUserDependencies = {
  userRepository: IUserRepository;
  hashProvider: IHashProvider;
};

export class CreateUserUseCase
  extends UseCase<CreateUserInputDto, CreateUserOutputDto>
{
  private readonly userRepository: IUserRepository;
  private readonly hashProvider: IHashProvider;

  constructor(dependencies: CreateUserDependencies) {
    super();
    this.userRepository = dependencies.userRepository;
    this.hashProvider = dependencies.hashProvider;
  }

  async execute(input: CreateUserInputDto): Promise<Result<CreateUserOutputDto>> {
    // 1. Verificar duplicidade
    const emailResult = Email.create(input.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);

    const exists = await this.userRepository.exists(emailResult.value);
    if (exists) return Result.fail(new Error('Email já cadastrado'));

    // 2. Hash da senha (infraestrutura via interface)
    const passwordHash = await this.hashProvider.hash({ plain: input.password });

    // 3. Criar entidade (validações no domínio)
    const userResult = User.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    if (userResult.isFailure) return Result.fail(userResult.error);

    // 4. Persistir
    await this.userRepository.save(userResult.value);

    // 5. Retornar DTO de saída
    return Result.ok({
      id: userResult.value.id.toString(),
      name: userResult.value.name.value,
      email: userResult.value.email.value,
      createdAt: userResult.value.createdAt,
    });
  }
}
```

### 4.4 DTOs de Input e Output

```typescript
// modules/user/application/use-cases/create-user/create-user.input.dto.ts
export type CreateUserInputDto = {
  name: string;
  email: string;
  password: string;
};

// modules/user/application/use-cases/create-user/create-user.output.dto.ts
export type CreateUserOutputDto = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};
```

### 4.5 Mapper de Aplicação

```typescript
// @core/application/mapper.base.ts
export abstract class Mapper<Input, Output> {
  abstract map(input: Input): Output;
}

// modules/user/application/mappers/user.mapper.ts
import { Mapper } from '@core/application/mapper.base';
import type { User } from '../../domain/entities/user.entity';
import type { CreateUserOutputDto } from '../use-cases/create-user/create-user.output.dto';

export type MapUserParams = { user: User };

export class UserMapper extends Mapper<MapUserParams, CreateUserOutputDto> {
  public map({ user }: MapUserParams): CreateUserOutputDto {
    return {
      id: user.id.toString(),
      name: user.name.value,
      email: user.email.value,
      createdAt: user.createdAt,
    };
  }
}
```

### 4.6 Exemplo: Application Service com Dependências Nomeadas

```typescript
// modules/user/application/services/load-user.service.ts
import { ApplicationService } from '@core/application/application-service.base';
import { Result } from '@core/domain/result';
import type { IUserRepository, UserId } from '../../domain/repositories/user-repository.interface';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import { UserMapper } from '../mappers/user.mapper';
import type { CreateUserOutputDto } from '../use-cases/create-user/create-user.output.dto';

type LoadUserParams = { id: UserId };
type LoadUserDependencies = { userRepository: IUserRepository; mapper: UserMapper };

export class LoadUserService extends ApplicationService<LoadUserParams, CreateUserOutputDto> {
  private readonly userRepository: IUserRepository;
  private readonly mapper: UserMapper;

  constructor(dependencies: LoadUserDependencies) {
    super();
    this.userRepository = dependencies.userRepository;
    this.mapper = dependencies.mapper;
  }

  async execute(params: LoadUserParams): Promise<Result<CreateUserOutputDto>> {
    const user = await this.userRepository.findById(params.id);
    if (!user) return Result.fail(new UserNotFoundError({ userId: params.id }));
    return Result.ok(this.mapper.map({ user }));
  }
}
```

Este serviço coordena busca, tratamento de ausência e mapeamento para reutilização por casos de uso. As regras de negócio continuam no domínio. Em um projeto real, um DTO de leitura pode ter um type próprio; aqui o exemplo reutiliza o DTO com os mesmos campos.

---

## 5. Camada Server

> **Tudo que é exclusivo do back-end: API HTTP, persistência, providers
> de infraestrutura, eventos de domínio.**

### 5.1 Regras da Camada Server

1. **Controllers herdam de `Controller<Request, Response>` e são finos**: apenas recebem request, chamam Use Case,
   retornam response. Zero lógica de negócio.
2. **Repositories herdam de bases abstratas do domínio que implementam suas interfaces**: a interface está no
   `domain/`, a implementação está aqui.
3. **Providers abstraem serviços externos**: hash, email, storage, etc.
   Sempre com interface no domínio, base abstrata no server e implementação que herda dessa base.
4. **Models de persistência são separados das Entities**: o schema do banco
   NÃO é a entidade de domínio. Use mappers para converter.
5. **DTOS de request/response HTTP são diferentes dos DTOs de Use Case**:
   o request DTO valida formato HTTP, o Use Case DTO é o contrato da ação.

### 5.2 Exemplo: Controller

```typescript
// server/api/controller.base.ts
export abstract class Controller<Request, Response> {
  abstract handle(request: Request): Promise<Response>;
}

// modules/user/server/api/controllers/user.controller.ts
import { Controller } from '@/server/api/controller.base';
import type { IUseCase } from '@core/application/use-case.interface';
import type { CreateUserInputDto } from '../../../application/use-cases/create-user/create-user.input.dto';
import type { CreateUserOutputDto } from '../../../application/use-cases/create-user/create-user.output.dto';
// CreateUserRequestDto e HttpResponse são contratos HTTP da camada server.

export type UserControllerDependencies = {
  createUserUseCase: IUseCase<CreateUserInputDto, CreateUserOutputDto>;
};

export class UserController extends Controller<CreateUserRequestDto, HttpResponse> {
  private readonly createUserUseCase: IUseCase<CreateUserInputDto, CreateUserOutputDto>;

  constructor(dependencies: UserControllerDependencies) {
    super();
    this.createUserUseCase = dependencies.createUserUseCase;
  }

  async handle(request: CreateUserRequestDto): Promise<HttpResponse> {
    const result = await this.createUserUseCase.execute({
      name: request.name,
      email: request.email,
      password: request.password,
    });
    if (result.isFailure) return HttpResponse.badRequest(result.error.message);
    return HttpResponse.created(result.value);
  }
}
```

### 5.3 Exemplo: Repository Implementation

```typescript
// modules/user/server/infrastructure/persistence/repositories/user.repository.impl.ts
import { UserRepository } from '../../../../domain/repositories/user-repository.base';
import type { UserId } from '../../../../domain/repositories/user-repository.interface';
import { User } from '../../../../domain/entities/user.entity';
import { Email } from '../../../../domain/value-objects/email.vo';
import { UserPersistenceMapper } from '../mappers/user-persistence.mapper';

export type UserRepositoryDependencies = {
  db: DatabaseClient;
  mapper: UserPersistenceMapper;
};

export class UserRepositoryImpl extends UserRepository {
  private readonly db: DatabaseClient;
  private readonly mapper: UserPersistenceMapper;

  constructor(dependencies: UserRepositoryDependencies) {
    super();
    this.db = dependencies.db;
    this.mapper = dependencies.mapper;
  }

  async findById(id: UserId): Promise<User | null> {
    const record = await this.db.user.findUnique({ where: { id } });
    if (!record) return null;
    return this.mapper.toDomain({ record });
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.db.user.findUnique({
      where: { email: email.value },
    });
    if (!record) return null;
    return this.mapper.toDomain({ record });
  }

  async save(user: User): Promise<void> {
    const data = this.mapper.toPersistence({ entity: user });
    await this.db.user.create({ data });
  }

  async update(user: User): Promise<void> {
    const data = this.mapper.toPersistence({ entity: user });
    await this.db.user.update({
      where: { id: user.id.toString() },
      data,
    });
  }

  async delete(id: UserId): Promise<void> {
    await this.db.user.delete({ where: { id } });
  }

  async exists(email: Email): Promise<boolean> {
    const count = await this.db.user.count({
      where: { email: email.value },
    });
    return count > 0;
  }
}
```

### 5.4 Exemplo: Persistence Mapper

```typescript
// @core/application/persistence-mapper.base.ts
export type ToDomainParams<Model> = { record: Model };
export type ToPersistenceParams<Domain> = { entity: Domain };

export abstract class PersistenceMapper<Domain, Model, Data> {
  abstract toDomain(params: ToDomainParams<Model>): Domain;
  abstract toPersistence(params: ToPersistenceParams<Domain>): Data;
}

// modules/user/server/infrastructure/persistence/mappers/user-persistence.mapper.ts
import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { User } from '../../../../domain/entities/user.entity';
import { Email } from '../../../../domain/value-objects/email.vo';
import { UserName } from '../../../../domain/value-objects/user-name.vo';
// UserModel e UserModelData pertencem à infraestrutura de persistência.

export type UserToDomainParams = ToDomainParams<UserModel>;
export type UserToPersistenceParams = ToPersistenceParams<User>;

export class UserPersistenceMapper extends PersistenceMapper<User, UserModel, UserModelData> {
  toDomain({ record }: UserToDomainParams): User {
    return User.reconstitute({
      props: {
        name: UserName.reconstitute(record.name),
        email: Email.reconstitute(record.email),
        passwordHash: record.passwordHash,
        isActive: record.isActive,
      },
      id: Identifier.fromExisting(record.id),
    });
  }

  toPersistence({ entity: user }: UserToPersistenceParams): UserModelData {
    return {
      id: user.id.toString(),
      name: user.name.value,
      email: user.email.value,
      passwordHash: user.passwordHash,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
```

### 5.5 Exemplo: Provider com Interface

```typescript
// modules/user/domain/services/hash-provider.interface.ts
export type HashParams = { plain: string };
export type CompareHashParams = { plain: string; hashed: string };

export interface IHashProvider {
  hash(params: HashParams): Promise<string>;
  compare(params: CompareHashParams): Promise<boolean>;
}

export const HASH_PROVIDER = Symbol('IHashProvider');

// modules/user/server/infrastructure/providers/hash-provider.base.ts
import type {
  IHashProvider, HashParams, CompareHashParams,
} from '../../../domain/services/hash-provider.interface';

export abstract class HashProvider implements IHashProvider {
  abstract hash(params: HashParams): Promise<string>;
  abstract compare(params: CompareHashParams): Promise<boolean>;
}

// modules/user/server/infrastructure/providers/hash.provider.ts
import { HashProvider } from './hash-provider.base';
import type { HashParams, CompareHashParams } from '../../../domain/services/hash-provider.interface';

export interface IHashDriver {
  hash(params: HashParams): Promise<string>;
  compare(params: CompareHashParams): Promise<boolean>;
}
export type HashProviderDependencies = { driver: IHashDriver };

export class BcryptHashProvider extends HashProvider {
  private readonly driver: IHashDriver;

  constructor(dependencies: HashProviderDependencies) {
    super();
    this.driver = dependencies.driver;
  }

  async hash(params: HashParams): Promise<string> {
    return this.driver.hash(params);
  }

  async compare(params: CompareHashParams): Promise<boolean> {
    return this.driver.compare(params);
  }
}
```

---

## 6. Camada Client

> **Tudo que é exclusivo do front-end: componentes UI, páginas, formulários,
> services de API, gerenciamento de estado.**

### 6.1 Regras da Camada Client

1. **Nunca importe de `server/` ou `application/`**. A comunicação é via API.
2. **SEMPRE importe Value Objects do `domain/`** para validação de formulários.
3. **Components são puros e reutilizáveis**: recebem props, emitem eventos.
4. **Pages orquestram components**: buscam dados, passam para components.
5. **Forms encapsulam validação**: usam VOs do domínio para validar antes de
   enviar.
6. **Services de API herdam de `ApiService` e são a única ponte com o server**: encapsulam chamadas
   HTTP.
7. **State é local ao módulo**: cada módulo gerencia seu próprio estado.

### 6.2 Exemplo: Validação de Formulário com VOs do Domínio

```typescript
// modules/user/client/ui/forms/create-user.form.ts
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { UserName } from '../../../domain/value-objects/user-name.vo';

export type FormErrors = { name?: string; email?: string; password?: string };
export type ValidateCreateUserFormParams = { name: string; email: string; password: string };
export type ValidateCreateUserFormResult = { isValid: boolean; errors: FormErrors };

export function validateCreateUserForm(data: ValidateCreateUserFormParams): ValidateCreateUserFormResult {
  const errors: FormErrors = {};
  const nameResult = UserName.create(data.name);
  if (nameResult.isFailure) errors.name = nameResult.error.message;
  const emailResult = Email.create(data.email);
  if (emailResult.isFailure) errors.email = emailResult.error.message;
  const passwordResult = Password.create(data.password);
  if (passwordResult.isFailure) errors.password = passwordResult.error.message;
  return { isValid: Object.keys(errors).length === 0, errors };
}
```

### 6.3 Exemplo: API Service do Client

```typescript
// client/services/api-service.base.ts
// HttpClient é um contrato de transporte definido no client.
export type ApiServiceDependencies = { httpClient: HttpClient };

export abstract class ApiService {
  protected readonly httpClient: HttpClient;

  protected constructor(dependencies: ApiServiceDependencies) {
    this.httpClient = dependencies.httpClient;
  }
}

// modules/user/client/services/user-api.service.ts
import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';
// Request, Response e ListUsersParams são types nomeados do client.
export type UserApiServiceDependencies = ApiServiceDependencies;
export type GetUserByIdParams = { id: string };

export class UserApiService extends ApiService {
  constructor(dependencies: UserApiServiceDependencies) {
    super(dependencies);
  }

  async create(data: CreateUserRequest): Promise<CreateUserResponse> {
    return this.httpClient.post('/api/users', data);
  }

  async getById({ id }: GetUserByIdParams): Promise<UserResponse> {
    return this.httpClient.get(`/api/users/${id}`);
  }

  async list(params: ListUsersParams): Promise<PaginatedResponse<UserResponse>> {
    return this.httpClient.get('/api/users', { params });
  }
}
```

### 6.4 Exemplo: Componente

```typescript
// modules/user/client/ui/components/user-card.component.ts
// (Pseudocódigo — adapte ao framework escolhido)

type UserCardData = { id: string; name: string; email: string; isActive: boolean };
type DeactivateUserParams = { id: string };
type OnDeactivateUser = (params: DeactivateUserParams) => void;
type UserCardProps = { user: UserCardData; onDeactivate?: OnDeactivateUser };

export function UserCard({ user, onDeactivate }: UserCardProps) {
  return (
    <div class="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <span class={user.isActive ? 'active' : 'inactive'}>
        {user.isActive ? 'Ativo' : 'Inativo'}
      </span>
      {user.isActive && (
        <button onClick={() => onDeactivate?.({ id: user.id })}>
          Desativar
        </button>
      )}
    </div>
  );
}
```

---

## 7. Regras de Importação

> **Estas regras são INEGOCIÁVEIS. Violações quebram a arquitetura.**

### 7.1 Matriz de Permissões

```text
DE (origem)          → PARA (destino)         | STATUS
─────────────────────┼─────────────────────────┼──────────
client/*             → domain/*               | ✅ PERMITIDO
client/*             → @core/*                | ✅ PERMITIDO
client/*             → shared/*               | ✅ PERMITIDO
client/*             → server/*               | ❌ PROIBIDO
client/*             → application/*          | ❌ PROIBIDO
server/api/*         → application/*          | ✅ PERMITIDO
server/api/*         → domain/*               | ✅ PERMITIDO
server/api/*         → @core/*                | ✅ PERMITIDO
server/api/*         → shared/*               | ✅ PERMITIDO
server/api/*         → server/infra/*         | ❌ PROIBIDO (via DI)
server/infra/*       → domain/*               | ✅ PERMITIDO
server/infra/*       → @core/*                | ✅ PERMITIDO
server/infra/*       → shared/*               | ✅ PERMITIDO
application/*        → domain/*               | ✅ PERMITIDO
application/*        → @core/*                | ✅ PERMITIDO
application/*        → server/infra/*         | ❌ PROIBIDO (interfaces)
application/*        → client/*               | ❌ PROIBIDO
domain/*             → @core/*                | ✅ PERMITIDO
domain/*             → domain/* (mesmo módulo)| ✅ PERMITIDO
domain/*             → server/*               | ❌ PROIBIDO
domain/*             → client/*               | ❌ PROIBIDO
domain/*             → application/*          | ❌ PROIBIDO
domain/*             → shared/*               | ❌ PROIBIDO
```

### 7.2 Regra de Ouro

> **O domínio é o centro do universo. Ele não conhece nada além de si mesmo
> e das classes base do `@core/`.**

### 7.3 Comunicação entre Módulos

Módulos diferentes (Bounded Contexts) **não devem importar diretamente** o domínio um do outro. A comunicação entre módulos acontece via:

- **Domain Events** (assíncrono, preferencial)
- **API interna** (síncrono, quando necessário)
- **Anti-Corruption Layer** (quando a integração é complexa)

---

## 8. Isomorfismo

### 8.1 O que é Código Isomórfico

Código isomórfico é aquele que pode ser executado tanto no ambiente do **client** (browser) quanto no **server** (Node.js, Deno, Bun, etc.) sem modificações.

### 8.2 Regras para Código Isomórfico

1. **Zero imports de APIs específicas de runtime**:
   - ❌ `import * as fs from 'fs'`
   - ❌ `import * as crypto from 'crypto'`
   - ❌ `window`, `document`, `navigator`
   - ❌ `process.env` (use injeção de config)
2. **Zero dependências de frameworks**:
   - ❌ `import { Injectable } from '@nestjs/common'`
   - ❌ `import { useState } from 'react'`
3. **Apenas lógica pura**: funções, classes, validações, transformações.
4. **Use apenas APIs padrão da linguagem**: `Date`, `Math`, `RegExp`,
   `Array`, `Map`, `Set`, `JSON`, etc.

### 8.3 Onde o Isomorfismo se Aplica

| Camada         | Isomórfica? | Por quê?                                  |
| -------------- | ----------- | ----------------------------------------- |
| `@core/`       | ✅ Sim       | Base classes usadas em ambos os lados     |
| `domain/`      | ✅ Sim       | Regras de negócio reutilizadas no client  |
| `application/` | ⚠️ Depende  | Pode ser em alguns casos (Server Actions) |
| `server/`      | ❌ Não       | Usa I/O, DB, filesystem                   |
| `client/`      | ❌ Não       | Usa DOM, browser APIs                     |
| `shared/`      | ✅ Sim       | Utilitários genéricos                     |

### 8.4 Benefício Principal

```typescript
// No client (formulário):
const emailResult = Email.create(input); // Validação instantânea na UI

// No server (use case):
const emailResult = Email.create(input); // Mesma validação, segurança

// MESMO CÓDIGO. UMA ÚNICA FONTE DE VERDADE. DRY ABSOLUTO.
```

---

## 9. SOLID

### 9.1 Single Responsibility Principle (S)

- Cada **Use Case** faz exatamente uma coisa.
- Cada **Entity** cuida apenas das suas próprias regras.
- Cada **Repository** cuida apenas da persistência de um Aggregate.
- Cada **Controller** apenas traduz HTTP para Use Case e vice-versa.
- Cada **Value Object** valida apenas o seu próprio conceito.

### 9.2 Open/Closed Principle (O)

- **Aberto para extensão**: Novos comportamentos via novos métodos na
  entidade ou novos Use Cases.
- **Fechado para modificação**: Não altere Use Cases existentes para
  adicionar funcionalidades. Crie novos.
- Use **Strategy Pattern** para variações de comportamento.

### 9.3 Liskov Substitution Principle (L)

- Qualquer implementação de `IUserRepository` deve poder substituir
  outra sem quebrar o Use Case.
- Value Objects derivados devem manter o contrato da classe base.
- Erros de domínio derivados devem ser tratáveis como o erro base.

### 9.4 Interface Segregation Principle (I)

- **Interfaces específicas por contexto**: `IUserRepository`,
  `IOrderRepository` — nunca um `IRepository` genérico gigante.
- **Interfaces de Provider mínimas**: `IHashProvider` só tem `hash()`
  e `compare()`. Nada mais.
- Se uma interface tem métodos que um consumidor não usa, divida-a.

### 9.5 Dependency Inversion Principle (D)

- **Use Cases dependem de interfaces** (`IUserRepository`), não de
  implementações (`UserRepositoryImpl`).
- **O domínio define os contratos** (interfaces de repositório).
- **A infraestrutura implementa os contratos**.
- **Injeção via construtor** sempre. Nunca `new` de dependências
  dentro de Use Cases ou Entities.

---

## 10. Design Patterns

### 10.1 Catálogo de Padrões Obrigatórios

| Pattern            | Onde Usar                                        | Por quê                      |
| ------------------ | ------------------------------------------------ | ---------------------------- |
| **Repository**     | `domain/` (interface) + `server/infra/` (impl)   | Abstrai persistência         |
| **Factory Method** | `domain/entities/` (método `create()`)           | Criação com validação        |
| **Value Object**   | `domain/value-objects/`                          | Imutabilidade e validação    |
| **Aggregate Root** | `domain/aggregates/`                             | Consistência transacional    |
| **Domain Event**   | `domain/events/`                                 | Desacoplamento entre módulos |
| **Result/Either**  | Toda a camada de domínio e aplicação             | Erros sem exceptions         |
| **Mapper**         | `application/mappers/` + `server/infra/mappers/` | Conversão entre camadas      |
| **Strategy**       | Providers e services com variações               | Troca de algoritmo           |
| **Observer**       | Event handlers de domínio                        | Reação a eventos             |
| **Unit of Work**   | `server/infra/` (quando necessário)              | Transações                   |
| **Specification**  | `domain/` (queries complexas)                    | Filtros reutilizáveis        |
| **Adapter**        | `server/infra/` (integrações externas)           | Adaptação de APIs            |

### 10.2 Padrão Result — Uso Correto

```typescript
// EmailValue é o type nomeado do exemplo de Email.
// ✅ CORRETO: Erros de domínio via Result
public static create(email: EmailValue): Result<Email> {
  if (!this.isValid(email)) {
    return Result.fail(new Error('Email inválido'));
  }
  return Result.ok(new Email({ value: email }));
}

// ❌ ERRADO: Exceptions para erros de negócio
public static create(email: EmailValue): Email {
  if (!this.isValid(email)) {
    throw new Error('Email inválido'); // NÃO!
  }
  return new Email({ value: email });
}
```

**Quando usar exceptions:** Apenas para erros de infraestrutura (banco caiu, API externa indisponível) e erros de programação (null reference, tipo errado). Nunca para regras de negócio.

---

## 11. Clean Code

### 11.1 Nomenclatura

| Tipo            | Convenção                   | Exemplo                            |
| --------------- | --------------------------- | ---------------------------------- |
| Classes         | `PascalCase`                | `UserEntity`, `CreateUserUseCase`  |
| Interfaces      | `I` + `PascalCase`          | `IUserRepository`, `IHashProvider` |
| Métodos/Funções | `camelCase` verbos          | `createUser()`, `findById()`       |
| Variáveis       | `camelCase` substantivos    | `userName`, `emailResult`          |
| Constantes      | `UPPER_SNAKE_CASE`          | `MAX_PASSWORD_LENGTH`              |
| Booleans        | Prefixo `is/has/can/should` | `isActive`, `hasPermission`        |
| Types/Enums     | `PascalCase`                | `UserRole`, `OrderStatus`          |
| Tokens DI       | `UPPER_SNAKE_CASE`          | `USER_REPOSITORY`, `HASH_PROVIDER` |

### 11.2 Funções

- **Máximo ~20 linhas** por função. Se passou, extraia.
- **Types nomeados para todos os parâmetros**. Nunca descreva estruturas inline na assinatura.
- **Um objeto de parâmetros** quando a operação recebe múltiplos dados; use um type semântico para valores únicos.
- **Um nível de abstração** por função.
- **Early return** para reduzir aninhamento.
- **Nomes descritivos**: `findActiveUsersByEmail()` ao invés de
  `getUsers()`.

### 11.3 Comentários

- **Código auto-documentável** é a regra.
- **Nunca comente o óbvio**: `// incrementa i` → ❌
- **Comente o PORQUÊ**, não o O QUÊ: `// Retry 3x porque a API externa
  é instável` → ✅
- **JSDoc/TSDoc** em interfaces públicas e Use Cases.

### 11.4 Organização de Imports

```typescript
// 1. Imports de bibliotecas externas
import { Injectable } from '@nestjs/common';

// 2. Imports do @core
import { Result } from '@core/domain/result';
import { IUseCase } from '@core/application/use-case.interface';

// 3. Imports do mesmo módulo (domínio)
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';

// 4. Imports do mesmo módulo (outras camadas)
import { CreateUserInputDto } from './create-user.input.dto';

// 5. Imports de outros módulos (apenas se permitido)
import { OrderCreatedEvent } from '../../../order/domain/events/order-created.event';

// 6. Imports relativos de shared
import { formatDate } from '../../../../shared/utils/date.util';
```

### 11.5 Tratamento de Erros

```typescript
// ✅ CORRETO: Verifique o Result
const result = await this.createUserUseCase.execute(input);
if (result.isFailure) {
  return HttpResponse.badRequest(result.error.message);
}
return HttpResponse.created(result.value);

// ❌ ERRADO: Try/catch para lógica de negócio
try {
  const user = await this.createUserUseCase.execute(input);
  return HttpResponse.created(user);
} catch (error) {
  return HttpResponse.badRequest(error.message);
}
```

---

## 12. Comunicação Client-Server

### 12.1 Fluxo Padrão

```text
Client UI
   │
   │ 1. Valida com VOs do domínio (instantâneo)
   │
   ▼
Client API Service
   │
   │ 2. Chama HTTP: POST /api/users
   │
   ▼
Server API Controller
   │
   │ 3. Valida formato HTTP (Request DTO)
   │
   ▼
Server Use Case
   │
   │ 4. Valida com domínio (segurança)
   │ 5. Executa lógica de negócio
   │ 6. Persiste via Repository
   │
   ▼
Server API Controller
   │
   │ 7. Formata Response DTO
   │
   ▼
Client API Service
   │
   │ 8. Recebe response
   │
   ▼
Client UI
   │
   │ 9. Atualiza state, mostra feedback
   │
   ▼
Usuário feliz ✅
```

### 12.2 Contrato de API

- **Endpoints RESTful** por padrão (adapte se usar GraphQL, tRPC, etc.).
- **Versionamento**: `/api/v1/users`
- **Responses padronizadas**:

  ```jsonc
  // Sucesso
  { "data": { ... }, "meta": { ... } }

  // Erro
  { "error": { "code": "USER_NOT_FOUND", "message": "..." } }
  ```

### 12.3 Validação em Duas Camadas

| Camada                | O que valida                        | Quando           | Por quê                  |
| --------------------- | ----------------------------------- | ---------------- | ------------------------ |
| **Client (VOs)**      | Formato, tamanho, regras de domínio | Antes de enviar  | UX rápida                |
| **Client (HTTP)**     | Formato do request                  | Antes de enviar  | Evita requests inválidos |
| **Server (HTTP)**     | Formato do request                  | Ao receber       | Sanitização              |
| **Server (Use Case)** | Regras de negócio completas         | Durante execução | Segurança                |
| **Server (Domain)**   | Invariantes e regras puras          | Durante criação  | Consistência             |

---

## 13. Criando Novos Módulos

### 13.1 Checklist Passo-a-Passo

Quando criar um novo módulo (ex: `product`), siga esta ordem:

#### Fase 1: Domínio (Isomórfico)

- [ ] Criar pasta `modules/product/domain/`
- [ ] Definir **Value Objects** (`name.vo.ts`, `price.vo.ts`, `sku.vo.ts`)
- [ ] Definir **Entity** (`product.entity.ts`) com método `create()`
- [ ] Definir **Aggregate Root** se necessário (`product.aggregate.ts`)
- [ ] Definir **Domain Events** (`product-created.event.ts`)
- [ ] Definir **Erros de Domínio** (`product-not-found.error.ts`)
- [ ] Definir **Interface de Repository** (`product-repository.interface.ts`)
- [ ] Definir **Factory** se criação for complexa (`product.factory.ts`)
- [ ] Verificar herança da base abstrata em todas as classes arquiteturais
- [ ] Definir types de propriedades, parâmetros e dependências antes das assinaturas
- [ ] Definir **Domain Services** se houver lógica entre entidades
      (`pricing.service.ts`)

#### Fase 2: Aplicação

- [ ] Criar pasta `modules/product/application/`
- [ ] Criar **Use Cases** um por um:
  - [ ] `create-product/` (use-case + input.dto + output.dto)
  - [ ] `get-product/`
  - [ ] `update-product/`
  - [ ] `delete-product/`
  - [ ] `list-products/`
- [ ] Criar **Mappers** (`product.mapper.ts`) herdando de `Mapper<Input, Output>`
- [ ] Criar **Application Services** herdando de `ApplicationService<Input, Output>` quando necessário

#### Fase 3: Server

- [ ] Criar pasta `modules/product/server/`
- [ ] Implementar **Repository** (`product.repository.impl.ts`)
- [ ] Criar **Model de Persistência** (`product.model.ts`)
- [ ] Criar **Persistence Mapper** (`product-persistence.mapper.ts`)
- [ ] Criar **Providers** se necessário (`image-storage.provider.ts`)
- [ ] Criar **Controller** (`product.controller.ts`)
- [ ] Criar **Routes** (`product.routes.ts`)
- [ ] Criar **Request/Response DTOs** (`create-product.request.dto.ts`)
- [ ] Criar **Middlewares** específicos se necessário
- [ ] Registrar **Injeção de Dependência** no container

#### Fase 4: Client

- [ ] Criar pasta `modules/product/client/`
- [ ] Criar **API Service** (`product-api.service.ts`)
- [ ] Criar **Forms** com validação via VOs (`create-product.form.ts`)
- [ ] Criar **Components** (`product-card.component.ts`)
- [ ] Criar **Pages** (`product-list.page.ts`)
- [ ] Criar **State/Store** (`product.store.ts`)

#### Fase 5: Integração

- [ ] Configurar **rotas** no client routing
- [ ] Configurar **rotas** no server routing
- [ ] Testar **fluxo completo** client → API → use case → domain → DB
- [ ] Verificar **regras de importação** (rodar lint de arquitetura)
- [ ] Revisar bases abstratas, types nomeados e ausência de estruturas inline nas assinaturas

### 13.2 Template Rápido

```bash
mkdir -p modules/product/{domain/{entities,value-objects,aggregates,events,services,repositories,factories,errors},application/{use-cases,mappers,services},server/{infrastructure/{persistence/{repositories,models,mappers},providers,events},api/{controllers,routes,middlewares,dtos}},client/{ui/{components,pages,forms},services,state}}
```

---

## 14. Anti-Patterns

> **Lista do que NUNCA fazer. Se você está prestes a fazer algo desta
> lista, PARE e repense.**

### 14.1 Anti-Patterns de Arquitetura

| #   | Anti-Pattern                            | Por quê é errado                      | O que fazer                      |
| --- | --------------------------------------- | ------------------------------------- | -------------------------------- |
| 1   | **Entity anêmica** (só getters/setters) | Lógica de negócio vaza para Use Cases | Coloque comportamentos na Entity |
| 2   | **Use Case gordo** (faz tudo)           | Viola SRP, difícil de testar          | Divida em múltiplos Use Cases    |
| 3   | **Controller com lógica**               | Viola separação de responsabilidades  | Mova para Use Case               |
| 4   | **Domain importando Infra**             | Inverte a dependência                 | Use interfaces no domínio        |
| 5   | **Client importando Server**            | Quebra isolamento, vaza secrets       | Comunique via API                |
| 6   | **Modelo de DB = Entity**               | Acopla domínio ao banco               | Use mappers de persistência      |
| 7   | **Exceptions para negócio**             | Caller não sabe quais erros tratar    | Use Result Pattern               |
| 8   | **Value Object mutável**                | Perde a garantia de consistência      | Use `Object.freeze()`            |
| 9   | **Repository com lógica de negócio**    | Lógica espalhada, difícil de manter   | Mova para Entity/Domain Service  |
| 10  | **God Module** (um módulo faz tudo)     | Viola Bounded Contexts                | Divida em módulos menores        |

### 14.2 Anti-Patterns de Código

| #   | Anti-Pattern                                                      | O que fazer               |
| --- | ----------------------------------------------------------------- | ------------------------- |
| 11  | **Números mágicos** (`if (status === 3)`)                         | Use constantes/enum       |
| 12  | **Funções com 5+ parâmetros**                                     | Use objeto de parâmetros  |
| 13  | **Nesting profundo** (`if > if > if`)                             | Use early return          |
| 14  | **Variáveis de uma letra** (`a`, `b`, `x`)                        | Nomes descritivos         |
| 15  | **Comentários de código morto**                                   | Delete, use git           |
| 16  | **`any` em TypeScript**                                           | Tipagem explícita sempre  |
| 17  | **`console.log` em produção**                                     | Use Logger injetável      |
| 18  | **Hardcoded config**                                              | Use variáveis de ambiente |
| 19  | **Duplicação de validação** (código diferente no client e server) | Reutilize VOs do domínio  |
| 20  | **Acoplamento temporal** (ordem de chamadas importa)              | Use construtor/factory    |

### 14.3 Anti-Patterns de Isomorfismo

| #   | Anti-Pattern                          | O que fazer                    |
| --- | ------------------------------------- | ------------------------------ |
| 21  | **`process.env` no domínio**          | Injete config via construtor   |
| 22  | **`fs`, `crypto`, `http` no domínio** | Abstraia em Provider no server |
| 23  | **`window`, `document` no domínio**   | Mantenha no client apenas      |
| 24  | **Importar framework no domínio**     | Domínio é framework-agnostic   |
| 25  | **Data/Date com timezone no domínio** | Use UTC, converta nas bordas   |

### 14.4 Anti-Patterns de Herança e Parâmetros

| Anti-Pattern                                                        | O que fazer                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Classe arquitetural sem base abstrata                               | Herdar da base que define seu papel                            |
| Apenas `implements` no Use Case, Repository ou Provider concreto    | Herdar da base abstrata e preservar o contrato de interface    |
| Base vazia sem contrato ou comportamento                            | Definir operações abstratas ou comportamento comum             |
| Estrutura inline na assinatura (`create(params: { name: string })`) | Declarar `type CreateParams` antes do método                   |
| Propriedades declaradas nos parâmetros do construtor                | Declarar atributos na classe e receber um type de dependências |
| Múltiplos dados posicionais sem type de parâmetros                  | Criar um objeto com type nomeado                               |
| Type de negócio em `shared/` ou importado da camada errada          | Manter o type junto ao contrato da camada proprietária         |

---

## Apêndice A: Glossário

| Termo               | Definição                                                       |
| ------------------- | --------------------------------------------------------------- |
| **Bounded Context** | Fronteira de um módulo com seu próprio modelo de domínio        |
| **Aggregate**       | Cluster de entidades tratadas como uma unidade                  |
| **Aggregate Root**  | Entidade principal do Aggregate, ponto de acesso                |
| **Value Object**    | Objeto imutável definido por seus atributos, sem identidade     |
| **Entity**          | Objeto com identidade própria e ciclo de vida                   |
| **Domain Event**    | Algo que aconteceu no domínio que outros contextos podem reagir |
| **Use Case**        | Uma ação específica que o sistema realiza para o usuário        |
| **Repository**      | Abstração de persistência que simula uma coleção em memória     |
| **Provider**        | Abstração de serviço externo (email, storage, hash, etc.)       |
| **Mapper**          | Objeto que converte dados entre camadas                         |
| **DTO**             | Data Transfer Object — objeto para transporte de dados          |
| **Result**          | Pattern que encapsula sucesso ou falha sem exceptions           |
| **Isomórfico**      | Código que roda em múltiplos ambientes sem alteração            |

---

## Apêndice B: Resumo Visual Rápido

```text
┌──────────────────────────────────────────────────────────────┐
│                      ARQUITETURA RESUMO                      │
│                                                              │
│  CLIENT                    SERVER                            │
│  ┌──────────┐              ┌──────────┐                      │
│  │ UI/Form  │              │Controller│                      │
│  │   │      │              │    │     │                      │
│  │   │ usa  │              │    │ usa │                      │
│  │   ▼      │              │    ▼     │                      │
│  │ Domain   │◄── MESMO ──►│ Use Case │                      │
│  │ (VOs)    │   CÓDIGO     │    │     │                      │
│  │          │              │    │ usa │                      │
│  │ API Svc ─┼── HTTP ────►│    ▼     │                      │
│  │          │              │   Domain │                      │
│  └──────────┘              │    │     │                      │
│                            │    │ usa │                      │
│                            │    ▼     │                      │
│                            │   Repo   │                      │
│                            │    │     │                      │
│                            │    ▼     │                      │
│                            │    DB    │                      │
│                            └──────────┘                      │
│                                                              │
│  @core/ = Base classes (isomórfico)                          │
│  shared/ = Utilitários (isomórfico)                          │
│  domain/ = Regras de negócio (isomórfico) ← NÚCLEO           │
└──────────────────────────────────────────────────────────────┘
```

---

> **Este documento é vivo.** Atualize-o conforme a arquitetura evolui,
> mas nunca remova regras fundamentais sem discussão com a equipe.
> A consistência entre sistemas é mais importante que a conveniência
> momentânea.
