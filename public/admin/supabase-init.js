// Shared Supabase Configuration Loader for Admin Pages
// This script must be included BEFORE any Supabase operations

let SUPABASE_CONFIG = null;
let supabaseClient = null;

async function initSupabase() {
    if (SUPABASE_CONFIG) return supabaseClient;

    try {
        // Fetch config from server
        const response = await fetch('/api/config');
        SUPABASE_CONFIG = await response.json();

        // Create Supabase client
        const { createClient } = supabase;
        supabaseClient = createClient(
            SUPABASE_CONFIG.supabaseUrl,
            SUPABASE_CONFIG.supabaseAnonKey
        );

        return supabaseClient;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return null;
    }
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initSupabase();
});
