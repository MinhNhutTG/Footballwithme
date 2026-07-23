const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(path, {method = 'GET',body,token} = {}) {
    const res = await fetch(`${BASE_URL}${path}`,{
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? {Authorization: `Bearer ${token}`} : '')
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(()=> null);
    if (!res.ok){
       throw new Error(data?.message || 'Request failed');
    }
    return data;
}

// viet function apiRequest de tai su dung 
// input path va {method,body,token} 
// res fetch api voi path vaf gui len goi gom method , header gom content-type, va token xac minh,
// sau do gui body { gom cac bien ...}
// lay data ve va tra lai
