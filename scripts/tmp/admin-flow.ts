/** Verifica os fluxos administrativos usados pelas telas do painel. */
const BASE = 'http://localhost:3000/api/v1';
let cookies = '';
const call = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(cookies ? { cookie: cookies } : {}), ...(init.headers ?? {}) },
  });
  const received = (response.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(';')[0]);
  if (received.length > 0) cookies = [...new Set([...cookies.split('; '), ...received])].filter(Boolean).join('; ');
  const text = await response.text();
  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  return { status: response.status, body: isJson && text ? JSON.parse(text) : null };
};
const ok = (label: string, condition: boolean, extra = '') =>
  console.log(`${condition ? 'PASS' : 'FALHA'} ${label}${extra ? ` — ${extra}` : ''}`);

const main = async () => {
  await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@rarotickets.com.br', password: 'RaroTickets2026' }) });
  const today = new Date();
  const plus = (days: number) => new Date(today.getTime() + days * 86_400_000).toISOString().slice(0, 10);

  const created = await call('/admin/events', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Evento de verificação',
      summary: 'Criado pelo script de verificação',
      description: 'Descrição do evento de verificação.',
      startDate: plus(30),
      endDate: plus(30),
      startTime: '09:00',
      endTime: '18:00',
      isOnline: false,
      venueName: 'Auditório Raro',
      address: 'Rua Exemplo, 100',
      city: 'Recife',
      state: 'PE',
      capacity: 60,
      registrationStart: plus(1),
      registrationEnd: plus(20),
      responsibleName: 'Ana Administradora',
      responsibleEmail: 'admin@rarotickets.com.br',
      workloadHours: 8,
      type: 'PAGO',
      certificateEnabled: true,
      waitlistEnabled: true,
      allowPix: true,
      allowBoleto: true,
      allowCreditCard: true,
      maxInstallments: 6,
      minInstallmentCents: 500,
      formFields: [
        { label: 'Nome completo', fieldType: 'TEXTO', isRequired: true },
        { label: 'E-mail', fieldType: 'EMAIL', isRequired: true },
      ],
    }),
  });
  const eventId = created.body?.data?.event?.id;
  ok('criar evento', created.status === 201 && Boolean(eventId), `status=${created.status} ${created.body?.error?.message ?? ''}`);

  const updated = await call(`/admin/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify({ fields: { title: 'Evento de verificação (editado)', capacity: 80 } }),
  });
  ok('atualizar evento', updated.status === 200 && updated.body?.data?.event?.capacity === 80, `status=${updated.status} ${updated.body?.error?.message ?? ''}`);

  const opened = await call(`/admin/events/${eventId}/status`, {
    method: 'POST',
    body: JSON.stringify({ nextStatus: 'INSCRICOES_ABERTAS', reason: 'verificação' }),
  });
  ok('abrir inscrições', opened.status === 200, `status=${opened.status} ${opened.body?.error?.message ?? ''}`);

  const lote = await call(`/admin/events/${eventId}/lotes`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'CREATE',
      name: '1º lote — verificação',
      startDate: plus(1),
      endDate: plus(20),
      maxQuantity: 40,
      priceCents: 15000,
      isActive: true,
    }),
  });
  ok('criar lote', lote.status === 200, `status=${lote.status} ${lote.body?.error?.message ?? ''}`);

  const form = await call(`/admin/events/${eventId}/form`, {
    method: 'PUT',
    body: JSON.stringify({
      fields: [
        { label: 'Nome completo', fieldType: 'TEXTO', isRequired: true },
        { label: 'E-mail', fieldType: 'EMAIL', isRequired: true },
        { label: 'Restrições alimentares', fieldType: 'SELECAO', options: ['Nenhuma', 'Vegetariano'] },
      ],
    }),
  });
  ok('salvar formulário', form.status === 200 && (form.body?.data?.fields ?? []).length === 3, `status=${form.status} v=${form.body?.data?.formVersion}`);

  const speaker = await call(`/admin/events/${eventId}/program`, {
    method: 'POST',
    body: JSON.stringify({ action: 'ADD_SPEAKER', name: 'Marina Castro', institution: 'Raro Labs', bio: 'Palestrante convidada' }),
  });
  ok('adicionar palestrante', speaker.status === 200, `status=${speaker.status} ${speaker.body?.error?.message ?? ''}`);
  const speakerId = speaker.body?.data?.speaker?.id ?? speaker.body?.data?.speakers?.[0]?.id;

  const activity = await call(`/admin/events/${eventId}/program`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'ADD_ACTIVITY',
      title: 'Abertura',
      description: 'Boas-vindas',
      speakerId: speakerId ?? null,
      startAt: `${plus(30)}T09:00:00.000Z`,
      endAt: `${plus(30)}T10:00:00.000Z`,
      room: 'Auditório',
    }),
  });
  ok('adicionar atividade', activity.status === 200, `status=${activity.status} ${activity.body?.error?.message ?? ''}`);

  const user = await call('/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Usuário Verificação', email: `verificacao.${Date.now()}@rarotickets.com.br`, password: 'SenhaForte2026', role: 'ATENDIMENTO' }),
  });
  ok('criar usuário', user.status === 201 || user.status === 200, `status=${user.status} ${user.body?.error?.message ?? ''}`);
  const userId = user.body?.data?.user?.id;
  if (userId) {
    const updatedUser = await call(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Usuário Verificado', isActive: true, role: 'CHECKIN' }),
    });
    ok('atualizar usuário', updatedUser.status === 200, `status=${updatedUser.status} ${updatedUser.body?.error?.message ?? ''}`);
  }

  const coupons = await call('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify({ eventId, code: 'VERIFICA10', type: 'PERCENTUAL', value: 10, maxUses: 5, startDate: plus(1), endDate: plus(20), isActive: true }),
  });
  ok('criar cupom', coupons.status === 201 || coupons.status === 200, `status=${coupons.status} ${coupons.body?.error?.message ?? ''}`);

  const checkIns = await call(`/admin/check-ins?eventId=${eventId}`);
  ok('credenciamento do evento novo', checkIns.status === 200 && Array.isArray(checkIns.body.data), `status=${checkIns.status}`);

  console.log('eventId criado:', eventId);
};
void main();

export {};
