import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers, FiGrid, FiCalendar, FiLogIn, FiArrowRight,
  FiDollarSign, FiTrendingUp, FiPlus,
} from 'react-icons/fi';
import api from '../api/axios';
import { Card, LoadingState } from '../components/ui';

interface DashboardStats {
  clientes: number;
  habitaciones: number;
  disponibles: number;
  ocupadas: number;
  reservasPendientes: number;
  huespedesActivos: number;
  ocupacionPct: number;
  ingresos: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [cli, hab, res, hue, ocu, ing] = await Promise.all([
          api.get<any[]>('/clientes').catch(() => ({ data: [] })),
          api.get<any[]>('/habitaciones').catch(() => ({ data: [] })),
          api.get<any[]>('/reservas').catch(() => ({ data: [] })),
          api.get<any[]>('/huespedes').catch(() => ({ data: [] })),
          api.get<any>('/reportes/ocupacion').catch(() => ({ data: null })),
          api.get<any>('/reportes/ingresos').catch(() => ({ data: null })),
        ]);
        const habitaciones = hab.data ?? [];
        const disponibles = habitaciones.filter((h: any) => h.estado_actual === 'Disponible').length;
        const ocupadas = habitaciones.filter((h: any) => h.estado_actual === 'Ocupada').length;
        const pendientes = (res.data ?? []).filter(
          (r: any) => r.estado_reserva === 'Pendiente' || r.estado_reserva === 'Confirmada'
        ).length;
        const activos = (hue.data ?? []).filter((h: any) => h.estado_hospedaje === 'En curso').length;

        setStats({
          clientes: (cli.data ?? []).length,
          habitaciones: habitaciones.length,
          disponibles,
          ocupadas,
          reservasPendientes: pendientes,
          huespedesActivos: activos,
          ocupacionPct: ocu.data?.porcentaje_ocupacion ?? (habitaciones.length ? Math.round((ocupadas / habitaciones.length) * 100) : 0),
          ingresos: ing.data?.total_ingresos ?? 0,
        });
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const tarjetas = stats
    ? [
        { label: 'Huéspedes activos', value: String(stats.huespedesActivos), sub: `${stats.reservasPendientes} reservas por atender`, icon: FiLogIn, grad: 'from-[#0f1f38] to-[#274067]', chip: 'bg-[#0f1f38]/10 text-[#0f1f38]' },
        { label: 'Habitaciones', value: String(stats.habitaciones), sub: `${stats.disponibles} disponibles · ${stats.ocupadas} ocupadas`, icon: FiGrid, grad: 'from-emerald-500 to-teal-600', chip: 'bg-emerald-50 text-emerald-700' },
        { label: 'Clientes registrados', value: String(stats.clientes), sub: 'Base de datos total', icon: FiUsers, grad: 'from-blue-500 to-indigo-600', chip: 'bg-blue-50 text-blue-700' },
        { label: 'Ingresos (folios)', value: `S/ ${stats.ingresos.toFixed(2)}`, sub: 'Acumulado del sistema', icon: FiDollarSign, grad: 'from-[#c9a86a] to-[#a98347]', chip: 'bg-[#faf8f3] text-[#8a6d35]' },
      ]
    : [];

  const accesos = [
    { to: '/reservas', icon: FiCalendar, t: 'Nueva reserva', s: 'Ocupación directa o futura', img: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&q=50&auto=format&fit=crop' },
    { to: '/checkin', icon: FiLogIn, t: 'Check-in / out', s: 'Llegadas, pagos y salidas', img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=50&auto=format&fit=crop' },
    { to: '/habitaciones', icon: FiGrid, t: 'Habitaciones', s: 'Disponibilidad por piso', img: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=50&auto=format&fit=crop' },
    { to: '/clientes', icon: FiPlus, t: 'Registrar cliente', s: 'DNI, pasaporte o CE', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=50&auto=format&fit=crop' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="anim-fade-up relative overflow-hidden rounded-3xl bg-[#0f1f38] text-white shadow-xl">
        <img
          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1000&q=60&auto=format&fit=crop"
          alt="Hotel"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1526] via-[#0b1526]/80 to-transparent" />
        <div className="relative grid gap-6 p-6 sm:p-9 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ecd9ac]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Operación de hoy
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-[2.6rem]">
              El hotel, en una sola mirada.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
              Ocupación, llegadas, habitaciones listas y cobros pendientes — todo actualizado con
              los datos reales del sistema.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/reservas"
                className="btn-gold flex items-center gap-2 rounded-2xl px-5 py-3 text-sm"
              >
                <FiPlus /> Nueva reserva <FiArrowRight />
              </Link>
              <Link
                to="/checkin"
                className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                <FiLogIn /> Ir a check-in
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <FiTrendingUp className="mb-2 text-xl text-[#ddbe7e]" />
              <p className="font-display text-3xl font-semibold">{stats?.ocupacionPct ?? 0}%</p>
              <p className="text-xs text-slate-300">Ocupación actual</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ddbe7e] to-[#ecd9ac]"
                  style={{ width: `${stats?.ocupacionPct ?? 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <FiCalendar className="mb-2 text-xl text-[#ddbe7e]" />
              <p className="font-display text-3xl font-semibold">{stats?.reservasPendientes ?? 0}</p>
              <p className="text-xs text-slate-300">Reservas por check-in</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading || !stats ? (
        <Card>
          <LoadingState message="Sincronizando datos del hotel..." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tarjetas.map((s, i) => (
            <Card key={s.label} delay={`stagger-${i + 1}`} className="card-hover">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
                  <p className="font-display mt-1 text-3xl font-semibold text-slate-900">{s.value}</p>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${s.chip}`}>
                    {s.sub}
                  </span>
                </div>
                <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${s.grad}`}>
                  <s.icon className="text-2xl" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Accesos rápidos con imagen */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-slate-800">Accesos rápidos</h2>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Operación diaria</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {accesos.map((a, i) => (
            <Link
              key={a.to}
              to={a.to}
              className={`anim-fade-up stagger-${i + 1} card-hover group relative overflow-hidden rounded-3xl shadow-lg`}
            >
              <img src={a.img} alt={a.t} loading="lazy" decoding="async" className="h-44 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1526] via-[#0b1526]/35 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-white">
                    <a.icon className="text-[#ddbe7e]" /> {a.t}
                  </p>
                  <p className="text-xs text-slate-300">{a.s}</p>
                </div>
                <span className="rounded-full bg-white/15 p-2 text-white backdrop-blur transition group-hover:bg-[#c9a86a] group-hover:text-[#0b1526]">
                  <FiArrowRight />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
