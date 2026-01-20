// Supabase Config Loader
// This script fetches Supabase credentials from the server
// and makes them available globally

(async function () {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        window.SUPABASE_CONFIG = config;
    } catch (error) {
        console.error('Failed to load Supabase config:', error);
        // Fallback to hardcoded values for local development
        window.SUPABASE_CONFIG = {
            supabaseUrl: 'https://vyspmhrbgaxvmkaqrrfo.supabase.co',
            supabaseAnonKey: ''
        };
    }
})();
