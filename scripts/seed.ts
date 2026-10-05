import { buildAppConfig } from '@server/config/app.config';
import { initializeDatabase } from '@server/bootstrap/database.bootstrap';
import { buildContainer } from '@server/di/container';
import { ConsoleLogger } from '@server/infrastructure/logger/logger';
import { SimulatedPaymentProvider } from '@server/infrastructure/providers/simulated-payment.provider';
import { stopEmbeddedDatabase } from '@server/infrastructure/database/embedded-database.provider';
import { addDays } from '../src/shared/utils/date.util';
import { ROLE_DEFAULT_PERMISSIONS } from '@core/domain/permissions';
import type { UserRole } from '@core/domain/permissions';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const logger = new ConsoleLogger({ level: 'info', prefix: 'seed' });

type SeedAnswer = { fieldKey: string; value: string | null };

const FORM_FIELD_VALUES: Record<string, string> = {
  nome: 'name',
  name: 'name',
  mail: 'email',
  cpf: 'cpf',
  telefone: 'phone',
  whatsapp: 'phone',
  empresa: 'company',
  companhia: 'company',
  cidade: 'city',
  cargo: 'jobTitle',
  restricoes: 'diet',
  imagem: 'image',
  participou: 'attended',
};

/**
 * Monta as respostas usando os identificadores reais do formulário do evento —
 * evita acoplar o seed a como o domínio deriva `fieldKey` a partir do rótulo.
 */
type SeedFormRepository = {
  listByEvent: (params: { eventId: string; onlyActive?: boolean }) => Promise<Array<{ label: string; fieldKey: string }>>;
};

async function buildAnswers(params: {
  formRepository: SeedFormRepository;
  eventId: string;
  person: { name: string; email: string; cpf: string; city: string; company: string; phone: string };
  index: number;
}): Promise<SeedAnswer[]> {
  const fields = await params.formRepository.listByEvent({ eventId: params.eventId, onlyActive: true });
  const answers: SeedAnswer[] = [];

  for (const field of fields) {
    const label = field.label.toLowerCase();
    const match = Object.keys(FORM_FIELD_VALUES).find((token) => label.includes(token));
    const key = match ? FORM_FIELD_VALUES[match] : null;
    if (!key) continue;

    if (key === 'diet') {
      answers.push({ fieldKey: field.fieldKey, value: params.index % 2 === 0 ? 'Nenhuma' : 'Vegetariano' });
    } else if (key === 'image') {
      answers.push({ fieldKey: field.fieldKey, value: 'SIM' });
    } else if (key === 'attended') {
      answers.push({ fieldKey: field.fieldKey, value: 'SIM' });
    } else {
      const value = (params.person as Record<string, string>)[key] ?? null;
      if (value !== null) answers.push({ fieldKey: field.fieldKey, value });
    }
  }

  return answers;
}


function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Seed de desenvolvimento: poucas linhas fictícias, apenas para visualizar a
 * interface com dados reais (eventos, inscrições, pagamento aprovado, check-in
 * e certificado). Nunca deve rodar em produção.
 */
