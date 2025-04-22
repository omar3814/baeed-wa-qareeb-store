<script lang="ts">
    // --- IMPORTS ---
	// Make sure the path to your global CSS file is correct
	import '../app.css'; // Or '../app.pcss' if you are using that

	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import AdminIcon from '$lib/components/AdminIcon.svelte';

    // --- LIFECYCLE FUNCTION ---
	// onMount runs only in the browser after the component is first added
	onMount(() => {
		// Log message to confirm this code block is reached
		console.log('[Root Layout] Component Mounted');

		// Attempt to get the current session when the layout loads
		supabase.auth.getSession().then(({ data: { session } }) => {
			// Log the session found (or null)
			console.log('[Root Layout] Initial Supabase Session:', session);
			// Update the Svelte store with the session status
			authStore.set(session);
		}).catch(error => {
            // Log any error during initial session check
            console.error('[Root Layout] Error getting initial session:', error);
        });

		// Set up the listener for real-time authentication changes (login, logout)
		const { data: authListener } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				// Log the type of event and the resulting session
				console.log('[Root Layout] Supabase Auth State Changed:', _event, session);
				// Update the Svelte store whenever the auth state changes
				authStore.set(session);
			}
		);

        // Log that the listener was set up
        console.log('[Root Layout] Auth state change listener attached.');

		// Cleanup function: This runs when the layout component is destroyed
		// It's crucial to prevent memory leaks by removing the listener
		return () => {
            console.log('[Root Layout] Unsubscribing from auth changes.'); // Log cleanup
			authListener?.unsubscribe();
		};
	});

    // Log message to show the script block itself was processed
    console.log('[Root Layout] Script block processed');

</script>

<!-- HTML Structure -->
<div class="min-h-screen bg-black text-gray-200 font-sans">

	<!-- Admin Icon: Show only if logged in ($authStore has a value) -->
	{#if $authStore}
		<AdminIcon />
	{/if}

	<!-- Main content area -->
	<main class="container mx-auto px-4 py-8">
		<slot /> <!-- Page content goes here -->
	</main>

	<!-- Footer will be added here later -->

</div>

<!-- CSS Styles -->
<style>
	/* Import an Arabic font from Google Fonts */
	@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');

	/* Apply global styles using the :global() modifier */
	:global(html) {
		direction: rtl; /* Set text direction to Right-to-Left */
		scroll-behavior: smooth;
	}

	:global(body) {
		font-family: 'Tajawal', sans-serif; /* Apply the Arabic font globally */
		/* Tailwind handles the background/text color via the @apply in app.css/app.pcss */
	}

	/* Basic glowing effect class we can reuse later */
	.glow-effect {
		transition: all 0.3s ease-in-out;
		box-shadow: 0 0 5px rgba(255, 255, 255, 0.3), 0 0 10px rgba(255, 255, 255, 0.2),
			0 0 15px rgba(255, 255, 255, 0.1);
	}
	.glow-effect:hover {
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.4),
			0 0 30px rgba(255, 255, 255, 0.3);
	}
</style>