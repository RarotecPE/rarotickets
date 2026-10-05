/**
 * Smoke test ponta a ponta contra a API em execução (localhost:3000).
 * Cobre: inscrição gratuita, cupom, PIX, credencial, check-in, cancelamento e relatórios.
 */
const BASE = 'http://localhost:3000/api/v1';

let cookies = '';
const auth = async (email: string, password: string) => {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  cookies = (response.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(';')[0]).join('; ');
  return response.json();
};

const call = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { cookie: cookies } : {}),
      ...(init.headers ?? {}),
    },
  });
  const received = (response.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(';')[0]);
  if (received.length > 0) cookies = [...new Set([...cookies.split('; '), ...received])].filter(Boolean).join('; ');
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body };
};

const ok = (label: string, condition: boolean, extra = '') =>
  console.log(`${condition ? 'PASS' : 'FALHA'} ${label}${extra ? ` — ${extra}` : ''}`);

const requiredAnswers = async (slugOrId: string) => {
  const detail = await call(`/events/${slugOrId}`);
  const fields = (detail.body?.data?.formFields ?? []) as Array<{
    fieldKey: string;
    fieldType: string;
    isRequired: boolean;
    options: string[];
  }>;
  return fields
    .filter((field) => field.isRequired)
    .map((field) => {
      if (field.fieldType === 'SIM_NAO') return { fieldKey: field.fieldKey, value: 'NAO' };
      if (field.fieldType === 'DATA') return { fieldKey: field.fieldKey, value: '1990-01-01' };
      if (field.fieldType === 'NUMERO') return { fieldKey: field.fieldKey, value: '1' };
      if (field.options.length > 0) return { fieldKey: field.fieldKey, value: field.options[0] };
      if (field.fieldType === 'EMAIL') return { fieldKey: field.fieldKey, value: `smoke.${stamp}@exemplo.com` };
      if (field.fieldType === 'CPF') return { fieldKey: field.fieldKey, value: '52998224725' };
      if (field.fieldType === 'TELEFONE') return { fieldKey: field.fieldKey, value: '81999990000' };
      return { fieldKey: field.fieldKey, value: 'Resposta do smoke test' };
    });
};

const stamp = Date.now().toString().slice(-6);

