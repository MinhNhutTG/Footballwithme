import { useState } from "react";
import {useLang} from '../context/LangContext'
import Button from '../components/ui/Button'
import { sendContactMessage } from '../api/contact'

function Contact() {
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const {t} = useLang();
    const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setError('');
        try {
            await sendContactMessage(form);
            setSent(true);
        } catch (err) {
            setError(err.message || t.contact.error);
        } finally {
            setSending(false);
        }
    }
    if (sent) {
        return (
            <section className="mx-auto max-w-xl px-4 py-24 text-center">
                <span className="text-4xl">✅</span>
                <h1 className="mt-4 font-head text-2xl font-black text-fwm-text">{t.contact.successTitle}</h1>
                <p className="mt-2 text-fwm-muted">{t.contact.successDesc}</p>
                <Button to="/" variant="primary" className="mt-6 inline-flex">{t.contact.backHome}</Button>
            </section>
        );
    }
    return (
        <section className="mx-auto max-w-xl px-4 py-16">
            <h1 className="font-head text-3xl font-black text-fwm-text">{t.contact.heading}</h1>
            <p className="mt-3 text-fwm-muted">{t.contact.desc}</p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.name}</label>
                    <input required value={form.name} onChange={handleChange('name')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.email}</label>
                    <input required type="email" value={form.email} onChange={handleChange('email')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                <div>
                    <label className="mb-1.5 block font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.contact.message}</label>
                    <textarea required rows={5} value={form.message} onChange={handleChange('message')}
                        className="w-full rounded-fwm border border-fwm-line bg-fwm-card px-4 py-3 text-fwm-text focus:border-fwm-accent focus:outline-none" />
                </div>
                {error && <p className="text-sm text-fwm-pink">{error}</p>}
                <Button type="submit" variant="primary" className="w-full" disabled={sending}>
                    {sending ? t.contact.sending : t.contact.send}
                </Button>
            </form>
        </section>
    );
}

export default Contact;