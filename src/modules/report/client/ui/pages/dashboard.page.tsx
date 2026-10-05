import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime } from '@client/shared/format';
import { Button } from '@client/ui/components/button.component';
import { StatCard } from '@client/ui/components/card.component';
import { ErrorBlock, LoadingBlock } from '@client/ui/components/feedback.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { useSession } from '@client/state/session.state';

const TONES: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  POSITIVO: 'success',
  ATENCAO: 'warning',
  NEGATIVO: 'danger',
};

/** Dashboard com os 10 indicadores principais (§41). */
export function DashboardPage() {
  const { user } = useSession();
  const { data, error, isLoading, reload } = useAsync(() => api.reports.dashboard(), []);

  if (isLoading) return <LoadingBlock label="Carregando indicadores…" />;
  if (error || !data) return <ErrorBlock message={error ?? 'Não foi possível carregar o dashboard'} onRetry={() => void reload()} />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Bem-vindo, ${user?.name ?? ''}. Indicadores atualizados em ${formatDateTime(data.updatedAt)}.`}
        actions={
          <Button size="sm" variant="secondary" onClick={() => void reload()}>
            Atualizar
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.indicators.map((indicator) => (
          <StatCard
            key={indicator.key}
            label={indicator.label}
            value={indicator.formatted}
            hint={indicator.hint ?? undefined}
            tone={(indicator.tone ? TONES[indicator.tone] : undefined) ?? 'default'}
          />
        ))}
      </div>
    </div>
  );
}
