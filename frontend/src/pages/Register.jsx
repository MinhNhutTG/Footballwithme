import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

function Register() {
  const { t } = useLang();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password);
      navigate('/');
    } catch {
      setError(t.auth.errorRegister);
    }
  };

  return (
    <section className="mx-auto max-w-sm px-4 py-20">
      <h1 className="font-head text-2xl font-black text-fwm-text">{t.auth.registerHeading}</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.name}
          </label>
          <input
            required
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.email}
          </label>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">
            {t.auth.password}
          </label>
          <input
            required
            type="password"
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-fwm-pink">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">
          {t.auth.submitRegister}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fwm-muted">
        {t.auth.hasAccount}{' '}
        <Link to="/dang-nhap" className="font-bold text-fwm-accent hover:underline">
          {t.auth.goLogin}
        </Link>
      </p>
    </section>
  );
}

export default Register;