/** Gera um CPF válido a partir de uma base, para que cada execução tenha participante próprio. */
const makeCpf = (base: string): string => {
  const digits = base.padEnd(9, '7').slice(0, 9).split('').map(Number);
  const check = (values: number[]): number => {
    const weight = values.length + 1;
    const sum = values.reduce((total, digit, index) => total + digit * (weight - index), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = check(digits);
  const second = check([...digits, first]);
  return [...digits, first, second].join('');
};

const freeCpf = makeCpf(`1${stamp}`);
const paidCpf = makeCpf(`2${stamp}`);

const main = async () => {
  const publicAgenda = (await call('/events')).body.data as Array<{ slug: string; title: string }>;
  const publicFree = publicAgenda.find((event) => event.title.includes('Meetup'))!;
  const publicPaid = publicAgenda.find((event) => event.title.includes('Workshop'))!;
  const freeAnswers = (await requiredAnswers(publicFree.slug)).map((answer) =>
    answer.fieldKey === 'cpf' ? { ...answer, value: freeCpf } : answer,
  );
  const paidAnswers = (await requiredAnswers(publicPaid.slug)).map((answer) =>
    answer.fieldKey === 'cpf' ? { ...answer, value: paidCpf } : answer,
  );

  await auth('admin@rarotickets.com.br', 'RaroTickets2026');
  const agenda = (await call('/admin/events')).body.data as Array<{ id: string; title: string; slug: string }>;
  const gratuito = agenda.find((event) => event.title.includes('Meetup'))!;
  const pago = agenda.find((event) => event.title.includes('Workshop'))!;

  // 1. Inscrição em evento gratuito
  const free = await call('/registrations', {
    method: 'POST',
    body: JSON.stringify({
      eventId: gratuito.id,
      participant: { name: 'Smoke Gratuito', email: `smoke.gratuito.${stamp}@exemplo.com`, cpf: freeCpf, phone: null, city: 'Recife', state: 'PE', company: null, jobTitle: null },
      answers: freeAnswers,
      consents: { termsVersion: '2026-01', privacyVersion: '2026-01', marketingAccepted: false },
      couponCode: null,
    }),
  });
  ok('inscrição gratuita', free.status === 201, `status=${free.status} code=${free.body?.data?.registration?.code} erro=${free.body?.error?.message ?? ''}`);

  // 1b. Sessão do participante (o client abre automaticamente após a inscrição)
  const session = await call('/participant/session', {
    method: 'POST',
    body: JSON.stringify({ email: `smoke.gratuito.${stamp}@exemplo.com`, cpf: freeCpf }),
  });
  ok('sessão do participante', session.status === 200, `status=${session.status} ${session.body?.error?.message ?? ''}`);

  // 2. Cupom
  const coupon = await call('/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ eventId: pago.id, code: 'RARO10', amountCents: 10000 }),
  });
  ok('cupom percentual', coupon.status === 200 && coupon.body.data.discountCents === 1000, JSON.stringify(coupon.body?.data ?? coupon.body));

  // 3. Inscrição paga com cupom
  const paid = await call('/registrations', {
    method: 'POST',
    body: JSON.stringify({
      eventId: pago.id,
      participant: { name: 'Smoke Pago', email: `smoke.pago.${stamp}@exemplo.com`, cpf: paidCpf, phone: '81999990000', city: 'Olinda', state: 'PE', company: 'Raro', jobTitle: 'Dev' },
      answers: paidAnswers,
      consents: { termsVersion: '2026-01', privacyVersion: '2026-01', marketingAccepted: true },
      couponCode: 'RARO10',
    }),
  });
  const paidRegistration = paid.body?.data?.registration;
  ok('inscrição paga com cupom', paid.status === 201 && paidRegistration?.discountCents > 0 && paidRegistration?.finalAmountCents < paidRegistration?.priceCents, `status=${paid.status} final=${paidRegistration?.finalAmountCents} erro=${paid.body?.error?.message ?? ''}`);
  ok('exige pagamento', paid.body?.data?.requiresPayment === true);

  // 4. PIX
  const paidSession = await call('/participant/session', {
    method: 'POST',
    body: JSON.stringify({ email: `smoke.pago.${stamp}@exemplo.com`, cpf: paidCpf }),
  });
  ok('sessão do participante pago', paidSession.status === 200, `status=${paidSession.status}`);

  const pix = await call(`/registrations/${paidRegistration.id}/payments`, {
    method: 'POST',
    body: JSON.stringify({ method: 'PIX', installments: 1 }),
  });
  const paymentId = pix.body?.data?.payment?.id;
  ok('cobrança PIX', pix.status === 201 && Boolean(paymentId), `status=${pix.status} ref=${pix.body?.data?.payment?.reference}`);
  ok('referência interna', /^EVENTO-\d+-INSCRICAO-\d+$/.test(pix.body?.data?.payment?.reference ?? ''), pix.body?.data?.payment?.reference);

  // 5. Simula pagamento (equivale ao webhook do PagBank)
  const simulated = await call(`/dev/payments/${paymentId}/simulate`, { method: 'POST', body: JSON.stringify({}) });
  ok('simulação de pagamento', simulated.status === 200, `status=${simulated.status}`);

  const detail = await call(`/registrations/${paidRegistration.code}`);
  ok('inscrição confirmada', detail.body?.data?.registration?.status === 'CONFIRMADA', detail.body?.data?.registration?.status);

  // 6. Credencial
  const credential = await call(`/registrations/${paidRegistration.code}/credential`);
  ok('credencial emitida', credential.status === 200 && Boolean(credential.body?.data?.token), `status=${credential.status}`);

  // 7. Check-in pelo código
  const lookup = await call(`/admin/check-ins/lookup?code=${paidRegistration.code}`);
  ok('consulta da credencial', lookup.status === 200 && lookup.body.data.canCheckIn === true, JSON.stringify(lookup.body?.data?.reason ?? ''));

  const checkIn = await call('/check-in', {
    method: 'POST',
    body: JSON.stringify({ code: paidRegistration.code, method: 'MANUAL', override: false, overrideReason: null }),
  });
  ok('check-in registrado', checkIn.status === 201 || checkIn.status === 200, `status=${checkIn.status}`);

  const duplicate = await call('/check-in', {
    method: 'POST',
    body: JSON.stringify({ code: paidRegistration.code, method: 'MANUAL', override: false, overrideReason: null }),
  });
  ok('check-in duplicado recusado', duplicate.status >= 400, `status=${duplicate.status}`);

  const board = await call(`/admin/check-ins?eventId=${pago.id}`);
  ok('painel do credenciamento', board.status === 200 && Array.isArray(board.body.data) && board.body.data[0]?.registrationCode !== undefined, JSON.stringify(board.body?.data?.[0] ?? {}).slice(0, 80));
  ok('estatísticas do credenciamento', typeof board.body?.meta?.stats?.attendanceRateLabel === 'string', JSON.stringify(board.body?.meta?.stats ?? {}));

  // 8. Certificado do evento pago (se elegível)
  const issueCertificate = await call(`/admin/registrations/${paidRegistration.id}/certificate`, { method: 'POST' });
  ok('emissão de certificado', [200, 201].includes(issueCertificate.status), `status=${issueCertificate.status} ${issueCertificate.body?.error?.message ?? ''}`);

  const certificateCode = issueCertificate.body?.data?.certificate?.code;
  if (certificateCode) {
    const validation = await call(`/certificates/${certificateCode}/validate`);
    ok('validação pública do certificado', validation.status === 200 && validation.body.data.valid === true, certificateCode);
  }

  // 9. Cancelamento liberando vaga
  const before = (await call(`/admin/events/${pago.id}`)).body.data.seatUsage;
  const cancelled = await call(`/participant/registrations/${paidRegistration.code}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Smoke test' }),
  });
  ok('cancelamento pela API pública', cancelled.status === 200, `status=${cancelled.status}`);
  const after = (await call(`/admin/events/${pago.id}`)).body.data.seatUsage;
  ok('vaga liberada', after.occupiedSeats + after.reservedSeats < before.occupiedSeats + before.reservedSeats, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);

  // 10. Relatórios e auditoria
  const reports = ['registrations-by-event', 'attendance-list', 'check-ins', 'revenue-by-lote', 'participants-by-location', 'registration-funnel'];
  for (const report of reports) {
    const result = await call(`/admin/reports/${report}?eventId=${pago.id}`);
    ok(`relatório ${report}`, result.status === 200, `status=${result.status}`);
  }
  const audit = await call('/admin/audit-logs?perPage=5');
  ok('auditoria', audit.status === 200 && (audit.body.data as unknown[]).length > 0, `registros=${(audit.body.data as unknown[]).length}`);

  const dashboard = await call('/admin/dashboard');
  ok('dashboard com os 10 indicadores (§34)', dashboard.status === 200 && (dashboard.body.data.indicators as unknown[]).length === 10 && (dashboard.body.data.indicators as Array<{ key: string }>).some((item) => item.key === 'taxa_comparecimento'), `indicadores=${(dashboard.body?.data?.indicators ?? []).length}`);
};

main().catch((error) => {
  console.error('Falha inesperada no smoke test:', error);
  process.exitCode = 1;
});

export {};
