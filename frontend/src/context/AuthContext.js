import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadSession = async () => {
            const { data, error } = await supabase.auth.getSession();

            if (!mounted) {
                return;
            }

            if (!error) {
                setSession(data.session ?? null);
            }

            setLoading(false);
        };

        loadSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (mounted) {
                setSession(nextSession);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    const register = async ({ email, password, fullName, role }) =>
        supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    fullName,
                    role,
                },
            },
        });

    const login = async ({ email, password }) => supabase.auth.signInWithPassword({ email, password });

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = useMemo(() => {
        // Roles are FIXED at registration (a provider cannot become a seeker
        // without creating a new account). Legacy role names are mapped to the
        // two public types so nothing breaks.
        const rawRole = session?.user?.user_metadata?.role;
        const role =
            { youth: 'seeker', seeker: 'seeker', company: 'provider', provider: 'provider', expert: 'provider' }[rawRole] ||
            'seeker';
        return {
            session,
            user: session?.user ?? null,
            role,
            isProvider: role === 'provider',
            loading,
            register,
            login,
            logout,
        };
    }, [session, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};