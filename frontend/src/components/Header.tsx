import { FiMenu, FiBell, FiCalendar } from 'react-icons/fi';
import { initialsOf } from './ui';

export default function Header({ onMenu }: { onMenu: () => void }) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onMenu}
          className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú"
        >
          <FiMenu className="text-xl" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b08d4f]">
            <FiCalendar className="text-xs" />
            <span className="truncate">{hoy}</span>
          </p>
          <h2 className="truncate text-lg font-extrabold text-slate-800 sm:text-xl">
            Hola, {usuario.nombres ?? 'equipo'}{' '}
            <span className="font-display font-semibold text-[#b08d4f]">· bienvenido de nuevo</span>
          </h2>
        </div>

        <button
          className="relative hidden rounded-2xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 sm:block"
          aria-label="Notificaciones"
        >
          <FiBell className="text-xl" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#c9a86a] ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#faf8f3] py-1.5 pl-1.5 pr-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f1f38] to-[#274067] text-sm font-extrabold text-[#ecd9ac]">
            {initialsOf(usuario.nombres, usuario.apellidos)}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-bold text-slate-800">
              {usuario.nombres} {usuario.apellidos}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#b08d4f]">
              {usuario.rol}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
