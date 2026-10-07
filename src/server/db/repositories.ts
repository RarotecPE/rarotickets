import { and, asc, desc, eq, gt, gte, isNull, lt, lte, or, sql, count } from "drizzle-orm";
import { db } from "@/server/db";
import {
  auditLogs,
  certificates,
  checkIns,
  coupons,
  events,
  lots,
  participants,
  payments,
  registrations,
  users,
} from "@/server/db/schema";
import {
  AuditLog,
  Certificate,
  CheckIn,
  Coupon,
  Event,
  Lot,
  Participant,
  Payment,
  Registration,
  User,
} from "@/lib/domain/entities";
import { Identifier } from "@/@core/domain/identifier";
import {
  DateRange,
  Document,
  Email,
  Money,
  Name,
  Percent,
  Phone,
} from "@/lib/domain/value-objects";

// ---------------------------------------------------------------------------
// Mapeadores
// ---------------------------------------------------------------------------
function mapEventRow(r: typeof events.$inferSelect): Event {
  return Event.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      title: r.title,
      description: r.description,
      modality: r.modality as Event["modality"],
      financialType: r.financialType as Event["financialType"],
      status: r.status as Event["status"],
      dateRange: DateRange.reconstitute(r.startsAt, r.endsAt),
      capacity: r.capacity,
      address: r.address,
      city: r.city,
      state: r.state,
      streamUrl: r.streamUrl,
      managerId: r.managerId,
      certificateEnabled: r.certificateEnabled,
      certificateHours: r.certificateHours,
      certificateMinPresencePercent: r.certificateMinPresencePercent
        ? Percent.reconstitute(r.certificateMinPresencePercent)
        : null,
      waitlistEnabled: r.waitlistEnabled,
      canceledAt: r.canceledAt,
      cancelReason: r.cancelReason,
      publishedAt: r.publishedAt,
      customFormFields: (r.customFormFields ?? []) as Event["customFormFields"],
    },
  });
}

function mapLotRow(r: typeof lots.$inferSelect): Lot {
  return Lot.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      eventId: r.eventId,
      name: r.name,
      price: Money.reconstitute(r.priceCents),
      dateRange: DateRange.reconstitute(r.startsAt, r.endsAt),
      totalSpots: r.totalSpots,
      spotsTaken: r.spotsTaken,
      active: r.active,
    },
  });
}

function mapParticipantRow(r: typeof participants.$inferSelect): Participant {
  return Participant.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      name: Name.reconstitute(r.name),
      email: Email.reconstitute(r.email),
      document: Document.reconstitute(r.documentKind as "CPF" | "PASSAPORTE", r.documentValue),
      phone: r.phone ? Phone.reconstitute(r.phone) : null,
      company: r.company,
      role: r.role,
    },
  });
}

function mapRegistrationRow(r: typeof registrations.$inferSelect): Registration {
  return Registration.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      code: r.code,
      eventId: r.eventId,
      participantId: r.participantId,
      lotId: r.lotId,
      status: r.status as Registration["status"],
      contractedPrice: Money.reconstitute(r.contractedPriceCents),
      discountAmount: Money.reconstitute(r.discountAmountCents),
      finalPrice: Money.reconstitute(r.finalPriceCents),
      couponId: r.couponId,
      answers: (r.answers ?? []) as Registration["answers"],
      consentTerms: r.consentTerms,
      consentMarketing: r.consentMarketing,
      reservationExpiresAt: r.reservationExpiresAt,
      waitlistPosition: r.waitlistPosition,
      cancellationReason: r.cancellationReason as Registration["cancellationReason"],
      canceledAt: r.canceledAt,
      confirmedAt: r.confirmedAt,
      credentialToken: r.credentialToken,
      credentialQrPayload: r.credentialQrPayload,
    },
  });
}

