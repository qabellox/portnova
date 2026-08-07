const { supabase } = require('../utils/supabase');

const tableName = 'users';

const applyFilters = (query, filters = {}) => {
    if (filters.id) {
        query = query.eq('id', filters.id);
    }

    if (filters.email) {
        query = query.eq('email', filters.email);
    }

    if (filters.role) {
        query = query.eq('role', filters.role);
    }

    if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
    }

    if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    return query;
};

const User = {
    async findById(id) {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();

        if (error) {
            throw error;
        }

        return data;
    },

    async findByEmail(email) {
        const { data, error } = await supabase.from(tableName).select('*').eq('email', email).maybeSingle();

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
            full_name: data.full_name || data.fullName,
            email: data.email,
            password_hash: data.password_hash || 'supabase-auth-managed',
            role: data.role || 'youth',
            is_active: data.is_active !== undefined ? data.is_active : true,
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

module.exports = User;