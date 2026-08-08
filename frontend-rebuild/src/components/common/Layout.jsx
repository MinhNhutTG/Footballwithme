import SiteHeader from '../layout/SiteHeader'
import SiteFooter from '../layout/SiteFooter'
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { logVisit } from '../../api/logs';

function Layout() {
    const location = useLocation();
    const { token } = useAuth();

    useEffect(() => {
        logVisit(location.pathname, token).catch(() => { });
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen flex-col bg-fwm-bg text-fwm-text">

            <SiteHeader></SiteHeader>
            <main className="flex-1">
                <Suspense fallback={<div className="flex justify-center py-24"><p className="text-fwm-muted">Đang tải...</p></div>}>
                    <Outlet />
                </Suspense>
            </main>
            <SiteFooter></SiteFooter>
        </div>
    );
}

export default Layout;