function mapPaymentRow(r: typeof payments.$inferSelect): Payment {
  return Payment.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      registrationId: r.registrationId,
      externalReference: r.externalReference,
      gatewayOrderId: r.gatewayOrderId,
      amount: Money.reconstitute(r.amountCents),
      status: r.status as Payment["status"],
      method: r.method as Payment["method"],
      payloadRaw: r.payloadRaw,
      paidAt: r.paidAt,
      refundedAt: r.refundedAt,
    },
  });
}

function mapCheckInRow(r: typeof checkIns.$inferSelect): CheckIn {
  return CheckIn.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      registrationId: r.registrationId,
      eventId: r.eventId,
      status: r.status as CheckIn["status"],
      checkedInAt: r.checkedInAt,
      operatorId: r.operatorId,
      operatorName: r.operatorName,
      note: r.note,
    },
  });
}

function mapCertificateRow(r: typeof certificates.$inferSelect): Certificate {
  return Certificate.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      registrationId: r.registrationId,
      eventId: r.eventId,
      participantName: r.participantName,
      eventTitle: r.eventTitle,
      hours: r.hours,
      code: r.code,
      issuedAt: r.issuedAt,
    },
  });
}

function mapUserRow(r: typeof users.$inferSelect): User {
  return User.reconstitute({
    id: Identifier.fromExisting(r.id),
    props: {
      globalId: r.globalId,
      name: r.name,
      email: r.email,
      avatarUrl: r.avatarUrl,
      role: r.role as User["role"],
    },
  });
}

// ---------------------------------------------------------------------------
// Repositórios
// ---------------------------------------------------------------------------
export const EventRepo = {
  async list(params?: { status?: string }): Promise<Event[]> {
    const rows = await db
      .select()
      .from(events)
      .where(params?.status ? eq(events.status, params.status) : undefined)
      .orderBy(desc(events.startsAt));
    return rows.map(mapEventRow);
  },

  async findById(id: string): Promise<Event | null> {
    const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return rows[0] ? mapEventRow(rows[0]) : null;
  },

  async findPublicOpen(): Promise<Event[]> {
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.status, "INSCRICOES_ABERTAS"))
      .orderBy(asc(events.startsAt));
    return rows.map(mapEventRow);
  },

  async save(ev: Event): Promise<void> {
    await db.insert(events).values({
      id: ev.id.toString(),
      title: ev.title,
      description: ev.description,
      modality: ev.modality,
      financialType: ev.financialType,
      status: ev.status,
      startsAt: ev.dateRange.startsAt,
      endsAt: ev.dateRange.endsAt,
      capacity: ev.capacity,
      address: ev.address,
      city: ev.city,
      state: ev.state,
      streamUrl: ev.streamUrl,
      managerId: ev.managerId,
      certificateEnabled: ev.certificateEnabled,
      certificateHours: ev.certificateHours,
      certificateMinPresencePercent: ev.certificateMinPresencePercent?.value ?? null,
      waitlistEnabled: ev.waitlistEnabled,
      canceledAt: ev.canceledAt,
      cancelReason: ev.cancelReason,
      publishedAt: ev.publishedAt,
      customFormFields: ev.customFormFields as unknown as object,
      createdAt: ev.createdAt,
      updatedAt: ev.updatedAt,
    });
  },

  async update(ev: Event): Promise<void> {
    await db
      .update(events)
      .set({
        title: ev.title,
        description: ev.description,
        modality: ev.modality,
        financialType: ev.financialType,
        status: ev.status,
        startsAt: ev.dateRange.startsAt,
        endsAt: ev.dateRange.endsAt,
        capacity: ev.capacity,
        address: ev.address,
        city: ev.city,
        state: ev.state,
        streamUrl: ev.streamUrl,
        certificateEnabled: ev.certificateEnabled,
        certificateHours: ev.certificateHours,
        certificateMinPresencePercent: ev.certificateMinPresencePercent?.value ?? null,
        waitlistEnabled: ev.waitlistEnabled,
        canceledAt: ev.canceledAt,
        cancelReason: ev.cancelReason,
        publishedAt: ev.publishedAt,
        customFormFields: ev.customFormFields as unknown as object,
        updatedAt: ev.updatedAt,
      })
      .where(eq(events.id, ev.id.toString()));
  },

  async countConfirmed(eventId: string): Promise<number> {
    const r = await db
      .select({ c: count() })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "CONFIRMADA")));
    return Number(r[0]?.c ?? 0);
  },

  async countActiveReservations(eventId: string): Promise<number> {
    const r = await db
      .select({ c: count() })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          or(eq(registrations.status, "PENDENTE"), eq(registrations.status, "AGUARDANDO_PAGAMENTO")),
          gt(registrations.reservationExpiresAt, new Date()),
        ),
      );
    return Number(r[0]?.c ?? 0);
  },

  async dashboardStats(): Promise<{
    totalEvents: number;
    openEvents: number;
    confirmedRegistrations: number;
    pendingReservations: number;
    revenueCents: number;
  }> {
    const [e, open, conf, pend, pay] = await Promise.all([
      db.select({ c: count() }).from(events),
      db.select({ c: count() }).from(events).where(eq(events.status, "INSCRICOES_ABERTAS")),
      db.select({ c: count() }).from(registrations).where(eq(registrations.status, "CONFIRMADA")),
      db
        .select({ c: count() })
        .from(registrations)
        .where(or(eq(registrations.status, "PENDENTE"), eq(registrations.status, "AGUARDANDO_PAGAMENTO"))),
      db
        .select({ total: sql<number>`coalesce(sum(${payments.amountCents}), 0)` })
        .from(payments)
        .where(eq(payments.status, "PAGO")),
    ]);
    return {
      totalEvents: Number(e[0]?.c ?? 0),
      openEvents: Number(open[0]?.c ?? 0),
      confirmedRegistrations: Number(conf[0]?.c ?? 0),
      pendingReservations: Number(pend[0]?.c ?? 0),
      revenueCents: Number(pay[0]?.total ?? 0),
    };
  },
};

