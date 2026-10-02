import { DomainError } from '../domain-error.base.ts';

export type CodedErrorParams = { code: string; message: string };

export class ValidationError extends DomainError {
  constructor(params: CodedErrorParams) {
    super(params);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends DomainError {
  constructor(params: CodedErrorParams) {
    super(params);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends DomainError {
  constructor(params: CodedErrorParams) {
    super(params);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(params: CodedErrorParams) {
    super(params);
    this.name = 'ForbiddenError';
  }
}

export class CapacityExceededError extends DomainError {
  constructor(params: CodedErrorParams) {
    super(params);
    this.name = 'CapacityExceededError';
  }
}

export class InvalidStateError extends DomainError {
  constructor(params: CodedErrorParams) {
    super(params);
    this.name = 'InvalidStateError';
  }
}
