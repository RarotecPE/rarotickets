import { redirect } from "next/navigation";
import { Panel, PanelHeader, Field, btnPrimary, inputCls, textareaCls, labelCls } from "@/components/ui";
import { getSession } from "@/server/session/session.service";

export const dynamic = "force-dynamic";

async function createEvent(formData: FormData) {
"use server";
  const res = await fetch(`${process.env.APP_BASE_URL || "http://localhost:3000"}/api/events`, {
    method: "POST",
    headers: { cookie: (formData.get("cookie") as string) || "" },
    body: JSON.stringify({
      title: formData.get("title"),
      description: formData.get("description"),
      modality: formData.get("modality"),
      financialType: formData.get("financialType"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      capacity: Number(formData.get("capacity")),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      streamUrl: formData.get("streamUrl"),
      waitlistEnabled: formData.get("waitlistEnabled") === "on",
      certificateEnabled: formData.get("certificateEnabled") === "on",
      certificateHours: formData.get("certificateHours") ? Number(formData.get("certificateHours")) : null,
    }),
  });
  if (res.ok) {
    const data = await res.json();
    redirect(`/eventos/${data.data.id}`);
  }
}

export default async function NovoEventoPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <PanelHeader title="Novo evento" description="Preencha as informações básicas" />
        <form action={createEvent} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <Field label="Título" className="sm:col-span-2">
            <input name="title" required className={inputCls} placeholder="Ex.: Reforma Tributária 2026" />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <textarea name="description" rows={3} required className={textareaCls} placeholder="Descrição detalhada do evento" />
          </Field>
          <Field label="Modalidade">
            <select name="modality" required className={inputCls}>
              <option value="PRESENCIAL">Presencial</option>
              <option value="ONLINE">Online</option>
            </select>
          </Field>
          <Field label="Tipo financeiro">
            <select name="financialType" required className={inputCls}>
              <option value="GRATUITO">Gratuito</option>
              <option value="PAGO">Pago</option>
            </select>
          </Field>
          <Field label="Data/hora de início">
            <input name="startsAt" type="datetime-local" required className={inputCls} />
          </Field>
          <Field label="Data/hora de término">
            <input name="endsAt" type="datetime-local" required className={inputCls} />
          </Field>
          <Field label="Capacidade máxima">
            <input name="capacity" type="number" min={1} required defaultValue={100} className={inputCls} />
          </Field>
          <Field label="Endereço (eventos presenciais)">
            <input name="address" className={inputCls} placeholder="Rua, número, bairro" />
          </Field>
          <Field label="Cidade / UF" className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              <input name="city" className={inputCls} placeholder="Município" />
              <input name="state" maxLength={2} className={inputCls} placeholder="UF" />
            </div>
          </Field>
          <Field label="Link de transmissão (eventos online)" className="sm:col-span-2">
            <input name="streamUrl" type="url" className={inputCls} placeholder="https://..." />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="waitlistEnabled" defaultChecked />
            Habilitar lista de espera
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="certificateEnabled" />
            Emitir certificados
          </label>
          <Field label="Carga horária do certificado (horas)">
            <input name="certificateHours" type="number" min={1} className={inputCls} placeholder="Ex.: 8" />
          </Field>
          <div className="sm:col-span-2 flex justify-end border-t border-app-border pt-4">
            <button type="submit" className={btnPrimary}>Criar evento</button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