export const LotRepo = {
  async listByEvent(eventId: string): Promise<Lot[]> {
    const rows = await db
      .select()
      .from(lots)
      .where(eq(lots.eventId, eventId))
      .orderBy(asc(lots.startsAt));
    return rows.map(mapLotRow);
  },

  async findCurrentForEvent(eventId: string, now = new Date()): Promise<Lot | null> {
    const rows = await db
      .select()
      .from(lots)
      .where(
        and(
          eq(lots.eventId, eventId),
          eq(lots.active, true),
          lte(lots.startsAt, now),
          gte(lots.endsAt, now),
          sql`${lots.spotsTaken} < ${lots.totalSpots}`,
        ),
      )
      .orderBy(asc(lots.startsAt))
      .limit(1);
    return rows[0] ? mapLotRow(rows[0]) : null;
  },

  async findById(id: string): Promise<Lot | null> {
    const rows = await db.select().from(lots).where(eq(lots.id, id)).limit(1);
    return rows[0] ? mapLotRow(rows[0]) : null;
  },

  async save(lot: Lot): Promise<void> {
    await db.insert(lots).values({
      id: lot.id.toString(),
      eventId: lot.eventId,
      name: lot.name,
      priceCents: lot.price.cents,
      startsAt: lot.dateRange.startsAt,
      endsAt: lot.dateRange.endsAt,
      totalSpots: lot.totalSpots,
      spotsTaken: lot.spotsTaken,
      active: lot.active,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,
    });
  },

  async update(lot: Lot): Promise<void> {
    await db
      .update(lots)
      .set({
        name: lot.name,
        priceCents: lot.price.cents,
        startsAt: lot.dateRange.startsAt,
        endsAt: lot.dateRange.endsAt,
        totalSpots: lot.totalSpots,
        spotsTaken: lot.spotsTaken,
        active: lot.active,
        updatedAt: lot.updatedAt,
      })
      .where(eq(lots.id, lot.id.toString()));
  },

  async activateDueLots(now = new Date()): Promise<number> {
    const res = await db
      .update(lots)
      .set({ active: true, updatedAt: now })
      .where(and(eq(lots.active, false), lte(lots.startsAt, now), gte(lots.endsAt, now)));
    return (res as any).count ?? 0;
  },

  async deactivateExpiredLots(now = new Date()): Promise<number> {
    const res = await db
      .update(lots)
      .set({ active: false, updatedAt: now })
      .where(and(eq(lots.active, true), lt(lots.endsAt, now)));
    return (res as any).count ?? 0;
  },
};

