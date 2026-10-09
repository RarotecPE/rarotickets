import { LoaderCircle } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui";

export type DataPageLoadingProps = { panels?: string[]; stats?: string[]; detailTitle?: string };

export function DataPageLoading({ panels = ["Carregando informações"], stats = [], detailTitle }: DataPageLoadingProps) {
  return <div aria-busy="true" className="flex flex-col gap-5"><div role="status" className="flex items-center gap-2 text-xs text-app-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Carregando conteúdo…</div>{stats.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map((label) => <div key={label} className="h-24 animate-pulse rounded-app-lg border border-app-border bg-app-surface" aria-label={`Carregando ${label}`} />)}</div> : null}{detailTitle ? <div className="h-8 w-56 animate-pulse rounded bg-app-surface-elevated" /> : null}{panels.map((title) => <Panel key={title}><PanelHeader title={title} /><div className="space-y-3 p-5">{[0, 1, 2].map((line) => <div key={line} className="h-4 animate-pulse rounded bg-app-surface-elevated" />)}</div></Panel>)}</div>;
}
