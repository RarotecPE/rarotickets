"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ListFilter, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Button, inputCls } from "@/components/ui";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import { cn } from "@/lib/utils";

const MAX_INLINE_CHIPS = 4;

export function parseEmailsText(text: string): string[] {
  if (!text) return [];
  const tokens = text
    .split(/[\r\n,;]+/)
    .flatMap((entry) => entry.trim().split(/\s+/))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const unique: string[] = [];
  for (const token of tokens) {
    if (!unique.includes(token)) unique.push(token);
  }
  return unique;
}

export function validateEmailToAdd(
  rawInput: string,
  existingEmails: string[],
): { ok: true; email: string } | { ok: false; message: string } {
  const trimmed = rawInput.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false, message: "Digite um e-mail para adicionar." };
  }
  const emailResult = Email.create(trimmed);
  if (emailResult.isFailure) {
    return { ok: false, message: "E-mail inválido. Verifique o endereço digitado." };
  }
  if (existingEmails.includes(emailResult.value.value)) {
    return { ok: false, message: "Este e-mail já está na lista." };
  }
  return { ok: true, email: emailResult.value.value };
}

type CouponAllowedEmailsFieldProps = {
  id: string;
  value: string;
  couponCode?: string;
  onChange: (nextValue: string) => void;
};

