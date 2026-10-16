import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const usuarioStr = localStorage.getItem('usuario');
  
  // 1. Si no hay token, redirigir al login
  if (!token || !usuarioStr) {
    return <Navigate to="/login" replace />;
  }

  const usuario = JSON.parse(usuarioStr);

  // 2. Si el rol del usuario no está en los roles permitidos, redirigir al dashboard
  if (!allowedRoles.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Si todo está bien, mostrar la página
  return <>{children}</>;
}