export const ParticipantRepo = {
  async findByDocument(kind: "CPF" | "PASSAPORTE", value: string): Promise<Participant | null> {
    const rows = await db
      .select()
      .from(participants)
      .where(and(eq(participants.documentKind, kind), eq(participants.documentValue, value)))
      .limit(1);
    return rows[0] ? mapParticipantRow(rows[0]) : null;
  },

  async findById(id: string): Promise<Participant | null> {
    const rows = await db.select().from(participants).where(eq(participants.id, id)).limit(1);
    return rows[0] ? mapParticipantRow(rows[0]) : null;
  },

  async findByEmail(email: string): Promise<Participant | null> {
    const rows = await db.select().from(participants).where(eq(participants.email, email)).limit(1);
    return rows[0] ? mapParticipantRow(rows[0]) : null;
  },

  async save(p: Participant): Promise<void> {
    await db.insert(participants).values({
      id: p.id.toString(),
      name: p.name.value,
      email: p.email.value,
      documentKind: p.document.kind,
      documentValue: p.document.value,
      phone: p.phone?.value ?? null,
      company: p.company,
      role: p.role,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });
  },

  async update(p: Participant): Promise<void> {
    await db
      .update(participants)
      .set({
        name: p.name.value,
        email: p.email.value,
        phone: p.phone?.value ?? null,
        company: p.company,
        role: p.role,
        updatedAt: p.updatedAt,
      })
      .where(eq(participants.id, p.id.toString()));
  },
};

