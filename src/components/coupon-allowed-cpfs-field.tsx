"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ListFilter, Plus, Search, Trash2, X } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Button, inputCls } from "@/components/ui";
import { Cpf } from "@/modules/ticketing/domain/participants/value-objects/cpf.vo";
import { cn } from "@/lib/utils";

const MAX_INLINE_CHIPS = 4;

export function formatCpfMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function parseCpfsText(text: string): string[] {
  if (!text) return [];
  const tokens = text
    .split(/[\r\n,;]+/)
    .flatMap((entry) => entry.trim().split(/\s+/))
    .map((item) => item.replace(/\D/g, ""))
    .filter(Boolean);

  const unique: string[] = [];
  for (const token of tokens) {
    if (!unique.includes(token)) unique.push(token);
  }
  return unique;
}

export function validateCpfToAdd(
  rawInput: string,
  existingDigits: string[],
): { ok: true; digits: string } | { ok: false; message: string } {
  const digits = rawInput.replace(/\D/g, "");
  if (digits.length === 0) {
    return { ok: false, message: "Digite um CPF para adicionar." };
  }
  if (digits.length !== 11) {
    return {
      ok: false,
      message: `CPF incompleto (informe 11 dígitos; digitados: ${digits.length}).`,
    };
  }
  const cpfResult = Cpf.create(digits);
  if (cpfResult.isFailure) {
    return { ok: false, message: "CPF inválido (dígito verificador incorreto)." };
  }
  if (existingDigits.includes(cpfResult.value.digits)) {
    return { ok: false, message: "Este CPF já está na lista." };
  }
  return { ok: true, digits: cpfResult.value.digits };
}

type CouponAllowedCpfsFieldProps = {
  id: string;
  value: string;
  couponCode?: string;
  onChange: (nextValue: string) => void;
};

