<!-- src/lib/components/ProductCard.svelte (Flipped Card Arrow Symbols) -->
<script lang="ts">
	// --- Core Imports ---
	import type { Product } from '$lib/types';
	import { basketStore, type BasketItem } from '$lib/stores/basketStore';
	import { createEventDispatcher } from 'svelte';

	// --- Quick View Imports ---
	import { openQuickView, type QuickViewProduct } from '$lib/stores/quickViewStore';

	// --- Dispatcher & Prop ---
	const dispatch = createEventDispatcher<{ itemadded: BasketItem }>();
	export let product: Product;

	// --- Image State ---
	let currentImageIndex = 0;
	$: images = product.images || [];
	$: hasMultipleImages = images.length > 1;
	let imageLoaded = true;
	let imageError = false;

	// --- Stock & Size State ---
	$: sizesWithStock = Object.entries(product.sizes_stock ?? {})
                            .filter(([_, stock]) => stock > 0);
    $: isInStock = sizesWithStock.length > 0;
	$: availableSizes = sizesWithStock.map(([size]) => size);

    // --- Card Interaction State ---
    let selectedSize: string | null = null;
    let addingInProgress = false;
    let addedFeedback = false;
    let addedFeedbackTimeout: ReturnType<typeof setTimeout>;

	// --- Internal Image Swap Functions ---
	function nextImage(event?: MouseEvent) {
        event?.stopPropagation();
        currentImageIndex = (currentImageIndex + 1) % images.length;
    }
	function prevImage(event?: MouseEvent) {
        event?.stopPropagation();
        currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    }

    // --- Add to Basket Logic ---
    function handleAddToBasket(event?: MouseEvent) {
        event?.stopPropagation();
        if (!selectedSize) { alert("يرجى اختيار المقاس أولاً."); return; }
        if (addingInProgress) return;
        const stockForSize = product.sizes_stock[selectedSize] ?? 0;
        if (stockForSize <= 0) { alert("عذراً، نفدت الكمية لهذا المقاس."); return; }

        addingInProgress = true;
        addedFeedback = false;
        clearTimeout(addedFeedbackTimeout);
        const itemToAdd: BasketItem = {
            productId: product.id, name: product.name, size: selectedSize, quantity: 1,
            price: product.price, imageUrl: images.length > 0 ? images[currentImageIndex] : null,
            maxStock: stockForSize
        };
        try {
            basketStore.addItem(itemToAdd);
            addedFeedback = true; dispatch('itemadded', itemToAdd);
            addedFeedbackTimeout = setTimeout(() => { addedFeedback = false; }, 1500);
        } catch (e) { console.error("Error adding item:", e); alert("خطأ إضافة للسلة."); }
        finally { addingInProgress = false; }
    }

	// --- Quick View Trigger Function ---
    function handleProductClick(event: MouseEvent) {
        const targetElement = event.target as HTMLElement;
        if (targetElement.closest('button')) {
            return;
        }
        console.log(`Card area clicked for product: ${product.name}, ID: ${product.id}`);
        if (!product.images || !Array.isArray(product.images)) {
            console.error("Product data is missing the 'images' array required for Quick View.", product);
             const fallbackImages = images.length > 0 ? [images[currentImageIndex]] : [];
             product.images = fallbackImages;
             if (product.images.length === 0) {
                 alert("Cannot open quick view: Image data missing.");
                 return;
             }
        }
        const description = product.description || null;
        const productDataForModal: QuickViewProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images,
            currency: product.currency_symbol || 'شيكل',
            description: description
        };
        openQuickView(productDataForModal);
    }

    // --- Accessibility Handler for Keyboard ---
    function handleKeydown(event: KeyboardEvent) {
        const targetElement = event.target as HTMLElement;
        if (targetElement.closest('button')) {
             return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleProductClick();
        }
    }

</script>

<div
    class="group relative flex h-full transform flex-col overflow-hidden rounded-xl border border-gray-800/80 bg-gradient-to-br from-gray-900/80 via-black/70 to-gray-900/80 text-right shadow-lg shadow-purple-950/10 transition duration-300 ease-in-out hover:shadow-xl hover:shadow-purple-800/20 {isInStock ? '' : 'opacity-60'} cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
    on:click={handleProductClick}
    on:keydown={handleKeydown}
    role="button"
    tabindex="0"
    aria-label="View details for {product.name}"
