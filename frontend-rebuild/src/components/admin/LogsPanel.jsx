import { fetchLogs } from '../../api/logs'
import { useEffect, useState } from 'react'
import { useLang } from '../../context/LangContext'

function LogsPanel({ token }) {
    const { t } = useLang();
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetchLogs(page, 20, token)
            .then((res) => {
                setLogs(res.data);
                setPages(res.pages);
                setTotal(res.total);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [page, token])

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">{t.admin.logsHeading}</h1>
                <span className="text-sm text-fwm-muted">{total}</span>
            </div>
            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

            {loading ? <p className="text-fwm-muted">...</p> :
                logs.length === 0 ? (<p className="text-fwm-muted">{t.admin.logsEmpty}</p>) : (
                    <div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-fwm-line text-left">
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colPath}</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colVisitor}</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colTime}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log._id} className="border-b border-fwm-line last:border-0">
                                        <td className="py-3 pr-4 text-sm text-fwm-text">{log.path}</td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">
                                            {log.user ? log.user.name : t.admin.anonymousLabel}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 flex items-center justify-between">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="rounded-fwm-pill border border-fwm-line px-4 py-2 text-xs font-bold text-fwm-text disabled:cursor-not-allowed disabled:opacity-40"
                            >{t.admin.prevPage}</button>
                            <span className="text-xs text-fwm-muted">{t.admin.pagePrefix} {page}/{pages}</span>
                            <button
                                type="button"
                                disabled={page >= pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-fwm-pill border border-fwm-line px-4 py-2 text-xs font-bold text-fwm-text disabled:cursor-not-allowed disabled:opacity-40"
                            >{t.admin.nextPage}</button>
                        </div>
                    </div>
                )
            }

        </div>
    )
}

export default LogsPanel;
