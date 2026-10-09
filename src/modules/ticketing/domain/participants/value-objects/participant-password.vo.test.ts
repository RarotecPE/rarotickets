import { describe, expect, it } from "vitest";
import { ParticipantPassword, WeakParticipantPasswordError } from "./participant-password.vo";

describe("ParticipantPassword Value Object", () => {
  it("should fail when password is less than 6 characters", () => {
    const result = ParticipantPassword.create("12345");
    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(WeakParticipantPasswordError);
  });

  it("should fail when password is empty or non-string", () => {
    const result = ParticipantPassword.create("");
    expect(result.isFailure).toBe(true);
  });

  it("should fail when password is longer than 128 characters", () => {
    const result = ParticipantPassword.create("a".repeat(129));
    expect(result.isFailure).toBe(true);
  });

  it("should succeed with valid password", () => {
    const result = ParticipantPassword.create("SenhaForte123!");
    expect(result.isSuccess).toBe(true);
    expect(result.value.value).toBe("SenhaForte123!");
  });
});

