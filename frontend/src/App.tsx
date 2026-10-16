import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loading: cada página se descarga solo cuando se visita.
// El bundle inicial baja de ~410KB a ~150KB → login carga al instante.
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Habitaciones = lazy(() => import('./pages/Habitaciones'));
const Reservas = lazy(() => import('./pages/Reservas'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const Reportes = lazy(() => import('./pages/Reportes'));
const TiposHabitacion = lazy(() => import('./pages/TiposHabitacion'));
const Usuarios = lazy(() => import('./pages/Usuarios'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center p-10">
      <div className="flex items-center gap-3 text-sm font-bold text-[#b08d4f]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#e9dfc9] border-t-[#b08d4f]" />
        Cargando módulo...
      </div>
    </div>
  );
}

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<Layout />}>
              <Route index element={
                isAuthenticated()
                  ? <Navigate to="/dashboard" replace />
                  : <Navigate to="/login" replace />
              } />

              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="habitaciones" element={<Habitaciones />} />
              <Route path="reservas" element={<Reservas />} />
              <Route path="checkin" element={<CheckIn />} />

              <Route
                path="reportes"
                element={
                  <ProtectedRoute allowedRoles={['Administrador']}>
                    <Reportes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="tipos-habitacion"
                element={
                  <ProtectedRoute allowedRoles={['Administrador']}>
                    <TiposHabitacion />
                  </ProtectedRoute>
                }
              />
              <Route
                path="usuarios"
                element={
                  <ProtectedRoute allowedRoles={['Administrador']}>
                    <Usuarios />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

export default App;
