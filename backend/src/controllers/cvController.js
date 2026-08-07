const path = require('path');
const multer = require('multer');
const CVRequest = require('../models/CVRequest');
const { supabase } = require('../utils/supabase');
const User = require('../models/User');

const upload = multer({ storage: multer.memoryStorage() });

const safeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const getUserRole = (user) => user?.user_metadata?.role || user?.app_metadata?.role || 'youth';

const getUserFullName = (user) => user?.user_metadata?.fullName || user?.email || 'User';

const getEffectiveUserId = (req) => req.user?.id;

const getLocalUser = async (req) => {
    const profile = await User.findByEmail(req.user.email);

    if (!profile) {
        throw Object.assign(new Error('Local user profile not found'), { status: 404 });
    }

    return profile;
};

const listRequests = async (req, res, next) => {
    try {
        const role = getUserRole(req.user);
        const filters = { ...req.query };
        const localUser = await getLocalUser(req);

        if (role === 'youth') {
            filters.user_id = localUser.id;
        }

        if (role === 'expert') {
            filters.assigned_expert_id = localUser.id;
        }

        const requests = await CVRequest.findAll(filters);
        res.json({ success: true, data: requests });
    } catch (error) {
        next(error);
    }
};

const getRequest = async (req, res, next) => {
    try {
        const request = await CVRequest.findById(req.params.id);
        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

const createRequest = async (req, res, next) => {
    try {
        const localUser = await getLocalUser(req);
        const request = await CVRequest.create({
            ...req.body,
            user_id: localUser.id,
        });
        res.status(201).json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

const updateRequest = async (req, res, next) => {
    try {
        const request = await CVRequest.update(req.params.id, req.body);
        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

const deleteRequest = async (req, res, next) => {
    try {
        const request = await CVRequest.delete(req.params.id);
        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

const uploadCv = [
    upload.single('cvFile'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'CV file is required' });
            }

            const localUser = await getLocalUser(req);

            const fileExtension = path.extname(req.file.originalname) || '.pdf';
            const fileName = `${localUser.id}/${Date.now()}_${safeFileName(req.file.originalname)}${fileExtension}`;

            const { error: storageError } = await supabase.storage
                .from('cvs')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false,
                });

            if (storageError) {
                throw storageError;
            }

            const { data: publicUrlData } = supabase.storage.from('cvs').getPublicUrl(fileName);

            const request = await CVRequest.create({
                user_id: localUser.id,
                status: 'pending',
                notes: req.body.notes || null,
                cv_url: publicUrlData.publicUrl,
                request_type: 'upload',
                requester_name: getUserFullName(req.user),
            });

            res.status(201).json({ success: true, data: request });
        } catch (error) {
            next(error);
        }
    },
];

const myRequests = async (req, res, next) => {
    try {
        const localUser = await getLocalUser(req);
        const requests = await CVRequest.findAll({ user_id: localUser.id });
        res.json({ success: true, data: requests });
    } catch (error) {
        next(error);
    }
};

const pendingRequests = async (req, res, next) => {
    try {
        const requests = await CVRequest.findAll({ status: 'pending' });
        res.json({ success: true, data: requests });
    } catch (error) {
        next(error);
    }
};

const assignSelf = async (req, res, next) => {
    try {
        const localUser = await getLocalUser(req);
        const request = await CVRequest.update(req.params.cvId, {
            status: 'assigned',
            assigned_expert_id: localUser.id,
            assigned_expert_name: getUserFullName(req.user),
            assigned_at: new Date().toISOString(),
        });

        res.json({ success: true, data: request });
    } catch (error) {
        next(error);
    }
};

const formatCv = [
    upload.single('formattedCv'),
    async (req, res, next) => {
        try {
            const request = await CVRequest.findById(req.params.cvId);

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Formatted CV file is required' });
            }

            const localUser = await getLocalUser(req);

            const fileExtension = path.extname(req.file.originalname) || '.pdf';
            const fileName = `${request.user_id}/formatted_${Date.now()}_${safeFileName(req.file.originalname)}${fileExtension}`;

            const { error: storageError } = await supabase.storage
                .from('cvs')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false,
                });

            if (storageError) {
                throw storageError;
            }

            const { data: publicUrlData } = supabase.storage.from('cvs').getPublicUrl(fileName);

            const updated = await CVRequest.update(req.params.cvId, {
                status: 'completed',
                formatted_cv_url: publicUrlData.publicUrl,
                delivered_at: new Date().toISOString(),
                assigned_expert_id: localUser.id,
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    },
];

module.exports = {
    listRequests,
    getRequest,
    createRequest,
    updateRequest,
    deleteRequest,
    uploadCv,
    myRequests,
    pendingRequests,
    assignSelf,
    formatCv,
};