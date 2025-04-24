<!-- === Code for src/routes/+layout.svelte (Corrected Comment on Line 105) === -->
<script lang="ts">
	// --- IMPORTS ---
	import '../app.css'; // Your global styles
	import { supabase } from '$lib/supabaseClient';
	import { onMount, onDestroy } from 'svelte';
	import { authStore } from '$lib/stores/authStore';
	import AdminIcon from '$lib/components/AdminIcon.svelte';
	import LoginIcon from '$lib/components/LoginIcon.svelte';
	import BasketIcon from '$lib/components/BasketIcon.svelte';
    import BasketView from '$lib/components/BasketView.svelte';
	import type { LayoutData } from './$types';

    // ---> QUICK VIEW MODAL IMPORT <--- (Standard Comment)
    import QuickViewModal from '$lib/components/QuickViewModal.svelte';

	// --- PROPS & STATE ---
	export let data: LayoutData;
	$: siteSettings = data.siteSettings as Partial<import('$lib/types').SiteSettings & { logo_image_url?: string | null }> || {};

    let showBasket = false;
    let settingsListener: ReturnType<typeof supabase.channel> | null = null;

	// --- LIFECYCLE (Keep your existing onMount/onDestroy) ---
	onMount(() => {
		// Get initial session state
		supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('[Root Layout] Initial Supabase Session:', session);
			authStore.set(session);
		}).catch(error => {
            console.error('[Root Layout] Error getting initial session:', error);
        });

		// Listen for auth changes
		const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('[Root Layout] Supabase Auth State Changed:', _event, session);
			authStore.set(session);
		});

        // Listen for settings changes
        if (settingsListener) supabase.removeChannel(settingsListener).catch(console.error);
        settingsListener = supabase.channel('public:site_settings:layout')
            .on<import('$lib/types').SiteSettings & { logo_image_url?: string | null }>(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: `id=eq.1` },
                (payload) => {
                    console.log('[Root Layout] Realtime settings update received!', payload);
                    data = { ...data, siteSettings: payload.new };
                }
            )
            .subscribe((status, err) => {
                 if (status === 'SUBSCRIBED') console.log('[Root Layout] Settings Realtime subscribed!');
                 if (err) console.error('[Root Layout] Settings Realtime error:', err);
             });

		// Cleanup listeners
		return () => {
            console.log('[Root Layout] Cleaning up listeners.');
			authListener?.unsubscribe();
            if (settingsListener) {
                supabase.removeChannel(settingsListener).catch(console.error);
            }
		};
	});
</script>

<!-- Main Structure -->
<div class="min-h-screen bg-black font-sans text-gray-200">

    <!-- Sticky Header Container -->
    <header class="sticky top-0 z-40 border-b border-purple-900/20 bg-black/80 py-3 shadow-lg backdrop-blur-md animate-fadeIn">
        <div class="container mx-auto flex items-center justify-between px-4">
            <div class="flex basis-1/4 items-center justify-start">
                {#if $authStore} <AdminIcon /> {:else} <LoginIcon /> {/if}
            </div>
            <div class="flex basis-1/2 items-center justify-center gap-x-3">
                {#if siteSettings.logo_image_url}
                    <img src={siteSettings.logo_image_url} alt="{siteSettings.store_name || 'Logo'}" class="h-12 w-auto object-contain md:h-14" loading="lazy"/>
                {/if}
                <h1 class="text-center text-3xl font-bold text-white sm:text-4xl md:text-5xl title-glow">
                    {siteSettings.store_name || 'بعيد وقريب'}
                 </h1>
             </div>
             <div class="flex basis-1/4 items-center justify-end gap-4 md:gap-5">
                 {#if siteSettings.instagram_url} <a href={siteSettings.instagram_url} target="_blank" rel="noopener noreferrer" class="text-gray-400 transition duration-300 hover:scale-110 hover:text-pink-500 social-icon-glow" title="Instagram"> <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" > <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/> </svg> </a> {/if}
				 {#if siteSettings.snapchat_url} <a href={siteSettings.snapchat_url} target="_blank" rel="noopener noreferrer" class="text-gray-400 transition duration-300 hover:scale-110 hover:text-yellow-400 social-icon-glow" title="Snapchat"> <svg class="h-7 w-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"> <path d="M14.5 20.7a19.2 19.2 0 0 1-7 0C4.7 19.4 2.9 16.5 3 13.1c0-2.3 1.2-4.7 3.4-6.3C8.1 5.3 10 4.4 12 4.4c2 0 3.9.9 5.6 2.4 2.2 1.6 3.4 4 3.4 6.3.1 3.4-1.7 6.3-4.5 7.6Z"/> <path d="M14.7 13.3a1.2 1.2 0 0 1-2.4 0c0-.6.5-1.1 1.2-1.1.7 0 1.2.5 1.2 1.1Z"/> <path d="M9.3 13.3a1.2 1.2 0 0 1-2.4 0c0-.6.5-1.1 1.2-1.1.6 0 1.2.5 1.2 1.1Z"/> </svg> </a> {/if}
             </div>
        </div>
    </header>

	<!-- Main content area -->
	<main class="container mx-auto px-4 py-8 pt-10 md:pt-12">
		<slot />
	</main>

    <!-- Basket Icon -->
    <BasketIcon onOpenBasket={() => showBasket = true}/>

    <!-- Basket View Modal -->
    {#if showBasket}
        <BasketView on:close={() => showBasket = false}/>
    {/if}

    <!-- QUICK VIEW MODAL COMPONENT INSTANCE (Comment format corrected) -->
    <QuickViewModal />

</div>

<!-- Styles (Keep your existing styles) -->
<style>
	@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
	:global(html) { direction: rtl; scroll-behavior: smooth; scroll-padding-top: 100px; }
	:global(body) { font-family: 'Tajawal', sans-serif; }
	.glow-effect { transition: all 0.3s ease-in-out; box-shadow: 0 0 5px rgba(255, 255, 255, 0.3), 0 0 10px rgba(255, 255, 255, 0.2), 0 0 15px rgba(255, 255, 255, 0.1); }
	.glow-effect:hover { box-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.4), 0 0 30px rgba(255, 255, 255, 0.3); }
    @keyframes titlePulseGlow { 0%, 100% { text-shadow: 0 0 10px rgba(216, 180, 254, 0.5), 0 0 20px rgba(192, 132, 252, 0.3), 0 0 35px rgba(167, 139, 250, 0.2); } 50% { text-shadow: 0 0 15px rgba(216, 180, 254, 0.7), 0 0 30px rgba(192, 132, 252, 0.45), 0 0 50px rgba(167, 139, 250, 0.3); } }
	.title-glow { animation: titlePulseGlow 5s infinite ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
    .social-icon-glow { filter: drop-shadow(0 0 4px rgba(200, 200, 255, 0.2)); }
	.social-icon-glow:hover { filter: drop-shadow(0 0 8px currentColor); }
</style>