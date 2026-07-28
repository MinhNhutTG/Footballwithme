import { useLang } from '../../context/LangContext'


function AdminTableRow({ post, onEdit, onDelete }) {
    const { lang, t } = useLang();
    return (
        <tr className="border-b border-fwm-line last:border-0">
            <td className="py-3 pr-4">
                {post.coverImageUrl ? (
                    <img src={post.coverImageUrl} alt="" className="mr-3 inline-block h-8 w-12 rounded-fwm-sm object-cover align-middle" />
                ) : (
                    <span className={`mr-3 inline-block h-8 w-12 rounded-fwm-sm bg-gradient-to-br ${post.gradient} align-middle`} />
                )}

                <span className="font-head text-sm font-bold text-fwm-text">{post.title[lang]}</span>
            </td>
            <td className="py-3 pr-4 text-sm text-fwm-muted">
                {t.categories[post.category]?.label}
            </td>
            <td className="py-3 text-right">
                <button type="button" onClick={() => onEdit(post.id)} className="mr-3 font-head text-xs font-bold text-fwm-accent hover:underline">{t.admin.edit}</button>
                <button type="button" onClick={() => onDelete(post.id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">{t.admin.delete}</button>
            </td>
        </tr>
    )
}

export default AdminTableRow;