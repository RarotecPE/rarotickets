"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, MonitorPlay, Search, Ticket } from "lucide-react";
import { ticketingApi } from "@/client/services/ticketing-api.service";
import type { EventReadModel } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";
import { Badge, Button, Empty, Field, InlineAlert, Panel, Stat, inputCls, selectCls } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";

export type PublicEventsBrowserProps = { variant: "home" | "listing" };
type EventQueryState = { query: string; modality: string };

export function PublicEventsBrowser({ variant }: PublicEventsBrowserProps) {
  const isHome = variant === "home";
  const [events, setEvents] = useState<EventReadModel[]>([]);
  const [query, setQuery] = useState("");
  const [modality, setModality] = useState("");
  const [filters, setFilters] = useState<EventQueryState>({ query: "", modality: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchEvents(): Promise<void> {
      try {
        const result = await ticketingApi.listPublicEvents({ query: filters.query, modality: filters.modality, limit: 24 });
        if (active) setEvents(result);
      } catch (caught) {
        if (active) {
          const raw = caught instanceof Error ? caught.message : "";
          const isTechnical = raw.includes("Failed query") || raw.includes("select \"");
          setError(isTechnical ? "Não foi possível carregar os eventos no momento. Tente novamente em instantes." : raw || "Não foi possível carregar os eventos.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchEvents();
    return () => { active = false; };
  }, [filters, reloadVersion]);

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setFilters({ query: query.trim(), modality });
    setReloadVersion((current) => current + 1);
  }

  function retrySearch(): void {
    setError(null);
    setLoading(true);
    setReloadVersion((current) => current + 1);
  }

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-6 pb-12 sm:px-6 lg:px-8 lg:py-8">
    {isHome ? <section className="grid gap-8 overflow-hidden rounded-app-lg border border-app-border bg-app-surface p-5 sm:p-8 lg:grid-cols-[1.3fr_0.7fr] lg:p-10"><div className="flex flex-col justify-center"><Badge tone="primary" className="w-fit">RaroTickets · Eventos</Badge><h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-app-foreground sm:text-4xl">Conhecimento que conecta. Experiências que ficam.</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-app-muted-foreground sm:text-base">Encontre eventos, garanta sua vaga e acompanhe sua inscrição em um só lugar — do primeiro clique ao certificado.</p><div className="mt-6 flex flex-wrap gap-3"><a href="#eventos" className="inline-flex h-10 items-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white transition hover:brightness-110">Explorar eventos<ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div></div><div className="relative flex min-h-48 flex-col justify-end overflow-hidden rounded-app-lg border border-app-border bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,.35),transparent_44%),linear-gradient(145deg,#111827,#0b0f17)] p-5 sm:min-h-64"><div className="absolute right-6 top-6 rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur"><Ticket className="h-8 w-8" aria-hidden="true" /></div><p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Sua próxima oportunidade</p><p className="mt-2 max-w-xs text-lg font-semibold leading-snug text-white">Aprenda, compartilhe e participe com segurança.</p><div className="mt-4 flex gap-2 text-[11px] text-slate-300"><span className="rounded-full border border-white/15 px-2.5 py-1">Inscrição simples</span><span className="rounded-full border border-white/15 px-2.5 py-1">Credencial digital</span></div></div></section> : <div><p className="text-xs font-semibold uppercase tracking-wider text-app-primary">Agenda RaroTickets</p><h1 className="mt-2 text-2xl font-bold text-app-foreground">Explore eventos</h1><p className="mt-1 text-sm text-app-muted-foreground">Pesquise encontros, treinamentos e experiências.</p></div>}

    <section id="eventos" className="flex flex-col gap-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-app-foreground">Próximos eventos</h2><p className="mt-1 text-xs text-app-muted-foreground">Escolha seu evento e faça sua inscrição online.</p></div><div className="flex flex-wrap gap-2"><Stat label="Eventos disponíveis" value={events.length} className="min-w-40" /></div></div>
      <Panel className="p-4 sm:p-5"><form onSubmit={submitSearch} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_220px_auto]"><Field label="Buscar evento" htmlFor="event-search"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted-foreground" aria-hidden="true" /><input id="event-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, tema ou cidade" className={inputCls + " pl-9"} /></div></Field><Field label="Modalidade" htmlFor="event-modality"><select id="event-modality" value={modality} onChange={(event) => setModality(event.target.value)} className={selectCls}><option value="">Todas</option><option value="presencial">Presencial</option><option value="online">Online</option></select></Field><Button type="submit"><Search className="h-4 w-4" aria-hidden="true" />Buscar</Button></form></Panel>
      {error ? <InlineAlert tone="danger" className="flex flex-wrap items-center justify-between gap-3">{error}<Button compact variant="secondary" onClick={retrySearch}>Tentar novamente</Button></InlineAlert> : null}
      {loading ? <div aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-app-lg border border-app-border bg-app-surface" />)}</div> : error ? null : events.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{events.map((event) => <PublicEventCard key={event.id} event={event} />)}</div> : <Empty title="Nenhum evento encontrado" description="Altere os filtros ou volte em breve para conferir novas oportunidades." />}
    </section>
  </div>;
}

export type PublicEventCardProps = { event: EventReadModel };
export function PublicEventCard({ event }: PublicEventCardProps) {
  const lowestPrice = event.lots.filter((lot) => lot.active).sort((left, right) => left.priceCents - right.priceCents)[0]?.priceCents;
  const isOnline = event.props.modality === "online";
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-app-lg border border-app-border bg-app-surface transition-colors hover:border-app-primary/40">
    <Link href={`/eventos/${event.props.slug}`} className="flex h-full flex-col" aria-label={`Ver detalhes do evento ${event.props.title}`}>
      <div className="relative h-40 overflow-hidden bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,.35),transparent_44%),linear-gradient(145deg,#111827,#0b0f17)]">
        {event.props.bannerUrl ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.props.bannerUrl} alt={`Banner do evento ${event.props.title}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        </> : <div className="flex h-full items-center justify-center text-blue-200"><Ticket className="h-10 w-10 opacity-70" aria-hidden="true" /></div>}
        <Badge tone="primary" className="absolute left-3 top-3">{isOnline ? "Online" : "Presencial"}</Badge>
      </div>
      <div className="flex flex-1 flex-col p-4"><div className="flex items-center gap-1.5 text-xs text-app-muted-foreground"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate({ value: event.props.startAt, withTime: true })}</div><h3 className="mt-2 line-clamp-2 text-base font-bold text-app-foreground group-hover:text-app-primary">{event.props.title}</h3><p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-app-muted-foreground">{event.props.summary}</p><div className="mt-4 flex items-center justify-between gap-2 border-t border-app-border pt-3"><span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs text-app-muted-foreground">{isOnline ? <MonitorPlay className="h-3.5 w-3.5" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5" aria-hidden="true" />}{isOnline ? "Transmissão online" : event.props.address?.municipality ? `${event.props.address.municipality}, ${event.props.address.state}` : "Local a definir"}</span><span className="shrink-0 text-xs font-semibold text-app-foreground">{event.props.chargeType === "gratuito" ? "Gratuito" : lowestPrice ? `A partir de ${formatCurrency({ cents: lowestPrice })}` : "Consulte"}</span></div></div>
    </Link>
  </article>;
}
