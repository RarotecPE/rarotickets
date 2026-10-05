import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export type QrCodeProps = { value: string; size?: number; label?: string };

/** Renderiza o QR da credencial no client (o payload vem assinado do servidor). */
export function QrCode({ value, size = 180, label }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="grid place-items-center rounded-[8px] border border-app-border bg-white/5 text-[12px] text-app-muted"
        style={{ width: size, height: size }}
      >
        Gerando QR…
      </div>
    );
  }

  return (
    <figure className="inline-flex flex-col items-center gap-2">
      <img src={dataUrl} width={size} height={size} alt={label ?? 'QR Code'} className="rounded-[8px] bg-white p-2" />
      {label && <figcaption className="text-[12px] text-app-muted">{label}</figcaption>}
    </figure>
  );
}
