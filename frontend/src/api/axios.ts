import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Caché en memoria para GETs de lectura (30s).
// El Dashboard pedía 6 endpoints y CheckIn otros 6 en cada visita;
// con esto las visitas repetidas son instantáneas y no golpean MySQL.
const getCache = new Map<string, { ts: number; data: unknown }>();
const CACHE_TTL = 30_000;
// Endpoints que sí conviene cachear (lecturas idempotentes)
const CACHEABLE = [
  '/clientes',
  '/habitaciones',
  '/habitaciones-disponibles',
  '/tipos-habitacion',
  '/reservas',
  '/huespedes',
  '/reportes/ocupacion',
  '/reportes/ingresos',
  '/reportes/reservas',
  '/reportes/huespedes-recientes',
  '/checkouts-estadisticas',
  '/alertas-limpieza',
  '/usuarios',
];

function isCacheable(url?: string) {
  if (!url) return false;
  return CACHEABLE.some((p) => url === p || url.startsWith(p + '?'));
}

export function clearApiCache() {
  getCache.clear();
}

// Interceptor para agregar el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Servir GET cacheable desde memoria sin ir a la red
  if (config.method === 'get' && isCacheable(config.url)) {
    const key = `${config.url}`;
    const hit = getCache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      // Adapter falso que resuelve con el dato cacheado
      config.adapter = async () => ({
        data: hit.data,
        status: 200,
        statusText: 'OK (cache)',
        headers: {},
        config,
      });
    }
  }
  return config;
});

// Interceptor para manejar errores de autenticación + poblar/invalidar caché
api.interceptors.response.use(
  (response) => {
    const { config, data } = response;
    if (config.method === 'get' && isCacheable(config.url) && response.status === 200) {
      getCache.set(`${config.url}`, { ts: Date.now(), data });
    }
    // Cualquier escritura invalida lecturas cacheadas (datos frescos tras crear/editar)
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
      getCache.clear();
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const esLogin = url.includes('/auth/login');
      // En el login con credenciales malas NO recargar: solo se avisa con el toast.
      // (Antes hacía window.location.href y la pantalla parpadeaba en blanco.)
      if (!esLogin && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        getCache.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
