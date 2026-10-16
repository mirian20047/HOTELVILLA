import { useState, useEffect } from 'react';
import { FiSearch, FiUser, FiHome, FiDollarSign, FiCheckCircle, FiCalendar, FiInfo, FiX, FiUsers, FiTag, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, Card, EmptyState, ModalShell } from '../components/ui';

interface Cliente {
  id_cliente: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email?: string;
  telefono?: string;
}

interface TipoHabitacion {
  nombre: string;
  capacidad_personas: number;
  descripcion?: string;
  tipo_cama?: string;
  amenities?: string;
  tarifa_base: number;
  imagen_url?: string | null;
}

interface HabitacionDisponible {
  id_habitacion: number;
  numero_habitacion: string;
  piso: number;
  estado_actual: string;
  tipo_habitacion: TipoHabitacion | null;
}

type TipoReserva = 'walkin' | 'futura';

export default function Reservas() {
  const [showOcupacionModal, setShowOcupacionModal] = useState(false);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [tipoReserva, setTipoReserva] = useState<TipoReserva>('walkin');
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<HabitacionDisponible[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState<HabitacionDisponible | null>(null);

  const [dni, setDni] = useState('');
  const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null);

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    tipo_documento: 'DNI',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    id_habitacion: 0,
    fecha_entrada: getLocalDateString(new Date()),
    fecha_salida: '',
    canal_reserva: 'Presencial',
    monto_pagado: 0,
    metodo_pago: 'Efectivo'
  });

  useEffect(() => {
    cargarHabitacionesDisponibles();
  }, []);

  useEffect(() => {
    if (formData.fecha_entrada && !formData.fecha_salida) {
      const entrada = new Date(formData.fecha_entrada + 'T00:00:00');
      if (tipoReserva === 'walkin') {
        entrada.setDate(entrada.getDate() + 1);
      } else {
        entrada.setDate(entrada.getDate() + 2);
      }
      setFormData(prev => ({
        ...prev,
        fecha_salida: getLocalDateString(entrada)
      }));
    }
  }, [formData.fecha_entrada, tipoReserva]);

  useEffect(() => {
    if (tipoReserva === 'walkin') {
      setFormData(prev => ({
        ...prev,
        fecha_entrada: getLocalDateString(new Date())
      }));
    }
  }, [tipoReserva]);

  const cargarHabitacionesDisponibles = async () => {
    try {
      const { data } = await api.get<HabitacionDisponible[]>('/habitaciones-disponibles');
      setHabitacionesDisponibles(data);
    } catch (error) {
      console.error('Error al cargar habitaciones');
    }
  };

  const buscarCliente = async (documento: string) => {
    try {
      const { data } = await api.get(`/buscar-cliente/${documento}`);
      if (data.existe) {
        setClienteExistente(data.cliente);
        setFormData(prev => ({
          ...prev,
          numero_documento: data.cliente.numero_documento,
          nombres: data.cliente.nombres,
          apellidos: data.cliente.apellidos,
          email: data.cliente.email || '',
          telefono: data.cliente.telefono || ''
        }));
        toast.success(`Cliente encontrado: ${data.cliente.nombres} ${data.cliente.apellidos}`);
      } else {
        setClienteExistente(null);
        setFormData(prev => ({
          ...prev,
          numero_documento: documento
        }));
      }
    } catch (error) {
      console.error('Error al buscar cliente:', error);
    }
  };

  const handleDniChange = (value: string) => {
    setDni(value);
    if (value.length === 8) {
      buscarCliente(value);
    } else {
      setClienteExistente(null);
      setFormData(prev => ({
        ...prev,
        numero_documento: value,
        nombres: '',
        apellidos: '',
        email: '',
        telefono: ''
      }));
    }
  };

  const calcularNoches = () => {
    if (!formData.fecha_entrada || !formData.fecha_salida) return 0;
    const entrada = new Date(formData.fecha_entrada + 'T00:00:00');
    const salida = new Date(formData.fecha_salida + 'T00:00:00');
    const diff = salida.getTime() - entrada.getTime();
    const noches = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return noches > 0 ? noches : 0;
  };

  const calcularTotal = () => {
    const noches = calcularNoches();
    const tarifa = selectedHabitacion?.tipo_habitacion?.tarifa_base || 0;
    return noches * tarifa;
  };

  const abrirDetallesHabitacion = () => {
    if (!selectedHabitacion) {
      toast.error('Primero seleccione una habitación');
      return;
    }
    setShowDetallesModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numero_documento || formData.numero_documento.length < 8) {
      toast.error('Ingrese un DNI válido (mínimo 8 dígitos)');
      return;
    }
    if (!formData.nombres || !formData.apellidos) {
      toast.error('Ingrese nombres y apellidos del cliente');
      return;
    }
    if (!formData.id_habitacion || formData.id_habitacion === 0) {
      toast.error('Seleccione una habitación');
      return;
    }
    if (tipoReserva === 'walkin' && formData.monto_pagado <= 0) {
      toast.error('Ingrese el monto pagado');
      return;
    }
    if (calcularNoches() <= 0) {
      toast.error('La fecha de salida debe ser posterior a la entrada');
      return;
    }

    const payload = {
      tipo_documento: formData.tipo_documento,
      numero_documento: formData.numero_documento,
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      email: formData.email || null,
      telefono: formData.telefono || null,
      id_habitacion: formData.id_habitacion,
      fecha_entrada: formData.fecha_entrada,
      fecha_salida: formData.fecha_salida,
      canal_reserva: formData.canal_reserva,
      monto_pagado: formData.monto_pagado,
      metodo_pago: formData.metodo_pago
    };

    try {
      const { data } = await api.post('/ocupacion-directa', payload);

      if (data.tipo === 'reserva_futura') {
        toast.success(`Reserva creada: ${data.codigo_reserva}`, { duration: 4000 });

        if (data.estado_pago === 'Pagado') {
          toast.success(`Reserva totalmente pagada (S/ ${data.monto_pagado.toFixed(2)})`, {
            icon: '💰', style: { background: '#10B981', color: '#fff', fontWeight: 'bold' }
          });
        } else if (data.estado_pago === 'Parcial') {
          const saldo = data.monto_total - data.monto_pagado;
          toast(`Adelanto: S/ ${data.monto_pagado.toFixed(2)} | Saldo pendiente: S/ ${saldo.toFixed(2)}`, {
            duration: 6000, icon: '💳', style: { background: '#F59E0B', color: '#fff', fontWeight: 'bold' }
          });
        } else {
          toast(`Reserva sin pago. Saldo: S/ ${data.monto_total.toFixed(2)}`, {
            duration: 5000, icon: '📝', style: { background: '#EF4444', color: '#fff', fontWeight: 'bold' }
          });
        }
      } else {
        toast.success(`Ocupación registrada: ${data.codigo_reserva}`);
      }

      setShowOcupacionModal(false);
      resetForm();
      cargarHabitacionesDisponibles();
    } catch (error: any) {
      console.error('Error al crear reserva:', error);
      toast.error(error.response?.data?.detail || 'Error al registrar');
    }
  };

  const resetForm = () => {
    setDni('');
    setClienteExistente(null);
    setSelectedHabitacion(null);
    setTipoReserva('walkin');
    setFormData({
      tipo_documento: 'DNI',
      numero_documento: '',
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      id_habitacion: 0,
      fecha_entrada: getLocalDateString(new Date()),
      fecha_salida: '',
      canal_reserva: 'Presencial',
      monto_pagado: 0,
      metodo_pago: 'Efectivo'
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Recepción · Reservas"
        title="Reservas y ocupación"
        subtitle={`${habitacionesDisponibles.length} habitaciones listas para asignar hoy`}
        background="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=50&auto=format&fit=crop"
        actions={
          <button
            onClick={() => setShowOcupacionModal(true)}
            className="btn-gold flex items-center gap-2 rounded-2xl px-5 py-3 text-sm"
          >
            <FiPlus className="text-lg" /> Nueva reserva / ocupación
          </button>
        }
      />

      <Card delay="stagger-1" className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-slate-800">
            Disponibles hoy <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">{habitacionesDisponibles.length}</span>
          </h2>
          <button onClick={cargarHabitacionesDisponibles} className="text-xs font-bold uppercase tracking-widest text-[#b08d4f] transition hover:text-[#8a6d35]">
            Actualizar
          </button>
        </div>
        {habitacionesDisponibles.length === 0 ? (
          <EmptyState
            title="Sin disponibilidad hoy"
            subtitle="Todas las habitaciones están ocupadas, reservadas o en mantenimiento."
            image="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=60&auto=format&fit=crop"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {habitacionesDisponibles.map((hab, i) => (
              <div
                key={hab.id_habitacion}
                className={`anim-fade-up stagger-${(i % 3) + 1} card-hover group overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-[#faf8f3]`}
              >
                <div className="flex items-start justify-between p-4 pb-0">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b08d4f]">Hab · Piso {hab.piso}</p>
                    <p className="font-display text-3xl font-semibold text-slate-900">{hab.numero_habitacion}</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Disponible
                  </span>
                </div>
                <div className="space-y-1 p-4 text-sm text-slate-600">
                  <p><strong className="text-slate-800">{hab.tipo_habitacion?.nombre || 'N/A'}</strong> · {hab.tipo_habitacion?.capacidad_personas || 0} personas</p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 bg-white/70 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Tarifa / noche</p>
                    <p className="font-display text-xl font-semibold text-slate-900">S/ {hab.tipo_habitacion?.tarifa_base.toFixed(2) || '0.00'}</p>
                  </div>
                  <button
                    onClick={() => {
                      const sel = habitacionesDisponibles.find(h => h.id_habitacion === hab.id_habitacion) || null;
                      setSelectedHabitacion(sel);
                      setFormData(prev => ({ ...prev, id_habitacion: hab.id_habitacion }));
                      setShowOcupacionModal(true);
                    }}
                    className="rounded-xl bg-[#0f1f38] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#c9a86a] hover:text-[#0b1526]"
                  >
                    Reservar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showOcupacionModal && (
        <ModalShell
          title="Nueva reserva / ocupación"
          subtitle="Walk-in de hoy o reserva para fechas futuras"
          onClose={() => { setShowOcupacionModal(false); }}
          maxWidth="max-w-4xl"
        >
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTipoReserva('walkin')}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                tipoReserva === 'walkin' ? 'border-[#c9a86a] bg-[#faf8f3] shadow' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <span className={`rounded-xl p-2.5 text-white ${tipoReserva === 'walkin' ? 'bg-gradient-to-br from-[#ddbe7e] to-[#a98347]' : 'bg-slate-200 text-slate-500'}`}>
                <FiCheckCircle className="text-xl" />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-slate-800">Ocupación de hoy</span>
                <span className="block text-xs text-slate-500">Cliente presente · pago inmediato</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTipoReserva('futura')}
              className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                tipoReserva === 'futura' ? 'border-blue-400 bg-blue-50/60 shadow' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <span className={`rounded-xl p-2.5 text-white ${tipoReserva === 'futura' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                <FiCalendar className="text-xl" />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-slate-800">Reserva futura</span>
                <span className="block text-xs text-slate-500">Para fechas posteriores</span>
              </span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-slate-500">
                <FiUser className="text-[#b08d4f]" /> Datos del cliente
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="label-modern">Tipo Documento</label>
                  <select value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })} className="input-modern">
                    <option value="DNI">DNI</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Carnet Extranjería">Carnet Extranjería</option>
                  </select>
                </div>
                <div>
                  <label className="label-modern">
                    DNI / Documento * {clienteExistente && <span className="text-emerald-600">✓ encontrado</span>}
                  </label>
                  <input type="text" value={dni} onChange={(e) => handleDniChange(e.target.value)} className="input-modern" placeholder="8 dígitos" maxLength={formData.tipo_documento === 'DNI' ? 8 : 20} required />
                </div>
                <div>
                  <label className="label-modern">Nombres *</label>
                  <input type="text" value={formData.nombres} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="input-modern" disabled={!!clienteExistente} required />
                </div>
                <div>
                  <label className="label-modern">Apellidos *</label>
                  <input type="text" value={formData.apellidos} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="input-modern" disabled={!!clienteExistente} required />
                </div>
                <div>
                  <label className="label-modern">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-modern" disabled={!!clienteExistente} />
                </div>
                <div>
                  <label className="label-modern">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="input-modern" disabled={!!clienteExistente} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-slate-500">
                <FiHome className="text-[#b08d4f]" /> Habitación y estadía
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="label-modern">Habitación disponible *</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={formData.id_habitacion}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const hab = habitacionesDisponibles.find(h => h.id_habitacion === id);
                        setSelectedHabitacion(hab || null);
                        setFormData({ ...formData, id_habitacion: id });
                      }}
                      className="input-modern flex-1"
                      required
                    >
                      <option value={0}>Seleccione una habitación...</option>
                      {habitacionesDisponibles.map(hab => (
                        <option key={hab.id_habitacion} value={hab.id_habitacion}>
                          {hab.numero_habitacion} - {hab.tipo_habitacion?.nombre} (S/ {hab.tipo_habitacion?.tarifa_base}/noche)
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={abrirDetallesHabitacion}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#0f1f38] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#274067]">
                      <FiInfo /> Detalles
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label-modern">Fecha de Entrada *</label>
                  <input type="date" value={formData.fecha_entrada} onChange={(e) => setFormData({ ...formData, fecha_entrada: e.target.value })} className="input-modern" min={tipoReserva === 'walkin' ? getLocalDateString(new Date()) : undefined} required />
                  {tipoReserva === 'walkin' && <p className="mt-1 text-xs font-semibold text-[#b08d4f]">Fecha de hoy (obligatoria)</p>}
                </div>
                <div>
                  <label className="label-modern">Fecha de Salida *</label>
                  <input type="date" value={formData.fecha_salida} onChange={(e) => setFormData({ ...formData, fecha_salida: e.target.value })} className="input-modern" required />
                </div>
                <div>
                  <label className="label-modern">Canal de Reserva</label>
                  <select value={formData.canal_reserva} onChange={(e) => setFormData({ ...formData, canal_reserva: e.target.value })} className="input-modern">
                    <option value="Presencial">Presencial</option>
                    <option value="Teléfono">Teléfono</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
              </div>

              {selectedHabitacion && calcularNoches() > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4 rounded-2xl border border-[#e9dfc9] bg-gradient-to-r from-[#faf8f3] to-white p-4 text-center">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Noches</p>
                    <p className="font-display text-3xl font-semibold text-[#0f1f38]">{calcularNoches()}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tarifa/noche</p>
                    <p className="font-display text-3xl font-semibold text-[#0f1f38]">S/ {selectedHabitacion.tipo_habitacion?.tarifa_base.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0f1f38] py-2 text-white">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#ecd9ac]">Total</p>
                    <p className="font-display text-3xl font-semibold">S/ {calcularTotal().toFixed(2)}</p>
                  </div>
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest text-slate-500">
                <FiDollarSign className="text-[#b08d4f]" /> {tipoReserva === 'walkin' ? 'Pago (obligatorio)' : 'Pago / adelanto (opcional)'}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="label-modern">{tipoReserva === 'walkin' ? 'Monto Pagado (S/) *' : 'Monto de Adelanto (S/)'}</label>
                  <input type="number" step="0.01" value={formData.monto_pagado || ''} onChange={(e) => setFormData({ ...formData, monto_pagado: parseFloat(e.target.value) || 0 })} className="input-modern" placeholder={calcularTotal().toFixed(2)} required={tipoReserva === 'walkin'} />
                  {tipoReserva === 'futura' && <p className="mt-1 text-xs text-blue-600">Puede ser un adelanto o el total.</p>}
                </div>
                <div>
                  <label className="label-modern">Método de Pago *</label>
                  <select value={formData.metodo_pago} onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })} className="input-modern">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => { setShowOcupacionModal(false); resetForm(); }} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-extrabold text-white ${tipoReserva === 'walkin' ? 'btn-gold' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
                {tipoReserva === 'walkin' ? <><FiCheckCircle /> Registrar y cobrar</> : <><FiCalendar /> Crear reserva futura</>}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showDetallesModal && selectedHabitacion && selectedHabitacion.tipo_habitacion && (
        <ModalShell
          title={`Habitación ${selectedHabitacion.numero_habitacion}`}
          subtitle={`${selectedHabitacion.tipo_habitacion.nombre} · Piso ${selectedHabitacion.piso}`}
          onClose={() => setShowDetallesModal(false)}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            {selectedHabitacion.tipo_habitacion.imagen_url && (
              <img
                src={selectedHabitacion.tipo_habitacion.imagen_url}
                alt={selectedHabitacion.tipo_habitacion.nombre}
                loading="lazy"
                decoding="async"
                className="h-44 w-full rounded-2xl object-cover"
              />
            )}
            {selectedHabitacion.tipo_habitacion.descripcion && (
              <p className="text-sm leading-relaxed text-slate-600">{selectedHabitacion.tipo_habitacion.descripcion}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#faf8f3] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#b08d4f]"><FiUsers /> Capacidad</p>
                <p className="font-extrabold text-slate-800">{selectedHabitacion.tipo_habitacion.capacidad_personas} personas</p>
              </div>
              <div className="rounded-2xl bg-[#faf8f3] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#b08d4f]"><FiHome /> Cama</p>
                <p className="font-extrabold text-slate-800">{selectedHabitacion.tipo_habitacion.tipo_cama || 'No especificado'}</p>
              </div>
              <div className="rounded-2xl bg-[#faf8f3] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#b08d4f]"><FiTag /> Tarifa</p>
                <p className="font-extrabold text-slate-800">S/ {selectedHabitacion.tipo_habitacion.tarifa_base.toFixed(2)} / noche</p>
              </div>
              <div className="rounded-2xl bg-[#faf8f3] p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#b08d4f]"><FiSearch /> Piso</p>
                <p className="font-extrabold text-slate-800">Piso {selectedHabitacion.piso}</p>
              </div>
            </div>
            {selectedHabitacion.tipo_habitacion.amenities && (
              <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-4">
                <h4 className="mb-1 text-sm font-extrabold text-blue-700">Servicios incluidos</h4>
                <p className="text-sm text-slate-600">{selectedHabitacion.tipo_habitacion.amenities}</p>
              </div>
            )}
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button onClick={() => setShowDetallesModal(false)} className="btn-gold rounded-xl px-6 py-2.5 text-sm">
                Cerrar
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* modal legacy oculto para compatibilidad de iconos */}
      <span className="hidden"><FiX /></span>
    </div>
  );
}
