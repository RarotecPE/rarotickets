"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  History,
  MonitorPlay,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
  Users,
  X,
} from "lucide-react";
import {
  ticketingApi,
  type UpsertRaffleRequest,
} from "@/client/services/ticketing-api.service";
import { Dialog } from "@/components/dialog";
import {
  Badge,
  Button,
  Empty,
  Field,
  InlineAlert,
  Panel,
  PanelHeader,
  Spinner,
  inputCls,
  selectCls,
} from "@/components/ui";
import type { Tone } from "@/lib/constants";
import type {
  RaffleFilterType,
  RaffleStatus,
} from "@/modules/ticketing/domain/raffles/entities/raffle.entity";
import type {
  RaffleActionType,
  RaffleDetail,
  RafflePrizeReadModel,
  RaffleSummary,
} from "@/modules/ticketing/domain/raffles/repositories/raffle-repository.interface";
import type { RegistrationListItem } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import { cn, formatDate } from "@/lib/utils";

const FILTER_LABELS: Record<RaffleFilterType, string> = {
  todos: "Todos os inscritos confirmados",
  pagantes: "Somente inscritos pagantes",
  presentes: "Somente presentes (com check-in)",
  manual: "Seleção manual de participantes",
};

const STATUS_META: Record<RaffleStatus, { label: string; tone: Tone }> = {
  rascunho: { label: "Aguardando início", tone: "muted" },
  em_andamento: { label: "Ao vivo / Em andamento", tone: "primary" },
  concluido: { label: "Concluído", tone: "success" },
  cancelado: { label: "Cancelado", tone: "danger" },
};

type PrizeDraft = {
  id?: string;
  title: string;
  description: string;
};

