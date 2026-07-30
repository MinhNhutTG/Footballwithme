import { useState } from "react";
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import Button from "../components/ui/Button";
import GoogleButton from "../components/auth/GoogleButton";

function Login() {
    const { t } = useLang();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassWord] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/');
        }
        catch {
            setError(t.auth.errorLogin);
        }
    }

    return (
        <section className="mx-auto max-w-sm px-4 py-20">
            <div className="font-head text-2xl font-black text-fwm-text">{t.auth.loginHeading}</div>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit} >
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.auth.email}</label>
                    <input
                        required
                        type="text"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    ></input>
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.auth.password}</label>
                    <input
                        required
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassWord(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    ></input>
                </div>
                <p className="text-right text-xs">
                    <Link to="/quen-mat-khau" className="font-bold text-fwm-accent hover:underline">
                        Quên mật khẩu?
                    </Link>
                </p>

                {error && <p className="text-sm text-fwm-pink">{error}</p>}
                <Button type="submit" variant="primary" className="w-full">{t.auth.submitLogin}</Button>
            </form>
            <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-fwm-line" />
                <span className="text-xs text-fwm-muted">hoặc</span>
                <div className="h-px flex-1 bg-fwm-line" />
            </div>
            <div className="mt-4">
                <GoogleButton onSuccess={() => navigate('/')} onError={setError} />
            </div>
            <p className="mt-6 text-center text-sm text-fwm-muted">
                {t.auth.noAccount}{' '}
                <Link to="/dang-ky" className="font-bold text-fwm-accent hover:underline">
                    {t.auth.goRegister}
                </Link>
            </p>
        </section>
    )

}

export default Login;