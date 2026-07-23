import { fetchUsers, updateUserRole, deleteUser } from '../../api/users'
import { useEffect, useState, useMemo } from 'react'
import { useLang } from '../../context/LangContext'
import SortHeader from './SortableHeader'

function UsersPanel({ token, currentUserId }) {
    const { lang, t } = useLang();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [sort, setSort] = useState({key: null, dir: 'asc'});

    const toglleSort = (key)=> setSort((s)=> ({key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc'}));

    useEffect(() => {
        fetchUsers(token)
            .then(setUsers)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [token])

    const visibleUsers = useMemo(()=>{
        const q = search.trim().toLowerCase();
        let list =  users.filter((u)=>{
            if (roleFilter !== 'all' && u.role !== roleFilter) return false;
            if (!q) return true;
            return `${u.name} ${u.email}`.toLowerCase().includes(q);
        })
        if (sort.key){
            list = [...list].sort((a,b)=>{
                let av = a[sort.key];
                let bv = b[sort.key];
                if (sort.key === 'createdAt'){
                    av = new Date(av).getTime();
                    bv = new Date(bv).getTime();
                    return sort.dir === 'asc' ? av - bv : bv- av;
                }
                const cmp = String(av).localeCompare(String(bv))
                return sort.dir === 'asc' ? cmp : -cmp;
            });
        }
        return list;
    },[users, search, roleFilter, sort])

    const handleRoleChange = async (id, role) => {
        try{
            const updated = await updateUserRole(id, role, token);
            setUsers((prev)=>  prev.map((u)=> (u._id === id ? updated : u)));
        }
        catch(err){
            setError(err.message);
        }
    }

    const handleDelete = async(id) => {
        try{
            await deleteUser(id, token);
            setUsers((prev)=> prev.filter((u)=> u._id !== id ));
        }
        catch(err){
            setError(err.message);
        }
    }

    return (
        <div>
            <div className="mb-5 flex items-center justify-between">
                <h1 className="font-head text-2xl font-black text-fwm-text">{t.admin.usersHeading}</h1>
            </div>
            {error && <p className="mb-4 text-sm text-fwm-pink">{error} </p>}

            {loading ? <p className="text-fwm-muted">...</p> :
                visibleUsers.length === 0 ? (<p className="text-fwm-muted">{t.admin.usersEmpty} </p>) :
                    (<div>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                            <input type="search" placeholder="Tìm tên/email..." className="flex-1 ..." value={search} onChange={(e)=> setSearch(e.target.value)} />
                            <select className="..." value={roleFilter} onChange={(e)=> setRoleFilter(e.target.value)} className="rounded-fwm border border-fwm-line bg-fwm-card-2 px-4 py-2.5 text-sm text-fwm-text focus:border-fwm-accent focus:outline-none">
                                <option value="all">{t.admin.filterAllRoles}</option>
                                <option value="user">{t.admin.roleUser}</option>
                                <option value="admin">{t.admin.roleAdmin}</option>
                            </select>
                        </div>

                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-fwm-line text-left">
                                    <SortHeader label={t.admin.colName} sortKey="name" sort={sort} onSort={toglleSort} ></SortHeader>
                                    <SortHeader label={t.admin.colEmail} sortKey="email" sort={sort} onSort={toglleSort} ></SortHeader>
                                    <SortHeader label={t.admin.colRole} sortKey="role" sort={sort} onSort={toglleSort} ></SortHeader>
                                    <SortHeader label={t.admin.colJoined} sortKey="createdAt" sort={sort} onSort={toglleSort} ></SortHeader>
                                    <th className="pb-2 text-right font-head text-xs font-bold uppercase tracking-wide text-fwm-muted">{t.admin.colActions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleUsers.map((u)=>{
                                    const isSelf = u._id === currentUserId;
                                    return (
                                        <tr key={u._id} className="border-b border-fwm-line last:border-0">
                                            <td className="py-3 pr-4 font-head text-sm font-bold text-fwm-text">
                                                {u.name} {isSelf && <span className="text-fwm-muted">{t.admin.youLabel}</span>}
                                            </td>
                                            <td className="py-3 pr-4 text-sm text-fwm-muted">{u.email}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`rounded-fwm-pill px-2.5 py-1 text-xs font-bold ${u.role === 'admin' ? 'bg-fwm-accent text-fwm-ink' : 'bg-fwm-pill text-fwm-muted'}`}>
                                                    {u.role === 'admin' ? t.admin.roleAdmin: t.admin.roleUser}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-sm text-fwm-muted">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 text-right">
                                                {!isSelf && (
                                                    <>
                                                        <button type="button" onClick={()=> handleRoleChange(u._id, u.role === 'admin' ? 'user': 'admin')} className="mr-3 font-head text-xs font-bold text-fwm-accent hover:underline">
                                                            {u.role === 'admin' ? t.admin.makeUser : t.admin.makeAdmin}
                                                        </button>
                                                        <button type="button" onClick={()=> handleDelete(u._id)} className="font-head text-xs font-bold text-fwm-pink hover:underline">
                                                            {t.admin.deleteUser}
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {/* map users ở đây */}
                            </tbody>
                        </table>
                    </div>)
            }

        </div>
    )
}

export default UsersPanel;