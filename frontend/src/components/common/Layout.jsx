import { Outlet } from 'react-router-dom';
import SiteHeader from '../layout/SiteHeader';
import SiteFooter from '../layout/SiteFooter';

function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-fwm-bg text-fwm-text">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

export default Layout;
