const { supabase } = require('../utils/supabase');

const tableName = 'courses';

const Course = {
    async findById(id) {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },

    async findAll(filters = {}) {
        let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
        if (filters.category) query = query.eq('category', filters.category);
        if (filters.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
        if (filters.level) query = query.eq('level', filters.level);
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

module.exports = Course;