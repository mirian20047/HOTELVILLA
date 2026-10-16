import { useState, useEffect } from 'react';
import { FiUsers, FiDollarSign, FiCalendar, FiActivity, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, Card, StatusBadge, EmptyState, LoadingState } from '../components/ui';

interface ReporteOcupacion {
  total_habitaciones: number;
  habitaciones_ocupadas: number;
  habitaciones_disponibles: number;
  porcentaje_ocupacion: number;
}

interface ReporteIngresos {
  total_ingresos: number;
  total_folios_cerrados: number;
}

interface ReporteReserva {
  estado: string;
  cantidad: number;
}

interface HuespedReciente {
  id_hospedaje: number;
  nombres: string;
  apellidos: string;
  fecha_checkin: string;
  estado: string;
}

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [ocupacion, setOcupacion] = useState<ReporteOcupacion | null>(null);
  const [ingresos, setIngresos] = useState<ReporteIngresos | null>(null);
  const [reservas, setReservas] = useState<ReporteReserva[]>([]);
  const [huespedes, setHuespedes] = useState<HuespedReciente[]>([]);

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    setLoading(true);
    try {
      const [ocupacionRes, ingresosRes, reservasRes, huespedesRes] = await Promise.all([
        api.get<ReporteOcupacion>('/reportes/ocupacion').catch(() => ({ data: null })),
        api.get<ReporteIngresos>('/reportes/ingresos').catch(() => ({ data: null })),
        api.get<ReporteReserva[]>('/reportes/reservas').catch(() => ({ data: [] })),
        api.get<HuespedReciente[]>('/reportes/huespedes-recientes').catch(() => ({ data: [] }))
      ]);

      setOcupacion(ocupacionRes.data);
      setIngresos(ingresosRes.data);
      setReservas(reservasRes.data || []);
      setHuespedes(huespedesRes.data || []);
    } catch (error) {
      toast.error('Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const getColorEstado = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return 'bg-amber-400';
      case 'Confirmada': return 'bg-blue-500';
      case 'Completada': return 'bg-emerald-500';
      case 'Cancelada': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const totalReservas = reservas.reduce((acc, curr) => acc + curr.cantidad, 0);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Admin · Inteligencia" title="Reportes y estadísticas" subtitle="Ocupación, ingresos y movimiento" />
        <Card><LoadingState message="Generando reportes..." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · Inteligencia"
        title="Reportes y estadísticas"
        subtitle="Ocupación en vivo, ingresos por folios y distribución de reservas"
        background="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=50&auto=format&fit=crop"
        actions={
          <button
            onClick={cargarReportes}
            className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            <FiActivity /> Actualizar datos
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card delay="stagger-1" className="card-hover relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-[#ddbe7e] to-[#a98347]" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Ocupación actual</p>
              <p className="font-display mt-1 text-4xl font-semibold text-slate-900">{ocupacion?.porcentaje_ocupacion || 0}%</p>
            </div>
            <span className="rounded-2xl bg-[#faf8f3] p-3 text-[#b08d4f]"><FiTrendingUp className="text-2xl" /></span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ddbe7e] to-[#a98347]" style={{ width: `${ocupacion?.porcentaje_ocupacion || 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{ocupacion?.habitaciones_ocupadas ?? 0} de {ocupacion?.total_habitaciones ?? 0} habitaciones ocupadas</p>
        </Card>

        <Card delay="stagger-2" className="card-hover relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Ingresos totales</p>
              <p className="font-display mt-1 text-4xl font-semibold text-slate-900">S/ {ingresos?.total_ingresos.toFixed(2) || '0.00'}</p>
            </div>
            <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><FiDollarSign className="text-2xl" /></span>
          </div>
          <p className="mt-4 text-xs text-slate-500">{ingresos?.total_folios_cerrados || 0} folios cerrados · cobro final</p>
        </Card>

        <Card delay="stagger-3" className="card-hover relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-blue-400 to-indigo-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Total reservas</p>
              <p className="font-display mt-1 text-4xl font-semibold text-slate-900">{totalReservas}</p>
            </div>
            <span className="rounded-2xl bg-blue-50 p-3 text-blue-600"><FiCalendar className="text-2xl" /></span>
          </div>
          <p className="mt-4 text-xs text-slate-500">Registros históricos en el sistema</p>
        </Card>

        <Card delay="stagger-4" className="card-hover relative overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-violet-400 to-purple-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Huéspedes recientes</p>
              <p className="font-display mt-1 text-4xl font-semibold text-slate-900">{huespedes.length}</p>
            </div>
            <span className="rounded-2xl bg-violet-50 p-3 text-violet-600"><FiUsers className="text-2xl" /></span>
          </div>
          <p className="mt-4 text-xs text-slate-500">Últimos 10 check-ins registrados</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&q=50&auto=format&fit=crop" alt="" loading="lazy" decoding="async" className="h-11 w-11 rounded-xl object-cover" />
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-800">Reservas por estado</h2>
              <p className="text-xs text-slate-400">Distribución porcentual del total</p>
            </div>
          </div>
          {reservas.length === 0 ? (
            <EmptyState title="Sin datos de reservas" subtitle="Aún no hay movimientos para graficar." />
          ) : (
            <div className="space-y-4">
              {reservas.map((item) => {
                const porcentaje = totalReservas > 0 ? (item.cantidad / totalReservas) * 100 : 0;
                return (
                  <div key={item.estado}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-bold text-slate-700">{item.estado}</span>
                      <span className="text-slate-400">{item.cantidad} · {porcentaje.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${getColorEstado(item.estado)}`} style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-6">
            <img src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=200&q=50&auto=format&fit=crop" alt="" loading="lazy" decoding="async" className="h-11 w-11 rounded-xl object-cover" />
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-800">Últimos huéspedes</h2>
              <p className="text-xs text-slate-400">Check-ins más recientes del hotel</p>
            </div>
          </div>
          {huespedes.length === 0 ? (
            <EmptyState title="Sin huéspedes aún" subtitle="Los check-ins aparecerán aquí automáticamente." />
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Huésped</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {huespedes.map((h) => (
                    <tr key={h.id_hospedaje} className="transition hover:bg-[#faf8f3]">
                      <td className="px-4 py-3 text-sm font-extrabold text-slate-700">#{h.id_hospedaje}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{h.nombres} {h.apellidos}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(h.fecha_checkin).toLocaleDateString('es-PE')}</td>
                      <td className="px-4 py-3"><StatusBadge value={h.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
