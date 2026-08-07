const { supabase } = require('../utils/supabase');

const tableName = 'jobs';

const applyFilters = (query, filters = {}) => {
    if (filters.id) {
        query = query.eq('id', filters.id);
    }

    if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
    }

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.job_type) {
        query = query.eq('job_type', filters.job_type);
    }

    if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,requirements.ilike.%${filters.search}%`);
    }

    return query;
};

const Job = {
    async findById(id) {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();

        if (error) {
            throw error;
        }

        return data;
    },

    async findAll(filters = {}) {
        let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
        query = applyFilters(query, filters);

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return data;
    },

    async create(data) {
        const payload = {
            company_id: data.company_id,
            title: data.title,
            location: data.location || null,
            job_type: data.job_type || null,
            salary_min: data.salary_min ?? null,
            salary_max: data.salary_max ?? null,
            description: data.description,
            requirements: data.requirements || null,
            status: data.status || 'draft',
            published_at: data.published_at || null,
        };

        const { data: created, error } = await supabase.from(tableName).insert(payload).select('*').single();

        if (error) {
            throw error;
        }

        return created;
    },

    async update(id, updates) {
        const payload = {
            ...updates,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select('*').single();

        if (error) {
            throw error;
        }

        return data;
    },

    async delete(id) {
        const { data, error } = await supabase.from(tableName).delete().eq('id', id).select('*').single();

        if (error) {
            throw error;
        }

        return data;
    },
};

module.exports = Job;