import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, Card, StatusBadge, EmptyState, LoadingState, initialsOf } from '../components/ui';

interface Usuario {
  id_usuario: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
  estado: string;
  fecha_registro: string;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nombres: '',
    apellidos: '',
    email: '',
    rol: 'Recepcionista',
    estado: 'Activo'
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const { data } = await api.get<Usuario[]>('/usuarios');
      setUsuarios(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUsuario) {
        await api.put(`/usuarios/${editingUsuario.id_usuario}`, formData);
        toast.success('Usuario actualizado correctamente');
      } else {
        await api.post('/usuarios', formData);
        toast.success('Usuario creado correctamente');
      }
      setShowModal(false);
      setEditingUsuario(null);
      resetForm();
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar usuario');
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      username: usuario.username,
      password: '',
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado
    });
    setShowModal(true);
  };

  const handleDelete = async (id_usuario: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await api.delete(`/usuarios/${id_usuario}`);
      toast.success('Usuario eliminado correctamente');
      cargarUsuarios();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nombres: '',
      apellidos: '',
      email: '',
      rol: 'Recepcionista',
      estado: 'Activo'
    });
  };

  const admins = usuarios.filter((u) => u.rol === 'Administrador').length;
  const recepcionistas = usuarios.filter((u) => u.rol !== 'Administrador').length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin · Equipo"
        title="Gestión de usuarios"
        subtitle={`${usuarios.length} cuentas · ${admins} administradores · ${recepcionistas} recepcionistas`}
        background="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=50&auto=format&fit=crop"
        actions={
          <button
            onClick={() => { setEditingUsuario(null); resetForm(); setShowModal(true); }}
            className="btn-gold flex items-center gap-2 rounded-2xl px-5 py-3 text-sm"
          >
            <FiPlus className="text-lg" /> Nuevo usuario
          </button>
        }
      />

      {loading ? (
        <Card><LoadingState message="Cargando equipo..." /></Card>
      ) : usuarios.length === 0 ? (
        <Card>
          <EmptyState title="Sin usuarios registrados" subtitle="Crea la primera cuenta del equipo." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {usuarios.map((usuario, i) => (
            <div
              key={usuario.id_usuario}
              className={`anim-fade-up stagger-${(i % 3) + 1} card-hover rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_10px_35px_-18px_rgba(16,31,56,0.35)]`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-extrabold ${
                    usuario.rol === 'Administrador'
                      ? 'bg-gradient-to-br from-violet-500 to-purple-700 text-white'
                      : 'bg-gradient-to-br from-[#0f1f38] to-[#274067] text-[#ecd9ac]'
                  }`}>
                    {initialsOf(usuario.nombres, usuario.apellidos)}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800">{usuario.nombres} {usuario.apellidos}</p>
                    <p className="text-xs text-slate-400">@{usuario.username} · {usuario.email}</p>
                  </div>
                </div>
                <FiShield className={usuario.rol === 'Administrador' ? 'text-violet-400' : 'text-sky-400'} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={usuario.rol} />
                <StatusBadge value={usuario.estado} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Acciones</span>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(usuario)} title="Editar"
                    className="rounded-xl bg-blue-50 p-2.5 text-blue-600 transition hover:bg-blue-600 hover:text-white">
                    <FiEdit2 />
                  </button>
                  <button onClick={() => handleDelete(usuario.id_usuario)} title="Eliminar"
                    className="rounded-xl bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-600 hover:text-white">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#0b1526]/60 p-4" onClick={() => setShowModal(false)}>
          <div className="anim-fade-up w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-gradient-to-r from-[#0f1f38] to-[#274067] px-6 py-5 text-white">
              <div>
                <h2 className="font-display text-xl font-semibold">{editingUsuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                <p className="text-xs text-slate-300">Cuenta, rol y acceso al sistema</p>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-full bg-white/10 p-1.5 transition hover:bg-white/25">
                <FiX className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
              <div>
                <label className="label-modern">Username *</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="input-modern" disabled={!!editingUsuario} required />
              </div>
              <div>
                <label className="label-modern">{editingUsuario ? 'Nueva Contraseña (vacío = no cambiar)' : 'Contraseña *'}</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input-modern" required={!editingUsuario} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-modern">Nombres *</label>
                  <input type="text" value={formData.nombres} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="input-modern" required />
                </div>
                <div>
                  <label className="label-modern">Apellidos *</label>
                  <input type="text" value={formData.apellidos} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="input-modern" required />
                </div>
              </div>
              <div>
                <label className="label-modern">Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-modern" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-modern">Rol *</label>
                  <select value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })} className="input-modern" required>
                    <option value="Administrador">Administrador</option>
                    <option value="Recepcionista">Recepcionista</option>
                  </select>
                </div>
                <div>
                  <label className="label-modern">Estado *</label>
                  <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="input-modern" required>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="btn-gold rounded-xl px-6 py-2.5 text-sm">
                  {editingUsuario ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
