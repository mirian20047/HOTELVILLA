import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiLayers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, Card, StatusBadge, SearchInput, EmptyState, LoadingState, ModalShell } from '../components/ui';
import { fotoTipo } from '../utils/imagen';
import { useDebouncedValue, usePagination, PaginationControls } from '../hooks/usePerf';

interface Habitacion {
  id_habitacion: number;
  numero_habitacion: string;
  id_tipo_habitacion: number;
  piso: number;
  estado_actual: string;
  tipo_habitacion?: {
    nombre: string;
    capacidad_personas: number;
    tarifa_base: number;
    imagen_url?: string | null;
  };
}

interface TipoHabitacion {
  id_tipo_habitacion: number;
  nombre: string;
  capacidad_personas: number;
  tarifa_base: number;
}

const ROOM_IMG: Record<string, string> = {
  default: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=50&auto=format&fit=crop',
};

export default function Habitaciones() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<TipoHabitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHabitacion, setEditingHabitacion] = useState<Habitacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [formData, setFormData] = useState({
    numero_habitacion: '',
    id_tipo_habitacion: 1,
    piso: 1,
    estado_actual: 'Disponible'
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [habRes, tiposRes] = await Promise.all([
        api.get<Habitacion[]>('/habitaciones'),
        api.get<TipoHabitacion[]>('/tipos-habitacion').catch(() => ({ data: [] }))
      ]);
      setHabitaciones(habRes.data);
      setTiposHabitacion(tiposRes.data);
    } catch (error) {
      toast.error('Error al cargar habitaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHabitacion) {
        await api.put(`/habitaciones/${editingHabitacion.id_habitacion}`, formData);
        toast.success('Habitación actualizada correctamente');
      } else {
        await api.post('/habitaciones', formData);
        toast.success('Habitación creada correctamente');
      }
      setShowModal(false);
      setEditingHabitacion(null);
      resetForm();
      cargarDatos();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar habitación');
    }
  };

  const handleEdit = (habitacion: Habitacion) => {
    setEditingHabitacion(habitacion);
    setFormData({
      numero_habitacion: habitacion.numero_habitacion,
      id_tipo_habitacion: habitacion.id_tipo_habitacion,
      piso: habitacion.piso,
      estado_actual: habitacion.estado_actual
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta habitación?')) return;
    try {
      await api.delete(`/habitaciones/${id}`);
      toast.success('Habitación eliminada');
      cargarDatos();
    } catch (error) {
      toast.error('Error al eliminar habitación');
    }
  };

  const marcarComoDisponible = (id_habitacion: number, numero: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3 min-w-[300px]">
          <p className="font-semibold text-gray-800 text-sm">
            ¿Marcar habitación <span className="text-orange-600 font-bold">{numero}</span> como Disponible?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await api.put(`/habitaciones/${id_habitacion}/estado`, null, {
                    params: { nuevo_estado: 'Disponible' }
                  });
                  toast.success(`Habitación ${numero} marcada como Disponible`, {
                    style: { background: '#10B981', color: '#fff', fontWeight: 'bold' }
                  });
                  cargarDatos();
                } catch (error) {
                  toast.error('Error al actualizar estado');
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium transition shadow-sm"
            >
              Sí, marcar
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1.5 rounded text-sm font-medium transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  const resetForm = () => {
    setFormData({
      numero_habitacion: '',
      id_tipo_habitacion: 1,
      piso: 1,
      estado_actual: 'Disponible'
    });
  };

  const estados = ['Todos', 'Disponible', 'Ocupada', 'Reservada', 'En limpieza', 'En mantenimiento'];

  const filteredHabitaciones = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return habitaciones.filter(h => {
      const matchSearch = !q ||
        h.numero_habitacion.toLowerCase().includes(q) ||
        h.estado_actual.toLowerCase().includes(q);
      const matchEstado = filtroEstado === 'Todos' || h.estado_actual === filtroEstado;
      return matchSearch && matchEstado;
    });
  }, [habitaciones, debouncedSearch, filtroEstado]);

  const { page, setPage, totalPages, pageItems } = usePagination(filteredHabitaciones, 9);

  const resumen = useMemo(() => estados.slice(1).map((e) => ({
    estado: e,
    total: habitaciones.filter((h) => h.estado_actual === e).length,
  })), [habitaciones]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operación · Habitaciones"
        title="Mapa de habitaciones"
        subtitle={`${habitaciones.length} habitaciones · filtra por estado y gestiona disponibilidad`}
        background="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=50&auto=format&fit=crop"
        actions={
          <button
            onClick={() => { resetForm(); setEditingHabitacion(null); setShowModal(true); }}
            className="btn-gold flex items-center gap-2 rounded-2xl px-5 py-3 text-sm"
          >
            <FiPlus className="text-lg" /> Nueva habitación
          </button>
        }
      />

      {/* Resumen por estado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {resumen.map((r, i) => (
          <button
            key={r.estado}
            onClick={() => setFiltroEstado(filtroEstado === r.estado ? 'Todos' : r.estado)}
            className={`anim-fade-up stagger-${i + 1} rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
              filtroEstado === r.estado ? 'border-[#c9a86a] ring-2 ring-[#c9a86a]/30' : 'border-slate-100'
            }`}
          >
            <StatusBadge value={r.estado} />
            <p className="font-display mt-2 text-3xl font-semibold text-slate-800">{r.total}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">habitaciones</p>
          </button>
        ))}
      </div>

      <Card delay="stagger-2">
        <SearchInput value={searchTerm} onChange={(v) => { setSearchTerm(v); setPage(1); }} placeholder="Buscar por número o estado..." />
      </Card>

      {loading ? (
        <Card><LoadingState message="Cargando habitaciones..." /></Card>
      ) : filteredHabitaciones.length === 0 ? (
        <Card>
          <EmptyState
            title="No hay habitaciones con ese filtro"
            subtitle="Prueba con otro estado o crea una nueva habitación."
            image="https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&q=60&auto=format&fit=crop"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((h, i) => (
            <div
              key={h.id_habitacion}
              className={`anim-fade-up stagger-${(i % 4) + 1} card-hover overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_10px_35px_-18px_rgba(16,31,56,0.35)]`}
            >
              <div className="relative h-40">
                <img src={fotoTipo(h.tipo_habitacion, ROOM_IMG.default)} alt={`Habitación ${h.numero_habitacion}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1526]/85 via-[#0b1526]/10 to-transparent" />
                <div className="absolute left-4 top-4">
                  <StatusBadge value={h.estado_actual} />
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ecd9ac]">Habitación</p>
                    <p className="font-display text-3xl font-semibold text-white">{h.numero_habitacion}</p>
                  </div>
                  <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                    Piso {h.piso}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <FiLayers className="text-[#b08d4f]" />
                  {h.tipo_habitacion?.nombre || `Tipo ${h.id_tipo_habitacion}`}
                  {h.tipo_habitacion && (
                    <span className="font-bold text-slate-800">· S/ {h.tipo_habitacion.tarifa_base.toFixed(2)}</span>
                  )}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {h.estado_actual === 'En limpieza' && (
                    <button
                      onClick={() => marcarComoDisponible(h.id_habitacion, h.numero_habitacion)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2.5 text-xs font-extrabold text-white shadow transition hover:brightness-110"
                    >
                      ✓ Marcar disponible
                    </button>
                  )}
                  <button onClick={() => handleEdit(h)} title="Editar"
                    className="rounded-xl bg-blue-50 p-2.5 text-blue-600 transition hover:bg-blue-600 hover:text-white">
                    <FiEdit2 />
                  </button>
                  <button onClick={() => handleDelete(h.id_habitacion)} title="Eliminar"
                    className="rounded-xl bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-600 hover:text-white">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && filteredHabitaciones.length > 9 && (
        <Card className="!p-0">
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} total={filteredHabitaciones.length} />
        </Card>
      )}

      {showModal && (
        <ModalShell
          title={editingHabitacion ? 'Editar habitación' : 'Nueva habitación'}
          subtitle="Define número, tipo, piso y estado"
          onClose={() => setShowModal(false)}
        >
          <form key={editingHabitacion?.id_habitacion || 'new'} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label-modern">Número de Habitación</label>
                <input type="text" value={formData.numero_habitacion} onChange={(e) => setFormData({ ...formData, numero_habitacion: e.target.value })} className="input-modern" required />
              </div>
              <div>
                <label className="label-modern">Tipo de Habitación</label>
                <select value={formData.id_tipo_habitacion} onChange={(e) => setFormData({ ...formData, id_tipo_habitacion: Number(e.target.value) })} className="input-modern">
                  {tiposHabitacion.length > 0 ? (
                    tiposHabitacion.map(tipo => (
                      <option key={tipo.id_tipo_habitacion} value={tipo.id_tipo_habitacion}>
                        {tipo.nombre} (Cap: {tipo.capacidad_personas})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={1}>Individual Silver</option>
                      <option value={2}>Doble Gold</option>
                      <option value={3}>Suite Premium</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="label-modern">Piso</label>
                <input type="number" min="1" value={formData.piso} onChange={(e) => setFormData({ ...formData, piso: Number(e.target.value) })} className="input-modern" required />
              </div>
              <div>
                <label className="label-modern">Estado</label>
                <select value={formData.estado_actual} onChange={(e) => setFormData({ ...formData, estado_actual: e.target.value })} className="input-modern">
                  <option value="Disponible">Disponible</option>
                  <option value="Ocupada">Ocupada</option>
                  <option value="En limpieza">En limpieza</option>
                  <option value="En mantenimiento">En mantenimiento</option>
                  <option value="Reservada">Reservada</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" className="btn-gold rounded-xl px-6 py-2.5 text-sm">
                {editingHabitacion ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