async function main(): Promise<void> {
  const config = buildAppConfig();
  if (config.isProduction) {
    throw new Error('O seed é exclusivo de desenvolvimento.');
  }

  const { client } = await initializeDatabase({ config, logger });
  const container = buildContainer({ config, db: client, logger });
  const { repositories, useCases, providers, services } = container;

  const existing = await client.queryOne<{ total: string }>({
    sql: `SELECT COUNT(*)::text AS total FROM events`,
  });
  if (Number(existing?.total ?? 0) > 0) {
    logger.info('Banco já possui eventos cadastrados — seed não aplicado novamente.');
    await client.close();
    await stopEmbeddedDatabase();
    return;
  }

  // ------------------------------------------------------------------ usuários
  const seedUsers = [
    { name: 'Ana Administradora', email: 'admin@rarotickets.com.br', role: 'ADMINISTRADOR', password: 'RaroTickets2026' },
    { name: 'Bruno Financeiro', email: 'financeiro@rarotickets.com.br', role: 'FINANCEIRO', password: 'RaroTickets2026' },
    { name: 'Carla Check-in', email: 'checkin@rarotickets.com.br', role: 'CHECKIN', password: 'RaroTickets2026' },
  ];

  const userIds: Record<string, string> = {};
  for (const user of seedUsers) {
    const existingUser = await client.queryOne<{ id: string }>({
      sql: 'SELECT id FROM users WHERE lower(email) = lower($1)',
      params: [user.email],
    });
    if (existingUser) {
      userIds[user.role] = existingUser.id;
      continue;
    }

    const passwordHash = await providers.passwordHasher.hash({ plain: user.password });
    const userId = generateUuid();
    const permissions = ROLE_DEFAULT_PERMISSIONS[user.role as UserRole] ?? [];
    await client.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, role, permissions, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6::text[], true, now(), now())`,
      params: [userId, user.name, user.email, passwordHash, user.role, permissions],
    });
    userIds[user.role] = userId;
    logger.info(`Usuário fictício criado: ${user.email} / ${user.password}`);
  }
  const adminId = userIds.ADMINISTRADOR ?? '';
  const checkinId = userIds.CHECKIN ?? '';

  // ------------------------------------------------------------------- eventos
  const today = new Date();
  const workshop = await useCases.createEventUseCase.execute({
    title: 'Workshop Raro de Tecnologia 2026',
    summary: 'Dois dias de conteúdo prático sobre produto, dados e arquitetura.',
    description:
      'O Workshop Raro reúne profissionais para uma imersão prática em arquitetura de software, produtos digitais e dados. Vagas limitadas.',
    imageUrl: null,
    startDate: isoDate(addDays(today, 20)),
    endDate: isoDate(addDays(today, 21)),
    startTime: '09:00',
    endTime: '18:00',
    isOnline: false,
    onlineUrl: null,
    venueName: 'Raro Hub Recife',
    address: 'Rua das Confianças, 123',
    city: 'Recife',
    state: 'PE',
    capacity: 40,
    registrationStart: isoDate(addDays(today, -10)),
    registrationEnd: isoDate(addDays(today, 18)),
    responsibleName: 'Ana Administradora',
    responsibleEmail: 'admin@rarotickets.com.br',
    workloadHours: 16,
    type: 'PAGO',
    certificateEnabled: true,
    certificateText: 'Participação no Workshop Raro de Tecnologia 2026',
    certificateRequiresAttendance: true,
    waitlistEnabled: true,
    waitlistAutoPromote: false,
    seatReservationMinutes: 15,
    maxInstallments: 6,
    allowPix: true,
    allowBoleto: true,
    allowCreditCard: true,
    minInstallmentCents: 1000,
    formFields: [
      { label: 'Nome completo', fieldType: 'TEXTO', isRequired: true, orderIndex: 0 },
      { label: 'E-mail', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
      { label: 'CPF', fieldType: 'CPF', isRequired: true, orderIndex: 2 },
      { label: 'Telefone/WhatsApp', fieldType: 'TELEFONE', isRequired: true, orderIndex: 3 },
      { label: 'Empresa', fieldType: 'TEXTO', isRequired: false, orderIndex: 4 },
      { label: 'Cargo', fieldType: 'TEXTO', isRequired: false, orderIndex: 5 },
      { label: 'Cidade', fieldType: 'TEXTO', isRequired: false, orderIndex: 6 },
      {
        label: 'Restrições alimentares',
        fieldType: 'SELECAO',
        isRequired: false,
        orderIndex: 7,
        options: ['Nenhuma', 'Vegetariano', 'Vegano', 'Sem lactose', 'Sem glúten'],
      },
      { label: 'Autorizo o uso da minha imagem no evento', fieldType: 'SIM_NAO', isRequired: false, orderIndex: 8 },
    ],
    actorUserId: adminId,
    actorName: 'Ana Administradora',
    ip: '127.0.0.1',
  });
  if (workshop.isFailure) throw new Error(`Falha ao criar evento pago: ${workshop.error.message}`);
  const workshopId = workshop.value.event.id;

  const meetup = await useCases.createEventUseCase.execute({
    title: 'Meetup Raro Online: Carreira em Tecnologia',
    summary: 'Encontro gratuito e remoto sobre transição de carreira.',
    description: 'Um encontro aberto, gratuito e remoto para conversar sobre carreira, comunidade e aprendizado contínuo.',
    imageUrl: null,
    startDate: isoDate(addDays(today, 7)),
    endDate: isoDate(addDays(today, 7)),
    startTime: '19:30',
    endTime: '21:30',
    isOnline: true,
    onlineUrl: 'https://meet.rarotickets.com.br/carreira',
    venueName: null,
    address: null,
    city: 'Recife',
    state: 'PE',
    capacity: 300,
    registrationStart: isoDate(addDays(today, -3)),
    registrationEnd: isoDate(addDays(today, 6)),
    responsibleName: 'Ana Administradora',
    responsibleEmail: 'admin@rarotickets.com.br',
    workloadHours: 2,
    type: 'GRATUITO',
    certificateEnabled: true,
    certificateText: 'Participação no Meetup Raro Online',
    certificateRequiresAttendance: false,
    waitlistEnabled: true,
    waitlistAutoPromote: true,
    formFields: [
      { label: 'Nome completo', fieldType: 'TEXTO', isRequired: true, orderIndex: 0 },
      { label: 'E-mail', fieldType: 'EMAIL', isRequired: true, orderIndex: 1 },
      { label: 'CPF', fieldType: 'CPF', isRequired: true, orderIndex: 2 },
      { label: 'Já participou de eventos Raro?', fieldType: 'SIM_NAO', isRequired: false, orderIndex: 3 },
    ],
    actorUserId: adminId,
    actorName: 'Ana Administradora',
    ip: '127.0.0.1',
  });
  if (meetup.isFailure) throw new Error(`Falha ao criar evento gratuito: ${meetup.error.message}`);
  const meetupId = meetup.value.event.id;

  const rascunho = await useCases.createEventUseCase.execute({
    title: 'Raro Summit 2026 (em preparação)',
    summary: 'Rascunho interno do maior encontro do ano.',
    description: 'Evento em fase de planejamento — não visível ao público.',
    startDate: isoDate(addDays(today, 120)),
    endDate: isoDate(addDays(today, 122)),
    startTime: '08:30',
    endTime: '18:30',
    isOnline: false,
    venueName: 'Centro de Convenções',
    address: 'Av. Boa Viagem, 5000',
    city: 'Recife',
    state: 'PE',
    capacity: 800,
    registrationStart: isoDate(addDays(today, 60)),
    registrationEnd: isoDate(addDays(today, 115)),
    responsibleName: 'Ana Administradora',
    workloadHours: 24,
    type: 'PAGO',
    certificateEnabled: true,
    actorUserId: adminId,
    actorName: 'Ana Administradora',
    ip: '127.0.0.1',
  });
  if (rascunho.isFailure) throw new Error(`Falha ao criar rascunho: ${rascunho.error.message}`);

  // Inscrições abertas: os eventos fictícios precisam aceitar público (§2).
  for (const eventId of [workshopId, meetupId]) {
    const opened = await useCases.changeEventStatusUseCase.execute({
      eventId,
      nextStatus: 'INSCRICOES_ABERTAS',
      reason: 'Seed de desenvolvimento',
      actorUserId: adminId,
      actorName: 'Ana Administradora',
      ip: '127.0.0.1',
    });
    if (opened.isFailure) throw new Error(`Falha ao abrir inscrições: ${opened.error.message}`);
  }

  // --------------------------------------------------------------------- lotes
  const loteResult = await useCases.manageEventLoteUseCase.execute({
    eventId: workshopId,
    action: 'CREATE',
    name: '1º lote — Lote promocional',
    description: 'Vagas com desconto para as primeiras inscrições.',
    startDate: isoDate(addDays(today, -10)),
    endDate: isoDate(addDays(today, 5)),
    maxQuantity: 20,
    priceCents: 24900,
    isActive: true,
    orderIndex: 0,
    actorUserId: adminId,
    actorName: 'Ana Administradora',
    ip: '127.0.0.1',
  });
  if (loteResult.isFailure) throw new Error(`Falha ao criar lote: ${loteResult.error.message}`);

  const lote2Result = await useCases.manageEventLoteUseCase.execute({
    eventId: workshopId,
    action: 'CREATE',
    name: '2º lote',
    description: 'Vagas regulares.',
    startDate: isoDate(addDays(today, 5)),
    endDate: isoDate(addDays(today, 18)),
    maxQuantity: 20,
    priceCents: 34900,
    isActive: true,
    orderIndex: 1,
    actorUserId: adminId,
    actorName: 'Ana Administradora',
    ip: '127.0.0.1',
  });
  if (lote2Result.isFailure) throw new Error(`Falha ao criar lote 2: ${lote2Result.error.message}`);

  // ------------------------------------------------------------------ programa
  const speaker = await useCases.manageEventProgramUseCase.execute({
    eventId: workshopId,
    action: 'ADD_SPEAKER',
    name: 'Marina Castro',
    bio: 'Especialista em arquitetura de software e sistemas distribuídos.',
    institution: 'Raro Labs',
    actorUserId: adminId,
    actorName: 'Ana Administradora',
  });
  const speakerId = speaker.isSuccess ? speaker.value.speaker?.id ?? null : null;

  await useCases.manageEventProgramUseCase.execute({
    eventId: workshopId,
    action: 'ADD_ACTIVITY',
    speakerId,
    title: 'Abertura e panorama de arquitetura',
    description: 'Boas-vindas e visão geral do conteúdo.',
    startAt: `${isoDate(addDays(today, 20))} 09:00`,
    endAt: `${isoDate(addDays(today, 20))} 10:30`,
    room: 'Auditório principal',
    actorUserId: adminId,
    actorName: 'Ana Administradora',
  });

  // -------------------------------------------------------------------- cupons
  await useCases.createCouponUseCase.execute({
    eventId: workshopId,
    code: 'RARO10',
    type: 'PERCENTUAL',
    value: 10,
    maxUses: 50,
    startDate: isoDate(addDays(today, -10)),
    endDate: isoDate(addDays(today, 18)),
    isActive: true,
    actorUserId: adminId,
    actorName: 'Ana Administradora',
  });
  await useCases.createCouponUseCase.execute({
    eventId: workshopId,
    code: 'CORTESIA-EQUIPE',
    type: 'CORTESIA',
    value: 0,
    maxUses: 5,
    startDate: isoDate(addDays(today, -10)),
    endDate: isoDate(addDays(today, 18)),
    isActive: true,
    actorUserId: adminId,
    actorName: 'Ana Administradora',
  });
  await useCases.createCouponUseCase.execute({
    eventId: workshopId,
    code: 'RARO50',
    type: 'VALOR_FIXO',
    value: 50,
    maxUses: 10,
    startDate: isoDate(addDays(today, -10)),
    endDate: isoDate(addDays(today, 18)),
    isActive: true,
    actorUserId: adminId,
    actorName: 'Ana Administradora',
  });

  // ------------------------------------------------------------------ inscrições
  const people = [
    { name: 'Diego Almeida', email: 'diego.almeida@exemplo.com', cpf: '39053344705', city: 'Recife', state: 'PE', company: 'Raro Labs' },
    { name: 'Elisa Nunes', email: 'elisa.nunes@exemplo.com', cpf: '11144477735', city: 'Olinda', state: 'PE', company: 'Tech Recife' },
    { name: 'Fábio Ramos', email: 'fabio.ramos@exemplo.com', cpf: '52998224725', city: 'Caruaru', state: 'PE', company: 'Freelancer' },
    { name: 'Gabriela Souza', email: 'gabriela.souza@exemplo.com', cpf: '86288366757', city: 'Salvador', state: 'BA', company: 'UFBA' },
    { name: 'Helena Lima', email: 'helena.lima@exemplo.com', cpf: '79320415030', city: 'São Paulo', state: 'SP', company: 'Banco Digital' },
  ];

  const registeredIds: string[] = [];
  for (const [index, person] of people.entries()) {
    const result = await useCases.registerForEventUseCase.execute({
      eventId: workshopId,
      participant: {
        name: person.name,
        email: person.email,
        cpf: person.cpf,
        phone: '81999998888',
        city: person.city,
        state: person.state,
        company: person.company,
      },
      answers: await buildAnswers({
        formRepository: repositories.eventFormRepository,
        eventId: workshopId,
        person: { ...person, phone: '81999998888' },
        index,
      }),
      consents: { termsVersion: '2026-01', privacyVersion: '2026-01', marketingAccepted: index % 2 === 0 },
      couponCode: index === 1 ? 'RARO10' : null,
      ip: '127.0.0.1',
    });

    if (result.isFailure) {
      logger.warn(`Inscrição fictícia não criada (${person.email}): ${result.error.message}`);
      continue;
    }
    registeredIds.push(result.value.registration.id);
    logger.info(`Inscrição criada: ${result.value.registration.code} — ${person.name}`);
  }

  // Duas inscrições gratuitas no meetup (uma confirmada e uma com check-in).
  const freeIds: string[] = [];
  for (const person of people.slice(0, 2)) {
    const result = await useCases.registerForEventUseCase.execute({
      eventId: meetupId,
      participant: {
        name: person.name,
        email: person.email,
        cpf: person.cpf,
        city: person.city,
        state: person.state,
      },
      answers: await buildAnswers({
        formRepository: repositories.eventFormRepository,
        eventId: meetupId,
        person: { ...person, phone: '81999998888' },
        index: 0,
      }),
      consents: { termsVersion: '2026-01', privacyVersion: '2026-01', marketingAccepted: true },
      ip: '127.0.0.1',
    });
    if (result.isSuccess) freeIds.push(result.value.registration.id);
  }

  // ------------------------------------------------- pagamento aprovado (PIX)
  const paidRegistrationId = registeredIds[0];
  if (paidRegistrationId) {
    const initiated = await useCases.initiatePaymentUseCase.execute({
      registrationId: paidRegistrationId,
      method: 'PIX',
      installments: 1,
      actorName: 'Diego Almeida',
    });

    if (initiated.isSuccess) {
      const paymentId = initiated.value.payment.id;
      const chargeId = initiated.value.payment.paymentData.qrCode ? initiated.value.payment.reference : null;
      const simulated = providers.paymentProvider;
      if (simulated instanceof SimulatedPaymentProvider) {
        const payment = await repositories.paymentRepository.findById(paymentId);
        const providerChargeId = payment?.transaction.providerChargeId ?? null;
        if (providerChargeId) simulated.simulatePayment({ providerChargeId });
      }
      const payment = await repositories.paymentRepository.findById(paymentId);
      if (payment) {
        const sync = await services.paymentStatusSyncService.execute({
          payment,
          providerStatus: 'PAID',
          at: new Date(),
          source: 'MANUAL',
          actorName: 'Seed',
        });
        if (sync.isFailure) logger.warn(`Falha ao confirmar pagamento fictício: ${sync.error.message}`);
        else logger.info(`Pagamento fictício ${chargeId ? '' : ''}confirmado (${payment.reference.value}).`);
      }
    } else {
      logger.warn(`Falha ao iniciar pagamento fictício: ${initiated.error.message}`);
    }
  }

  // Reserva temporária em aberto: segunda inscrição com boleto aguardando.
  const pendingRegistrationId = registeredIds[1];
  if (pendingRegistrationId) {
    const initiated = await useCases.initiatePaymentUseCase.execute({
      registrationId: pendingRegistrationId,
      method: 'BOLETO',
      actorName: 'Elisa Nunes',
    });
    if (initiated.isFailure) logger.warn(`Falha ao gerar boleto fictício: ${initiated.error.message}`);
  }

  // Cancelamento com liberação de vaga (terceira inscrição).
  const cancelledRegistrationId = registeredIds[2];
  if (cancelledRegistrationId) {
    const cancelled = await useCases.cancelRegistrationUseCase.execute({
      registrationId: cancelledRegistrationId,
      reason: 'Participante informou que não poderá comparecer ao evento',
      actorName: 'Ana Administradora',
      isAdministrative: true,
      ip: '127.0.0.1',
    });
    if (cancelled.isFailure) logger.warn(`Falha ao cancelar inscrição fictícia: ${cancelled.error.message}`);
  }

  // -------------------------------------------------------- check-in + certificado
  const meetupRegistrationId = freeIds[0];
  if (meetupRegistrationId) {
    const checkIn = await useCases.performCheckInUseCase.execute({
      registrationId: meetupRegistrationId,
      actorUserId: checkinId,
      actorName: 'Carla Check-in',
      ip: '127.0.0.1',
    });
    if (checkIn.isFailure) logger.warn(`Falha no check-in fictício: ${checkIn.error.message}`);

    const certificate = await useCases.issueCertificateUseCase.execute({
      registrationId: meetupRegistrationId,
      actorUserId: adminId,
      actorName: 'Ana Administradora',
      ip: '127.0.0.1',
    });
    if (certificate.isFailure) logger.warn(`Falha ao emitir certificado fictício: ${certificate.error.message}`);
    else logger.info(`Certificado fictício: ${certificate.value.certificate.code}`);
  }

  logger.info('Seed concluído. Acesse http://localhost:3000 com admin@rarotickets.com.br / RaroTickets2026');
  await client.close();
  await stopEmbeddedDatabase();
}

main().catch(async (error: unknown) => {
  logger.error('Falha no seed', { error: error instanceof Error ? error.message : String(error) });
  await stopEmbeddedDatabase();
  process.exit(1);
});
