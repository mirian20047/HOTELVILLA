import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiUser, FiLock, FiEye, FiEyeOff, FiShield, FiClock, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';

interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: {
    id_usuario: number;
    username: string;
    nombres: string;
    apellidos: string;
    rol: string;
    estado: string;
  };
}

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // MISMA llamada al backend — sin cambios funcionales
      const { data } = await api.post<LoginResponse>('/auth/login', formData);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      toast.success(`¡Bienvenido ${data.usuario.nombres}!`);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b1526]">
      {/* Panel izquierdo — imagen del hotel */}
      <div className="relative hidden w-[52%] overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1000&q=60&auto=format&fit=crop"
          alt="Hotel La Villa de Roel"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1526] via-[#0b1526]/45 to-[#0b1526]/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0b1526]/40" />

        <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ddbe7e] to-[#a98347] font-display text-2xl font-bold text-[#0b1526] shadow-xl">
              V
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-white">La Villa de Roel</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ddbe7e]">
                Huamanga · Ayacucho
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <FiShield className="text-[#ddbe7e]" /> Acceso corporativo
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-10">
          <p className="mb-3 inline-block rounded-full bg-[#ddbe7e] px-4 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0b1526]">
            Hotel La Villa de Roel · PMS
          </p>
          <h2 className="font-display max-w-lg text-4xl font-semibold leading-[1.1] text-white xl:text-5xl">
            La operación del hotel, en un solo lugar.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Reservas, recepción, habitaciones, cobranza y reportes gerenciales en una plataforma
            diseñada para el equipo del hotel.
          </p>
          <div className="mt-7 grid max-w-md grid-cols-3 gap-3">
            {[
              { icon: FiClock, t: 'Recepción ágil', s: 'Check-in en segundos' },
              { icon: FiShield, t: 'Acceso por roles', s: 'Datos protegidos' },
              { icon: FiBarChart2, t: 'Reportes gerenciales', s: 'Ocupación e ingresos' },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
                <f.icon className="mb-2 text-lg text-[#ddbe7e]" />
                <p className="text-xs font-bold text-white">{f.t}</p>
                <p className="text-[11px] text-slate-300">{f.s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#c9a86a]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="anim-fade-up w-full max-w-md">
          {/* marca móvil */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ddbe7e] to-[#a98347] font-display text-xl font-bold text-[#0b1526]">
              V
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-white">La Villa de Roel</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#ddbe7e]">
                Gestión hotelera
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#b08d4f]">
              Hotel La Villa de Roel
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-slate-900">
              Iniciar sesión
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Ingresa tus credenciales corporativas para continuar.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label className="label-modern">Usuario</label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-modern pl-11"
                    placeholder="Ej. admin"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label-modern">Contraseña</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-modern pl-11 pr-12"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Verificando acceso...
                  </>
                ) : (
                  <>
                    <FiLogIn className="text-lg" /> Iniciar sesión
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#faf8f3] p-4 text-xs leading-relaxed text-slate-500">
              <FiShield className="mt-0.5 shrink-0 text-base text-[#b08d4f]" />
              <p>
                <span className="font-bold text-slate-700">Acceso restringido.</span>{' '}
                Uso exclusivo del personal autorizado del hotel. Si no tienes credenciales,
                contacta a administración.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © 2026 Hotel La Villa de Roel · Huamanga, Ayacucho
          </p>
        </div>
      </div>
    </div>
  );
}
