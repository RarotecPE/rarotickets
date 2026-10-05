import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/constants/route.constants';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDate, formatDateTime, formatMoney, formatPhone, maskCpf, maskPhone } from '@client/shared/format';
import { RegistrationStatusBadge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { Card, SectionCard } from '@client/ui/components/card.component';
import { Alert, EmptyState, ErrorBlock, LoadingBlock } from '@client/ui/components/feedback.component';
import { CheckboxField, TextField } from '@client/ui/components/form-fields.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { QrCode } from '@client/ui/components/qrcode.component';
import { useParticipant } from '@client/state/participant.state';
import { useToast } from '@client/state/toast.state';


/** Área do participante: histórico, pagamentos, credenciais, certificados e LGPD (§34, §37). */
export function ParticipantAreaPage() {
  const toast = useToast();
  const { participant, consents, isAuthenticated, isLoading, openSession, closeSession, updateProfile, registerConsents, refresh } =
    useParticipant();

  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setLoggingIn] = useState(false);
  const [profile, setProfile] = useState({ name: '', phone: '', city: '', state: '', company: '', jobTitle: '' });

  const data = useAsync(
    async () => {
      if (!isAuthenticated) return null;
      const [registrations, certificates] = await Promise.all([
        api.registrations.listMine(),
        api.certificates.listMine(),
      ]);
      return { registrations: registrations.registrations, certificates: certificates.certificates };
    },
    [isAuthenticated],
  );

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      await openSession({ email: email.trim(), cpf: cpf.replace(/\D/g, '') });
      await data.reload();
    } catch (caught) {
      setLoginError(caught instanceof Error ? caught.message : 'Não encontramos seu cadastro');
    } finally {
      setLoggingIn(false);
    }
  };

  if (isLoading) return <LoadingBlock label="Carregando sua área…" />;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <PageHeader title="Minha área" description="Acesse com o e-mail e o CPF usados na sua inscrição." />
        <form className="space-y-3" onSubmit={handleLogin}>
          {loginError && <Alert tone="danger">{loginError}</Alert>}
          <TextField
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="CPF"
            required
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(event) => setCpf(maskCpf(event.target.value))}
          />
          <Button type="submit" block isLoading={isLoggingIn}>
            Acessar minha área
          </Button>
          <p className="text-[12px] text-app-muted">
            Informe o e-mail e o CPF usados na inscrição. Não é necessário criar senha — a combinação dos dois protege
            o acesso aos seus dados.
          </p>
        </form>
      </div>
    );
  }

  const registrations = data.data?.registrations ?? [];
  const certificates = data.data?.certificates ?? [];
  const marketing = consents.find((consent) => consent.type === 'MARKETING');

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Olá, ${participant?.name.split(' ')[0] ?? ''}`}
        description={participant?.email}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void closeSession();
            }}
          >
            Sair
          </Button>
        }
      />

      {data.error && <ErrorBlock message={data.error} onRetry={() => void data.reload()} />}

      <SectionCard
        title="Minhas inscrições"
        description={`${registrations.length} inscrição(ões) no seu histórico.`}
      >
        {data.isLoading && <LoadingBlock />}
        {!data.isLoading && registrations.length === 0 && (
          <EmptyState title="Você ainda não se inscreveu em nenhum evento" action={<Link to={ROUTES.home}><Button size="sm">Ver eventos</Button></Link>} />
        )}
        <ul className="space-y-2">
          {registrations.map((registration) => (
            <li key={registration.id} className="rounded-[8px] border border-app-border px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{registration.eventTitle ?? 'Evento'}</p>
                  <p className="text-[12px] text-app-muted">
                    {registration.code} · inscrita em {formatDate(registration.createdAt)}
                  </p>
                </div>
                <RegistrationStatusBadge status={registration.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <span>{registration.isCourtesy ? 'Cortesia' : formatMoney(registration.finalAmountCents)}</span>
                <Link to={ROUTES.registrationStatus(registration.code)} className="text-app-primary underline">
                  Ver detalhes
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {certificates.length > 0 && (
        <SectionCard title="Meus certificados">
          <ul className="space-y-2">
            {certificates.map((certificate) => (
              <li key={certificate.id} className="rounded-[8px] border border-app-border px-3 py-2.5 text-[13px]">
                <p className="font-medium">{certificate.eventTitle}</p>
                <p className="text-[12px] text-app-muted">
                  Código {certificate.code} · {certificate.workloadHours}h
                </p>
                <Link to={ROUTES.certificateValidation(certificate.code)} className="text-app-primary underline">
                  Validar / imprimir
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Meus dados">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await updateProfile({
                name: profile.name || participant?.name,
                phone: profile.phone || participant?.phone,
                city: profile.city || participant?.city,
                state: profile.state || participant?.state,
                company: profile.company || participant?.company,
                jobTitle: profile.jobTitle || participant?.jobTitle,
              });
              toast.show({ tone: 'success', title: 'Dados atualizados' });
              await refresh();
            } catch (caught) {
              toast.show({ tone: 'danger', title: 'Não foi possível salvar', description: caught instanceof Error ? caught.message : undefined });
            }
          }}
        >
          <TextField
            label="Nome"
            defaultValue={participant?.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
          />
          <TextField
            label="Telefone"
            placeholder={formatPhone(participant?.phone)}
            onChange={(event) => setProfile({ ...profile, phone: maskPhone(event.target.value) })}
          />
          <TextField label="Cidade" defaultValue={participant?.city ?? ''} onChange={(event) => setProfile({ ...profile, city: event.target.value })} />
          <TextField label="UF" maxLength={2} defaultValue={participant?.state ?? ''} onChange={(event) => setProfile({ ...profile, state: event.target.value.toUpperCase() })} />
          <TextField label="Empresa" defaultValue={participant?.company ?? ''} onChange={(event) => setProfile({ ...profile, company: event.target.value })} />
          <TextField label="Cargo" defaultValue={participant?.jobTitle ?? ''} onChange={(event) => setProfile({ ...profile, jobTitle: event.target.value })} />
          <div className="sm:col-span-2">
            <Button type="submit" block>
              Salvar alterações
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Privacidade e consentimentos" description="Registramos tipo, versão e data de cada consentimento (§37, §38).">
        <ul className="space-y-2 text-[13px]">
          {consents.map((consent) => (
            <li key={`${consent.type}-${consent.version}`} className="flex items-center justify-between gap-2 rounded-[8px] border border-app-border px-3 py-2">
              <span>{consent.type === 'MARKETING' ? 'Comunicações de marketing' : consent.type}</span>
              <span className="text-[12px] text-app-muted">
                {consent.accepted ? `Aceito em ${formatDateTime(consent.acceptedAt)}` : 'Não aceito'} · v{consent.version}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <CheckboxField
            label="Quero receber novidades e ofertas de eventos"
            checked={marketing?.accepted ?? false}
            onChange={async (event) => {
              const accepted = event.target.checked;
              await registerConsents([{ type: 'MARKETING', version: marketing?.version ?? '2026-01', accepted }]);
              toast.show({ tone: 'success', title: accepted ? 'Inscrição de marketing ativada' : 'Marketing desativado' });
            }}
          />
        </div>
        <p className="mt-3 text-[12px] text-app-muted">
          Você pode solicitar a exportação ou a anonimização dos seus dados à equipe do evento a qualquer momento.
        </p>
      </SectionCard>

      {/* Credenciais disponíveis nas inscrições confirmadas */}
      <CredentialList registrations={registrations} />
    </div>
  );
}

type CredentialListParams = { registrations: Array<{ code: string; status: string; hasCheckedIn: boolean }> };

function CredentialList({ registrations }: CredentialListParams) {
  const confirmed = registrations.filter((registration) => registration.status === 'CONFIRMADA');
  const credential = useAsync(
    async () => (confirmed[0] ? api.registrations.credential(confirmed[0].code) : null),
    [confirmed[0]?.code ?? ''],
  );

  if (confirmed.length === 0) return null;

  return (
    <SectionCard title="Credencial" description="Use na entrada do evento; o check-in é único por inscrição.">
      {credential.isLoading && <LoadingBlock />}
      {credential.data && (
        <div className="flex flex-col items-center gap-3">
          <QrCode value={credential.data.token} label={credential.data.code} />
          <p className="text-[12px] text-app-muted">
            {credential.data.eventTitle} · {credential.data.participantName}
          </p>
        </div>
      )}
      {!credential.isLoading && !credential.data && (
        <p className="text-[13px] text-app-muted">Credencial disponível após a confirmação da inscrição.</p>
      )}
    </SectionCard>
  );
}
