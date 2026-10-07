import { createHash, createHmac } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/infrastructure/persistence/schema";

const DEMO_USER_ID = "raronexus-demo-organizer";
const DEMO_USER_NAME = "Organização de Demonstração";
const DAY_MS = 24 * 60 * 60 * 1000;

const ids = {
  events: {
    summit: "a1a00000-0000-4000-8000-000000000001",
    online: "a1a00000-0000-4000-8000-000000000002",
    finished: "a1a00000-0000-4000-8000-000000000003",
    scheduled: "a1a00000-0000-4000-8000-000000000004",
  },
  lots: {
    summitFirst: "a1a00000-0000-4000-8000-000000000101",
    summitSecond: "a1a00000-0000-4000-8000-000000000102",
  },
  fields: {
    summitOrganization: "a1a00000-0000-4000-8000-000000000201",
    summitProfile: "a1a00000-0000-4000-8000-000000000202",
    summitAccessibility: "a1a00000-0000-4000-8000-000000000203",
    onlineOrganization: "a1a00000-0000-4000-8000-000000000204",
  },
  activities: {
    keynote: "a1a00000-0000-4000-8000-000000000301",
    workshop: "a1a00000-0000-4000-8000-000000000302",
    pastTalk: "a1a00000-0000-4000-8000-000000000303",
  },
  participants: {
    ana: "a1a00000-0000-4000-8000-000000000401",
    bruno: "a1a00000-0000-4000-8000-000000000402",
    camila: "a1a00000-0000-4000-8000-000000000403",
    diego: "a1a00000-0000-4000-8000-000000000404",
    elisa: "a1a00000-0000-4000-8000-000000000405",
    felipe: "a1a00000-0000-4000-8000-000000000406",
  },
  coupon: "a1a00000-0000-4000-8000-000000000501",
  registrations: {
    summitPaid: "a1a00000-0000-4000-8000-000000000601",
    summitPaidFull: "a1a00000-0000-4000-8000-000000000602",
    summitWaitingPayment: "a1a00000-0000-4000-8000-000000000603",
    summitWaitlist: "a1a00000-0000-4000-8000-000000000604",
    summitCancelled: "a1a00000-0000-4000-8000-000000000605",
    onlineFree: "a1a00000-0000-4000-8000-000000000606",
    finishedCertificate: "a1a00000-0000-4000-8000-000000000607",
    finishedNoShow: "a1a00000-0000-4000-8000-000000000608",
  },
  payments: {
    summitPaid: "a1a00000-0000-4000-8000-000000000701",
    summitPaidFull: "a1a00000-0000-4000-8000-000000000702",
    summitWaitingPayment: "a1a00000-0000-4000-8000-000000000703",
    summitCancelled: "a1a00000-0000-4000-8000-000000000704",
  },
  checkin: "a1a00000-0000-4000-8000-000000000801",
  certificate: "a1a00000-0000-4000-8000-000000000901",
  audit: {
    eventCreated: "a1a00000-0000-4000-8000-000000001001",
    eventOpened: "a1a00000-0000-4000-8000-000000001002",
    registrationCancelled: "a1a00000-0000-4000-8000-000000001003",
    certificateIssued: "a1a00000-0000-4000-8000-000000001004",
  },
} as const;

function offsetFrom(now: Date, days: number, hours = 0): Date {
  return new Date(now.getTime() + days * DAY_MS + hours * 60 * 60 * 1000);
}

function calculateCpf(base: string): string {
  const digits = base.replace(/\D/g, "");
  if (digits.length !== 9)
    throw new Error("A base do CPF precisa ter nove dígitos.");
  const firstDigit = calculateCpfDigit({
    numbers: digits,
    weights: [10, 9, 8, 7, 6, 5, 4, 3, 2],
  });
  const secondDigit = calculateCpfDigit({
    numbers: `${digits}${firstDigit}`,
    weights: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  });
  return `${digits}${firstDigit}${secondDigit}`;
}

type CalculateCheckDigitParams = { numbers: string; weights: number[] };

