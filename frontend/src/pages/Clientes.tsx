import { useState, useEffect, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { PageHeader, Card, StatusBadge, SearchInput, EmptyState, LoadingState, ModalShell, initialsOf } from '../components/ui';
import { useDebouncedValue, usePagination, PaginationControls } from '../hooks/usePerf';

interface Cliente {
  id_cliente: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  nacionalidad?: string;
  tipo_cliente?: string;
  estado: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [formData, setFormData] = useState({
    tipo_documento: 'DNI',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    nacionalidad: 'Peruana',
    tipo_cliente: 'Turista',
    estado: 'Activo'
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      const { data } = await api.get<Cliente[]>('/clientes');
      setClientes(data);
    } catch (error) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await api.put(`/clientes/${editingCliente.id_cliente}`, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await api.post('/clientes', formData);
        toast.success('Cliente creado correctamente');
      }
      setShowModal(false);
      setEditingCliente(null);
      resetForm();
      cargarClientes();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar cliente');
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      tipo_documento: cliente.tipo_documento,
      numero_documento: cliente.numero_documento,
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      nacionalidad: cliente.nacionalidad || 'Peruana',
      tipo_cliente: cliente.tipo_cliente || 'Turista',
      estado: cliente.estado
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      toast.success('Cliente eliminado');
      cargarClientes();
    } catch (error) {
      toast.error('Error al eliminar cliente');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo_documento: 'DNI',
      numero_documento: '',
      nombres: '',
      apellidos: '',
      email: '',
      telefono: '',
      nacionalidad: 'Peruana',
      tipo_cliente: 'Turista',
      estado: 'Activo'
    });
  };

  const filteredClientes = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(c =>
      c.nombres.toLowerCase().includes(q) ||
      c.apellidos.toLowerCase().includes(q) ||
      c.numero_documento.includes(debouncedSearch.trim())
    );
  }, [clientes, debouncedSearch]);

  const { page, setPage, totalPages, pageItems } = usePagination(filteredClientes, 12);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Recepción · Clientes"
        title="Gestión de clientes"
        subtitle={`${clientes.length} clientes en la base de datos · busca por nombre o documento`}
        background="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=50&auto=format&fit=crop"
        actions={
          <button
            onClick={() => { resetForm(); setEditingCliente(null); setShowModal(true); }}
            className="btn-gold flex items-center gap-2 rounded-2xl px-5 py-3 text-sm"
          >
            <FiPlus className="text-lg" /> Nuevo cliente
          </button>
        }
      />

      <Card delay="stagger-1">
        <SearchInput
          value={searchTerm}
          onChange={(v) => { setSearchTerm(v); setPage(1); }}
          placeholder="Buscar por nombre, apellido o documento..."
        />
      </Card>

      <Card delay="stagger-2" className="!p-0 overflow-hidden">
        {loading ? (
          <LoadingState message="Cargando clientes..." />
        ) : filteredClientes.length === 0 ? (
          <EmptyState
            title="No hay clientes registrados"
            subtitle="Registra al primer huésped con el botón Nuevo cliente."
            image="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=60&auto=format&fit=crop"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-modern w-full">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contacto</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((cliente) => (
                  <tr key={cliente.id_cliente}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f1f38] to-[#274067] text-xs font-extrabold text-[#ecd9ac]">
                          {initialsOf(cliente.nombres, cliente.apellidos)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{cliente.nombres} {cliente.apellidos}</p>
                          <p className="text-xs text-slate-400">#{cliente.id_cliente}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{cliente.tipo_documento}</p>
                      <p className="font-bold text-slate-700">{cliente.numero_documento}</p>
                    </td>
                    <td>
                      <p className="text-slate-600">{cliente.email || '—'}</p>
                      <p className="text-xs text-slate-400">{cliente.telefono || 'Sin teléfono'}</p>
                    </td>
                    <td className="text-slate-500">{cliente.tipo_cliente || '—'}</td>
                    <td><StatusBadge value={cliente.estado} /></td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(cliente)} title="Editar"
                          className="rounded-xl bg-blue-50 p-2.5 text-blue-600 transition hover:bg-blue-600 hover:text-white">
                          <FiEdit2 />
                        </button>
                        <button onClick={() => handleDelete(cliente.id_cliente)} title="Eliminar"
                          className="rounded-xl bg-rose-50 p-2.5 text-rose-600 transition hover:bg-rose-600 hover:text-white">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredClientes.length > 0 && (
          <PaginationControls page={page} totalPages={totalPages} onChange={setPage} total={filteredClientes.length} />
        )}
      </Card>

      {showModal && (
        <ModalShell
          title={editingCliente ? 'Editar cliente' : 'Nuevo cliente'}
          subtitle="Completa los datos del huésped"
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label-modern">Tipo Documento</label>
                <select value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })} className="input-modern">
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Carnet Extranjería">Carnet Extranjería</option>
                </select>
              </div>
              <div>
                <label className="label-modern">Número Documento</label>
                <input type="text" value={formData.numero_documento} onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })} className="input-modern" required />
              </div>
              <div>
                <label className="label-modern">Nombres</label>
                <input type="text" value={formData.nombres} onChange={(e) => setFormData({ ...formData, nombres: e.target.value })} className="input-modern" required />
              </div>
              <div>
                <label className="label-modern">Apellidos</label>
                <input type="text" value={formData.apellidos} onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })} className="input-modern" required />
              </div>
              <div>
                <label className="label-modern">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-modern" />
              </div>
              <div>
                <label className="label-modern">Teléfono</label>
                <input type="text" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="input-modern" />
              </div>
              <div>
                <label className="label-modern">Nacionalidad</label>
                <input type="text" value={formData.nacionalidad} onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })} className="input-modern" />
              </div>
              <div>
                <label className="label-modern">Tipo Cliente</label>
                <select value={formData.tipo_cliente} onChange={(e) => setFormData({ ...formData, tipo_cliente: e.target.value })} className="input-modern">
                  <option value="Turista">Turista</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Frecuente">Frecuente</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label-modern">Estado</label>
                <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="input-modern">
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" className="btn-gold rounded-xl px-6 py-2.5 text-sm">
                {editingCliente ? 'Actualizar' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
