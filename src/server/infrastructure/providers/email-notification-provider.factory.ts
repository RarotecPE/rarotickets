import "server-only";
import { isRaroNexusConfigured, isSmtpConfigured, readEnvironment } from "@/server/config/environment.config";
import type { NotificationProvider } from "./notification-provider.base";
import { RaroNexusNotificationProvider } from "./raronexus-notification.provider";
import { SmtpNotificationProvider } from "./smtp-notification.provider";

export function getEmailNotificationProvider(): NotificationProvider {
  const environment = readEnvironment();

  if (environment.emailProvider === "smtp") {
    return new SmtpNotificationProvider();
  }

  if (isRaroNexusConfigured()) {
    return new RaroNexusNotificationProvider();
  }

  if (isSmtpConfigured()) {
    return new SmtpNotificationProvider();
  }

  return new RaroNexusNotificationProvider();
}

