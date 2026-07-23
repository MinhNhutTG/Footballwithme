import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 text-center">
      <h1 className="font-head text-4xl font-black text-fwm-accent">404</h1>
      <p className="mt-3 text-fwm-muted">Trang này chưa sẵn sàng hoặc không tồn tại.</p>
      <Link to="/" className="mt-6 inline-flex rounded-fwm-pill bg-fwm-accent px-5 py-2.5 font-head text-sm font-bold text-fwm-ink">
        Về trang chủ
      </Link>
    </section>
  );
}

export default NotFound;