export function CouponAllowedEmailsField({
  id,
  value,
  couponCode,
  onChange,
}: CouponAllowedEmailsFieldProps) {
  const [inputValue, setInputValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const inlineInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const emails = useMemo(() => parseEmailsText(value), [value]);
  const visibleEmails = emails.slice(0, MAX_INLINE_CHIPS);
  const hiddenCount = Math.max(0, emails.length - MAX_INLINE_CHIPS);

  const filteredModalEmails = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (!cleanQuery) return emails;
    return emails.filter((email) => email.includes(cleanQuery));
  }, [emails, searchQuery]);

  const commitList = (nextList: string[]) => {
    onChange(nextList.join("\n"));
  };

  const handleAddInline = () => {
    const result = validateEmailToAdd(inputValue, emails);
    if (!result.ok) {
      setLocalError(result.message);
      inlineInputRef.current?.focus();
      return;
    }
    commitList([...emails, result.email]);
    setInputValue("");
    setLocalError(null);
    inlineInputRef.current?.focus();
  };

  const handleAddInModal = () => {
    const result = validateEmailToAdd(modalInput, emails);
    if (!result.ok) {
      setModalError(result.message);
      modalInputRef.current?.focus();
      return;
    }
    commitList([...emails, result.email]);
    setModalInput("");
    setModalError(null);
    setConfirmClearAll(false);
    modalInputRef.current?.focus();
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    commitList(emails.filter((item) => item !== emailToRemove));
    setConfirmClearAll(false);
  };

  const handleInlineKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddInline();
    }
  };

  const handleModalKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddInModal();
    }
  };

  const closeManager = () => {
    setManagerOpen(false);
    setModalInput("");
    setModalError(null);
    setSearchQuery("");
    setConfirmClearAll(false);
  };

  const emailReadyInline = Email.create(inputValue).isSuccess;
  const emailReadyModal = Email.create(modalInput).isSuccess;

  return (
    <div className="min-w-0 space-y-2">
      {/* Input de e-mail + botão "+" */}
      <div className="flex items-center gap-1.5">
        <input
          ref={inlineInputRef}
          id={id}
          type="email"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (localError) setLocalError(null);
          }}
          onKeyDown={handleInlineKeyDown}
          className={cn(inputCls, "text-xs")}
          placeholder="nome@exemplo.com"
          aria-label="E-mail para vincular ao cupom"
        />
        <Button
          type="button"
          variant={emailReadyInline ? "primary" : "secondary"}
          compact
          onClick={handleAddInline}
          title="Adicionar e-mail"
          aria-label="Adicionar e-mail"
          className="h-9 w-9 shrink-0 px-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {localError ? (
        <p role="alert" className="text-xs text-app-danger">
          {localError}
        </p>
      ) : null}

      {/* Lista compacta de chips */}
      {emails.length === 0 ? (
        <p className="text-[11px] text-app-muted-foreground">
          Sem restrição — qualquer e-mail pode usar este cupom.
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleEmails.map((email) => (
              <span
                key={email}
                title={email}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-app-border bg-app-surface px-2.5 py-0.5 text-[11px] text-app-foreground"
              >
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email)}
                  className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-app-muted-foreground transition-colors hover:bg-app-danger/10 hover:text-app-danger"
                  title={`Remover e-mail ${email}`}
                  aria-label={`Remover e-mail ${email}`}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}

            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setManagerOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-app-primary/30 bg-app-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-app-primary transition-colors hover:bg-app-primary/15"
              >
                +{hiddenCount} {hiddenCount === 1 ? "e-mail" : "e-mails"}
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-app-muted-foreground">
            <span>
              {emails.length} {emails.length === 1 ? "e-mail vinculado" : "e-mails vinculados"}
            </span>
            <button
              type="button"
              onClick={() => setManagerOpen(true)}
              className="inline-flex items-center gap-1 font-medium text-app-primary hover:underline"
            >
              <ListFilter className="h-3 w-3" aria-hidden="true" />
              Gerenciar lista
            </button>
          </div>
        </div>
      )}

      {/* Modal para gerenciamento completo de listas maiores */}
      <Dialog
        open={managerOpen}
        onClose={closeManager}
        title={
          couponCode?.trim()
            ? `E-mails vinculados — ${couponCode.trim().toUpperCase()}`
            : "E-mails vinculados ao cupom"
        }
        description={`${emails.length} ${emails.length === 1 ? "e-mail cadastrado" : "e-mails cadastrados"} para este cupom.`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Adicionar e-mail dentro do modal */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={modalInputRef}
                type="email"
                autoComplete="off"
                value={modalInput}
                onChange={(e) => {
                  setModalInput(e.target.value);
                  if (modalError) setModalError(null);
                }}
                onKeyDown={handleModalKeyDown}
                className={cn(inputCls, "text-xs")}
                placeholder="Adicionar novo e-mail (nome@exemplo.com)"
                aria-label="Adicionar novo e-mail"
              />
              <Button
                type="button"
                variant={emailReadyModal ? "primary" : "secondary"}
                compact
                onClick={handleAddInModal}
                title="Adicionar e-mail"
                aria-label="Adicionar e-mail"
                className="h-9 w-9 shrink-0 px-0"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {modalError ? (
              <p role="alert" className="text-xs text-app-danger">
                {modalError}
              </p>
            ) : null}
          </div>

          {/* Busca quando houver vários e-mails */}
          {emails.length > 4 ? (
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(inputCls, "pl-8 text-xs")}
                placeholder="Buscar e-mail na lista..."
                aria-label="Buscar e-mail na lista"
              />
            </div>
          ) : null}

          {/* Lista isolada com scroll contido */}
          {emails.length === 0 ? (
            <div className="rounded-app-md border border-dashed border-app-border px-4 py-6 text-center text-xs text-app-muted-foreground">
              Nenhum e-mail vinculado. O cupom ficará disponível para qualquer participante.
            </div>
          ) : filteredModalEmails.length === 0 ? (
            <div className="rounded-app-md border border-app-border px-4 py-6 text-center text-xs text-app-muted-foreground">
              Nenhum e-mail encontrado para “{searchQuery}”.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-app-border/60 rounded-app-md border border-app-border bg-app-surface-elevated/40">
              {filteredModalEmails.map((email) => {
                const position = emails.indexOf(email) + 1;
                return (
                  <div
                    key={email}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-app-muted-foreground">
                        #{position}
                      </span>
                      <span
                        title={email}
                        className="min-w-0 truncate font-medium text-app-foreground"
                      >
                        {email}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-app-md text-app-muted-foreground transition-colors hover:bg-app-danger/10 hover:text-app-danger"
                      title={`Remover e-mail ${email}`}
                      aria-label={`Remover e-mail ${email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé do modal */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-3">
            {emails.length > 0 ? (
              confirmClearAll ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    compact
                    onClick={() => {
                      commitList([]);
                      setConfirmClearAll(false);
                      setSearchQuery("");
                    }}
                  >
                    Confirmar limpeza ({emails.length})
                  </Button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="text-xs text-app-muted-foreground hover:text-app-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="text-xs font-medium text-app-danger hover:underline"
                >
                  Remover todos
                </button>
              )
            ) : (
              <span />
            )}
            <Button type="button" variant="primary" compact onClick={closeManager}>
              Concluir
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
