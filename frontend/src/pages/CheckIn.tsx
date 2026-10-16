import { useState, useEffect, useMemo } from 'react';
import { FiLogIn, FiLogOut, FiAlertTriangle, FiCalendar, FiClock, FiDollarSign } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, Card, SearchInput, EmptyState, LoadingState, ModalShell, StatusBadge } from '../components/ui';
import { useDebouncedValue, usePagination, PaginationControls } from '../hooks/usePerf';

interface Reserva {
  id_reserva: number;
  codigo_reserva: string;
  fecha_entrada: string;
  fecha_salida: string;
  estado_reserva: string;
  id_cliente: number;
  id_tipo_habitacion: number;
  id_habitacion?: number;
  monto_total_estimado?: number;
  monto_pagado?: number;
  estado_pago?: string;
}

interface Cliente {
  id_cliente: number;
  nombres: string;
  apellidos: string;
  numero_documento: string;
  tipo_documento: string;
}

interface Habitacion {
  id_habitacion: number;
  numero_habitacion: string;
  estado_actual: string;
}

interface Huesped {
  id_hospedaje: number;
  id_reserva: number;
  id_cliente: number;
  id_habitacion: number;
  fecha_checkin: string;
  fecha_checkout?: string;
  estado_hospedaje: string;
  fecha_salida?: string;
  noches_restantes?: number;
  habitacion?: Habitacion;
  total_estadia?: number;
  total_pagado?: number;
  saldo_pendiente?: number;
  estado_pago?: string;
}

interface CheckoutStats {
  salen_hoy: any[];
  salen_manana: any[];
  vencidos: any[];
  total_salen_hoy: number;
  total_salen_manana: number;
  total_vencidos: number;
}

