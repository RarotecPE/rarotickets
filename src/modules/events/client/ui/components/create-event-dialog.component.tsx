import { useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { AlertCircle, CalendarDays, Check, CircleX, LoaderCircle, X } from 'lucide-react';
import { ApiClientError } from '../../../../../client/services/api-service.base';
import { eventsApiService } from '../../../../../client/bootstrap/container';
import { validateCreateEventForm } from '../forms/create-event.form';
import type { CreateEventFormErrors, CreateEventFormValues } from '../forms/create-event.form';
import type { EventView } from '../../types/event.types';

export type CloseCreateEventDialog = () => void;
export type OnEventCreated = (event: EventView) => void;
export type CreateEventDialogProps = {
  onClose: CloseCreateEventDialog;
  onCreated: OnEventCreated;
};

const INITIAL_FORM_VALUES: CreateEventFormValues = {
  title: '',
  shortDescription: '',
  description: '',
  eventType: 'PAGO',
  price: '189,00',
  startAt: '',
  endAt: '',
  capacity: '200',
  modality: 'PRESENCIAL',
  location: '',
};

export function CreateEventDialog(params: CreateEventDialogProps) {
  const [values, setValues] = useState<CreateEventFormValues>(INITIAL_FORM_VALUES);
  const [errors, setErrors] = useState<CreateEventFormErrors>({});
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    titleInputRef.current?.focus();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) params.onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isSaving, params]);

  const updateField = <Field extends keyof CreateEventFormValues>(field: Field, value: CreateEventFormValues[Field]) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateCreateEventForm({ values });
    setErrors(validation.errors);
    if (!validation.payload) return;
    setIsSaving(true);
    setServerError('');
    try {
      const response = await eventsApiService.create(validation.payload);
      params.onCreated(response.data.event);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : 'Não foi possível criar o evento. Tente novamente.';
      setServerError(message);
      setIsSaving(false);
    }
  };

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target && !isSaving) params.onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={closeFromBackdrop}>
      <section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="create-event-title" aria-describedby="create-event-description">
        <div className="dialog-header">
          <div className="dialog-title-icon"><CalendarDays size={19} /></div>
          <div><p className="eyebrow">NOVO EVENTO</p><h2 id="create-event-title">Vamos criar algo especial.</h2><p id="create-event-description">Comece com as informações principais. Você poderá ajustar os detalhes depois.</p></div>
          <button className="icon-button dialog-close" type="button" aria-label="Fechar criação de evento" onClick={params.onClose} disabled={isSaving}><X size={19} /></button>
        </div>

        {serverError && <div className="callout callout-danger dialog-error" role="alert"><AlertCircle size={16} />{serverError}</div>}

        <form className="event-form" onSubmit={handleSubmit} noValidate>
          <div className="form-section-heading"><span>01</span><div><strong>O essencial</strong><small>Como vamos chamar seu evento?</small></div></div>
          <div className="form-field">
            <label htmlFor="event-title">Nome do evento <span className="required-mark">*</span></label>
            <input ref={titleInputRef} id="event-title" maxLength={120} value={values.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Ex.: Conexão Raro Summit 2026" autoComplete="off" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'event-title-error' : undefined} />
            {errors.title && <span className="field-error" id="event-title-error">{errors.title}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="event-summary">Resumo <span className="required-mark">*</span></label>
            <input id="event-summary" maxLength={240} value={values.shortDescription} onChange={(event) => updateField('shortDescription', event.target.value)} placeholder="Uma frase curta para apresentar o evento" aria-invalid={Boolean(errors.shortDescription)} />
            {errors.shortDescription && <span className="field-error">{errors.shortDescription}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="event-description">Descrição <span className="optional-mark">Opcional</span></label>
            <textarea id="event-description" rows={3} maxLength={5000} value={values.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Conte um pouco mais sobre o que os participantes podem esperar." />
          </div>

          <div className="form-section-heading form-section-spaced"><span>02</span><div><strong>Formato e inscrições</strong><small>Defina quando, onde e como acontece.</small></div></div>
          <div className="form-field">
            <span className="form-label">Tipo de evento</span>
            <div className="choice-tabs" role="group" aria-label="Tipo de evento">
              <button type="button" className={values.eventType === 'PAGO' ? 'choice-tab choice-tab-active' : 'choice-tab'} aria-pressed={values.eventType === 'PAGO'} onClick={() => updateField('eventType', 'PAGO')}><span className="choice-tab-dot" /> Pago</button>
              <button type="button" className={values.eventType === 'GRATUITO' ? 'choice-tab choice-tab-active' : 'choice-tab'} aria-pressed={values.eventType === 'GRATUITO'} onClick={() => updateField('eventType', 'GRATUITO')}><span className="choice-tab-dot" /> Gratuito</button>
            </div>
          </div>
          {values.eventType === 'PAGO' && <div className="form-field"><label htmlFor="event-price">Valor inicial <span className="required-mark">*</span></label><div className="input-with-prefix"><span>R$</span><input id="event-price" type="text" inputMode="decimal" value={values.price} onChange={(event) => updateField('price', event.target.value)} placeholder="189,00" aria-invalid={Boolean(errors.price)} /></div>{errors.price && <span className="field-error">{errors.price}</span>}<span className="field-hint">Este valor será usado como referência para o primeiro lote.</span></div>}
          <div className="form-field">
            <span className="form-label">Formato</span>
            <div className="choice-tabs" role="group" aria-label="Formato do evento">
              <button type="button" className={values.modality === 'PRESENCIAL' ? 'choice-tab choice-tab-active' : 'choice-tab'} aria-pressed={values.modality === 'PRESENCIAL'} onClick={() => updateField('modality', 'PRESENCIAL')}>Presencial</button>
              <button type="button" className={values.modality === 'ONLINE' ? 'choice-tab choice-tab-active' : 'choice-tab'} aria-pressed={values.modality === 'ONLINE'} onClick={() => updateField('modality', 'ONLINE')}>Online</button>
            </div>
          </div>
          <div className="form-field"><label htmlFor="event-location">{values.modality === 'ONLINE' ? 'Link do evento' : 'Local do evento'} <span className="required-mark">*</span></label><input id="event-location" value={values.location} onChange={(event) => updateField('location', event.target.value)} placeholder={values.modality === 'ONLINE' ? 'https://...' : 'Espaço, cidade e estado'} aria-invalid={Boolean(errors.location)} />{errors.location && <span className="field-error">{errors.location}</span>}</div>
          <div className="form-two-columns">
            <div className="form-field"><label htmlFor="event-start">Início <span className="required-mark">*</span></label><input id="event-start" type="datetime-local" value={values.startAt} onChange={(event) => updateField('startAt', event.target.value)} aria-invalid={Boolean(errors.startAt)} /></div>
            <div className="form-field"><label htmlFor="event-end">Término <span className="required-mark">*</span></label><input id="event-end" type="datetime-local" value={values.endAt} onChange={(event) => updateField('endAt', event.target.value)} aria-invalid={Boolean(errors.endAt)} />{errors.endAt && <span className="field-error">{errors.endAt}</span>}</div>
          </div>
          <div className="form-field"><label htmlFor="event-capacity">Capacidade <span className="optional-mark">Opcional</span></label><input id="event-capacity" type="number" min="1" step="1" inputMode="numeric" value={values.capacity} onChange={(event) => updateField('capacity', event.target.value)} placeholder="Sem limite de vagas" aria-invalid={Boolean(errors.capacity)} />{errors.capacity && <span className="field-error">{errors.capacity}</span>}<span className="field-hint">Deixe em branco para não limitar o número de participantes.</span></div>

          <div className="draft-notice"><CircleX size={16} /><span>O evento será salvo como <strong>rascunho</strong> e não aceitará inscrições públicas até ser publicado.</span></div>
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={params.onClose} disabled={isSaving}>Cancelar</button><button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={16} className="spin-icon" /> : <Check size={16} />}{isSaving ? 'Salvando…' : 'Criar rascunho'}</button></div>
        </form>
      </section>
    </div>
  );
}
