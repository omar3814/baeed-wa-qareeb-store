<!-- === Code for src/routes/+page.svelte (Homepage - 2 Column Mobile Grid) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount, onDestroy } from 'svelte';
	import type { Product, SiteSettings } from '$lib/types';
	import ProductCard from '$lib/components/ProductCard.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let products: Product[] = [];
	let siteSettings: Partial<SiteSettings> = {};
	let loadingProducts = true;
	let loadingSettings = true;
	let productError: string | null = null;
	let settingsError: string | null = null;
    let productsChannel: ReturnType<typeof supabase.channel> | null = null;
    let settingsChannel: ReturnType<typeof supabase.channel> | null = null;

	async function loadData() {
		console.log('[Homepage] Loading initial data...');
		productError = null; settingsError = null;
		const [productsResult, settingsResult] = await Promise.allSettled([
			supabase.from('products').select('*').order('created_at', { ascending: false }),
			supabase.from('site_settings').select('*').limit(1).single()
		]);

		if (productsResult.status === 'fulfilled') {
			if (productsResult.value.error) { console.error('[Homepage] Error fetching products:', productsResult.value.error); productError = 'حدث خطأ أثناء تحميل المنتجات.'; }
            else { products = productsResult.value.data || []; console.log('[Homepage] Products loaded:', products.length); }
		} else { console.error('[Homepage] Failed to execute product fetch:', productsResult.reason); productError = 'فشل الاتصال لجلب المنتجات.'; }
		loadingProducts = false;

		if (settingsResult.status === 'fulfilled') {
			if (settingsResult.value.error && settingsResult.value.error.code !== 'PGRST116') { console.error('[Homepage] Error fetching settings:', settingsResult.value.error); settingsError = 'حدث خطأ أثناء تحميل إعدادات الموقع.'; }
            else { siteSettings = settingsResult.value.data || {}; console.log('[Homepage] Settings loaded:', siteSettings); }
		} else { console.error('[Homepage] Failed to execute settings fetch:', settingsResult.reason); settingsError = 'فشل الاتصال لجلب الإعدادات.'; }
		loadingSettings = false;
        console.log('[Homepage] Initial data load complete.');
	}

	function setupRealtime() {
        console.log('[Homepage] Setting up Realtime...');
        if (productsChannel) supabase.removeChannel(productsChannel);
		productsChannel = supabase.channel('public:products:homepage')
			.on<Product>('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
					console.log('[Homepage] Realtime product change received!', payload);
					if (payload.eventType === 'INSERT') { if (!products.some(p => p.id === payload.new.id)) { products = [payload.new, ...products]; } }
                    else if (payload.eventType === 'UPDATE') { products = products.map((p) => (p.id === payload.new.id ? payload.new : p)); }
                    else if (payload.eventType === 'DELETE') { products = products.filter((p) => p.id !== payload.old.id); }
				})
			.subscribe((status, err) => { if (status === 'SUBSCRIBED') console.log('[Homepage] Products Realtime subscribed!'); if (err) console.error('[Homepage] Products Realtime error:', err); });

        if (settingsChannel) supabase.removeChannel(settingsChannel);
		settingsChannel = supabase.channel('public:site_settings:homepage')
			.on<SiteSettings>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: `id=eq.1` }, (payload) => {
					console.log('[Homepage] Realtime settings change received!', payload); siteSettings = payload.new; })
            .subscribe((status, err) => { if (status === 'SUBSCRIBED') console.log('[Homepage] Settings Realtime subscribed!'); if (err) console.error('[Homepage] Settings Realtime error:', err); });
	}

	onMount(() => { loadData(); setupRealtime(); });
    onDestroy(() => {
        if (productsChannel) { supabase.removeChannel(productsChannel).catch(console.error); }
        if (settingsChannel) { supabase.removeChannel(settingsChannel).catch(console.error); }
    });
</script>

<svelte:head>
	<title>{siteSettings.store_name || 'بعيد وقريب'}</title>
	<meta name="description" content="متجر بعيد وقريب لملابس النساء. {siteSettings.collection_title || 'تشكيلة'} مميزة وجودة عالية." />
</svelte:head>

<!-- Header/Banner Section -->
<header class="mb-12 py-10 text-center animate-fadeIn">
	<h1 class="mb-4 text-5xl font-bold text-white sm:text-6xl md:text-7xl title-glow">
		{siteSettings.store_name || 'بعيد وقريب'}
	</h1>
	{#if siteSettings.banner_image_url}
		<img src={siteSettings.banner_image_url} alt="{siteSettings.store_name || 'بعيد وقريب'} Banner" class="mx-auto mt-6 max-h-60 rounded-lg shadow-lg shadow-purple-950/30" loading="lazy" />
	{/if}
</header>

<!-- Product Gallery ("تشكيلتنا") Section -->
<section id="collection" class="mb-16 animate-fadeInUp">
	<h2 class="mb-10 text-center text-3xl font-bold text-purple-400 title-glow-secondary md:text-4xl">
		{siteSettings.collection_title || 'تشكيلتنا'}
	</h2>

	{#if loadingProducts}
		<p class="text-center text-lg text-purple-300/70 animate-pulse">جاري تحميل المنتجات...</p>
	{:else if productError}
		<p class="rounded border border-red-700 bg-red-900/50 p-4 text-center text-red-300">{productError}</p>
	{:else if products.length === 0}
		<p class="rounded border border-gray-700 bg-gray-800/50 p-6 text-center text-xl text-gray-400"> 😕 لا توجد منتجات لعرضها حالياً. عاودي الزيارة قريباً! </p>
	{:else}
        <!-- UPDATED GRID CLASSES -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
			{#each products as product (product.id)}
				<ProductCard {product} />
			{/each}
		</div>
	{/if}
</section>

<!-- Footer Section -->
{#if !loadingSettings}
	<Footer {siteSettings} />
{/if}

<!-- Page Specific Styles -->
<style>
	@keyframes titlePulseGlow { 0%, 100% { text-shadow: 0 0 10px rgba(216, 180, 254, 0.5), 0 0 20px rgba(192, 132, 252, 0.3), 0 0 35px rgba(167, 139, 250, 0.2); } 50% { text-shadow: 0 0 15px rgba(216, 180, 254, 0.7), 0 0 30px rgba(192, 132, 252, 0.45), 0 0 50px rgba(167, 139, 250, 0.3); } }
	.title-glow { animation: titlePulseGlow 5s infinite ease-in-out; }
    .title-glow-secondary { text-shadow: 0 0 8px rgba(192, 132, 252, 0.4); }
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
	@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
	.animate-fadeInUp { opacity: 0; animation: fadeInUp 0.6s 0.2s ease-out forwards; }
</style>