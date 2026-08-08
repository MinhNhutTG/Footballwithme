import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPublicUser } from '../api/users';
import SEO from '../components/common/SEO';

function PublicProfile() {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        fetchPublicUser(id)
            .then(setUser)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [id]);

    const initials = user?.name?.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    if (loading) return null;

    if (error || !user) {
        return (
            <section className="mx-auto max-w-md px-4 py-24 text-center">
                <h1 className="font-head text-2xl font-black text-fwm-text">Không tìm thấy người dùng</h1>
                <p className="mt-3 text-fwm-muted">Tài khoản này có thể đã bị xoá.</p>
                <Link to="/" className="mt-6 inline-flex font-head text-sm font-bold text-fwm-accent">Về trang chủ</Link>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-md px-4 py-16 text-center">
            <SEO title={user.name} />
            <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-fwm-accent font-head text-2xl font-black text-fwm-ink">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
            </div>
            <h1 className="mt-4 font-head text-2xl font-black text-fwm-text">{user.name}</h1>
            {user.bio && <p className="mt-2 text-fwm-muted">{user.bio}</p>}
            <p className="mt-4 text-xs text-fwm-muted">Tham gia từ {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
        </section>
    );
}

export default PublicProfile;