export function EventRafflesPanel({
  eventId,
  canWrite,
}: {
  eventId: string;
  canWrite: boolean;
}) {
  const [raffles, setRaffles] = useState<RaffleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create / Edit form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingRaffleId, setEditingRaffleId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [participantFilter, setParticipantFilter] =
    useState<RaffleFilterType>("presentes");
  const [allowRepeatWinners, setAllowRepeatWinners] = useState(false);
  const [animationDurationSeconds, setAnimationDurationSeconds] = useState(7);
  const [prizes, setPrizes] = useState<PrizeDraft[]>([
    { title: "1º Prêmio", description: "" },
  ]);
  const [manualRegistrationIds, setManualRegistrationIds] = useState<string[]>(
    [],
  );
  const [availableRegistrations, setAvailableRegistrations] = useState<
    RegistrationListItem[]
  >([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [manualSearch, setManualSearch] = useState("");

  // Operator Console modal state
  const [activeRaffleId, setActiveRaffleId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<RaffleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [consoleError, setConsoleError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Redraw / Disqualify confirmation dialog
  const [redrawTargetPrize, setRedrawTargetPrize] =
    useState<RafflePrizeReadModel | null>(null);
  const [redrawReason, setRedrawReason] = useState("");

  // Reset confirmation dialog
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<RaffleSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRaffles = useCallback(async () => {
    try {
      setError(null);
      const list = await ticketingApi.listEventRaffles({ eventId });
      setRaffles(list);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os sorteios deste evento.",
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadRaffles();
  }, [loadRaffles]);

  const loadConfirmedRegistrations = useCallback(async () => {
    setLoadingRegistrations(true);
    try {
      const res = await ticketingApi.listRegistrations({
        eventId,
        status: "confirmada",
        page: 1,
        pageSize: 300,
      });
      setAvailableRegistrations(res.items);
    } catch {
      // Ignore if unable to list
    } finally {
      setLoadingRegistrations(false);
    }
  }, [eventId]);

  function openCreateModal() {
    setEditingRaffleId(null);
    setTitle("");
    setDescription("");
    setParticipantFilter("presentes");
    setAllowRepeatWinners(false);
    setAnimationDurationSeconds(7);
    setPrizes([{ title: "1º Prêmio: ", description: "" }]);
    setManualRegistrationIds([]);
    setManualSearch("");
    setFormError(null);
    setFormOpen(true);
    void loadConfirmedRegistrations();
  }

  async function openEditModal(raffleId: string) {
    setEditingRaffleId(raffleId);
    setFormError(null);
    setFormLoading(true);
    setFormOpen(true);
    void loadConfirmedRegistrations();

    try {
      const detail = await ticketingApi.getEventRaffle({ eventId, raffleId });
      setTitle(detail.title);
      setDescription(detail.description ?? "");
      setParticipantFilter(detail.participantFilter);
      setAllowRepeatWinners(detail.allowRepeatWinners);
      setAnimationDurationSeconds(detail.animationDurationSeconds);
      setPrizes(
        detail.prizes.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description ?? "",
        })),
      );
      setManualRegistrationIds(detail.manualRegistrationIds);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar os dados do sorteio.",
      );
    } finally {
      setFormLoading(false);
    }
  }

  async function openOperatorConsole(raffleId: string) {
    setActiveRaffleId(raffleId);
    setConsoleError(null);
    setLoadingDetail(true);
    try {
      const detail = await ticketingApi.getEventRaffle({ eventId, raffleId });
      setActiveDetail(detail);
    } catch (caught) {
      setConsoleError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível carregar a mesa de controle do sorteio.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSavingForm(true);

    const payload: UpsertRaffleRequest = {
      title: title.trim(),
      description: description.trim() || null,
      participantFilter,
      allowRepeatWinners,
      animationDurationSeconds: Number(animationDurationSeconds) || 7,
      prizes: prizes.map((p, idx) => ({
        id: p.id,
        title: p.title.trim(),
        description: p.description.trim() || null,
        orderIndex: idx + 1,
      })),
      manualRegistrationIds:
        participantFilter === "manual" ? manualRegistrationIds : [],
    };

    try {
      if (editingRaffleId) {
        const updated = await ticketingApi.updateEventRaffle({
          eventId,
          raffleId: editingRaffleId,
          request: payload,
        });
        setNotice(`Sorteio "${updated.title}" atualizado com sucesso.`);
        if (activeDetail?.id === updated.id) {
          setActiveDetail(updated);
        }
      } else {
        const created = await ticketingApi.createEventRaffle({
          eventId,
          request: payload,
        });
        setNotice(`Sorteio "${created.title}" criado com sucesso!`);
      }
      setFormOpen(false);
      await loadRaffles();
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o sorteio.",
      );
    } finally {
      setSavingForm(false);
    }
  }

  async function triggerRaffleAction(params: {
    action: RaffleActionType;
    prizeId?: string;
    reason?: string;
  }) {
    if (!activeRaffleId) return;
    const busyKey = `${params.action}:${params.prizeId ?? "all"}`;
    setActionBusy(busyKey);
    setConsoleError(null);

    try {
      const updated = await ticketingApi.executeRaffleAction({
        eventId,
        raffleId: activeRaffleId,
        action: params.action,
        prizeId: params.prizeId,
        reason: params.reason,
      });
      setActiveDetail(updated);
      setRedrawTargetPrize(null);
      setRedrawReason("");
      setConfirmResetOpen(false);
      await loadRaffles();
    } catch (caught) {
      setConsoleError(
        caught instanceof Error
          ? caught.message
          : "Falha ao executar ação no sorteio.",
      );
    } finally {
      setActionBusy(null);
    }
  }

  async function confirmDeleteRaffle() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ticketingApi.deleteEventRaffle({
        eventId,
        raffleId: deleteTarget.id,
      });
      setNotice(`Sorteio "${deleteTarget.title}" removido.`);
      setDeleteTarget(null);
      await loadRaffles();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível excluir o sorteio.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function copyTvUrl(token: string) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/sorteio/${token}`;
    void navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => {
      setCopiedToken((prev) => (prev === token ? null : prev));
    }, 2500);
  }

  function addPrizeRow() {
    setPrizes((prev) => [
      ...prev,
      { title: `${prev.length + 1}º Prêmio: `, description: "" },
    ]);
  }

  function removePrizeRow(index: number) {
    setPrizes((prev) => prev.filter((_, idx) => idx !== index));
  }

  function movePrizeRow(index: number, direction: -1 | 1) {
    setPrizes((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }

  const filteredManualRegistrations = useMemo(() => {
    const q = manualSearch.trim().toLowerCase();
    if (!q) return availableRegistrations;
    return availableRegistrations.filter(
      (r) =>
        r.participantName.toLowerCase().includes(q) ||
        r.participantEmail.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q),
    );
  }, [availableRegistrations, manualSearch]);

  return (
    <Panel>
      <PanelHeader
        title="Sorteios de Prêmios"
        description="Gerencie sorteios ao vivo para os convidados e projete a roleta na TV ou telão do evento."
        right={
          canWrite ? (
            <Button type="button" compact onClick={openCreateModal}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Novo sorteio
            </Button>
          ) : null
        }
      />

      <div className="space-y-4 p-4 sm:p-5">
        {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

        {loading ? (
          <Spinner label="Carregando sorteios…" />
        ) : raffles.length === 0 ? (
          <Empty
            title="Nenhum sorteio cadastrado"
            description="Crie um sorteio vinculado a este evento, defina os prêmios e abra o painel ao vivo no telão."
            action={
              canWrite ? (
                <Button type="button" onClick={openCreateModal}>
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  Criar primeiro sorteio
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {raffles.map((raffle) => {
              const statusMeta = STATUS_META[raffle.status];
              return (
                <div
                  key={raffle.id}
                  className="flex flex-col justify-between gap-4 rounded-app-md border border-app-border bg-app-surface-elevated/30 p-4 transition-colors hover:border-app-primary/40"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      <span className="text-xs font-medium text-app-muted-foreground">
                        {raffle.drawnPrizesCount} / {raffle.prizesCount} prêmio(s)
                        sorteado(s)
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-app-foreground">
                      {raffle.title}
                    </h3>
                    {raffle.description ? (
                      <p className="text-xs text-app-muted-foreground">
                        {raffle.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-app-muted-foreground">
                      <span className="rounded-app-sm border border-app-border bg-app-surface px-2 py-0.5 font-medium">
                        Público: {FILTER_LABELS[raffle.participantFilter]}
                      </span>
                      <span className="rounded-app-sm border border-app-border bg-app-surface px-2 py-0.5">
                        {raffle.allowRepeatWinners
                          ? "Permite repetir ganhador"
                          : "Sem repetir ganhador"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        compact
                        variant="primary"
                        onClick={() => void openOperatorConsole(raffle.id)}
                      >
                        <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" />
                         Operar Sorteio
                      </Button>

                      <a
                        href={`/sorteio/${raffle.publicToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-app-sm border border-app-border bg-app-surface-elevated px-2.5 text-xs font-semibold text-app-foreground transition-colors hover:bg-app-surface"
                        title="Abrir painel visual da TV / Telão em nova aba"
                      >
                        <Tv className="h-3.5 w-3.5 text-app-primary" />
                        Abrir Telão
                        <ExternalLink className="h-3 w-3 text-app-muted-foreground" />
                      </a>

                      <Button
                        type="button"
                        compact
                        variant="secondary"
                        onClick={() => copyTvUrl(raffle.publicToken)}
                        title="Copiar link público para a TV"
                      >
                        {copiedToken === raffle.publicToken ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-app-success" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Link TV
                          </>
                        )}
                      </Button>
                    </div>

                    {canWrite ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          compact
                          variant="ghost"
                          onClick={() => void openEditModal(raffle.id)}
                          title="Editar configurações e prêmios"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          compact
                          variant="ghost"
                          onClick={() => setDeleteTarget(raffle)}
                          title="Excluir sorteio"
                          className="text-app-danger hover:text-app-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: CRIAR / EDITAR SORTEIO */}
      <Dialog
        open={formOpen}
        onClose={() => {
          if (!savingForm) setFormOpen(false);
        }}
        maxWidth="max-w-3xl"
        title={editingRaffleId ? "Editar Sorteio" : "Novo Sorteio de Prêmios"}
        description="Configure as regras de participação, os prêmios em ordem e o tempo da roleta no telão."
      >
        {formLoading ? (
          <div className="py-8">
            <Spinner label="Carregando configurações do sorteio…" />
          </div>
        ) : (
          <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Nome do sorteio *"
                htmlFor="raffle-title"
                className="sm:col-span-2"
              >
                <input
                  id="raffle-title"
                  required
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Sorteio de Encerramento dos Convidados"
                  className={inputCls}
                />
              </Field>

              <Field
                label="Tempo de giro no telão (seg)"
                htmlFor="raffle-duration"
                hint="Entre 2 e 30 segundos"
              >
                <input
                  id="raffle-duration"
                  type="number"
                  min={2}
                  max={30}
                  required
                  value={animationDurationSeconds}
                  onChange={(e) =>
                    setAnimationDurationSeconds(Number(e.target.value))
                  }
                  className={inputCls}
                />
              </Field>
            </div>

            <Field
              label="Descrição / subtítulo (opcional)"
              htmlFor="raffle-description"
            >
              <input
                id="raffle-description"
                maxLength={250}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Brindes exclusivos oferecidos pelos patrocinadores"
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 rounded-app-md border border-app-border bg-app-surface-elevated/40 p-4 sm:grid-cols-2">
              <Field
                label="Quais participantes entram no sorteio? *"
                htmlFor="raffle-filter"
              >
                <select
                  id="raffle-filter"
                  value={participantFilter}
                  onChange={(e) =>
                    setParticipantFilter(e.target.value as RaffleFilterType)
                  }
                  className={selectCls}
                >
                  <option value="presentes">
                    Presentes (confirmados com check-in na portaria)
                  </option>
                  <option value="todos">
                    Todos (todas as inscrições confirmadas)
                  </option>
                  <option value="pagantes">
                    Pagantes (inscrições confirmadas com valor pago)
                  </option>
                  <option value="manual">
                    Selecionar participantes manualmente
                  </option>
                </select>
              </Field>

              <div className="flex flex-col justify-center pt-2">
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={allowRepeatWinners}
                    onChange={(e) => setAllowRepeatWinners(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-app-primary"
                  />
                  <span>
                    <strong className="font-semibold text-app-foreground">
                      Permitir repetir ganhador
                    </strong>
                    <span className="mt-0.5 block text-xs text-app-muted-foreground">
                      Se marcado, o mesmo participante poderá ganhar mais de um
                      prêmio neste sorteio.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Seleção manual de participantes */}
            {participantFilter === "manual" ? (
              <div className="space-y-3 rounded-app-md border border-app-border bg-app-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
                      Participantes Selecionados ({manualRegistrationIds.length})
                    </h4>
                    <p className="text-xs text-app-muted-foreground">
                      Marque os participantes confirmados que participarão do
                      sorteio.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      compact
                      variant="secondary"
                      onClick={() =>
                        setManualRegistrationIds(
                          availableRegistrations.map((r) => r.id),
                        )
                      }
                    >
                      Marcar todos ({availableRegistrations.length})
                    </Button>
                    <Button
                      type="button"
                      compact
                      variant="ghost"
                      onClick={() => setManualRegistrationIds([])}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted-foreground" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Buscar participante por nome, e-mail ou código…"
                    className={cn(inputCls, "pl-9")}
                  />
                </div>

                {loadingRegistrations ? (
                  <Spinner label="Carregando inscritos confirmados…" />
                ) : filteredManualRegistrations.length === 0 ? (
                  <p className="py-3 text-center text-xs text-app-muted-foreground">
                    Nenhuma inscrição confirmada encontrada.
                  </p>
                ) : (
                  <div className="max-h-52 divide-y divide-app-border overflow-y-auto rounded-app-md border border-app-border">
                    {filteredManualRegistrations.map((reg) => {
                      const checked = manualRegistrationIds.includes(reg.id);
                      return (
                        <label
                          key={reg.id}
                          className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-app-surface-elevated/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setManualRegistrationIds((prev) => [
                                    ...prev,
                                    reg.id,
                                  ]);
                                } else {
                                  setManualRegistrationIds((prev) =>
                                    prev.filter((id) => id !== reg.id),
                                  );
                                }
                              }}
                              className="h-4 w-4 accent-app-primary"
                            />
                            <div>
                              <span className="font-semibold text-app-foreground">
                                {reg.participantName}
                              </span>
                              <span className="ml-2 font-mono text-app-muted-foreground">
                                {reg.code}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {reg.checkInAt ? (
                              <Badge tone="success">Presente</Badge>
                            ) : (
                              <Badge tone="muted">Sem check-in</Badge>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {/* Lista de Prêmios */}
            <div className="space-y-3 rounded-app-md border border-app-border bg-app-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
                    Prêmios do Sorteio ({prizes.length})
                  </h4>
                  <p className="text-xs text-app-muted-foreground">
                    Informe os prêmios na ordem em que serão sorteados.
                  </p>
                </div>
                <Button
                  type="button"
                  compact
                  variant="secondary"
                  onClick={addPrizeRow}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Prêmio
                </Button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {prizes.map((prize, idx) => (
                  <div
                    key={prize.id ?? idx}
                    className="flex flex-wrap items-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated/30 p-2.5 sm:flex-nowrap"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-primary/15 text-xs font-bold text-app-primary">
                      {idx + 1}º
                    </span>
                    <input
                      required
                      maxLength={150}
                      value={prize.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrizes((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, title: val } : item,
                          ),
                        );
                      }}
                      placeholder={`${idx + 1}º Prêmio (ex: Echo Dot / Vale-Compras)`}
                      className={cn(inputCls, "h-9 flex-1 text-xs")}
                    />
                    <input
                      maxLength={200}
                      value={prize.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrizes((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, description: val } : item,
                          ),
                        );
                      }}
                      placeholder="Observação / patrocinador (opcional)"
                      className={cn(inputCls, "h-9 sm:w-56 text-xs")}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        compact
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => movePrizeRow(idx, -1)}
                        title="Subir prêmio"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        compact
                        variant="ghost"
                        disabled={idx === prizes.length - 1}
                        onClick={() => movePrizeRow(idx, 1)}
                        title="Descer prêmio"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        compact
                        variant="ghost"
                        disabled={prizes.length <= 1}
                        onClick={() => removePrizeRow(idx)}
                        title="Remover prêmio"
                        className="text-app-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formError ? (
              <InlineAlert tone="danger">{formError}</InlineAlert>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-app-border pt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={savingForm}
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingForm}>
                {savingForm
                  ? "Salvando…"
                  : editingRaffleId
                    ? "Salvar alterações"
                    : "Criar sorteio"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* MODAL: MESA DE CONTROLE DO OPERADOR (AO VIVO) */}
      <Dialog
        open={Boolean(activeRaffleId)}
        onClose={() => {
          if (!actionBusy) {
            setActiveRaffleId(null);
            setActiveDetail(null);
          }
        }}
        maxWidth="max-w-5xl"
        title={
          activeDetail
            ? `Mesa de Controle · ${activeDetail.title}`
            : "Mesa de Controle do Sorteio"
        }
        description="Comande o sorteio em tempo real. Todas as ações refletem automaticamente no telão da TV."
      >
        {loadingDetail || !activeDetail ? (
          <div className="py-10">
            <Spinner label="Carregando mesa de operação…" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Barra de Status e Link da TV */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-app-md border border-app-border bg-app-surface-elevated/60 p-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge tone={STATUS_META[activeDetail.status].tone}>
                  {STATUS_META[activeDetail.status].label}
                </Badge>
                <span className="text-xs text-app-muted-foreground">
                  Elegíveis no pote agora:{" "}
                  <strong className="text-app-foreground">
                    {activeDetail.eligibleCandidates.length} participante(s)
                  </strong>
                </span>
                <span className="text-xs text-app-muted-foreground">
                  · Filtro: {FILTER_LABELS[activeDetail.participantFilter]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  compact
                  variant="secondary"
                  onClick={() => copyTvUrl(activeDetail.publicToken)}
                >
                  {copiedToken === activeDetail.publicToken ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-app-success" />
                      Link Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar Link do Telão
                    </>
                  )}
                </Button>

                <a
                  href={`/sorteio/${activeDetail.publicToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-app-sm bg-app-primary px-3 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  <Tv className="h-3.5 w-3.5" />
                  Abrir Telão Ao Vivo
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {consoleError ? (
              <InlineAlert tone="danger">{consoleError}</InlineAlert>
            ) : null}

            {/* Botões Globais de Comando do Sorteio */}
            {canWrite ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-app-md border border-app-border bg-app-surface p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  {activeDetail.status === "rascunho" ? (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={Boolean(actionBusy)}
                      onClick={() =>
                        void triggerRaffleAction({ action: "start" })
                      }
                    >
                      <Play className="h-4 w-4" />
                      Iniciar Sorteio no Telão
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      Boolean(actionBusy) ||
                      activeDetail.status === "cancelado" ||
                      !activeDetail.prizes.some((p) => p.status === "pendente")
                    }
                    onClick={() =>
                      void triggerRaffleAction({ action: "next_prize" })
                    }
                  >
                    <Sparkles className="h-4 w-4 text-app-primary" />
                    Focar Próximo Prêmio Pendente
                  </Button>

                  <Button
                    type="button"
                    variant={
                      activeDetail.showWinnersSummary ? "primary" : "secondary"
                    }
                    disabled={Boolean(actionBusy)}
                    onClick={() =>
                      void triggerRaffleAction({ action: "toggle_summary" })
                    }
                  >
                    <Crown className="h-4 w-4 text-amber-500" />
                    {activeDetail.showWinnersSummary
                      ? "Ocultar Resumo Final no Telão"
                      : "Exibir Ranking de Ganhadores no Telão"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={Boolean(actionBusy)}
                    onClick={() => setConfirmResetOpen(true)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reiniciar Sorteio
                  </Button>

                  {activeDetail.status !== "cancelado" ? (
                    <Button
                      type="button"
                      variant="danger"
                      disabled={Boolean(actionBusy)}
                      onClick={() =>
                        void triggerRaffleAction({ action: "cancel" })
                      }
                    >
                      <Ban className="h-4 w-4" />
                      Cancelar Sorteio
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Fila de Prêmios e Botões Individuais de Sorteio */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-foreground">
                Prêmios e Controle de Giro ({activeDetail.prizes.length})
              </h4>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeDetail.prizes.map((prize) => {
                  const isFocusedOnTv =
                    activeDetail.currentPrizeId === prize.id &&
                    !activeDetail.showWinnersSummary;
                  const isDrawn = prize.status === "sorteado";

                  return (
                    <div
                      key={prize.id}
                      className={cn(
                        "flex flex-col justify-between gap-3 rounded-app-md border p-4 transition-all",
                        isFocusedOnTv
                          ? "border-app-primary bg-app-primary/5 ring-1 ring-app-primary/30"
                          : "border-app-border bg-app-surface",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone={isDrawn ? "success" : "muted"}>
                              {prize.orderIndex}º Prêmio
                            </Badge>
                            {isFocusedOnTv ? (
                              <Badge tone="primary" solid>
                                <Tv className="h-3 w-3" /> No Telão Agora
                              </Badge>
                            ) : null}
                          </div>

                          <Badge tone={isDrawn ? "success" : "warning"}>
                            {isDrawn ? "Sorteado" : "Pendente"}
                          </Badge>
                        </div>

                        <h5 className="text-sm font-bold text-app-foreground">
                          {prize.title}
                        </h5>
                        {prize.description ? (
                          <p className="text-xs text-app-muted-foreground">
                            {prize.description}
                          </p>
                        ) : null}

                        {isDrawn && prize.winnerName ? (
                          <div className="mt-2 rounded-app-sm border border-app-success/30 bg-app-success/10 p-2.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-app-success">
                                🏆 Ganhador(a): {prize.winnerName}
                              </span>
                              {prize.winnerTicketCode ? (
                                <span className="font-mono font-bold text-app-foreground">
                                  {prize.winnerTicketCode}
                                </span>
                              ) : null}
                            </div>
                            {prize.drawnAt ? (
                              <p className="mt-0.5 text-[11px] text-app-muted-foreground">
                                Sorteado em{" "}
                                {formatDate({
                                  value: prize.drawnAt,
                                  withTime: true,
                                })}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {canWrite && activeDetail.status !== "cancelado" ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-3">
                          <Button
                            type="button"
                            compact
                            variant="secondary"
                            disabled={Boolean(actionBusy) || isFocusedOnTv}
                            onClick={() =>
                              void triggerRaffleAction({
                                action: "select_prize",
                                prizeId: prize.id,
                              })
                            }
                          >
                            <Tv className="h-3.5 w-3.5" />
                            Exibir no Telão
                          </Button>

                          {!isDrawn ? (
                            <Button
                              type="button"
                              compact
                              variant="primary"
                              disabled={
                                Boolean(actionBusy) ||
                                activeDetail.eligibleCandidates.length === 0
                              }
                              onClick={() =>
                                void triggerRaffleAction({
                                  action: "draw_prize",
                                  prizeId: prize.id,
                                })
                              }
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Sortear / Girar Roleta
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              compact
                              variant="danger"
                              disabled={Boolean(actionBusy)}
                              onClick={() => {
                                setRedrawTargetPrize(prize);
                                setRedrawReason("");
                              }}
                              title="Anular este ganhador (ex: ausente) e girar novamente"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Anular e Sortear Outro
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel Inferior: Participantes Elegíveis e Histórico */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-app-md border border-app-border bg-app-surface p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-app-foreground">
                    <Users className="h-4 w-4 text-app-primary" />
                    Participantes Elegíveis Restantes (
                    {activeDetail.eligibleCandidates.length})
                  </span>
                </div>
                {activeDetail.eligibleCandidates.length === 0 ? (
                  <p className="py-4 text-center text-xs text-app-muted-foreground">
                    Nenhum participante elegível disponível no momento.
                  </p>
                ) : (
                  <div className="max-h-44 divide-y divide-app-border overflow-y-auto text-xs">
                    {activeDetail.eligibleCandidates.map((c) => (
                      <div
                        key={c.registrationId}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="font-medium text-app-foreground">
                          {c.participantName}
                        </span>
                        <span className="font-mono text-app-muted-foreground">
                          {c.registrationCode}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-app-md border border-app-border bg-app-surface p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-app-foreground">
                    <History className="h-4 w-4 text-app-primary" />
                    Histórico de Giros ({activeDetail.history.length})
                  </span>
                </div>
                {activeDetail.history.length === 0 ? (
                  <p className="py-4 text-center text-xs text-app-muted-foreground">
                    Nenhum giro realizado ainda neste sorteio.
                  </p>
                ) : (
                  <div className="max-h-44 divide-y divide-app-border overflow-y-auto text-xs">
                    {activeDetail.history.map((h) => (
                      <div key={h.id} className="space-y-0.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-app-foreground">
                            {h.prizeTitle}: {h.winnerName}
                          </span>
                          <Badge
                            tone={
                              h.action === "anulado" ? "danger" : "success"
                            }
                          >
                            {h.action === "anulado" ? "Anulado" : "Sorteado"}
                          </Badge>
                        </div>
                        {h.reason ? (
                          <p className="text-[11px] text-app-muted-foreground">
                            Motivo: {h.reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* DIALOG: CONFIRMAR ANULAÇÃO E NOVO SORTEIO (REDRAW) */}
      <Dialog
        open={Boolean(redrawTargetPrize)}
        onClose={() => {
          if (!actionBusy) setRedrawTargetPrize(null);
        }}
        title="Anular Ganhador e Sortear Novamente"
        description={
          redrawTargetPrize
            ? `O ganhador atual (${redrawTargetPrize.winnerName}) do prêmio "${redrawTargetPrize.title}" será desclassificado e a roleta girará imediatamente para escolher um novo vencedor.`
            : undefined
        }
      >
        <div className="space-y-4">
          <Field
            label="Motivo da anulação (opcional)"
            htmlFor="redraw-reason"
            hint="Ex: Participante não estava presente no auditório."
          >
            <input
              id="redraw-reason"
              type="text"
              value={redrawReason}
              onChange={(e) => setRedrawReason(e.target.value)}
              placeholder="Ex: Participante ausente no momento da chamada"
              className={inputCls}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(actionBusy)}
              onClick={() => setRedrawTargetPrize(null)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={Boolean(actionBusy)}
              onClick={() => {
                if (!redrawTargetPrize) return;
                void triggerRaffleAction({
                  action: "redraw_prize",
                  prizeId: redrawTargetPrize.id,
                  reason: redrawReason,
                });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Confirmar e Girar Novamente
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG: CONFIRMAR REINÍCIO DO SORTEIO */}
      <Dialog
        open={confirmResetOpen}
        onClose={() => {
          if (!actionBusy) setConfirmResetOpen(false);
        }}
        title="Reiniciar Sorteio"
        description="Tem certeza que deseja zerar todos os ganhadores e reiniciar este sorteio do início?"
      >
        <div className="space-y-4">
          <InlineAlert tone="danger">
            Todos os prêmios voltarão para o status <strong>Pendente</strong> e o
            histórico de contemplados deste sorteio será limpo.
          </InlineAlert>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(actionBusy)}
              onClick={() => setConfirmResetOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={Boolean(actionBusy)}
              onClick={() => void triggerRaffleAction({ action: "reset" })}
            >
              <RotateCcw className="h-4 w-4" />
              Confirmar Reinício
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOG: CONFIRMAR EXCLUSÃO DO SORTEIO */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        title="Excluir Sorteio"
        description={
          deleteTarget
            ? `Confirma a exclusão definitiva do sorteio "${deleteTarget.title}"?`
            : undefined
        }
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={deleting}
            onClick={() => setDeleteTarget(null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={deleting}
            onClick={() => void confirmDeleteRaffle()}
          >
            {deleting ? "Excluindo…" : "Confirmar Exclusão"}
          </Button>
        </div>
      </Dialog>
    </Panel>
  );
}
