import { fetchAllComments, deleteComment } from '../../api/comments'
import { useEffect, useState } from 'react'

function CommentsPanel({ token }) {
    const [comments, setComments] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetchAllComments(page, 20, token)
            .then((res) => {
                setComments(res.data);
                setPages(res.pages);
                setTotal(res.total);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [page, token])

    const handleDelete = async (id) => {
        setError('');
        try {
            await deleteComment(id, token);
            setComments((prev) => prev.filter((c) => c._id !== id));
            setTotal((t) => t - 1);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">Bình luận</h1>
                <span className="text-sm text-fwm-muted">{total}</span>
            </div>
            {error && <p className="mb-4 text-sm text-fwm-pink">{error}</p>}

            {loading ? <p className="text-fwm-muted">...</p> :
                comments.length === 0 ? (<p className="text-fwm-muted">Chưa có bình luận nào.</p>) : (
                    <div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-fwm-line text-left">
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Nội dung</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Tác giả</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Bài viết</th>
                                    <th className="pb-2 font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Thời gian</th>
                                    <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comments.map((c) => (
                                    <tr key={c._id} className="border-b border-fwm-line last:border-0">
                                        <td className="max-w-xs py-3 pr-4 text-sm text-fwm-text">
                                            <span className="line-clamp-2" title={c.text}>{c.text}</span>
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">{c.author?.name || '(đã xoá)'}</td>
                                        <td className="py-3 pr-4 text-sm">
                                            {c.postTitle ? (
                                                <a href={`/bai-viet/${c.postId}`} target="_blank" rel="noopener noreferrer" className="text-fwm-accent hover:underline">
                                                    {c.postTitle}
                                                </a>
                                            ) : (
                                                <span className="text-fwm-muted">(bài viết đã xoá)</span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-sm text-fwm-muted">
                                            {new Date(c.createdAt).toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button type="button" onClick={() => handleDelete(c._id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                                Xoá
                                            </button>
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
                            >Trước</button>
                            <span className="text-xs text-fwm-muted">Trang {page}/{pages}</span>
                            <button
                                type="button"
                                disabled={page >= pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-fwm-pill border border-fwm-line px-4 py-2 text-xs font-bold text-fwm-text disabled:cursor-not-allowed disabled:opacity-40"
                            >Sau</button>
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default CommentsPanel;
