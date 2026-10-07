import { APP } from "@/lib/constants";

export const metadata = { title: `Entrar — ${APP.name}` };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-app-lg border border-app-border bg-app-surface p-8 shadow-app-elevated">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-app-md bg-app-primary text-xl font-bold text-white">
            RT
          </span>
          <div>
            <h1 className="text-xl font-bold">RaroTickets</h1>
            <p className="text-xs text-app-muted-foreground">Gestão de eventos e credenciamento</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-app-muted-foreground">
          <p>
            O acesso é realizado via <strong className="text-app-foreground">RaroNexus</strong> (SSO único da Rarotec).
            Se suas credenciais ainda não estiverem configuradas em <code className="font-mono">.env</code>,
            o sistema entrará automaticamente em <strong>modo de demonstração</strong> com um usuário Administrador.
          </p>
        </div>

        <a
          href={`/api/auth/raronexus/start`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-white hover:brightness-110"
        >
          Entrar com RaroNexus
        </a>

        <div className="rounded-app-md border border-app-border bg-app-surface-elevated/60 p-4 text-xs text-app-muted-foreground">
          <p className="mb-1 font-semibold text-app-foreground">Modo demonstração</p>
          <p>
            Ao clicar acima sem RaroNexus configurado, você entra como Administrador
            e pode testar todas as funcionalidades com os dados do seed.
          </p>
        </div>
      </div>
    </div>
  );
}