export default function CheckIn() {
  const [reservasPendientes, setReservasPendientes] = useState<Reserva[]>([]);
  const [huespedesActivos, setHuespedesActivos] = useState<Huesped[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showPagoModal, setShowPagoModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'checkin' | 'activos'>('checkin');
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);
  const [selectedHuesped, setSelectedHuesped] = useState<Huesped | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 250);

  const [checkoutStats, setCheckoutStats] = useState<CheckoutStats>({
    salen_hoy: [], salen_manana: [], vencidos: [],
    total_salen_hoy: 0, total_salen_manana: 0, total_vencidos: 0
  });
  const [alertasLimpieza, setAlertasLimpieza] = useState<any[]>([]);
  const [formData, setFormData] = useState({ id_reserva: 0, id_habitacion: 0 });

  const [pagoFormData, setPagoFormData] = useState({ monto: 0, metodo_pago: 'Efectivo' });

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Sin fecha';
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [reservasRes, huespedesRes, clientesRes, habitacionesRes, statsRes, alertasRes] = await Promise.all([
        api.get<Reserva[]>('/reservas'),
        api.get<any[]>('/huespedes').catch(() => ({ data: [] })),
        api.get<Cliente[]>('/clientes'),
        api.get<Habitacion[]>('/habitaciones'),
        api.get<CheckoutStats>('/checkouts-estadisticas').catch(() => ({
          data: {
            salen_hoy: [], salen_manana: [], vencidos: [],
            total_salen_hoy: 0, total_salen_manana: 0, total_vencidos: 0
          }
        })),
        api.get<any>('/alertas-limpieza').catch(() => ({ data: { alertas: [] } }))
      ]);

      const pendientes = reservasRes.data.filter(r =>
        r.estado_reserva === 'Pendiente' || r.estado_reserva === 'Confirmada'
      );

      const activos = huespedesRes.data
        .filter((h: any) => h.estado_hospedaje === 'En curso')
        .sort((a: any, b: any) => {
          if (!a.fecha_salida) return 1;
          if (!b.fecha_salida) return -1;
          return new Date(a.fecha_salida).getTime() - new Date(b.fecha_salida).getTime();
        });

      setReservasPendientes(pendientes);
      setHuespedesActivos(activos);
      setClientes(clientesRes.data);
      setHabitacionesDisponibles(habitacionesRes.data.filter(h => h.estado_actual === 'Disponible'));
      setCheckoutStats(statsRes.data);
      setAlertasLimpieza(alertasRes.data?.alertas || []);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_habitacion) {
      toast.error('Debe seleccionar una habitación');
      return;
    }
    try {
      const response = await api.post('/checkin', formData);
      const data = response.data;

      let mensaje = 'Check-in realizado correctamente';
      if (data.saldo_pendiente > 0) {
        mensaje += `. Saldo pendiente: S/ ${data.saldo_pendiente.toFixed(2)}`;
      } else {
        mensaje += '. ¡Reserva totalmente pagada!';
      }

      toast.success(mensaje);
      setShowCheckInModal(false);
      setSelectedReserva(null);
      setFormData({ id_reserva: 0, id_habitacion: 0 });
      cargarDatos();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al realizar check-in');
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHuesped) return;

    const saldo = selectedHuesped.saldo_pendiente || 0;
    if (pagoFormData.monto < saldo) {
      toast.error(`El monto (S/ ${pagoFormData.monto}) no cubre el saldo pendiente (S/ ${saldo})`);
      return;
    }

    try {
      const response = await api.post(`/checkout/${selectedHuesped.id_hospedaje}`, {
        monto_pagado: pagoFormData.monto,
        metodo_pago: pagoFormData.metodo_pago
      });

      const data = response.data;
      let mensaje = 'Check-out realizado correctamente';
      if (data.vuelto > 0) {
        mensaje += `. Vuelto entregado: S/ ${data.vuelto.toFixed(2)}`;
      }

      toast.success(mensaje);
      setShowCheckOutModal(false);
      setSelectedHuesped(null);
      setPagoFormData({ monto: 0, metodo_pago: 'Efectivo' });
      cargarDatos();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al realizar check-out');
    }
  };

  const handleRegistrarPagoParcial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHuesped) return;

    const saldo = selectedHuesped.saldo_pendiente || 0;
    if (pagoFormData.monto <= 0 || pagoFormData.monto > saldo) {
      toast.error(`El monto debe ser mayor a 0 y no exceder el saldo (S/ ${saldo})`);
      return;
    }

    try {
      await api.post(`/huespedes/${selectedHuesped.id_hospedaje}/pago`, {
        monto: pagoFormData.monto,
        metodo_pago: pagoFormData.metodo_pago
      });

      toast.success(`Pago de S/ ${pagoFormData.monto.toFixed(2)} registrado correctamente`);
      setShowPagoModal(false);
      setSelectedHuesped(null);
      setPagoFormData({ monto: 0, metodo_pago: 'Efectivo' });
      cargarDatos();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    }
  };

  const getClienteInfo = (id_cliente: number) => {
    const cliente = clientes.find(c => c.id_cliente === id_cliente);
    return cliente ? {
      nombre: `${cliente.nombres} ${cliente.apellidos}`,
      documento: `${cliente.tipo_documento} ${cliente.numero_documento}`
    } : { nombre: `Cliente #${id_cliente}`, documento: '' };
  };

  const getEstadoPagoBadge = (item: Reserva | Huesped) => {
    const esReserva = (item as Reserva).monto_total_estimado !== undefined;
    const total = esReserva
      ? ((item as Reserva).monto_total_estimado || 0)
      : ((item as Huesped).total_estadia || 0);
    const pagado = esReserva
      ? ((item as Reserva).monto_pagado || 0)
      : ((item as Huesped).total_pagado || 0);
    const estadoPago = item.estado_pago;
    const saldo = total - pagado;
    if (estadoPago === 'Pagado' || saldo <= 0) {
      return <StatusBadge value="Pagado" />;
    }
    if (estadoPago === 'Parcial' || (pagado > 0 && saldo > 0)) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
          Parcial · S/ {saldo.toFixed(2)}
        </span>
      );
    }
    return <StatusBadge value="Pendiente" />;
  };

  const getEstadoSalidaColor = (fechaSalida?: string, nochesRestantes?: number) => {
    if (!fechaSalida) return 'bg-slate-100 text-slate-600 ring-slate-200';
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const salida = new Date(fechaSalida + 'T00:00:00');
    if (salida < hoy) return 'bg-rose-50 text-rose-700 ring-rose-200';
    if (salida.toDateString() === hoy.toDateString()) return 'bg-orange-50 text-orange-700 ring-orange-200';
    if (nochesRestantes === 1) return 'bg-amber-50 text-amber-700 ring-amber-200';
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  };

  const getEstadoSalidaTexto = (fechaSalida?: string, nochesRestantes?: number) => {
    if (!fechaSalida) return 'Sin fecha';
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const salida = new Date(fechaSalida + 'T00:00:00');
    if (salida < hoy) return `${Math.abs(nochesRestantes || 0)} días vencido`;
    if (salida.toDateString() === hoy.toDateString()) return 'Sale HOY';
    if (nochesRestantes === 1) return 'Sale mañana';
    return `${nochesRestantes} noches restantes`;
  };

  const filteredReservas = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return reservasPendientes;
    return reservasPendientes.filter(r =>
      r.codigo_reserva.toLowerCase().includes(q) ||
      getClienteInfo(r.id_cliente).nombre.toLowerCase().includes(q)
    );
  }, [reservasPendientes, debouncedSearch, clientes]);

  const filteredHuespedes = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return huespedesActivos;
    return huespedesActivos.filter(h =>
      getClienteInfo(h.id_cliente).nombre.toLowerCase().includes(q)
    );
  }, [huespedesActivos, debouncedSearch, clientes]);

  const resPag = usePagination(filteredReservas, 10);
  const huePag = usePagination(filteredHuespedes, 10);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Recepción · Llegadas y salidas"
        title="Check-in / Check-out"
        subtitle={`${reservasPendientes.length} llegadas pendientes · ${huespedesActivos.length} huéspedes en casa`}
        background="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=50&auto=format&fit=crop"
      />

      {alertasLimpieza.length > 0 && (
        <div className="space-y-3">
          {alertasLimpieza.map((alerta: any, index: number) => (
            <div key={index} className="anim-fade-up rounded-3xl border-l-4 border-rose-500 bg-white p-5 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-2xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-rose-800">{alerta.mensaje}</h3>
                  <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Check-out</p>
                      <p className="text-sm font-bold text-slate-800">{alerta.checkout.cliente}</p>
                      <p className="text-xs text-slate-500">Salida: {alerta.checkout.hora_salida}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Check-in</p>
                      <p className="text-sm font-bold text-slate-800">{alerta.checkin.cliente}</p>
                      <p className="text-xs text-slate-500">Reserva: {alerta.checkin.codigo_reserva} · Entrada: {alerta.checkin.hora_entrada}</p>
                    </div>
                  </div>
                  <span className="mt-2 inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                    Tiempo disponible: {alerta.tiempo_disponible}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'activos' && (checkoutStats.total_salen_hoy > 0 || checkoutStats.total_vencidos > 0 || checkoutStats.total_salen_manana > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {checkoutStats.total_vencidos > 0 && (
            <div className="rounded-3xl border-l-4 border-rose-500 bg-white p-4 shadow">
              <p className="flex items-center gap-2 font-extrabold text-rose-700"><FiAlertTriangle /> {checkoutStats.total_vencidos} vencido(s)</p>
              <div className="mt-2 space-y-1.5">
                {checkoutStats.vencidos.map((v: any) => (
                  <div key={v.id_hospedaje} className="rounded-xl bg-rose-50 p-2 text-sm">
                    <p className="font-bold text-rose-900">{v.nombre}</p>
                    <p className="text-xs text-rose-600">Hab: {v.numero_habitacion} · {v.dias_vencido} días vencido</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {checkoutStats.total_salen_hoy > 0 && (
            <div className="rounded-3xl border-l-4 border-[#c9a86a] bg-white p-4 shadow">
              <p className="flex items-center gap-2 font-extrabold text-[#8a6d35]"><FiClock /> {checkoutStats.total_salen_hoy} salen hoy</p>
              <div className="mt-2 space-y-1.5">
                {checkoutStats.salen_hoy.map((h: any) => (
                  <div key={h.id_hospedaje} className="rounded-xl bg-[#faf8f3] p-2 text-sm">
                    <p className="font-bold text-slate-800">{h.nombre}</p>
                    <p className="text-xs text-slate-500">Hab: {h.numero_habitacion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {checkoutStats.total_salen_manana > 0 && (
            <div className="rounded-3xl border-l-4 border-amber-400 bg-white p-4 shadow">
              <p className="flex items-center gap-2 font-extrabold text-amber-700"><FiCalendar /> {checkoutStats.total_salen_manana} salen mañana</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
            activeTab === 'checkin' ? 'bg-[#0f1f38] text-white shadow' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <FiLogIn /> Llegadas ({reservasPendientes.length})
        </button>
        <button
          onClick={() => setActiveTab('activos')}
          className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
            activeTab === 'activos' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <FiClock /> En casa ({huespedesActivos.length})
        </button>
      </div>

      <Card>
        <SearchInput value={searchTerm} onChange={(v) => { setSearchTerm(v); resPag.setPage(1); huePag.setPage(1); }} placeholder="Buscar por código de reserva o nombre..." />
      </Card>

      {activeTab === 'checkin' && (
        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <LoadingState message="Cargando llegadas..." />
          ) : filteredReservas.length === 0 ? (
            <EmptyState title="Sin llegadas pendientes" subtitle="No hay reservas esperando check-in con ese criterio." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern w-full">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Pago</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resPag.pageItems.map((reserva) => {
                    const cliente = getClienteInfo(reserva.id_cliente);
                    return (
                      <tr key={reserva.id_reserva}>
                        <td><span className="font-extrabold text-[#8a6d35]">{reserva.codigo_reserva}</span></td>
                        <td className="font-semibold text-slate-800">{cliente.nombre}</td>
                        <td className="text-slate-500">{formatearFecha(reserva.fecha_entrada)}</td>
                        <td className="text-slate-500">{formatearFecha(reserva.fecha_salida)}</td>
                        <td>{getEstadoPagoBadge(reserva as any)}</td>
                        <td>
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                setSelectedReserva(reserva);
                                setFormData({
                                  ...formData,
                                  id_reserva: reserva.id_reserva,
                                  id_habitacion: reserva.id_habitacion || 0
                                });
                                setShowCheckInModal(true);
                              }}
                              className="btn-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs"
                            >
                              <FiLogIn /> Check-in
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredReservas.length > 10 && (
            <PaginationControls page={resPag.page} totalPages={resPag.totalPages} onChange={resPag.setPage} total={filteredReservas.length} />
          )}
        </Card>
      )}

      {activeTab === 'activos' && (
        <Card className="!p-0 overflow-hidden">
          {filteredHuespedes.length === 0 ? (
            <EmptyState title="Casa vacía por ahora" subtitle="No hay huéspedes activos con ese criterio." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-modern w-full">
                <thead>
                  <tr>
                    <th>Hospedaje</th>
                    <th>Cliente</th>
                    <th>Hab.</th>
                    <th>Salida</th>
                    <th>Pago</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {huePag.pageItems.map((huesped) => {
                    const cliente = getClienteInfo(huesped.id_cliente);
                    return (
                      <tr key={huesped.id_hospedaje}>
                        <td className="font-extrabold text-slate-800">#{huesped.id_hospedaje}</td>
                        <td className="font-semibold text-slate-800">{cliente.nombre}</td>
                        <td className="text-slate-500">{huesped.habitacion?.numero_habitacion || `Hab #${huesped.id_habitacion}`}</td>
                        <td>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getEstadoSalidaColor(huesped.fecha_salida, huesped.noches_restantes)}`}>
                            {getEstadoSalidaTexto(huesped.fecha_salida, huesped.noches_restantes)}
                          </span>
                        </td>
                        <td>{getEstadoPagoBadge(huesped)}</td>
                        <td>
                          <div className="flex justify-end gap-2">
                            {(huesped.saldo_pendiente || 0) > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedHuesped(huesped);
                                  setPagoFormData({ monto: huesped.saldo_pendiente || 0, metodo_pago: 'Efectivo' });
                                  setShowPagoModal(true);
                                }}
                                className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-blue-700"
                              >
                                <FiDollarSign /> Pagar
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedHuesped(huesped);
                                setPagoFormData({ monto: huesped.saldo_pendiente || 0, metodo_pago: 'Efectivo' });
                                setShowCheckOutModal(true);
                              }}
                              className="flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-rose-700"
                            >
                              <FiLogOut /> Check-out
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filteredHuespedes.length > 10 && (
            <PaginationControls page={huePag.page} totalPages={huePag.totalPages} onChange={huePag.setPage} total={filteredHuespedes.length} />
          )}
        </Card>
      )}

      {showCheckInModal && selectedReserva && (
        <ModalShell
          title="Confirmar check-in"
          subtitle={`Reserva ${selectedReserva.codigo_reserva} · ${getClienteInfo(selectedReserva.id_cliente).nombre}`}
          onClose={() => setShowCheckInModal(false)}
        >
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div>
              <label className="label-modern">Habitación a asignar *</label>
              <select value={formData.id_habitacion} onChange={(e) => setFormData({ ...formData, id_habitacion: Number(e.target.value) })} className="input-modern" required>
                <option value={0}>Seleccione una habitación disponible...</option>
                {habitacionesDisponibles.map(hab => (
                  <option key={hab.id_habitacion} value={hab.id_habitacion}>
                    Habitación {hab.numero_habitacion}
                    {hab.id_habitacion === selectedReserva?.id_habitacion && " ✓ (Reservada)"}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="label-modern !mb-1">Entrada</p>
                <p className="font-bold text-slate-800">{formatearFecha(selectedReserva.fecha_entrada)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="label-modern !mb-1">Salida</p>
                <p className="font-bold text-slate-800">{formatearFecha(selectedReserva.fecha_salida)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowCheckInModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={habitacionesDisponibles.length === 0} className="btn-gold rounded-xl px-6 py-2.5 text-sm disabled:opacity-50">
                Confirmar check-in
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showPagoModal && selectedHuesped && (
        <ModalShell
          title="Registrar pago"
          subtitle={`Huésped: ${getClienteInfo(selectedHuesped.id_cliente).nombre}`}
          onClose={() => setShowPagoModal(false)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRegistrarPagoParcial} className="space-y-4">
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total estadía:</span><span className="font-bold">S/ {(selectedHuesped.total_estadia || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ya pagado:</span><span className="font-bold text-emerald-600">S/ {(selectedHuesped.total_pagado || 0).toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-extrabold">Saldo:</span><span className="font-extrabold text-rose-600">S/ {(selectedHuesped.saldo_pendiente || 0).toFixed(2)}</span></div>
            </div>
            <div>
              <label className="label-modern">Monto a pagar (S/)</label>
              <input type="number" step="0.01" min="0.01" max={selectedHuesped.saldo_pendiente || 0} value={pagoFormData.monto || ''} onChange={(e) => setPagoFormData({ ...pagoFormData, monto: parseFloat(e.target.value) || 0 })} className="input-modern" required />
            </div>
            <div>
              <label className="label-modern">Método de pago</label>
              <select value={pagoFormData.metodo_pago} onChange={(e) => setPagoFormData({ ...pagoFormData, metodo_pago: e.target.value })} className="input-modern">
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia Bancaria</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowPagoModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={pagoFormData.monto <= 0 || pagoFormData.monto > (selectedHuesped.saldo_pendiente || 0)} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-50">
                Registrar pago
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showCheckOutModal && selectedHuesped && (
        <ModalShell
          title="Realizar check-out"
          subtitle={`Huésped: ${getClienteInfo(selectedHuesped.id_cliente).nombre}`}
          onClose={() => setShowCheckOutModal(false)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCheckOut} className="space-y-4">
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total estadía:</span><span className="font-bold">S/ {(selectedHuesped.total_estadia || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ya pagado:</span><span className="font-bold text-emerald-600">S/ {(selectedHuesped.total_pagado || 0).toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-extrabold">Saldo:</span><span className="font-extrabold text-rose-600">S/ {(selectedHuesped.saldo_pendiente || 0).toFixed(2)}</span></div>
            </div>
            {(selectedHuesped.saldo_pendiente || 0) > 0 ? (
              <>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  Debe cancelar el saldo total para liberar la habitación.
                </div>
                <div>
                  <label className="label-modern">Monto a pagar hoy (S/)</label>
                  <input type="number" step="0.01" min={(selectedHuesped.saldo_pendiente || 0)} value={pagoFormData.monto || ''} onChange={(e) => setPagoFormData({ ...pagoFormData, monto: parseFloat(e.target.value) || 0 })} className="input-modern" required />
                  {pagoFormData.monto < (selectedHuesped.saldo_pendiente || 0) && pagoFormData.monto > 0 && (
                    <p className="mt-1 text-xs text-rose-600">Faltan S/ {((selectedHuesped.saldo_pendiente || 0) - pagoFormData.monto).toFixed(2)} para completar.</p>
                  )}
                </div>
                <div>
                  <label className="label-modern">Método de pago</label>
                  <select value={pagoFormData.metodo_pago} onChange={(e) => setPagoFormData({ ...pagoFormData, metodo_pago: e.target.value })} className="input-modern">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                Reserva totalmente pagada. Puede proceder con la salida.
              </div>
            )}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowCheckOutModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={(selectedHuesped.saldo_pendiente || 0) > 0 && pagoFormData.monto < (selectedHuesped.saldo_pendiente || 0)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white ${(selectedHuesped.saldo_pendiente || 0) > 0 && pagoFormData.monto < (selectedHuesped.saldo_pendiente || 0) ? 'bg-slate-300' : 'bg-rose-600 hover:bg-rose-700'}`}>
                <FiLogOut /> {(selectedHuesped.saldo_pendiente || 0) > 0 ? 'Pagar y confirmar' : 'Confirmar salida'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
