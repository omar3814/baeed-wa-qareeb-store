<!-- === Code for src/routes/+page.svelte (with Categories & Filtering) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount, onDestroy } from 'svelte';
	import type { Product, SiteSettings, Category } from '$lib/types';
	import ProductCard from '$lib/components/ProductCard.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { PageData } from './$types';

	// --- Props & State ---
	export let data: PageData; // From +layout.ts load
	$: siteSettings = data.siteSettings || {};

	let allProducts: Product[] = []; // Holds ALL fetched products
	let categories: Category[] = []; // Holds fetched categories
    let filteredProducts: Product[] = []; // Products filtered by selected category
	let selectedCategoryId: string | 'all' = 'all'; // 'all' or a category UUID

	// Loading & Error States
	let loadingProducts = true;
	let loadingCategories = true;
	let productError: string | null = null;
	let categoryError: string | null = null;

    // Realtime Subscriptions
    let productsChannel: ReturnType<typeof supabase.channel> | null = null;
    let categoriesChannel: ReturnType<typeof supabase.channel> | null = null;


	// --- Fetch Initial Data ---
	async function loadData() {
		loadingProducts = true; loadingCategories = true;
		productError = null; categoryError = null;

		const [productsResult, categoriesResult] = await Promise.allSettled([
			// Fetch products AND their linked category name/id
			supabase
                .from('products')
                .select('*, categories ( id, name )') // Fetch related category data
                .order('created_at', { ascending: false }),
			// Fetch categories, ordered
			supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true })
		]);

		// Process Products
		if (productsResult.status === 'fulfilled') {
			if (productsResult.value.error) { productError = 'فشل تحميل المنتجات.'; console.error(productsResult.value.error); }
            else { allProducts = productsResult.value.data || []; }
		} else { productError = 'فشل الاتصال لجلب المنتجات.'; console.error(productsResult.reason); }
		loadingProducts = false;

		// Process Categories
		if (categoriesResult.status === 'fulfilled') {
			if (categoriesResult.value.error) { categoryError = 'فشل تحميل الأقسام.'; console.error(categoriesResult.value.error); }
            else { categories = categoriesResult.value.data || []; }
		} else { categoryError = 'فشل الاتصال لجلب الأقسام.'; console.error(categoriesResult.reason); }
		loadingCategories = false;

        // Initial filter application
        filterProducts();
	}

    // --- Filter Products Logic ---
    function filterProducts() {
        if (selectedCategoryId === 'all') {
            filteredProducts = allProducts; // Show all if 'all' is selected
        } else {
            // Filter products based on the selected category ID
            filteredProducts = allProducts.filter(p => p.category_id === selectedCategoryId);
        }
         console.log(`Filtered products for category '${selectedCategoryId}': ${filteredProducts.length}`);
    }

    // Reactive statement: Re-run filterProducts whenever selectedCategoryId or allProducts changes
    $: if (!loadingProducts) filterProducts(selectedCategoryId, allProducts);


	// --- Setup Realtime ---
	function setupRealtime() {
        // Products Listener (updates allProducts)
        if (productsChannel) supabase.removeChannel(productsChannel);
		productsChannel = supabase.channel('public:products:homepage')
			.on<Product>( 'postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
					console.log('[Homepage] Realtime product change received!', payload);
					// Re-fetch all products to ensure consistency with joins and filtering
                    // A more complex implementation could update the array directly
                    loadData(); // Simple refetch for now
				})
			.subscribe();

        // Categories Listener (updates categories list)
        if (categoriesChannel) supabase.removeChannel(categoriesChannel);
        categoriesChannel = supabase.channel('public:categories:homepage')
            .on<Category>('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
                    console.log('[Homepage] Realtime category change received!', payload);
                    // Refetch categories to update filter buttons etc.
                    loadData(); // Simple refetch for now
                })
            .subscribe();
	}

	// --- Lifecycle ---
	onMount(() => { loadData(); setupRealtime(); });
    onDestroy(() => {
        if (productsChannel) { supabase.removeChannel(productsChannel).catch(console.error); }
        if (categoriesChannel) { supabase.removeChannel(categoriesChannel).catch(console.error); }
    });

    // Helper to get category name for section headers
    function getCategoryName(categoryId: string | null): string | null {
        if (!categoryId) return "غير مصنف"; // Handle uncategorized
        const category = categories.find(c => c.id === categoryId);
        return category ? category.name : null; // Return name or null if not found
    }

    // Group products by category for display when 'all' is selected
    $: groupedProducts = selectedCategoryId === 'all'
        ? categories.map(category => ({
            ...category,
            products: allProducts.filter(p => p.category_id === category.id)
          })).filter(group => group.products.length > 0) // Only show categories with products
        : [];

     $: uncategorizedProducts = selectedCategoryId === 'all'
        ? allProducts.filter(p => !p.category_id)
        : [];

     $: currentCategoryName = selectedCategoryId === 'all'
         ? siteSettings.collection_title || 'تشكيلتنا'
         : getCategoryName(selectedCategoryId) || 'القسم المحدد';

