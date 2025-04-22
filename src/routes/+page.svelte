<!-- === Code for src/routes/+page.svelte (Header Removed, Footer remains) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount, onDestroy } from 'svelte';
	import type { Product, SiteSettings } from '$lib/types';
	import ProductCard from '$lib/components/ProductCard.svelte';
	import Footer from '$lib/components/Footer.svelte';
    import type { PageData } from './$types'; // Import type for layout data passed down

    // Receive layout data (including siteSettings) passed down from +layout.ts -> +layout.svelte
    export let data: PageData;
    $: siteSettings = data.siteSettings || {}; // Get settings from layout data

	// State variables for products
	let products: Product[] = [];
	let loadingProducts = true;
	let productError: string | null = null;
    let productsChannel: ReturnType<typeof supabase.channel> | null = null;

	// --- Fetch Initial Products ---
	async function loadProducts() {
		loadingProducts = true; productError = null;
		try {
            const { data: productData, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            products = productData || [];
		} catch (err: any) {
            console.error('[Homepage] Error fetching products:', err);
			productError = 'حدث خطأ أثناء تحميل المنتجات.';
		} finally {
            loadingProducts = false;
        }
	}

	// --- Setup Product Realtime Subscription ---
	function setupProductRealtime() {
        if (productsChannel) supabase.removeChannel(productsChannel);
		productsChannel = supabase
			.channel('public:products:homepage')
			.on<Product>( 'postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
					console.log('[Homepage] Realtime product change received!', payload);
					if (payload.eventType === 'INSERT') { if (!products.some(p => p.id === payload.new.id)) { products = [payload.new, ...products]; } }
                    else if (payload.eventType === 'UPDATE') { products = products.map((p) => (p.id === payload.new.id ? payload.new : p)); }
                    else if (payload.eventType === 'DELETE') { products = products.filter((p) => p.id !== payload.old.id); }
				})
			.subscribe((status, err) => { if (err) console.error('[Homepage] Products Realtime error:', err); });
	}

	// --- Component Lifecycle ---
	onMount(() => { loadProducts(); setupProductRealtime(); });
    onDestroy(() => { if (productsChannel) { supabase.removeChannel(productsChannel).catch(console.error); } });

</script>

<!-- No <svelte:head> needed here if title set in layout -->

<!-- Header is now handled by the main layout -->

<!-- Product Gallery ("تشكيلتنا") Section -->
<section id="collection" class="mb-16 animate-fadeInUp">
    <!-- Use siteSettings passed down from layout data -->
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
        <!-- 2-Column Mobile Grid -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
			{#each products as product (product.id)}
				<ProductCard {product} />
			{/each}
		</div>
	{/if}
</section>

<!-- Footer Section - Pass down siteSettings received from layout -->
<Footer {siteSettings} />

<!-- Page Specific Styles -->
<style>
    /* Title glows are now primarily handled in the main layout or components */
    .title-glow-secondary { text-shadow: 0 0 8px rgba(192, 132, 252, 0.4); }
	@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
	.animate-fadeInUp { opacity: 0; animation: fadeInUp 0.6s 0.2s ease-out forwards; }
</style>