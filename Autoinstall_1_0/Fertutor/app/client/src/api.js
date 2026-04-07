import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

export const uploadProfileImage = async (file) => {
    const formData = new FormData();
    formData.append('profileImage', file);

    const response = await api.post('/profile/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data;
};

export const deleteProfileImage = async () => {
    const response = await api.delete('/profile/delete-image');
    return response.data;
};

export const getImageUrl = (filename) => {
    if (!filename) return null;
    return `/uploads/profiles/${filename}`;
};

export default api;