import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#eef2f6]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[1280px] flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <Outlet />
          <p className="pb-4 text-center text-xs text-slate-400">
            La Villa de Roel · Sistema de gestión hotelera — Huamanga, Ayacucho
          </p>
        </main>
      </div>
    </div>
  );
}
