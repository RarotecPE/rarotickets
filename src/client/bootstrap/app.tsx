import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@client/routing/app.routes';
import { ThemeProvider } from '@client/state/theme.state';
import { ToastProvider } from '@client/state/toast.state';
import { SessionProvider } from '@client/state/session.state';
import { ParticipantProvider } from '@client/state/participant.state';
import { Toaster } from '@client/ui/components/toaster.component';

/** Composition root do client: provedores globais + rotas. */
export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SessionProvider>
          <ParticipantProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
            <Toaster />
          </ParticipantProvider>
        </SessionProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
