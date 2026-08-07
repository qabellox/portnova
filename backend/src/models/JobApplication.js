const { supabase } = require('../utils/supabase');

const tableName = 'job_applications';

const JobApplication = {
    async findById(id) {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    async findAll(filters = {}) {
        let query = supabase.from(tableName).select('*').order('applied_at', { ascending: false });
        if (filters.job_id) query = query.eq('job_id', filters.job_id);
        if (filters.user_id) query = query.eq('user_id', filters.user_id);
        if (filters.status) query = query.eq('status', filters.status);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async create(data) {
        const { data: created, error } = await supabase.from(tableName).insert(data).select('*').single();
        if (error) throw error;
        return created;
    },

    async update(id, updates) {
        const { data, error } = await supabase.from(tableName).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
        if (error) throw error;
        return data;
    },

    async delete(id) {
        const { data, error } = await supabase.from(tableName).delete().eq('id', id).select('*').single();
        if (error) throw error;
        return data;
    },
};

module.exports = JobApplication;