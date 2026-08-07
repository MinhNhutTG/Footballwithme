import { useEffect, useState } from 'react'
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fetchAnalytics } from '../../api/analytics'
import { useLang } from '../../context/LangContext'
import { useCategories } from '../../context/CategoryContext'
import { REACTIONS } from '../../config/reactions'

const REACTION_COLORS = { like: '#34d399', dislike: '#f87171', haha: '#fbbf24', angry: '#fb7185' };
const CATEGORY_COLORS = { skill: '#f59e0b', tactic: '#6366f1', exp: '#14b8a6', player: '#ec4899' };
const FALLBACK_PALETTE = ['#eab308', '#0ea5e9', '#a855f7', '#22c55e', '#f97316', '#06b6d4'];
function colorForCategory(slug, index) {
    return CATEGORY_COLORS[slug] || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-fwm-muted">{label}</p>
            <p className="mt-1 font-head text-2xl font-black text-fwm-text">{value}</p>
        </div>
    );
}

function AnalyticsPanel({ token }) {
    const { t, lang } = useLang();
    const { categories } = useCategories();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchAnalytics(token)
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <p className="text-fwm-muted">...</p>;
    if (error) return <p className="text-sm text-fwm-pink">{error}</p>;
    if (!data) return null;

    const categoryData = Object.entries(data.categoryCounts).map(([id, count], index) => ({
        id, count,
        label: categories.find((c) => c.slug === id)?.label[lang] || id,
        color: colorForCategory(id, index),
    }));

    const reactionData = REACTIONS.map((r) => ({
        type: r.type, label: r.label, count: data.reactionCounts[r.type] || 0,
    }));

    const trafficData = data.traffic.map((d) => ({
        ...d, label: d.date.slice(5).split('-').reverse().join('/'),
    }));

    return (
        <div>
            <h1 className="mb-5 font-head text-2xl font-black text-fwm-text">{t.admin.analyticsHeading}</h1>

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label={t.admin.statPosts} value={data.totals.posts} />
                <StatCard label={t.admin.statUsers} value={data.totals.users} />
                <StatCard label={t.admin.statViews} value={data.totals.views} />
                <StatCard label={t.admin.statComments} value={data.totals.comments} />
            </div>

            <div className="mb-6 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.chartTrafficTitle}</h2>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={trafficData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-fwm-line)" />
                        <XAxis dataKey="label" stroke="var(--color-fwm-muted)" fontSize={12} />
                        <YAxis allowDecimals={false} stroke="var(--color-fwm-muted)" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ffd93d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                    <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.chartCategoryTitle}</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={categoryData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-fwm-line)" />
                            <XAxis type="number" allowDecimals={false} stroke="var(--color-fwm-muted)" fontSize={12} />
                            <YAxis type="category" dataKey="label" stroke="var(--color-fwm-muted)" fontSize={12} width={90} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                {categoryData.map((c) => (
                                    <Cell key={c.id} fill={c.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                    <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.chartReactionTitle}</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={reactionData} dataKey="count" nameKey="label" innerRadius={40} outerRadius={80}>
                                {reactionData.map((r) => (
                                    <Cell key={r.type} fill={REACTION_COLORS[r.type]} />
                                ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
                <h2 className="mb-3 font-head text-sm font-bold text-fwm-text">{t.admin.topPostsTitle}</h2>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-fwm-line text-left">
                            <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colTitle}</th>
                            <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colViews}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.topPosts.map((p) => (
                            <tr key={p._id} className="border-b border-fwm-line last:border-0">
                                <td className="py-3 pr-4 text-sm text-fwm-text">{p.title[lang]}</td>
                                <td className="py-3 text-right text-sm text-fwm-muted">{p.views}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AnalyticsPanel;
