import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiHome, FiUser, FiGrid, FiCalendar,
  FiLogIn, FiBarChart2, FiLogOut, FiSettings, FiUserCheck, FiX,
} from 'react-icons/fi';
import { initialsOf } from './ui';

const todasLasOpciones = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard', desc: 'Vista general', roles: ['Administrador', 'Recepcionista'] },
  { path: '/clientes', icon: FiUser, label: 'Clientes', desc: 'Huéspedes y contactos', roles: ['Administrador', 'Recepcionista'] },
  { path: '/habitaciones', icon: FiGrid, label: 'Habitaciones', desc: 'Estado y pisos', roles: ['Administrador', 'Recepcionista'] },
  { path: '/reservas', icon: FiCalendar, label: 'Reservas', desc: 'Ocupación directa', roles: ['Administrador', 'Recepcionista'] },
  { path: '/checkin', icon: FiLogIn, label: 'Check-in / out', desc: 'Llegadas y salidas', roles: ['Administrador', 'Recepcionista'] },
  { path: '/reportes', icon: FiBarChart2, label: 'Reportes', desc: 'Ocupación e ingresos', roles: ['Administrador'] },
  { path: '/tipos-habitacion', icon: FiSettings, label: 'Tipos', desc: 'Categorías y tarifas', roles: ['Administrador'] },
  { path: '/usuarios', icon: FiUserCheck, label: 'Usuarios', desc: 'Equipo y roles', roles: ['Administrador'] },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const usuarioStr = localStorage.getItem('usuario');
  const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
  const rol = usuario?.rol || 'Recepcionista';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const menuItems = todasLasOpciones.filter((item) => item.roles.includes(rol));

  return (
    <>
      {/* overlay móvil */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#0b1526]/60 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed z-50 flex h-screen w-[290px] flex-col bg-[#0b1526] text-white transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Marca */}
        <div className="relative overflow-hidden px-6 pb-6 pt-7">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=40&auto=format&fit=crop"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1526]/40 via-[#0b1526]/85 to-[#0b1526]" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ddbe7e] to-[#a98347] font-display text-2xl font-bold text-[#0b1526] shadow-lg">
                V
              </div>
              <div>
                <p className="font-display text-lg font-semibold leading-tight">La Villa de Roel</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ddbe7e]">
                  Hotel · PMS
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-1.5 transition hover:bg-white/20 lg:hidden"
              aria-label="Cerrar menú"
            >
              <FiX />
            </button>
          </div>
          {/* usuario */}
          <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ddbe7e] to-[#b08d4f] text-sm font-extrabold text-[#0b1526]">
              {initialsOf(usuario?.nombres, usuario?.apellidos)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {usuario?.nombres} {usuario?.apellidos}
              </p>
              <span className="mt-0.5 inline-block rounded-full bg-[#ddbe7e]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#ecd9ac] ring-1 ring-[#ddbe7e]/30">
                {rol}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
          <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            Operación
          </p>
          {menuItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                  isActive
                    ? 'bg-gradient-to-r from-[#ddbe7e] to-[#c9a86a] text-[#0b1526] shadow-lg'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                }`
              }
            >
              <item.icon className="text-xl shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{item.label}</span>
                <span className="block truncate text-[11px] opacity-70">{item.desc}</span>
              </span>
            </NavLink>
          ))}

          {menuItems.length > 5 && (
            <>
              <p className="px-2 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                Administración
              </p>
              {menuItems.slice(5).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                      isActive
                        ? 'bg-gradient-to-r from-[#ddbe7e] to-[#c9a86a] text-[#0b1526] shadow-lg'
                        : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                    }`
                  }
                >
                  <item.icon className="text-xl shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{item.label}</span>
                    <span className="block truncate text-[11px] opacity-70">{item.desc}</span>
                  </span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* footer */}
        <div className="p-4">
          <div className="overflow-hidden rounded-2xl border border-[#ddbe7e]/25 bg-gradient-to-br from-[#ddbe7e]/15 to-transparent p-4">
            <p className="font-display text-sm font-semibold text-[#ecd9ac]">Turno activo</p>
            <p className="mt-0.5 text-xs text-slate-400">Recepción · Huamanga, Ayacucho</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-200"
          >
            <FiLogOut className="text-lg" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