export const CouponRepo = {
  async findByCode(code: string): Promise<Coupon | null> {
    const rows = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1);
    return rows[0]
      ? Coupon.reconstitute({
          id: Identifier.fromExisting(rows[0].id),
          props: {
            code: rows[0].code,
            type: rows[0].type as Coupon["type"],
            value: rows[0].value,
            eventId: rows[0].eventId,
            maxUses: rows[0].maxUses,
            uses: rows[0].uses,
            active: rows[0].active,
            validUntil: rows[0].validUntil,
          },
        })
      : null;
  },

  async save(c: Coupon): Promise<void> {
    await db.insert(coupons).values({
      id: c.id.toString(),
      code: c.code,
      type: c.type,
      value: c.value,
      eventId: c.eventId,
      maxUses: c.maxUses,
      uses: c.uses,
      active: c.active,
      validUntil: c.validUntil,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
  },

  async update(c: Coupon): Promise<void> {
    await db
      .update(coupons)
      .set({
        uses: c.uses,
        active: c.active,
        updatedAt: c.updatedAt,
      })
      .where(eq(coupons.id, c.id.toString()));
  },
};

export const RegistrationRepo = {
  async findById(id: string): Promise<Registration | null> {
    const rows = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1);
    return rows[0] ? mapRegistrationRow(rows[0]) : null;
  },

  async findByCode(code: string): Promise<Registration | null> {
    const rows = await db
      .select()
      .from(registrations)
      .where(eq(registrations.code, code))
      .limit(1);
    return rows[0] ? mapRegistrationRow(rows[0]) : null;
  },

  async listByEvent(eventId: string): Promise<Registration[]> {
    const rows = await db
      .select()
      .from(registrations)
      .where(eq(registrations.eventId, eventId))
      .orderBy(desc(registrations.createdAt));
    return rows.map(mapRegistrationRow);
  },

  async listByParticipant(participantId: string): Promise<Registration[]> {
    const rows = await db
      .select()
      .from(registrations)
      .where(eq(registrations.participantId, participantId))
      .orderBy(desc(registrations.createdAt));
    return rows.map(mapRegistrationRow);
  },

  async findByCredentialToken(token: string): Promise<Registration | null> {
    const rows = await db
      .select()
      .from(registrations)
      .where(eq(registrations.credentialToken, token))
      .limit(1);
    return rows[0] ? mapRegistrationRow(rows[0]) : null;
  },

  async nextWaitlistPosition(eventId: string): Promise<number> {
    const r = await db
      .select({ c: count() })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "LISTA_ESPERA")));
    return Number(r[0]?.c ?? 0) + 1;
  },

  async findExpiredReservations(now = new Date()): Promise<Registration[]> {
    const rows = await db
      .select()
      .from(registrations)
      .where(
        and(
          or(eq(registrations.status, "PENDENTE"), eq(registrations.status, "AGUARDANDO_PAGAMENTO")),
          isNull(registrations.reservationExpiresAt),
        ),
      );
    // filtro com lt no timestamp
    const rows2 = await db
      .select()
      .from(registrations)
      .where(
        and(
          or(eq(registrations.status, "PENDENTE"), eq(registrations.status, "AGUARDANDO_PAGAMENTO")),
          lt(registrations.reservationExpiresAt, now),
        ),
      );
    // dedup
    const seen = new Set<string>();
    const out: Registration[] = [];
    for (const r of rows2) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        out.push(mapRegistrationRow(r));
      }
    }
    return out;
  },

  async promoteNextFromWaitlist(eventId: string): Promise<Registration | null> {
    const rows = await db
      .select()
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "LISTA_ESPERA")))
      .orderBy(asc(registrations.waitlistPosition))
      .limit(1);
    return rows[0] ? mapRegistrationRow(rows[0]) : null;
  },

  async save(r: Registration): Promise<void> {
    await db.insert(registrations).values({
      id: r.id.toString(),
      code: r.code,
      eventId: r.eventId,
      participantId: r.participantId,
      lotId: r.lotId,
      status: r.status,
      contractedPriceCents: r.contractedPrice.cents,
      discountAmountCents: r.discountAmount.cents,
      finalPriceCents: r.finalPrice.cents,
      couponId: r.couponId,
      answers: r.answers as unknown as object,
      consentTerms: true,
      consentMarketing: (r as any).props.consentMarketing,
      reservationExpiresAt: r.reservationExpiresAt,
      waitlistPosition: r.waitlistPosition,
      cancellationReason: (r as any).props.cancellationReason ?? null,
      canceledAt: r.canceledAt,
      confirmedAt: r.confirmedAt,
      credentialToken: r.credentialToken,
      credentialQrPayload: r.credentialQrPayload,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  },

  async update(r: Registration): Promise<void> {
    await db
      .update(registrations)
      .set({
        status: r.status,
        lotId: r.lotId,
        contractedPriceCents: r.contractedPrice.cents,
        discountAmountCents: r.discountAmount.cents,
        finalPriceCents: r.finalPrice.cents,
        couponId: r.couponId,
        answers: r.answers as unknown as object,
        reservationExpiresAt: r.reservationExpiresAt,
        waitlistPosition: r.waitlistPosition,
        cancellationReason: (r as any).props.cancellationReason ?? null,
        canceledAt: r.canceledAt,
        confirmedAt: r.confirmedAt,
        credentialToken: r.credentialToken,
        credentialQrPayload: r.credentialQrPayload,
        updatedAt: r.updatedAt,
      })
      .where(eq(registrations.id, r.id.toString()));
  },
};

export const PaymentRepo = {
  async findByRegistration(registrationId: string): Promise<Payment | null> {
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.registrationId, registrationId))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    return rows[0] ? mapPaymentRow(rows[0]) : null;
  },

  async findByGatewayOrderId(id: string): Promise<Payment | null> {
    const rows = await db.select().from(payments).where(eq(payments.gatewayOrderId, id)).limit(1);
    return rows[0] ? mapPaymentRow(rows[0]) : null;
  },

  async save(p: Payment): Promise<void> {
    await db.insert(payments).values({
      id: p.id.toString(),
      registrationId: p.registrationId,
      externalReference: p.externalReference,
      gatewayOrderId: p.gatewayOrderId,
      amountCents: p.amount.cents,
      status: p.status,
      method: p.method,
      payloadRaw: (p as any).props.payloadRaw ?? null,
      paidAt: p.paidAt,
      refundedAt: p.refundedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    });
  },

  async update(p: Payment): Promise<void> {
    await db
      .update(payments)
      .set({
        gatewayOrderId: p.gatewayOrderId,
        status: p.status,
        method: p.method,
        payloadRaw: (p as any).props.payloadRaw ?? null,
        paidAt: p.paidAt,
        refundedAt: p.refundedAt,
        updatedAt: p.updatedAt,
      })
      .where(eq(payments.id, p.id.toString()));
  },
};

