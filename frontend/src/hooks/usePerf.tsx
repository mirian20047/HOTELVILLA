import { useEffect, useMemo, useState } from 'react';

/** Debounce: evita refiltrar/recargar en cada tecla (causa del lag al buscar). */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Paginación cliente: renderiza solo 12 filas/tarjetas por vez en vez de
 *  cientos de nodos DOM (la otra gran causa del lag en tablas). */
export function usePagination<T>(items: T[], perPage = 12) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [items.length, totalPages, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  return { page, setPage, totalPages, pageItems };
}

export function PaginationControls({
  page,
  totalPages,
  onChange,
  total,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  total: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="text-xs font-semibold text-slate-400">
        Página {page} de {totalPages} · {total} registros
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          ← Anterior
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-xl bg-[#0f1f38] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#274067] disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