function calculateCpfDigit(params: CalculateCheckDigitParams): number {
  const sum = [...params.numbers].reduce(
    (total, digit, index) => total + Number(digit) * params.weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function createAccessToken(params: {
  registrationId: string;
  secret: string;
}): string {
  const body = `PT1.${params.registrationId}`;
  const signature = createHmac("sha256", params.secret)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function requireConfiguredSecret(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (!value || value.startsWith("[") || Buffer.byteLength(value) < 32) {
    throw new Error(
      `${name} deve ser preenchido com pelo menos 32 bytes antes de executar o seed.`,
    );
  }
  return value;
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "O seed fictício está bloqueado quando NODE_ENV=production.",
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl || databaseUrl.includes("[")) {
    throw new Error(
      "Configure DATABASE_URL no arquivo .env antes de executar npm run db:seed.",
    );
  }
  const appSecret = requireConfiguredSecret("APP_SECRET_KEY");
  requireConfiguredSecret("QR_SIGNING_SECRET");

  const now = new Date();
  const summitStart = offsetFrom(now, 20);
  const onlineStart = offsetFrom(now, 32);
  const finishedStart = offsetFrom(now, -8);
  const scheduledStart = offsetFrom(now, 45);
  const reservationExpiresAt = offsetFrom(now, 0, 0.2);
  const appBaseUrl = (
    process.env.APP_BASE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  const accessTokens = Object.fromEntries(
    Object.entries(ids.registrations).map(([key, registrationId]) => [
      key,
      createAccessToken({ registrationId, secret: appSecret }),
    ]),
  ) as Record<keyof typeof ids.registrations, string>;

  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 5,
  });
  const database = drizzle(client, { schema });

  try {
    await database.transaction(async (transaction) => {
      const eventRows: (typeof schema.events.$inferInsert)[] = [
        {
          id: ids.events.summit,
          title: "Summit de Inovação Pernambuco",
          description:
            "Um encontro prático para conectar lideranças, tecnologia e novas oportunidades de negócio. A programação combina palestras, conversas e atividades colaborativas com especialistas da região.",
          summary:
            "Ideias, pessoas e tecnologia para transformar o futuro dos negócios.",
          slug: "summit-inovacao-pernambuco-demo",
          bannerUrl: null,
          modality: "presencial",
          chargeType: "pago",
          status: "inscricoes_abertas",
          startAt: summitStart,
          endAt: offsetFrom(now, 20, 9),
          registrationStartAt: offsetFrom(now, -7),
          registrationEndAt: offsetFrom(now, 19),
          maxCapacity: 3,
          allowsWaitlist: true,
          onlineUrl: null,
          addressStreet: "Rua do Bom Jesus",
          addressNumber: "125",
          addressComplement: "Centro de Convenções",
          addressNeighborhood: "Recife Antigo",
          addressMunicipality: "Recife",
          addressState: "PE",
          responsibleName: "Equipe RaroTickets",
          responsibleEmail: "eventos@example.test",
          createdByGlobalUserId: DEMO_USER_ID,
          certificateEnabled: true,
          workloadHours: 8,
          certificateDescription:
            "Participação no Summit de Inovação Pernambuco, com carga horária de oito horas.",
          createdAt: offsetFrom(now, -14),
          updatedAt: now,
        },
        {
          id: ids.events.online,
          title: "Conexões Digitais: Produto e Comunidade",
          description:
            "Uma conversa online sobre construção de produtos digitais, comunidades e experiências centradas nas pessoas.",
          summary: "Uma conversa aberta sobre produtos digitais e comunidades.",
          slug: "conexoes-digitais-demo",
          bannerUrl: null,
          modality: "online",
          chargeType: "gratuito",
          status: "inscricoes_abertas",
          startAt: onlineStart,
          endAt: offsetFrom(now, 32, 3),
          registrationStartAt: offsetFrom(now, -3),
          registrationEndAt: offsetFrom(now, 31),
          maxCapacity: 60,
          allowsWaitlist: false,
          onlineUrl: "https://meet.example.test/rarotickets-demo",
          addressStreet: null,
          addressNumber: null,
          addressComplement: null,
          addressNeighborhood: null,
          addressMunicipality: null,
          addressState: null,
          responsibleName: "Equipe RaroTickets",
          responsibleEmail: "eventos@example.test",
          createdByGlobalUserId: DEMO_USER_ID,
          certificateEnabled: false,
          workloadHours: 0,
          certificateDescription: null,
          createdAt: offsetFrom(now, -10),
          updatedAt: now,
        },
        {
          id: ids.events.finished,
          title: "Encontro de Lideranças Raras",
          description:
            "Um dia de troca de experiências sobre liderança, gestão e desenvolvimento de equipes.",
          summary: "Liderança colaborativa e desenvolvimento de equipes.",
          slug: "encontro-liderancas-raras-demo",
          bannerUrl: null,
          modality: "presencial",
          chargeType: "gratuito",
          status: "finalizado",
          startAt: finishedStart,
          endAt: offsetFrom(now, -8, 8),
          registrationStartAt: offsetFrom(now, -38),
          registrationEndAt: offsetFrom(now, -9),
          maxCapacity: 100,
          allowsWaitlist: false,
          onlineUrl: null,
          addressStreet: "Av. Alfredo Lisboa",
          addressNumber: "10",
          addressComplement: null,
          addressNeighborhood: "Recife Antigo",
          addressMunicipality: "Recife",
          addressState: "PE",
          responsibleName: "Equipe RaroTickets",
          responsibleEmail: "eventos@example.test",
          createdByGlobalUserId: DEMO_USER_ID,
          certificateEnabled: true,
          workloadHours: 8,
          certificateDescription:
            "Participação no Encontro de Lideranças Raras, com carga horária de oito horas.",
          createdAt: offsetFrom(now, -45),
          updatedAt: now,
        },
        {
          id: ids.events.scheduled,
          title: "Oficina de Gestão de Projetos",
          description:
            "Uma oficina introdutória sobre planejamento, priorização e acompanhamento de projetos.",
          summary: "Aprenda práticas essenciais para organizar projetos.",
          slug: "oficina-gestao-projetos-demo",
          bannerUrl: null,
          modality: "online",
          chargeType: "gratuito",
          status: "agendado",
          startAt: scheduledStart,
          endAt: offsetFrom(now, 45, 4),
          registrationStartAt: offsetFrom(now, 15),
          registrationEndAt: offsetFrom(now, 44),
          maxCapacity: 120,
          allowsWaitlist: false,
          onlineUrl: "https://meet.example.test/oficina-demo",
          addressStreet: null,
          addressNumber: null,
          addressComplement: null,
          addressNeighborhood: null,
          addressMunicipality: null,
          addressState: null,
          responsibleName: "Equipe RaroTickets",
          responsibleEmail: "eventos@example.test",
          createdByGlobalUserId: DEMO_USER_ID,
          certificateEnabled: false,
          workloadHours: 0,
          certificateDescription: null,
          createdAt: offsetFrom(now, -2),
          updatedAt: now,
        },
      ];

      for (const { id, ...values } of eventRows) {
        await transaction
          .insert(schema.events)
          .values({ id, ...values })
          .onConflictDoUpdate({ target: schema.events.id, set: values });
      }

      const lotRows: (typeof schema.ticketLots.$inferInsert)[] = [
        {
          id: ids.lots.summitFirst,
          eventId: ids.events.summit,
          name: "Lote de lançamento",
          priceCents: 29900,
          maxQuantity: 80,
          startAt: offsetFrom(now, -7),
          endAt: offsetFrom(now, 10),
          active: true,
          sortOrder: 1,
          createdAt: offsetFrom(now, -7),
          updatedAt: now,
        },
        {
          id: ids.lots.summitSecond,
          eventId: ids.events.summit,
          name: "Segundo lote",
          priceCents: 39900,
          maxQuantity: 70,
          startAt: offsetFrom(now, 10),
          endAt: offsetFrom(now, 19),
          active: true,
          sortOrder: 2,
          createdAt: offsetFrom(now, -7),
          updatedAt: now,
        },
      ];

      for (const { id, ...values } of lotRows) {
        await transaction
          .insert(schema.ticketLots)
          .values({ id, ...values })
          .onConflictDoUpdate({ target: schema.ticketLots.id, set: values });
      }

      const fieldRows: (typeof schema.eventFormFields.$inferInsert)[] = [
        {
          id: ids.fields.summitOrganization,
          eventId: ids.events.summit,
          label: "Empresa ou instituição",
          description: "Informe onde você trabalha ou estuda.",
          type: "texto",
          required: true,
          options: [],
          displayOrder: 1,
          active: true,
        },
        {
          id: ids.fields.summitProfile,
          eventId: ids.events.summit,
          label: "Área de atuação",
          description: null,
          type: "select",
          required: true,
          options: ["Tecnologia", "Gestão", "Educação", "Outra"],
          displayOrder: 2,
          active: true,
        },
        {
          id: ids.fields.summitAccessibility,
          eventId: ids.events.summit,
          label: "Necessidade de acessibilidade",
          description: "Campo opcional para ajudar na organização.",
          type: "texto_longo",
          required: false,
          options: [],
          displayOrder: 3,
          active: true,
        },
        {
          id: ids.fields.onlineOrganization,
          eventId: ids.events.online,
          label: "Organização",
          description: null,
          type: "texto",
          required: false,
          options: [],
          displayOrder: 1,
          active: true,
        },
      ];

      for (const { id, ...values } of fieldRows) {
        await transaction
          .insert(schema.eventFormFields)
          .values({ id, ...values })
          .onConflictDoUpdate({
            target: schema.eventFormFields.id,
            set: values,
          });
      }

      const activityRows: (typeof schema.eventActivities.$inferInsert)[] = [
        {
          id: ids.activities.keynote,
          eventId: ids.events.summit,
          title: "Inovação que gera impacto",
          description:
            "Como aproximar estratégia, tecnologia e necessidades reais das pessoas.",
          speakerName: "Marina Albuquerque",
          speakerBio:
            "Executiva e pesquisadora de inovação aberta e transformação digital.",
          speakerPhotoUrl: null,
          room: "Auditório principal",
          startAt: offsetFrom(now, 20, 1),
          endAt: offsetFrom(now, 20, 2),
        },
        {
          id: ids.activities.workshop,
          eventId: ids.events.summit,
          title: "Laboratório de ideias",
          description:
            "Atividade colaborativa para transformar desafios em experimentos.",
          speakerName: "Rafael Nascimento",
          speakerBio: "Facilitador de times e designer de serviços.",
          speakerPhotoUrl: null,
          room: "Sala Capibaribe",
          startAt: offsetFrom(now, 20, 3),
          endAt: offsetFrom(now, 20, 5),
        },
        {
          id: ids.activities.pastTalk,
          eventId: ids.events.finished,
          title: "Equipes que aprendem",
          description:
            "Práticas de confiança, comunicação e melhoria contínua.",
          speakerName: "Paulo Freire Neto",
          speakerBio: "Consultor em desenvolvimento de lideranças.",
          speakerPhotoUrl: null,
          room: "Auditório Recife Antigo",
          startAt: offsetFrom(now, -8, 1),
          endAt: offsetFrom(now, -8, 2),
        },
      ];

      for (const { id, ...values } of activityRows) {
        await transaction
          .insert(schema.eventActivities)
          .values({ id, ...values })
          .onConflictDoUpdate({
            target: schema.eventActivities.id,
            set: values,
          });
      }

      const couponValues: typeof schema.coupons.$inferInsert = {
        id: ids.coupon,
        eventId: ids.events.summit,
        code: "DEMO50",
        type: "valor_fixo",
        discountValue: 50,
        maxUses: 50,
        usedCount: 1,
        startAt: offsetFrom(now, -7),
        endAt: offsetFrom(now, 19),
        active: true,
        createdAt: offsetFrom(now, -7),
        updatedAt: now,
      };
      const { id: couponId, ...couponUpdate } = couponValues;
      await transaction
        .insert(schema.coupons)
        .values({ id: couponId, ...couponUpdate })
        .onConflictDoUpdate({ target: schema.coupons.id, set: couponUpdate });

      const participantRows: (typeof schema.participants.$inferInsert)[] = [
        {
          id: ids.participants.ana,
          name: "Ana Beatriz Souza",
          cpf: calculateCpf("537246981"),
          passport: null,
          email: "ana.souza@example.test",
          phone: "+5581999999001",
          birthDate: new Date("1992-04-16T12:00:00.000Z"),
          company: "Maré Digital",
          jobTitle: "Product Manager",
          termsConsent: true,
          marketingConsent: false,
        },
        {
          id: ids.participants.bruno,
          name: "Bruno Henrique Lima",
          cpf: calculateCpf("724609185"),
          passport: null,
          email: "bruno.lima@example.test",
          phone: "+5581999999002",
          birthDate: new Date("1987-09-03T12:00:00.000Z"),
          company: "Porto Lab",
          jobTitle: "Desenvolvedor",
          termsConsent: true,
          marketingConsent: true,
        },
        {
          id: ids.participants.camila,
          name: "Camila Ferreira Rocha",
          cpf: calculateCpf("684135297"),
          passport: null,
          email: "camila.rocha@example.test",
          phone: "+5581999999003",
          birthDate: new Date("1995-02-24T12:00:00.000Z"),
          company: "Casa Norte",
          jobTitle: "Designer de serviços",
          termsConsent: true,
          marketingConsent: false,
        },
        {
          id: ids.participants.diego,
          name: "Diego Santos Oliveira",
          cpf: calculateCpf("920483761"),
          passport: null,
          email: "diego.oliveira@example.test",
          phone: "+5581999999004",
          birthDate: new Date("1989-12-08T12:00:00.000Z"),
          company: "Coletivo Ponto",
          jobTitle: "Analista de projetos",
          termsConsent: true,
          marketingConsent: true,
        },
        {
          id: ids.participants.elisa,
          name: "Elisa Martins Costa",
          cpf: calculateCpf("391852604"),
          passport: null,
          email: "elisa.costa@example.test",
          phone: "+5581999999005",
          birthDate: new Date("1991-06-15T12:00:00.000Z"),
          company: "Vértice Educação",
          jobTitle: "Coordenadora",
          termsConsent: true,
          marketingConsent: false,
        },
        {
          id: ids.participants.felipe,
          name: "Felipe Araújo Mendes",
          cpf: calculateCpf("170936528"),
          passport: null,
          email: "felipe.mendes@example.test",
          phone: "+5581999999006",
          birthDate: new Date("1994-10-02T12:00:00.000Z"),
          company: "Rota Criativa",
          jobTitle: "Consultor",
          termsConsent: true,
          marketingConsent: false,
        },
      ];

      for (const { id, ...values } of participantRows) {
        await transaction
          .insert(schema.participants)
          .values({
            id,
            ...values,
            createdAt: offsetFrom(now, -5),
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.participants.id,
            set: { ...values, updatedAt: now },
          });
      }

      const registrationRows: (typeof schema.registrations.$inferInsert)[] = [
        {
          id: ids.registrations.summitPaid,
          code: "INS-2026-DEMO01",
          eventId: ids.events.summit,
          participantId: ids.participants.ana,
          lotId: ids.lots.summitFirst,
          couponId: ids.coupon,
          answersSnapshot: {
            [ids.fields.summitOrganization]: "Maré Digital",
            [ids.fields.summitProfile]: "Tecnologia",
            [ids.fields.summitAccessibility]: "",
          },
          originalCents: 29900,
          discountCents: 5000,
          finalCents: 24900,
          status: "confirmada",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.summitPaid),
          credentialTokenHash: null,
          cancellationReason: null,
          confirmedAt: offsetFrom(now, -3),
          createdAt: offsetFrom(now, -4),
          updatedAt: offsetFrom(now, -3),
        },
        {
          id: ids.registrations.summitPaidFull,
          code: "INS-2026-DEMO02",
          eventId: ids.events.summit,
          participantId: ids.participants.bruno,
          lotId: ids.lots.summitFirst,
          couponId: null,
          answersSnapshot: {
            [ids.fields.summitOrganization]: "Porto Lab",
            [ids.fields.summitProfile]: "Tecnologia",
            [ids.fields.summitAccessibility]: "",
          },
          originalCents: 29900,
          discountCents: 0,
          finalCents: 29900,
          status: "confirmada",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.summitPaidFull),
          credentialTokenHash: null,
          cancellationReason: null,
          confirmedAt: offsetFrom(now, -2),
          createdAt: offsetFrom(now, -3),
          updatedAt: offsetFrom(now, -2),
        },
        {
          id: ids.registrations.summitWaitingPayment,
          code: "INS-2026-DEMO03",
          eventId: ids.events.summit,
          participantId: ids.participants.camila,
          lotId: ids.lots.summitFirst,
          couponId: null,
          answersSnapshot: {
            [ids.fields.summitOrganization]: "Casa Norte",
            [ids.fields.summitProfile]: "Gestão",
            [ids.fields.summitAccessibility]: "",
          },
          originalCents: 29900,
          discountCents: 0,
          finalCents: 29900,
          status: "aguardando_pagamento",
          reservationExpiresAt,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.summitWaitingPayment),
          credentialTokenHash: null,
          cancellationReason: null,
          confirmedAt: null,
          createdAt: offsetFrom(now, -1),
          updatedAt: offsetFrom(now, -1),
        },
        {
          id: ids.registrations.summitWaitlist,
          code: "INS-2026-DEMO04",
          eventId: ids.events.summit,
          participantId: ids.participants.diego,
          lotId: null,
          couponId: null,
          answersSnapshot: {},
          originalCents: 0,
          discountCents: 0,
          finalCents: 0,
          status: "lista_espera",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.summitWaitlist),
          credentialTokenHash: null,
          cancellationReason: null,
          confirmedAt: null,
          createdAt: offsetFrom(now, -1, 1),
          updatedAt: offsetFrom(now, -1, 1),
        },
        {
          id: ids.registrations.summitCancelled,
          code: "INS-2026-DEMO05",
          eventId: ids.events.summit,
          participantId: ids.participants.elisa,
          lotId: ids.lots.summitFirst,
          couponId: null,
          answersSnapshot: {
            [ids.fields.summitOrganization]: "Vértice Educação",
            [ids.fields.summitProfile]: "Educação",
          },
          originalCents: 29900,
          discountCents: 0,
          finalCents: 29900,
          status: "cancelada",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.summitCancelled),
          credentialTokenHash: null,
          cancellationReason: "Cancelamento solicitado para demonstração",
          confirmedAt: null,
          createdAt: offsetFrom(now, -2, 2),
          updatedAt: offsetFrom(now, -1),
        },
        {
          id: ids.registrations.onlineFree,
          code: "INS-2026-DEMO06",
          eventId: ids.events.online,
          participantId: ids.participants.felipe,
          lotId: null,
          couponId: null,
          answersSnapshot: { [ids.fields.onlineOrganization]: "Rota Criativa" },
          originalCents: 0,
          discountCents: 0,
          finalCents: 0,
          status: "confirmada",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.onlineFree),
          credentialTokenHash: null,
          cancellationReason: null,
          confirmedAt: offsetFrom(now, -2),
          createdAt: offsetFrom(now, -3),
          updatedAt: offsetFrom(now, -2),
        },
        {
          id: ids.registrations.finishedCertificate,
          code: "INS-2026-DEMO07",
          eventId: ids.events.finished,
          participantId: ids.participants.ana,
          lotId: null,
          couponId: null,
          answersSnapshot: {},
          originalCents: 0,
          discountCents: 0,
          finalCents: 0,
          status: "confirmada",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.finishedCertificate),
          credentialTokenHash: null,
          cancellationReason: null,
          confirmedAt: offsetFrom(now, -40),
          createdAt: offsetFrom(now, -41),
          updatedAt: offsetFrom(now, -40),
        },
        {
          id: ids.registrations.finishedNoShow,
          code: "INS-2026-DEMO08",
          eventId: ids.events.finished,
          participantId: ids.participants.bruno,
          lotId: null,
          couponId: null,
          answersSnapshot: {},
          originalCents: 0,
          discountCents: 0,
          finalCents: 0,
          status: "confirmada",
          reservationExpiresAt: null,
          waitlistExpiresAt: null,
          accessTokenHash: hashToken(accessTokens.finishedNoShow),
          credentialTokenHash: null,
          cancellationReason: null,
          confirmedAt: offsetFrom(now, -40),
          createdAt: offsetFrom(now, -41, 1),
          updatedAt: offsetFrom(now, -40),
        },
      ];

      for (const { id, ...values } of registrationRows) {
        await transaction
          .insert(schema.registrations)
          .values({ id, ...values })
          .onConflictDoUpdate({ target: schema.registrations.id, set: values });
      }

      const paymentRows: (typeof schema.payments.$inferInsert)[] = [
        {
          id: ids.payments.summitPaid,
          registrationId: ids.registrations.summitPaid,
          referenceId: ids.registrations.summitPaid,
          provider: "mock",
          status: "pago",
          method: "pix",
          amountCents: 24900,
          externalId: "mock-seed-payment-01",
          checkoutUrl: null,
          payload: { demo: true, label: "Pagamento fictício de demonstração" },
          paidAt: offsetFrom(now, -3),
          refundedCents: 0,
          refundReason: null,
          refundedAt: null,
          refundedByGlobalUserId: null,
          createdAt: offsetFrom(now, -4),
          updatedAt: offsetFrom(now, -3),
        },
        {
          id: ids.payments.summitPaidFull,
          registrationId: ids.registrations.summitPaidFull,
          referenceId: ids.registrations.summitPaidFull,
          provider: "mock",
          status: "pago",
          method: "cartao_credito",
          amountCents: 29900,
          externalId: "mock-seed-payment-02",
          checkoutUrl: null,
          payload: { demo: true, label: "Pagamento fictício de demonstração" },
          paidAt: offsetFrom(now, -2),
          refundedCents: 0,
          refundReason: null,
          refundedAt: null,
          refundedByGlobalUserId: null,
          createdAt: offsetFrom(now, -3),
          updatedAt: offsetFrom(now, -2),
        },
        {
          id: ids.payments.summitWaitingPayment,
          registrationId: ids.registrations.summitWaitingPayment,
          referenceId: ids.registrations.summitWaitingPayment,
          provider: "mock",
          status: "aguardando",
          method: "pix",
          amountCents: 29900,
          externalId: null,
          checkoutUrl: null,
          payload: { demo: true, label: "Aguardando simulação de pagamento" },
          paidAt: null,
          refundedCents: 0,
          refundReason: null,
          refundedAt: null,
          refundedByGlobalUserId: null,
          createdAt: offsetFrom(now, -1),
          updatedAt: offsetFrom(now, -1),
        },
        {
          id: ids.payments.summitCancelled,
          registrationId: ids.registrations.summitCancelled,
          referenceId: ids.registrations.summitCancelled,
          provider: "mock",
          status: "cancelado",
          method: "pix",
          amountCents: 29900,
          externalId: "mock-seed-payment-cancelled",
          checkoutUrl: null,
          payload: { demo: true, label: "Pagamento fictício cancelado" },
          paidAt: null,
          refundedCents: 0,
          refundReason: null,
          refundedAt: null,
          refundedByGlobalUserId: null,
          createdAt: offsetFrom(now, -2),
          updatedAt: offsetFrom(now, -1),
        },
      ];

      for (const { id, ...values } of paymentRows) {
        await transaction
          .insert(schema.payments)
          .values({ id, ...values })
          .onConflictDoUpdate({ target: schema.payments.id, set: values });
      }

      const checkinValues: typeof schema.checkins.$inferInsert = {
        id: ids.checkin,
        registrationId: ids.registrations.finishedCertificate,
        eventId: ids.events.finished,
        operatorGlobalUserId: DEMO_USER_ID,
        operatorName: DEMO_USER_NAME,
        happenedAt: offsetFrom(now, -8, 1),
        type: "normal",
        justification: null,
      };
      const { id: checkinId, ...checkinUpdate } = checkinValues;
      await transaction
        .insert(schema.checkins)
        .values({ id: checkinId, ...checkinUpdate })
        .onConflictDoUpdate({ target: schema.checkins.id, set: checkinUpdate });

      const certificateValues: typeof schema.certificates.$inferInsert = {
        id: ids.certificate,
        registrationId: ids.registrations.finishedCertificate,
        eventId: ids.events.finished,
        participantId: ids.participants.ana,
        authenticationCode: "CERT-DEMO-2026-0001",
        workloadHours: 8,
        descriptionSnapshot:
          "Participação no Encontro de Lideranças Raras, com carga horária de oito horas.",
        eventTitleSnapshot: "Encontro de Lideranças Raras",
        participantNameSnapshot: "Ana Beatriz Souza",
        eventStartSnapshot: finishedStart,
        issuedAt: offsetFrom(now, -7),
        createdAt: offsetFrom(now, -7),
        updatedAt: now,
      };
      const { id: certificateId, ...certificateUpdate } = certificateValues;
      await transaction
        .insert(schema.certificates)
        .values({ id: certificateId, ...certificateUpdate })
        .onConflictDoUpdate({
          target: schema.certificates.id,
          set: certificateUpdate,
        });

      const auditRows: (typeof schema.auditLogs.$inferInsert)[] = [
        {
          id: ids.audit.eventCreated,
          userId: DEMO_USER_ID,
          userName: DEMO_USER_NAME,
          action: "event.created",
          entity: "event",
          recordId: ids.events.summit,
          beforeData: null,
          afterData: {
            title: "Summit de Inovação Pernambuco",
            status: "rascunho",
          },
          ip: "127.0.0.1",
          createdAt: offsetFrom(now, -14),
          updatedAt: offsetFrom(now, -14),
        },
        {
          id: ids.audit.eventOpened,
          userId: DEMO_USER_ID,
          userName: DEMO_USER_NAME,
          action: "event.status.transition",
          entity: "event",
          recordId: ids.events.summit,
          beforeData: { status: "agendado" },
          afterData: { status: "inscricoes_abertas" },
          ip: "127.0.0.1",
          createdAt: offsetFrom(now, -7),
          updatedAt: offsetFrom(now, -7),
        },
        {
          id: ids.audit.registrationCancelled,
          userId: DEMO_USER_ID,
          userName: DEMO_USER_NAME,
          action: "registration.cancelled",
          entity: "registration",
          recordId: ids.registrations.summitCancelled,
          beforeData: { status: "aguardando_pagamento" },
          afterData: {
            status: "cancelada",
            reason: "Cancelamento solicitado para demonstração",
          },
          ip: "127.0.0.1",
          createdAt: offsetFrom(now, -1),
          updatedAt: offsetFrom(now, -1),
        },
        {
          id: ids.audit.certificateIssued,
          userId: DEMO_USER_ID,
          userName: DEMO_USER_NAME,
          action: "certificate.issued",
          entity: "certificate",
          recordId: ids.certificate,
          beforeData: null,
          afterData: {
            code: "CERT-DEMO-2026-0001",
            registrationCode: "INS-2026-DEMO07",
          },
          ip: "127.0.0.1",
          createdAt: offsetFrom(now, -7),
          updatedAt: offsetFrom(now, -7),
        },
      ];

      for (const { id, ...values } of auditRows) {
        await transaction
          .insert(schema.auditLogs)
          .values({ id, ...values })
          .onConflictDoUpdate({ target: schema.auditLogs.id, set: values });
      }
    });

    const links = Object.entries(accessTokens).map(([key, token]) => ({
      key,
      token,
    }));
    console.info("\nDados fictícios de demonstração inseridos/atualizados.");
    console.info(`Vitrine: ${appBaseUrl}/eventos`);
    console.info("Links da Área do Participante (uso local/teste):");
    for (const { key, token } of links) {
      const registrationKey = key as keyof typeof ids.registrations;
      const code = registrationCodes[registrationKey];
      console.info(`- ${code}: ${appBaseUrl}/ingressos/${token}`);
    }
    console.info(
      "\nCheckout mock pendente: abra o link INS-2026-DEMO03 e escolha um resultado de pagamento.",
    );
    console.info(
      "Certificado de demonstração: /certificados/CERT-DEMO-2026-0001\n",
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

const registrationCodes: Record<keyof typeof ids.registrations, string> = {
  summitPaid: "INS-2026-DEMO01",
  summitPaidFull: "INS-2026-DEMO02",
  summitWaitingPayment: "INS-2026-DEMO03",
  summitWaitlist: "INS-2026-DEMO04",
  summitCancelled: "INS-2026-DEMO05",
  onlineFree: "INS-2026-DEMO06",
  finishedCertificate: "INS-2026-DEMO07",
  finishedNoShow: "INS-2026-DEMO08",
};

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Falha inesperada ao criar dados de demonstração.",
  );
  process.exitCode = 1;
});