export const CheckInRepo = {
  async findByRegistration(registrationId: string): Promise<CheckIn | null> {
    const rows = await db
      .select()
      .from(checkIns)
      .where(eq(checkIns.registrationId, registrationId))
      .limit(1);
    if (!rows[0]) return null;
    return mapCheckInRow(rows[0]);
  },

  async save(c: CheckIn): Promise<void> {
    await db.insert(checkIns).values({
      id: c.id.toString(),
      registrationId: c.registrationId,
      eventId: c.eventId,
      status: c.status,
      checkedInAt: c.checkedInAt,
      operatorId: (c as any).props.operatorId ?? null,
      operatorName: (c as any).props.operatorName ?? null,
      note: (c as any).props.note ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
  },

  async update(c: CheckIn): Promise<void> {
    await db
      .update(checkIns)
      .set({
        status: c.status,
        checkedInAt: c.checkedInAt,
        operatorId: (c as any).props.operatorId ?? null,
        operatorName: (c as any).props.operatorName ?? null,
        note: (c as any).props.note ?? null,
        updatedAt: c.updatedAt,
      })
      .where(eq(checkIns.id, c.id.toString()));
  },
};

export const CertificateRepo = {
  async findByRegistration(registrationId: string): Promise<Certificate | null> {
    const rows = await db
      .select()
      .from(certificates)
      .where(eq(certificates.registrationId, registrationId))
      .limit(1);
    return rows[0] ? mapCertificateRow(rows[0]) : null;
  },

  async findByCode(code: string): Promise<Certificate | null> {
    const rows = await db.select().from(certificates).where(eq(certificates.code, code)).limit(1);
    return rows[0] ? mapCertificateRow(rows[0]) : null;
  },

  async save(c: Certificate): Promise<void> {
    await db.insert(certificates).values({
      id: c.id.toString(),
      registrationId: c.registrationId,
      eventId: c.eventId,
      participantName: c.participantName,
      eventTitle: c.eventTitle,
      hours: c.hours,
      code: c.code,
      issuedAt: c.issuedAt ?? new Date(),
    });
  },
};

export const AuditLogRepo = {
  async log(entry: AuditLog): Promise<void> {
    await db.insert(auditLogs).values({
      id: entry.id.toString(),
      userId: entry.userId,
      userEmail: (entry as any).props.userEmail ?? null,
      ip: (entry as any).props.ip ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      prevState: (entry as any).props.prevState ?? null,
      newState: (entry as any).props.newState ?? null,
      createdAt: entry.createdAt,
    });
  },
};

export const UserRepo = {
  async findByGlobalId(globalId: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.globalId, globalId)).limit(1);
    return rows[0] ? mapUserRow(rows[0]) : null;
  },
};
