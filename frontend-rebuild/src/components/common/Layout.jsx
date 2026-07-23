import SiteHeader from '../layout/SiteHeader'
import SiteFooter from '../layout/SiteFooter'
import { Outlet } from 'react-router-dom';

function Layout() {
    return (
        <div className="flex min-h-screen flex-col bg-fwm-bg text-fwm-text">

            <SiteHeader></SiteHeader>
            <main className="flex-1">
                <Outlet />
            </main>
            <SiteFooter></SiteFooter>
        </div>
    );
}

export default Layout;