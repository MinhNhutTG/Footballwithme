import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { verifyEmail } from '../api/auth';
function VerifyEmail() {
    const { token } = useParams();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    useEffect(() => {
        verifyEmail(token)
            .then((res) => {
                setMessage(res.message);
                setStatus('success');
            })
            .catch((err) => {
                setMessage(err.message);
                setStatus('error');
            });
    }, [token]);

    return (
        <section className="mx-auto max-w-sm px-4 py-20 text-center">
            <div className="font-head text-2xl font-black text-fwm-text">Xác thực email</div>
            {status === 'loading' && <p className="mt-6 text-fwm-muted"> Đang xác thực...</p>}
            {status === 'success' && <p className="mt-6 text-emerald-400">{message}</p>}
            {status === 'error' && <p className="mt-6 text-fwm-pink">{message}</p>}
            <p className="mt-6 text-sm text-fwm-muted">
                <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
                    Về trang đăng nhập
                </Link>
            </p>
        </section>
    );
}

export default VerifyEmail;