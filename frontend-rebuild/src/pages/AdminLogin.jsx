import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
function AdminLogin() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(email, password);
            
            if (user.role !== 'admin') {
                setError('Tài khoản này không có quyền quản trị.');
                return;
            }
            navigate('/admin')
        }
        catch {
            setError('Email hoặc mật khẩu không đúng.');
        }
    }
    return (
        <section className="mx-auto max-w-sm px-4 py-20">
            <h1 className="font-head text-2xl font-black text-fwm-text">Đăng nhập quản trị</h1>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                        Tên đăng nhập / Email
                    </label>
                    <input
                        required
                        type="text"
                        value={email}
                        autoComplete="username"
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    ></input>
                </div>

                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
                        Mật khẩu
                    </label>
                    <input
                        required
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    ></input>
                </div>
                {error && <p className="text-sm text-fwm-pink">{error}</p>}
                <Button type="submit" variant="primary" className="w-full" >Đăng nhập</Button>
            </form>
        </section>
    )
}

export default AdminLogin;