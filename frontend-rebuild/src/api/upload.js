
const BASE_URL = import.meta.env.VITE_API_URL ||  'http://localhost:5000/api';

export async function uploadFile(file, token){
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/uploads`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`},
        body: formData,
    });
    if (!res.ok) throw new Error('Upload thất bại');
    return res.json();
}