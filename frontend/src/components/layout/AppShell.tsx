import { Header } from './Header';
import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Outlet />
      </main>
    </div>
  );
}
