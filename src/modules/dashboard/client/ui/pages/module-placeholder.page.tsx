import { ArrowRight, BarChart3, CircleDollarSign, ClipboardCheck, Mail, TicketCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export type ModulePlaceholderKey = 'registrations' | 'participants' | 'finance' | 'check-in' | 'reports';
export type ModulePlaceholderPageProps = { moduleKey: ModulePlaceholderKey };

type ModuleInformation = {
  title: string;
  eyebrow: string;
  description: string;
  detail: string;
  icon: typeof TicketCheck;
  nextStep: string;
};

const MODULES: Record<ModulePlaceholderKey, ModuleInformation> = {
  registrations: {
    title: 'Inscrições', eyebrow: 'JORNADA DO PARTICIPANTE',
    description: 'Acompanhe participantes, formulários e status de cada inscrição.',
    detail: 'A fundação de eventos e o acesso SSO já estão preparados. A próxima etapa conecta formulários, lista de espera e confirmação de inscrições.',
    icon: TicketCheck, nextStep: 'Gerencie os eventos que recebem inscrições',
  },
  participants: {
    title: 'Participantes', eyebrow: 'RELACIONAMENTO',
    description: 'Uma visão única das pessoas que participam dos eventos Raro.',
    detail: 'O módulo será conectado ao cadastro único de participantes, respeitando os dados solicitados em cada formulário e as regras de privacidade.',
    icon: Users, nextStep: 'Confira os eventos e sua capacidade',
  },
  finance: {
    title: 'Financeiro', eyebrow: 'CONTROLE FINANCEIRO',
    description: 'Pagamentos, cobranças e conciliação em um só lugar.',
    detail: 'Esta área será habilitada junto aos fluxos de cobrança, webhooks e reconciliação do PagBank. Nenhuma cobrança é criada nesta versão.',
    icon: CircleDollarSign, nextStep: 'Veja o resumo financeiro no painel',
  },
  'check-in': {
    title: 'Check-in', eyebrow: 'NO DIA DO EVENTO',
    description: 'Valide credenciais e acompanhe a presença em tempo real.',
    detail: 'O próximo passo integra QR Codes seguros, consulta da inscrição e registro de presença auditável.',
    icon: ClipboardCheck, nextStep: 'Consulte a agenda de eventos',
  },
  reports: {
    title: 'Relatórios', eyebrow: 'DADOS PARA DECIDIR',
    description: 'Indicadores confiáveis para acompanhar os resultados dos eventos.',
    detail: 'Os relatórios serão formados a partir dos dados efetivamente coletados em cada inscrição e respeitarão as permissões do seu perfil.',
    icon: BarChart3, nextStep: 'Explore os eventos cadastrados',
  },
};

export function ModulePlaceholderPage(params: ModulePlaceholderPageProps) {
  const module = MODULES[params.moduleKey];
  const Icon = module.icon;
  return (
    <div className="page-content module-placeholder-page">
      <section className="page-intro">
        <div><p className="eyebrow">{module.eyebrow}</p><h1>{module.title}</h1><p>{module.description}</p></div>
      </section>
      <section className="surface-card module-roadmap-card">
        <div className="module-roadmap-icon"><Icon size={22} /></div>
        <span className="roadmap-chip"><span /> PRÓXIMA ETAPA</span>
        <h2>Estamos preparando esta área.</h2>
        <p>{module.detail}</p>
        <div className="roadmap-divider" />
        <div className="roadmap-footer"><span><Mail size={15} /> Seu acesso respeita o perfil do RaroNexus.</span><Link to="/events">{module.nextStep} <ArrowRight size={15} /></Link></div>
      </section>
    </div>
  );
}