</script>

<!-- Sticky Header is in +layout.svelte -->

<!-- Category Filter Buttons -->
{#if !loadingCategories && categories.length > 0}
<section class="mb-8 animate-fadeInUp">
    <div class="container mx-auto px-4">
         <h3 class="mb-3 text-center text-lg font-medium text-purple-300 md:text-right">تصفح حسب القسم:</h3>
         <div class="flex flex-wrap justify-center gap-2 rounded-lg bg-gray-900/50 p-3 md:justify-start">
            <!-- All Categories Button -->
            <button
                on:click={() => selectedCategoryId = 'all'}
                class="rounded-md px-3 py-1.5 text-sm transition duration-150 ease-in-out"
                class:bg-purple-700={selectedCategoryId === 'all'}
                class:text-white={selectedCategoryId === 'all'}
                class:border-purple-600={selectedCategoryId === 'all'}
                class:border={selectedCategoryId === 'all'}
                class:bg-gray-800={selectedCategoryId !== 'all'}
                class:text-gray-300={selectedCategoryId !== 'all'}
                class:border-transparent={selectedCategoryId !== 'all'}
                class:hover:bg-purple-800={selectedCategoryId !== 'all'}
            >
                الكل
            </button>
            <!-- Individual Category Buttons -->
            {#each categories as category (category.id)}
                 <button
                    on:click={() => selectedCategoryId = category.id}
                    class="rounded-md px-3 py-1.5 text-sm transition duration-150 ease-in-out"
                    class:bg-purple-700={selectedCategoryId === category.id}
                    class:text-white={selectedCategoryId === category.id}
                    class:border-purple-600={selectedCategoryId === category.id}
                    class:border={selectedCategoryId === category.id}
                    class:bg-gray-800={selectedCategoryId !== category.id}
                    class:text-gray-300={selectedCategoryId !== category.id}
                    class:border-transparent={selectedCategoryId !== category.id}
                    class:hover:bg-purple-800={selectedCategoryId !== category.id}
                >
                    {category.name}
                </button>
            {/each}
         </div>
    </div>
</section>
{/if}


<!-- Product Display Section -->
<section id="collection" class="mb-16 animate-fadeInUp">
	<h2 class="mb-10 text-center text-3xl font-bold text-purple-400 title-glow-secondary md:text-4xl">
		{currentCategoryName} <!-- Show current filter/main title -->
	</h2>

	{#if loadingProducts || loadingCategories}
		<p class="text-center text-lg text-purple-300/70 animate-pulse">جاري تحميل المنتجات...</p>
	{:else if productError || categoryError}
		<p class="rounded border border-red-700 bg-red-900/50 p-4 text-center text-red-300">{productError || categoryError}</p>
    {:else if selectedCategoryId !== 'all' && filteredProducts.length === 0}
        <p class="rounded border border-gray-700 bg-gray-800/50 p-6 text-center text-xl text-gray-400"> 😕 لا توجد منتجات في هذا القسم حالياً. </p>
	{:else if selectedCategoryId === 'all' && allProducts.length === 0}
		<p class="rounded border border-gray-700 bg-gray-800/50 p-6 text-center text-xl text-gray-400"> 😕 لا توجد منتجات لعرضها حالياً. </p>
	{:else}
        <!-- Display Logic -->
        {#if selectedCategoryId === 'all'}
             <!-- Show products grouped by category -->
             {#each groupedProducts as group (group.id)}
                 <div class="mb-12">
                      <h3 class="mb-6 border-b border-purple-800/30 pb-2 text-center text-2xl font-semibold text-purple-300 md:text-right">
                          {group.name}
                      </h3>
                      <div class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                         {#each group.products as product (product.id)}
                             <ProductCard {product} />
                         {/each}
                     </div>
                 </div>
             {/each}
             <!-- Show Uncategorized Products -->
             {#if uncategorizedProducts.length > 0}
                  <div class="mb-12">
                      <h3 class="mb-6 border-b border-gray-700/30 pb-2 text-center text-2xl font-semibold text-gray-500 md:text-right">
                          غير مصنف
                      </h3>
                      <div class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                         {#each uncategorizedProducts as product (product.id)}
                             <ProductCard {product} />
                         {/each}
                     </div>
                 </div>
             {/if}
        {:else}
             <!-- Show only filtered products -->
             <div class="grid grid-cols-2 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                 {#each filteredProducts as product (product.id)}
                     <ProductCard {product} />
                 {/each}
             </div>
        {/if}
	{/if}
</section>

<!-- Footer -->
<Footer {siteSettings} />

<!-- Styles -->
<style> .title-glow-secondary { text-shadow: 0 0 8px rgba(192, 132, 252, 0.4); } @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeInUp { opacity: 0; animation: fadeInUp 0.6s 0.2s ease-out forwards; } </style>