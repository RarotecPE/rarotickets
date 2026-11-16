"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  Maximize2,
  Minimize2,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { PublicRaffleView } from "@/modules/ticketing/domain/raffles/repositories/raffle-repository.interface";
import { cn } from "@/lib/utils";

const SLOT_ITEM_HEIGHT = 112;
const REEL_LENGTH = 65;

type ReelEntry = {
  name: string;
  ticketCode: string;
};

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTick(progress: number): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      // Frequency rises slightly as the wheel slows down
      const baseFreq = 220 + Math.round(progress * 260);
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Ignore audio errors on restricted devices
    }
  }

  playVictoryFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const startTime = ctx.currentTime + idx * 0.11;
        const duration = idx === notes.length - 1 ? 0.85 : 0.22;

        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.22, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      });
    } catch {
      // Ignore audio errors
    }
  }
}

export function RaffleTvDisplay({ token }: { token: string }) {
  const [view, setView] = useState<PublicRaffleView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Slot machine animation states
  const [isRolling, setIsRolling] = useState(false);
  const [reelItems, setReelItems] = useState<ReelEntry[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [rollProgress, setRollProgress] = useState(0);
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);

  const soundRef = useRef<SoundEffectsEngine | null>(null);
  const animatedDrawsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    soundRef.current = new SoundEffectsEngine();
  }, []);

  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.muted = muted;
    }
  }, [muted]);

  const startSlotMachineRoll = useCallback(
    (params: {
      winnerName: string;
      winnerTicketCode: string;
      candidatePool: ReelEntry[];
      durationSeconds: number;
    }) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const pool: ReelEntry[] =
        params.candidatePool.length > 0
          ? params.candidatePool
          : [
              { name: params.winnerName, ticketCode: params.winnerTicketCode },
              { name: "Participante Confirmado", ticketCode: "INS-2026" },
            ];

      const builtReel: ReelEntry[] = [];
      for (let i = 0; i < REEL_LENGTH - 1; i++) {
        const randomCandidate = pool[Math.floor(Math.random() * pool.length)];
        builtReel.push(randomCandidate);
      }
      // Avoid immediate duplicate right before winner if pool has multiple people
      if (
        pool.length > 1 &&
        builtReel[builtReel.length - 1]?.name === params.winnerName
      ) {
        const alternative = pool.find((c) => c.name !== params.winnerName);
        if (alternative) {
          builtReel[builtReel.length - 1] = alternative;
        }
      }
      // Final slot is the exact winner determined by the server
      builtReel.push({
        name: params.winnerName,
        ticketCode: params.winnerTicketCode,
      });

      setReelItems(builtReel);
      setScrollOffset(0);
      setRollProgress(0);
      setIsRolling(true);

      const durationMs = Math.max(2000, params.durationSeconds * 1000);
      const startTime = performance.now();
      const targetOffset = (builtReel.length - 1) * SLOT_ITEM_HEIGHT;
      let lastTickIndex = 0;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        // Smooth deceleration curve (cubic/quartic ease-out)
        const eased = 1 - Math.pow(1 - t, 3.6);
        const currentOffset = eased * targetOffset;

        const currentIndex = Math.floor(currentOffset / SLOT_ITEM_HEIGHT);
        if (currentIndex > lastTickIndex) {
          lastTickIndex = currentIndex;
          soundRef.current?.playTick(t);
        }

        setScrollOffset(currentOffset);
        setRollProgress(t);

        if (t < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          setScrollOffset(targetOffset);
          setRollProgress(1);
          setTimeout(() => {
            setIsRolling(false);
            soundRef.current?.playVictoryFanfare();
            setConfettiBurstKey((prev) => prev + 1);
          }, 350);
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchPublicState() {
      try {
        const data = await ticketingApi.getPublicRaffle({ token });
        if (!active) return;

        setView(data);
        setError(null);

        const activePrize =
          data.prizes.find((p) => p.id === data.currentPrizeId) ??
          data.prizes[0];

        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
          // Pre-register already drawn prizes so opening an old raffle doesn't replay old animations,
          // UNLESS the current prize was drawn within the last 10 seconds!
          const nowMs = Date.now();
          for (const p of data.prizes) {
            if (p.status === "sorteado" && p.drawnAt) {
              const drawnTime = new Date(p.drawnAt).getTime();
              const ageSeconds = (nowMs - drawnTime) / 1000;
              const drawKey = `${p.id}:${new Date(p.drawnAt).toISOString()}`;
              if (
                p.id === activePrize?.id &&
                ageSeconds <= data.animationDurationSeconds + 4 &&
                p.winnerName
              ) {
                animatedDrawsRef.current.add(drawKey);
                startSlotMachineRoll({
                  winnerName: p.winnerName,
                  winnerTicketCode: p.winnerTicketCode ?? "",
                  candidatePool: data.candidatePool,
                  durationSeconds: data.animationDurationSeconds,
                });
              } else {
                animatedDrawsRef.current.add(drawKey);
              }
            }
          }
        } else if (
          activePrize &&
          activePrize.status === "sorteado" &&
          activePrize.drawnAt &&
          activePrize.winnerName
        ) {
          const drawKey = `${activePrize.id}:${new Date(activePrize.drawnAt).toISOString()}`;
          if (!animatedDrawsRef.current.has(drawKey)) {
            animatedDrawsRef.current.add(drawKey);
            startSlotMachineRoll({
              winnerName: activePrize.winnerName,
              winnerTicketCode: activePrize.winnerTicketCode ?? "",
              candidatePool: data.candidatePool,
              durationSeconds: data.animationDurationSeconds,
            });
          }
        }
      } catch (caught) {
        if (active && !view) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Não foi possível carregar o painel do sorteio.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchPublicState();
    const interval = setInterval(() => {
      void fetchPublicState();
    }, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token, startSlotMachineRoll, view]);

  function toggleFullscreen() {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      void document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      void document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }

  const currentPrize = useMemo(() => {
    if (!view) return null;
    return (
      view.prizes.find((p) => p.id === view.currentPrizeId) ??
      view.prizes.find((p) => p.status === "pendente") ??
      view.prizes[0] ??
      null
    );
  }, [view]);

  const drawnPrizes = useMemo(() => {
    if (!view) return [];
    return view.prizes.filter((p) => p.status === "sorteado" && p.winnerName);
  }, [view]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060913] text-white">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-amber-400/20 border-t-amber-400" />
        <p className="mt-4 text-lg font-medium text-slate-300">
          Carregando telão do sorteio…
        </p>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060913] p-6 text-center text-white">
        <div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 backdrop-blur-md">
          <Trophy className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 text-xl font-bold">Sorteio Indisponível</h1>
          <p className="mt-2 text-sm text-slate-300">
            {error ?? "Verifique se o link público do telão está correto."}
          </p>
        </div>
      </div>
    );
  }

  const showSummaryScreen =
    !isRolling &&
    (view.showWinnersSummary ||
      (view.status === "concluido" && drawnPrizes.length > 0 && view.showWinnersSummary));

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-[#050811] text-white select-none">
      {/* Ambient Stage Lighting Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[960px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-[150px]" />
        <div className="absolute bottom-[-200px] left-1/4 h-[450px] w-[650px] rounded-full bg-blue-600/15 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-1/4 h-[450px] w-[650px] rounded-full bg-purple-600/15 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Confetti Canvas Overlay */}
      <ConfettiCanvas
        burstKey={confettiBurstKey}
        continuous={showSummaryScreen}
      />

      {/* Top Stage Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/60 px-6 py-4 backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
              {view.eventTitle}
            </p>
            <h1 className="text-lg font-extrabold tracking-tight text-white sm:text-2xl">
              {view.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300 sm:flex">
            <Users className="h-4 w-4 text-amber-400" />
            <span>
              <strong className="text-white">{view.totalEligibleCount}</strong>{" "}
              participantes elegíveis
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Ativar som" : "Silenciar som"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
          >
            {muted ? (
              <VolumeX className="h-5 w-5 text-rose-400" />
            ) : (
              <Volume2 className="h-5 w-5 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title="Alternar tela cheia"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Stage Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-8">
        {view.status === "cancelado" ? (
          <div className="text-center">
            <span className="inline-block rounded-full border border-rose-500/40 bg-rose-500/10 px-5 py-1.5 text-sm font-bold uppercase tracking-widest text-rose-300">
              Sorteio Encerrado / Cancelado
            </span>
            <h2 className="mt-4 text-4xl font-black text-white">
              Este sorteio foi cancelado pela organização.
            </h2>
          </div>
        ) : showSummaryScreen ? (
          /* MODO RESUMO FINAL / RANKING DE GANHADORES */
          <div className="w-full space-y-8 animate-in fade-in duration-700">
            <div className="text-center">
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-5 py-1.5 text-xs font-extrabold uppercase tracking-[0.22em] text-amber-300">
                <Crown className="h-4 w-4 text-amber-400" />
                Resultado Oficial do Sorteio
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                Quadro de Ganhadores
              </h2>
              <p className="mt-2 text-base text-slate-300">
                Parabéns a todos os participantes contemplados no evento!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {view.prizes.map((prize, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={prize.id}
                    className={cn(
                      "relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 backdrop-blur-xl transition-all",
                      prize.winnerName
                        ? isFirst
                          ? "border-amber-400/50 bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-950/90 shadow-2xl shadow-amber-500/15"
                          : "border-emerald-400/30 bg-slate-900/80 shadow-xl"
                        : "border-white/10 bg-slate-900/40 opacity-60",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider",
                            isFirst
                              ? "bg-amber-400 text-slate-950"
                              : "bg-white/10 text-amber-300",
                          )}
                        >
                          <Award className="h-3.5 w-3.5" />
                          {prize.orderIndex}º Prêmio
                        </span>
                        {prize.winnerTicketCode ? (
                          <span className="rounded-md border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-300">
                            {prize.winnerTicketCode}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-slate-200">
                        {prize.title}
                      </h3>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-4">
                      {prize.winnerName ? (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                            Ganhador(a) Contemplado(a)
                          </p>
                          <p className="mt-1 truncate text-2xl font-black text-white">
                            {prize.winnerName}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm italic text-slate-400">
                          Aguardando sorteio
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isRolling && currentPrize ? (
          /* MODO MÁQUINA DE CAÇA-NÍQUEL (SLOT MACHINE GIRANDO) */
          <div className="flex w-full max-w-4xl flex-col items-center text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/20 px-5 py-1.5 text-xs font-extrabold uppercase tracking-[0.25em] text-amber-300 shadow-lg shadow-amber-500/20 animate-pulse">
              <Sparkles className="h-4 w-4 text-amber-300" />
              Sorteando {currentPrize.orderIndex}º Prêmio
            </div>

            <h2 className="mb-8 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">
              {currentPrize.title}
            </h2>

            {/* Slot Machine Outer Frame */}
            <div className="relative w-full overflow-hidden rounded-3xl border-4 border-amber-400/70 bg-gradient-to-b from-slate-900 via-[#0a1022] to-slate-950 p-3 shadow-[0_0_90px_-15px_rgba(251,191,36,0.45)] sm:p-5">
              {/* Top & Bottom Decorative Casino Lights */}
              <div className="mb-3 flex justify-around px-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all duration-300",
                      Math.floor(rollProgress * 40) % 2 === i % 2
                        ? "bg-amber-300 shadow-[0_0_12px_#fcd34d]"
                        : "bg-amber-900/50",
                    )}
                  />
                ))}
              </div>

              {/* Slot Drum Window */}
              <div
                className="relative mx-auto overflow-hidden rounded-2xl border border-white/15 bg-[#050814]"
                style={{ height: `${SLOT_ITEM_HEIGHT * 3}px` }}
              >
                {/* Top & Bottom 3D Drum Shadow Gradients */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-[#050814] via-[#050814]/85 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-[#050814] via-[#050814]/85 to-transparent" />

                {/* Center Payline Highlight Frame */}
                <div
                  className="pointer-events-none absolute inset-x-3 top-1/2 z-20 -translate-y-1/2 rounded-xl border-2 border-amber-400 bg-amber-400/[0.07] shadow-[0_0_35px_rgba(251,191,36,0.3)]"
                  style={{ height: `${SLOT_ITEM_HEIGHT}px` }}
                >
                  <div className="absolute -left-2 top-1/2 h-5 w-5 -translate-y-1/2 rotate-45 bg-amber-400 shadow-lg" />
                  <div className="absolute -right-2 top-1/2 h-5 w-5 -translate-y-1/2 rotate-45 bg-amber-400 shadow-lg" />
                </div>

                {/* Scrolling Names Strip */}
                <div
                  className="will-change-transform"
                  style={{
                    transform: `translate3d(0, ${SLOT_ITEM_HEIGHT - scrollOffset}px, 0)`,
                  }}
                >
                  {reelItems.map((entry, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${SLOT_ITEM_HEIGHT}px` }}
                      className="flex flex-col items-center justify-center px-6 text-center"
                    >
                      <p className="max-w-full truncate text-2xl font-black tracking-tight text-white sm:text-4xl">
                        {entry.name}
                      </p>
                      <span className="mt-1 font-mono text-xs font-semibold tracking-widest text-amber-300/90 sm:text-sm">
                        {entry.ticketCode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, rollProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : currentPrize &&
          currentPrize.status === "sorteado" &&
          currentPrize.winnerName ? (
          /* MODO GANHADOR REVELADO */
          <div className="flex w-full max-w-4xl flex-col items-center text-center animate-in zoom-in-95 duration-500">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-5 py-1.5 text-xs font-extrabold uppercase tracking-[0.25em] text-emerald-300 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {currentPrize.orderIndex}º Prêmio Sorteado!
            </div>

            <h2 className="text-2xl font-extrabold text-amber-300 sm:text-4xl">
              {currentPrize.title}
            </h2>
            {currentPrize.description ? (
              <p className="mt-1 text-sm text-slate-300 sm:text-base">
                {currentPrize.description}
              </p>
            ) : null}

            <div className="relative mt-8 w-full overflow-hidden rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/20 via-slate-900/95 to-slate-950 p-8 shadow-[0_0_100px_-15px_rgba(251,191,36,0.4)] sm:p-12">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 shadow-xl shadow-amber-400/30">
                <Crown className="h-11 w-11" />
              </div>

              <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-amber-300">
                Participante Contemplado(a)
              </p>

              <p className="mt-3 break-words text-4xl font-black tracking-tight text-white sm:text-6xl">
                {currentPrize.winnerName}
              </p>

              {currentPrize.winnerTicketCode ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-2 font-mono text-base font-bold text-amber-200 sm:text-lg">
                  <span>Inscrição:</span>
                  <strong className="text-white">
                    {currentPrize.winnerTicketCode}
                  </strong>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* MODO LOBBY / AGUARDANDO GIRO DO PRÊMIO */
          <div className="flex w-full max-w-4xl flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/15 px-5 py-1.5 text-xs font-extrabold uppercase tracking-[0.25em] text-blue-300">
              <Sparkles className="h-4 w-4 text-blue-400" />
              Preparado para o Sorteio Ao Vivo
            </div>

            {currentPrize ? (
              <>
                <p className="text-sm font-bold uppercase tracking-widest text-amber-400">
                  Em Disputa Agora · {currentPrize.orderIndex}º Prêmio
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">
                  {currentPrize.title}
                </h2>
                {currentPrize.description ? (
                  <p className="mt-3 max-w-xl text-base text-slate-300 sm:text-lg">
                    {currentPrize.description}
                  </p>
                ) : null}
              </>
            ) : (
              <h2 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">
                {view.title}
              </h2>
            )}

            {/* Idle Slot Machine Preview */}
            <div className="mt-10 w-full max-w-2xl rounded-3xl border border-white/15 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-400">
                  <Trophy className="h-8 w-8" />
                </div>
                <p className="text-xl font-bold text-white">
                  Aguardando comando para girar a roleta…
                </p>
                <p className="max-w-md text-sm text-slate-400">
                  Assim que o organizador iniciar o giro, os nomes dos{" "}
                  <strong className="text-slate-200">
                    {view.totalEligibleCount} participantes elegíveis
                  </strong>{" "}
                  rodarão na tela até revelar o ganhador!
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Stage Footer: Prizes Queue Progress */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/70 px-6 py-4 backdrop-blur-md sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {view.prizes.map((p) => {
              const isCurrent = p.id === currentPrize?.id && !showSummaryScreen;
              const isDrawn = p.status === "sorteado";
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
                    isCurrent
                      ? "border-amber-400 bg-amber-400/20 text-amber-200 shadow-sm shadow-amber-400/20"
                      : isDrawn
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-white/10 bg-white/5 text-slate-400",
                  )}
                >
                  <span>{p.orderIndex}º</span>
                  <span className="max-w-36 truncate">{p.title}</span>
                  {isDrawn && p.winnerName ? (
                    <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] text-emerald-200">
                      ✓ {p.winnerName.split(" ")[0]}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="text-xs font-semibold text-slate-400">
            {drawnPrizes.length} de {view.prizes.length} prêmio(s) sorteado(s)
          </div>
        </div>
      </footer>
    </div>
  );
}

function ConfettiCanvas({
  burstKey,
  continuous,
}: {
  burstKey: number;
  continuous: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (burstKey === 0 && !continuous) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let disposed = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = [
      "#fbbf24",
      "#34d399",
      "#60a5fa",
      "#f472b6",
      "#a78bfa",
      "#f87171",
    ];

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
    };

    const particles: Particle[] = [];
    const spawnBurst = (count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: canvas.width * (0.2 + Math.random() * 0.6),
          y: canvas.height * 0.35,
          vx: (Math.random() - 0.5) * 18,
          vy: -Math.random() * 16 - 5,
          size: 7 + Math.random() * 7,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
        });
      }
    };

    spawnBurst(140);

    let frame = 0;
    const render = () => {
      if (disposed) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      if (continuous && frame % 45 === 0 && particles.length < 180) {
        spawnBurst(35);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38; // gravity
        p.vx *= 0.99;
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();

        if (p.y > canvas.height + 40) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0 || continuous) {
        animationId = requestAnimationFrame(render);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [burstKey, continuous]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-30 h-full w-full"
    />
  );
}
