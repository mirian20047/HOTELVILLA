import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiDollarSign, FiStar, FiCamera, FiX, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, Card, StatusBadge, EmptyState, LoadingState, ModalShell } from '../components/ui';
import { fotoTipo } from '../utils/imagen';

interface TipoHabitacion {
  id_tipo_habitacion: number;
  nombre: string;
  capacidad_personas: number;
  descripcion?: string;
  tipo_cama?: string;
  amenities?: string;
  tarifa_base: number;
  estado: string;
  imagen_url?: string | null;
}

const TYPE_IMGS = [
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=50&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&q=50&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=50&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400&q=50&auto=format&fit=crop',
];

export default function TiposHabitacion() {
  const [tipos, setTipos] = useState<TipoHabitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoHabitacion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    capacidad_personas: 1,
    descripcion: '',
    tipo_cama: '',
    amenities: '',
    tarifa_base: 0,
    estado: 'Activo'
  });

  // Foto: archivo nuevo, vista previa local y foto actual guardada
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoActual, setFotoActual] = useState<string | null>(null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarTipos();
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    };
  }, []);

  const cargarTipos = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<TipoHabitacion[]>('/tipos-habitacion');
      setTipos(data || []);
    } catch (error) {
      console.error('Error al cargar tipos:', error);
      toast.error('Error al cargar tipos de habitación');
      setTipos([]);
    } finally {
      setLoading(false);
    }
  };

  const elegirFoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen supera los 5 MB');
      return;
    }
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setQuitarFoto(false);
  };

  const limpiarFotoNueva = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(null);
    setFotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: String(formData.nombre).trim(),
      capacidad_personas: Number(formData.capacidad_personas),
      descripcion: formData.descripcion && formData.descripcion.trim() !== '' ? formData.descripcion.trim() : null,
      tipo_cama: formData.tipo_cama && formData.tipo_cama.trim() !== '' ? formData.tipo_cama.trim() : null,
      amenities: formData.amenities && formData.amenities.trim() !== '' ? formData.amenities.trim() : null,
      tarifa_base: Number(formData.tarifa_base),
      estado: String(formData.estado)
    };
    setSaving(true);
    try {
      let idTipo: number;
      if (editingTipo) {
        await api.put(`/tipos-habitacion/${editingTipo.id_tipo_habitacion}`, payload);
        idTipo = editingTipo.id_tipo_habitacion;
      } else {
        const { data } = await api.post('/tipos-habitacion', payload);
        idTipo = data.id_tipo_habitacion;
      }

      // Foto: subir la nueva o quitar la actual (después de guardar el tipo)
      if (fotoFile) {
        const fd = new FormData();
        fd.append('archivo', fotoFile);
        await api.post(`/tipos-habitacion/${idTipo}/imagen`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (quitarFoto && editingTipo?.imagen_url) {
        await api.delete(`/tipos-habitacion/${idTipo}/imagen`);
      }

      toast.success(editingTipo ? 'Tipo de habitación actualizado correctamente' : 'Tipo de habitación creado correctamente');
      cerrarModal();
      await cargarTipos();
    } catch (error: any) {
      console.error('Error al guardar:', error);
      let mensajeError = 'Error al guardar el tipo de habitación';
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        mensajeError = detail.map((d: any) => d.msg || d.message).join(', ');
      } else if (typeof detail === 'string') {
        mensajeError = detail;
      }
      toast.error(mensajeError);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tipo: TipoHabitacion) => {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre,
      capacidad_personas: tipo.capacidad_personas,
      descripcion: tipo.descripcion || '',
      tipo_cama: tipo.tipo_cama || '',
      amenities: tipo.amenities || '',
      tarifa_base: tipo.tarifa_base,
      estado: tipo.estado
    });
    limpiarFotoNueva();
    setFotoActual(tipo.imagen_url || null);
    setQuitarFoto(false);
    setShowModal(true);
  };

  const abrirNuevo = () => {
    resetForm();
    setEditingTipo(null);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingTipo(null);
    resetForm();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este tipo de habitación?')) return;
    try {
      await api.delete(`/tipos-habitacion/${id}`);
      toast.success('Tipo de habitación eliminado');
      cargarTipos();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      capacidad_personas: 1,
      descripcion: '',
      tipo_cama: '',
      amenities: '',
      tarifa_base: 0,
      estado: 'Activo'
    });
    limpiarFotoNueva();
    setFotoActual(null);
    setQuitarFoto(false);
  };

  // Lo que se muestra en el editor: nueva selección > foto guardada (salvo que se marque quitar)
  const previewVisible = fotoPreview || (!quitarFoto ? fotoActual : null);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Admin · Catálogo" title="Tipos de habitación" subtitle="Categorías, camas, amenities y tarifas" />
        <Card><LoadingState message="Cargando tipos de habitación..." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · Catálogo"
        title="Tipos de habitación"
        subtitle={`${tipos.length} categorías configuradas · definen capacidad, tarifa y foto`}
        background="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=50&auto=format&fit=crop"
        actions={
          <button
            onClick={abrirNuevo}
            className="btn-gold flex items-center gap-2 rounded-2xl px-5 py-3 text-sm"
          >
            <FiPlus className="text-lg" /> Nuevo tipo
          </button>
        }
      />

      {tipos.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin tipos registrados"
            subtitle="Crea tu primera categoría: Individual, Doble, Suite..."
            image="https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=60&auto=format&fit=crop"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tipos.map((tipo, i) => (
            <div
              key={tipo.id_tipo_habitacion}
              className={`anim-fade-up stagger-${(i % 3) + 1} card-hover overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_10px_35px_-18px_rgba(16,31,56,0.35)]`}
            >
              <div className="relative h-44">
                <img src={fotoTipo(tipo, TYPE_IMGS[i % TYPE_IMGS.length])} alt={tipo.nombre} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1526]/85 via-[#0b1526]/15 to-transparent" />
                <div className="absolute left-4 top-4"><StatusBadge value={tipo.estado} /></div>
                {tipo.imagen_url && (
                  <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#0b1526]/70 px-2.5 py-1 text-[11px] font-bold text-[#ecd9ac] backdrop-blur">
                    <FiCamera /> Foto propia
                  </span>
                )}
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <h3 className="font-display text-2xl font-semibold text-white">{tipo.nombre}</h3>
                  <span className="rounded-xl bg-[#c9a86a] px-3 py-1.5 text-sm font-extrabold text-[#0b1526]">
                    S/ {tipo.tarifa_base.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                    <FiUsers className="text-[#b08d4f]" /> {tipo.capacidad_personas} personas
                  </span>
                  {tipo.tipo_cama && (
                    <span className="rounded-full bg-[#faf8f3] px-3 py-1.5 text-[#8a6d35]">
                      {tipo.tipo_cama}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-slate-500">{tipo.descripcion || 'Sin descripción registrada.'}</p>
                {tipo.amenities && (
                  <p className="flex items-start gap-1.5 rounded-2xl bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-900">
                    <FiStar className="mt-0.5 shrink-0 text-blue-500" /> {tipo.amenities}
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <FiDollarSign /> tarifa / noche
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(tipo)} title="Editar (incluye foto)"
                      className="rounded-xl bg-blue-50 p-2.5 text-blue-600 transition hover:bg-blue-600 hover:text-white">
                      <FiEdit2 />
                    </button>
                    <button onClick={() => handleDelete(tipo.id_tipo_habitacion)} title="Eliminar"
                      className="rounded-xl bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-600 hover:text-white">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalShell
          title={editingTipo ? 'Editar tipo de habitación' : 'Nuevo tipo de habitación'}
          subtitle="Categoría, capacidad, cama, tarifa y foto"
          onClose={cerrarModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto */}
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
              <label className="label-modern flex items-center gap-1.5">
                <FiImage className="text-[#b08d4f]" /> Foto del tipo de habitación
              </label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-200 sm:w-48">
                  {previewVisible ? (
                    <img src={previewVisible} alt="Foto del tipo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                      <FiCamera className="text-2xl" />
                      <span className="text-[11px] font-bold">Sin foto</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => elegirFoto(e.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="rounded-xl bg-[#0f1f38] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#274067]"
                    >
                      {previewVisible ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    {fotoFile && (
                      <button
                        type="button"
                        onClick={limpiarFotoNueva}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                      >
                        <FiX /> Descartar
                      </button>
                    )}
                    {!fotoFile && fotoActual && !quitarFoto && (
                      <button
                        type="button"
                        onClick={() => setQuitarFoto(true)}
                        className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                      >
                        <FiTrash2 /> Quitar foto
                      </button>
                    )}
                    {quitarFoto && (
                      <button
                        type="button"
                        onClick={() => setQuitarFoto(false)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
                      >
                        Conservar foto
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Acepta cualquier imagen (JPG, PNG, WEBP…). Se ajusta sola al encuadre y se
                    optimiza al subir (máx. 5 MB).
                  </p>
                  {fotoFile && (
                    <p className="truncate text-xs font-bold text-emerald-600">
                      ✓ {fotoFile.name} lista para subir al guardar
                    </p>
                  )}
                  {quitarFoto && (
                    <p className="text-xs font-bold text-rose-600">
                      La foto actual se eliminará al guardar.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label-modern">Nombre del Tipo *</label>
                <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="input-modern" placeholder="Ej: Suite Premium" required />
              </div>
              <div>
                <label className="label-modern">Capacidad (personas) *</label>
                <input type="number" min="1" value={formData.capacidad_personas} onChange={(e) => setFormData({ ...formData, capacidad_personas: Number(e.target.value) })} className="input-modern" required />
              </div>
              <div>
                <label className="label-modern">Tarifa por Noche (S/) *</label>
                <input type="number" step="0.01" min="0" value={formData.tarifa_base} onChange={(e) => setFormData({ ...formData, tarifa_base: parseFloat(e.target.value) || 0 })} className="input-modern" required />
              </div>
              <div className="sm:col-span-2">
                <label className="label-modern">Descripción</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="input-modern" rows={2} placeholder="Descripción breve..." />
              </div>
              <div className="sm:col-span-2">
                <label className="label-modern">Tipo de Cama *</label>
                <input type="text" value={formData.tipo_cama} onChange={(e) => setFormData({ ...formData, tipo_cama: e.target.value })} className="input-modern" placeholder="Ej: 1 Cama Queen" required />
              </div>
              <div className="sm:col-span-2">
                <label className="label-modern">Servicios Incluidos / Amenities</label>
                <textarea value={formData.amenities} onChange={(e) => setFormData({ ...formData, amenities: e.target.value })} className="input-modern" rows={2} placeholder="Ej: WiFi, TV, Aire acondicionado..." />
              </div>
              <div>
                <label className="label-modern">Estado</label>
                <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="input-modern">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={cerrarModal} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-gold flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm disabled:opacity-60">
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {saving ? 'Guardando...' : (editingTipo ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