>
	<div class="relative aspect-square w-full flex-shrink-0">
		{#if images.length > 0 && !imageError}
            {#key currentImageIndex}
                <img src={images[currentImageIndex]} alt={product.name || 'صورة المنتج'} class="h-full w-full object-cover animate-fadeIn" loading="lazy" on:error={() => imageError = true}/>
            {/key}
        {:else}
            <div class="flex h-full w-full items-center justify-center bg-gray-800/50">
                <span class="text-sm text-gray-500">لا توجد صورة</span>
            </div>
        {/if}

        <!-- Image Arrows (Swapped Visual Symbol) -->
		{#if hasMultipleImages}
            <!-- Left Arrow (Next Image function, shows > symbol) -->
            <button on:click|stopPropagation={nextImage} aria-label="Next Image" class="arrow-button left-1"> {'>'} </button>
            <!-- Right Arrow (Previous Image function, shows < symbol) -->
            <button on:click|stopPropagation={prevImage} aria-label="Previous Image" class="arrow-button right-1"> {'<'} </button>
            <!-- Index Indicator -->
            <div class="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                {currentImageIndex + 1} / {images.length}
            </div>
        {/if}

		{#if !isInStock}
            <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-[1px]">
                <span class="rounded border border-red-500/50 bg-red-900/80 px-3 py-1 text-sm font-semibold text-red-300 tracking-wider">نفدت الكمية</span>
            </div>
        {/if}
	</div>

	<div class="flex flex-grow flex-col p-4 sm:p-5">
        <h3 class="mb-1 flex-grow truncate font-semibold text-lg text-purple-100/90 group-hover:text-purple-200" title={product.name}>{product.name}</h3>
        <p class="mb-3 mt-1 text-xl font-bold text-purple-400 price-glow">{product.price} <span class="text-base font-normal text-gray-400">{product.currency_symbol || 'شيكل'}</span></p>

        {#if isInStock}
            <div class="mb-3 space-y-1.5">
                <p class="text-xs text-gray-400">اختيار المقاس:</p>
                <div class="flex flex-wrap gap-2">
                    {#each availableSizes as size (size)}
                        <button
                           type="button"
                           on:click|stopPropagation={() => selectedSize = size}
                           class="rounded-md px-2.5 py-1 text-xs border transition duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-black"
                           class:bg-purple-700={selectedSize === size}
                           class:text-white={selectedSize === size}
                           class:border-purple-600={selectedSize === size}
                           class:bg-gray-800={selectedSize !== size}
                           class:text-gray-300={selectedSize !== size}
                           class:border-gray-700={selectedSize !== size}
                           class:hover:bg-purple-800={selectedSize !== size}
                           class:hover:border-purple-700={selectedSize !== size}
                        >
                           {size}
                         </button>
                    {/each}
                </div>
            </div>
        {/if}

		{#if !isInStock}
            <div class="mt-auto pt-2 text-xs text-red-400/80">غير متوفر حالياً</div>
        {/if}
    </div>

	<div class="px-4 pb-4 pt-1 mt-auto">
         {#if isInStock}
             <button
                on:click={handleAddToBasket}
                disabled={addingInProgress || !selectedSize}
                class="w-full rounded-lg border border-purple-300/20 bg-white px-4 py-2 text-sm font-medium text-purple-600 shadow-md shadow-purple-900/10 transition duration-200 ease-in-out hover:bg-purple-100 hover:text-purple-700 hover:scale-[1.03] hover:shadow-purple-400/20 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-40 disabled:cursor-not-allowed glow-subtle"
             >
                 {#if addingInProgress} <span class="animate-pulse">جاري الإضافة...</span> {:else if addedFeedback} ✅ أضيف للسلة {:else if !selectedSize} اختر المقاس أولاً {:else} إضافة للسلة {/if}
             </button>
         {:else}
             <button disabled class="w-full cursor-not-allowed rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-sm font-medium text-gray-500 opacity-70"> نفدت الكمية </button>
         {/if}
     </div>

	 <div class="h-1 w-full bg-gradient-to-r from-purple-800 via-pink-700/50 to-purple-800 opacity-0 transition-opacity duration-300 group-hover:opacity-60"></div>
</div>

<style>
    .price-glow { text-shadow: 0 0 5px rgba(192, 132, 252, 0.4); }
    .arrow-button { @apply absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 transition hover:bg-black/60 focus:opacity-100 group-hover:opacity-100 disabled:opacity-20; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
    .glow-subtle { box-shadow: 0 0 8px rgba(255, 255, 255, 0.1), 0 0 12px rgba(192, 132, 252, 0.1); }
    .glow-subtle:not(:disabled):hover { box-shadow: 0 0 12px rgba(255, 255, 255, 0.2), 0 0 18px rgba(192, 132, 252, 0.2); }
</style>