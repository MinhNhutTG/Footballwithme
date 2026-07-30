import { useState } from "react";
import Button from "../components/ui/Button";
import { resetPassword } from "../api/auth";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";

function ResetPassword(){
    const {token} = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setError('');
        setLoading(true);
        try{
            await resetPassword(token, password);
            navigate('/dang-nhap');
        }
        catch(err){
            setError(err.message);
        }
        finally{
            setLoading(false);
        }
    }
    return (
        <section className="mx-auto max-w-sm px-4 py-20">
            <div className="font-head text-2xl font-black text-fwm-text">Đặt lại mật khẩu</div>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Mật khẩu mới</label>
                    <input 
                        required
                        type="password"
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e)=> setPassword(e.target.value)}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
                    ></input>
                </div>
                 {error && <p className="text-sm text-fwm-pink">{error}</p>}
                 <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
                 </Button>
            </form>
            <p className="mt-6 text-center text-sm text-fwm-muted">
                <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
                    Quay lại đăng nhập
                </Link>
            </p>
        </section>
    )
}

export default ResetPassword;