export function CouponAllowedCpfsField({
  id,
  value,
  couponCode,
  onChange,
}: CouponAllowedCpfsFieldProps) {
  const [inputValue, setInputValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const inlineInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const cpfs = useMemo(() => parseCpfsText(value), [value]);
  const visibleCpfs = cpfs.slice(0, MAX_INLINE_CHIPS);
  const hiddenCount = Math.max(0, cpfs.length - MAX_INLINE_CHIPS);

  const filteredModalCpfs = useMemo(() => {
    const cleanQuery = searchQuery.replace(/\D/g, "");
    if (!cleanQuery) return cpfs;
    return cpfs.filter((digits) => digits.includes(cleanQuery));
  }, [cpfs, searchQuery]);

  const commitList = (nextList: string[]) => {
    onChange(nextList.join("\n"));
  };

  const handleAddInline = () => {
    const result = validateCpfToAdd(inputValue, cpfs);
    if (!result.ok) {
      setLocalError(result.message);
      inlineInputRef.current?.focus();
      return;
    }
    commitList([...cpfs, result.digits]);
    setInputValue("");
    setLocalError(null);
    inlineInputRef.current?.focus();
  };

  const handleAddInModal = () => {
    const result = validateCpfToAdd(modalInput, cpfs);
    if (!result.ok) {
      setModalError(result.message);
      modalInputRef.current?.focus();
      return;
    }
    commitList([...cpfs, result.digits]);
    setModalInput("");
    setModalError(null);
    setConfirmClearAll(false);
    modalInputRef.current?.focus();
  };

  const handleRemoveCpf = (digitsToRemove: string) => {
    commitList(cpfs.filter((item) => item !== digitsToRemove));
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

  const digitsReadyInline = inputValue.replace(/\D/g, "").length === 11;
  const digitsReadyModal = modalInput.replace(/\D/g, "").length === 11;

  return (
    <div className="space-y-2">
      {/* Input mascarado + botão "+" */}
      <div className="flex items-center gap-1.5">
        <input
          ref={inlineInputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          value={inputValue}
          onChange={(e) => {
            setInputValue(formatCpfMask(e.target.value));
            if (localError) setLocalError(null);
          }}
          onKeyDown={handleInlineKeyDown}
          className={cn(inputCls, "font-mono text-xs")}
          placeholder="000.000.000-00"
          aria-label="CPF para vincular ao cupom"
        />
        <Button
          type="button"
          variant={digitsReadyInline ? "primary" : "secondary"}
          compact
          onClick={handleAddInline}
          title="Adicionar CPF"
          aria-label="Adicionar CPF"
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
      {cpfs.length === 0 ? (
        <p className="text-[11px] text-app-muted-foreground">
          Sem restrição — qualquer CPF pode usar este cupom.
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleCpfs.map((digits) => {
              const formatted = formatCpfMask(digits);
              return (
                <span
                  key={digits}
                  className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-surface px-2.5 py-0.5 font-mono text-[11px] text-app-foreground"
                >
                  <span>{formatted}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCpf(digits)}
                    className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-app-muted-foreground transition-colors hover:bg-app-danger/10 hover:text-app-danger"
                    title={`Remover CPF ${formatted}`}
                    aria-label={`Remover CPF ${formatted}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              );
            })}

            {hiddenCount > 0 ? (
              <button
                type="button"
                onClick={() => setManagerOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-app-primary/30 bg-app-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-app-primary transition-colors hover:bg-app-primary/15"
              >
                +{hiddenCount} {hiddenCount === 1 ? "CPF" : "CPFs"}
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-app-muted-foreground">
            <span>
              {cpfs.length} {cpfs.length === 1 ? "CPF vinculado" : "CPFs vinculados"}
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
            ? `CPFs vinculados — ${couponCode.trim().toUpperCase()}`
            : "CPFs vinculados ao cupom"
        }
        description={`${cpfs.length} ${cpfs.length === 1 ? "CPF cadastrado" : "CPFs cadastrados"} para este cupom.`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Adicionar CPF dentro do modal */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={modalInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                value={modalInput}
                onChange={(e) => {
                  setModalInput(formatCpfMask(e.target.value));
                  if (modalError) setModalError(null);
                }}
                onKeyDown={handleModalKeyDown}
                className={cn(inputCls, "font-mono text-xs")}
                placeholder="Adicionar novo CPF (000.000.000-00)"
                aria-label="Adicionar novo CPF"
              />
              <Button
                type="button"
                variant={digitsReadyModal ? "primary" : "secondary"}
                compact
                onClick={handleAddInModal}
                title="Adicionar CPF"
                aria-label="Adicionar CPF"
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

          {/* Busca quando houver vários CPFs */}
          {cpfs.length > 4 ? (
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                inputMode="numeric"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(inputCls, "pl-8 font-mono text-xs")}
                placeholder="Buscar CPF na lista..."
                aria-label="Buscar CPF na lista"
              />
            </div>
          ) : null}

          {/* Lista isolada com scroll contido */}
          {cpfs.length === 0 ? (
            <div className="rounded-app-md border border-dashed border-app-border px-4 py-6 text-center text-xs text-app-muted-foreground">
              Nenhum CPF vinculado. O cupom ficará disponível para qualquer participante.
            </div>
          ) : filteredModalCpfs.length === 0 ? (
            <div className="rounded-app-md border border-app-border px-4 py-6 text-center text-xs text-app-muted-foreground">
              Nenhum CPF encontrado para “{searchQuery}”.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-app-border/60 rounded-app-md border border-app-border bg-app-surface-elevated/40">
              {filteredModalCpfs.map((digits) => {
                const formatted = formatCpfMask(digits);
                const position = cpfs.indexOf(digits) + 1;
                return (
                  <div
                    key={digits}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-app-muted-foreground">
                        #{position}
                      </span>
                      <span className="font-mono font-medium text-app-foreground">
                        {formatted}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCpf(digits)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-app-md text-app-muted-foreground transition-colors hover:bg-app-danger/10 hover:text-app-danger"
                      title={`Remover CPF ${formatted}`}
                      aria-label={`Remover CPF ${formatted}`}
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
            {cpfs.length > 0 ? (
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
                    Confirmar limpeza ({cpfs.length})
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
