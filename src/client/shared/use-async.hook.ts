import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncState<Data> = {
  data: Data | null;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  setData: (data: Data | null) => void;
};

/** Executa uma consulta e mantém estado de carregamento/erro para a tela. */
export function useAsync<Data>(loader: () => Promise<Data>, deps: readonly unknown[] = []): AsyncState<Data> {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, isLoading, reload, setData };
}
