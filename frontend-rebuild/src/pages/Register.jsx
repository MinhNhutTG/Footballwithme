import { useState } from "react";
import Button from '../components/ui/Button'
import { Link,useNavigate } from 'react-router-dom'
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import GoogleButton from "../components/auth/GoogleButton";


function Register() {
    const {t} = useLang();
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSumit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await register(name, email, password);
            setMessage(res.message);
        }
        catch {
            setError(t.auth.errorRegister);
        }
    }
    return (
        <section className="mx-auto max-w-sm px-4 py-20">
            <h1 className="font-head text-2xl font-black text-fwm-text">
                {t.auth.registerHeading}
            </h1>
            <form className="mt-8 space-y-4" onSubmit={handleSumit}>

                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted" >{t.auth.name}</label>
                    <input
                        required
                        type="text"
                        value={name}
                        autoComplete="name"
                        onChange={(e) => { setName(e.target.value) }}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    >
                    </input>
                </div>

                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted" >{t.auth.email}</label>
                    <input
                        required
                        type="email"
                        value={email}
                        autoComplete="email"
                        onChange={(e) => { setEmail(e.target.value) }}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    >
                    </input>
                </div>

                 <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted" >{t.auth.password}</label>
                    <input
                        minLength={6}
                        required
                        type="password"
                        value={password}
                        autoComplete="new-password"
                        onChange={(e) => { setPassword(e.target.value) }}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    >
                    </input>
                </div>

                {error && <p className="text-sm text-fwm-pink"> {error} </p>}
                {message && <p className="text-sm text-emerald-400">{message}</p>}

                <Button variant="primary" className="w-full" type="submit">
                    {t.auth.submitRegister}
                </Button>
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
                {t.auth.hasAccount} {'  '}
                <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
                    {t.auth.goLogin}
                </Link>
            </p>
        </section>
    )
}

export default Register;