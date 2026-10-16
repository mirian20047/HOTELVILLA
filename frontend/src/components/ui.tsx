import type { ReactNode } from 'react';
import { FiSearch, FiFolder } from 'react-icons/fi';

/* ---------- Encabezado de página ---------- */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  background,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  background?: string;
}) {
  return (
    <div className="anim-fade-up relative overflow-hidden rounded-3xl bg-[#0f1f38] text-white shadow-xl">
      {background && (
        <>
          <img
            src={background}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1526] via-[#0f1f38]/85 to-[#0f1f38]/30" />
        </>
      )}
      {!background && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(201,168,106,0.35),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(56,130,246,0.25),transparent_50%)]" />
      )}
      <div className="relative flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ecd9ac]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ddbe7e]" />
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-sm text-slate-300">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------- Tarjeta ---------- */
export function Card({
  children,
  className = '',
  delay = '',
}: {
  children: ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`anim-fade-up ${delay} rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_10px_35px_-18px_rgba(16,31,56,0.35)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Badge de estado ---------- */
const badgeStyles: Record<string, string> = {
  Disponible: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Activo: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pagado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'En curso': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Confirmada: 'bg-blue-50 text-blue-700 ring-blue-200',
  Ocupada: 'bg-rose-50 text-rose-700 ring-rose-200',
  Reservada: 'bg-blue-50 text-blue-700 ring-blue-200',
  Pendiente: 'bg-amber-50 text-amber-700 ring-amber-200',
  Parcial: 'bg-amber-50 text-amber-700 ring-amber-200',
  'En limpieza': 'bg-amber-50 text-amber-700 ring-amber-200',
  'En mantenimiento': 'bg-slate-100 text-slate-600 ring-slate-200',
  Inactivo: 'bg-slate-100 text-slate-500 ring-slate-200',
  Cancelada: 'bg-rose-50 text-rose-700 ring-rose-200',
  Administrador: 'bg-violet-50 text-violet-700 ring-violet-200',
  Recepcionista: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export function StatusBadge({ value }: { value: string }) {
  const style = badgeStyles[value] ?? 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

/* ---------- Buscador ---------- */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-modern pl-11"
      />
    </div>
  );
}

/* ---------- Estado vacío ---------- */
export function EmptyState({
  title,
  subtitle,
  image,
}: {
  title: string;
  subtitle?: string;
  image?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {image ? (
        <img src={image} alt="" loading="lazy" decoding="async" className="mb-5 h-36 w-56 rounded-2xl object-cover shadow-lg" />
      ) : (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#faf8f3] text-[#c9a86a]">
          <FiFolder className="text-3xl" />
        </div>
      )}
      <p className="font-display text-xl font-semibold text-slate-800">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

/* ---------- Cargando ---------- */
export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="space-y-3 p-6">
      <div className="skeleton h-10 w-1/3" />
      <div className="skeleton h-24 w-full" />
      <div className="skeleton h-24 w-full" />
      <p className="pt-2 text-center text-sm font-semibold text-[#b08d4f] animate-pulse">{message}</p>
    </div>
  );
}

/* ---------- Modal ---------- */
export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0b1526]/60 p-4"
      onClick={onClose}
    >
      <div
        className={`anim-fade-up w-full ${maxWidth} overflow-hidden rounded-3xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-[#0f1f38] to-[#274067] px-6 py-5 text-white">
          <div>
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-300">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-lg leading-none text-white transition hover:bg-white/25"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Avatar con iniciales ---------- */
export function initialsOf(nombres = '', apellidos = '') {
  const a = (nombres.trim()[0] ?? '').toUpperCase();
  const b = (apellidos.trim()[0] ?? '').toUpperCase();
  return `${a}${b}` || 'H';
}
