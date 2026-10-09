import { beforeEach, describe, expect, it } from "vitest";
import { getEmailNotificationProvider } from "./email-notification-provider.factory";
import { RaroNexusNotificationProvider } from "./raronexus-notification.provider";
import { SmtpNotificationProvider } from "./smtp-notification.provider";

describe("getEmailNotificationProvider", () => {
  beforeEach(() => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.RARONEXUS_API_URL;
    delete process.env.RARONEXUS_BASE_URL;
    delete process.env.RARONEXUS_CLIENT_ID;
    delete process.env.RARONEXUS_CLIENT_SECRET;
    delete process.env.SMTP_HOST;
  });

  it("retorna RaroNexusNotificationProvider quando credenciais RaroNexus estão preenchidas", () => {
    process.env.RARONEXUS_API_URL = "http://nexus.local";
    process.env.RARONEXUS_CLIENT_ID = "nexus-id";
    process.env.RARONEXUS_CLIENT_SECRET = "nexus-secret";

    const provider = getEmailNotificationProvider();
    expect(provider).toBeInstanceOf(RaroNexusNotificationProvider);
  });

  it("retorna SmtpNotificationProvider quando EMAIL_PROVIDER=smtp", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.RARONEXUS_API_URL = "http://nexus.local";
    process.env.RARONEXUS_CLIENT_ID = "nexus-id";
    process.env.RARONEXUS_CLIENT_SECRET = "nexus-secret";

    const provider = getEmailNotificationProvider();
    expect(provider).toBeInstanceOf(SmtpNotificationProvider);
  });

  it("retorna SmtpNotificationProvider como fallback quando apenas SMTP estiver configurado", () => {
    process.env.SMTP_HOST = "smtp.mailtrap.io";

    const provider = getEmailNotificationProvider();
    expect(provider).toBeInstanceOf(SmtpNotificationProvider);
  });
});

