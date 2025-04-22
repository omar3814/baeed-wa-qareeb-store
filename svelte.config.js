// === Code for svelte.config.js (Corrected Import) ===
import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'; // <<< CORRECTED IMPORT PATH

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(), // Uses the imported function

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({ // Use the Netlify adapter
            // Use Netlify Functions (serverless) instead of Edge Functions
            edge: false,
            // Keep as a single function unless needed
            split: false
        }),
        // Ensure SvelteKit knows where to find the .env file
         env: {
             dir: '.', // Look for .env file in the current root directory
             publicPrefix: 'PUBLIC_' // Match the prefix used in your .env file
         }
	}
};

export default config;