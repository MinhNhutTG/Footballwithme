const cloudinary = require('../config/cloudinary')

exports.uploadFile = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Chưa chọn file' });

        const resourceType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: resourceType, folder: 'footballwithme' },
                (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
            );
            stream.end(req.file.buffer);
        });
        res.json({ url: result.secure_url, resourceType });
    }
    catch (err) {
        next(err);
    }
}