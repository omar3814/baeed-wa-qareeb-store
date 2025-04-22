// === Code for src/routes/+layout.ts ===
import { supabase } from '$lib/supabaseClient'; // Assuming supabaseClient is set up correctly
import type { LayoutLoad } from './$types';
import type { SiteSettings } from '$lib/types'; // Import your SiteSettings type

export const load: LayoutLoad = async () => {
	console.log('[Root Layout Load] Fetching site settings...');
	try {
		// Fetch the single row of site settings
		const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .limit(1)
            .single();

		// Handle potential errors (ignoring if no row found initially)
		if (error && error.code !== 'PGRST116') {
			console.error('[Root Layout Load] Error fetching site settings:', error);
            // Return default/empty settings on error
			return { siteSettings: {} as Partial<SiteSettings> };
		}

        console.log('[Root Layout Load] Site settings fetched:', data);
		// Return the fetched data (or an empty object if null)
        // The 'data' object returned here will be available in +layout.svelte
		return {
			siteSettings: (data || {}) as Partial<SiteSettings>
		};

	} catch (err) {
		console.error('[Root Layout Load] Unexpected error fetching settings:', err);
		return {
			siteSettings: {} as Partial<SiteSettings> // Return empty object on unexpected error
		};
	}
};

// Enable SSR for the layout itself if you want the header data pre-rendered
// export const ssr = true;
// Or keep it false if you prefer full client-side rendering (might cause flicker)
export const ssr = false; // Let's keep SSR off for simplicity now