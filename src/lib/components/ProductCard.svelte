<!-- === Code for src/lib/components/ProductCard.svelte (Fixed Prop Name) === -->
<script lang="ts">
	import type { Product } from '$lib/types';
	import ProductDetailModal from './ProductDetailModal.svelte'; // Import the modal

	export let product: Product;

	// State for modal
	let showModal = false;
	// This variable holds the calculated position data
	let modalPosition: { top: number; left: number, width: number, height: number } | null = null;

	// Reactive calculations
	$: isInStock = product.sizes_stock && Object.values(product.sizes_stock).some(stock => stock > 0);
	$: availableSizesInStock = Object.entries(product.sizes_stock ?? {})
								.filter(([size, stock]) => stock > 0)
								.map(([size]) => size);
	let imageLoaded = false;
	let imageError = false;

    // --- Function to Open Modal ---
	function openModal(event: MouseEvent) {
		if (!isInStock) return;
		const button = event.currentTarget as HTMLElement;
        if (!button) return;
		const rect = button.getBoundingClientRect(); // Position relative to viewport

		// Store the viewport-relative position in modalPosition
		modalPosition = {
			top: rect.top,
			left: rect.left,
            width: rect.width,
            height: rect.height
		};
        console.log("Card clicked. Viewport Position:", modalPosition);
		showModal = true;
	}

    function closeModal() {
        showModal = false;
        modalPosition = null; // Clear position when closed
    }
</script>

<!-- Card Container - Button Wrapper to make the whole card clickable -->
<button
	type="button"
	on:click={openModal}
	disabled={!isInStock}
	class="group relative flex h-full transform flex-col overflow-hidden rounded-xl border border-gray-800/80 bg-gradient-to-br from-gray-900/80 via-black/70 to-gray-900/80 text-right shadow-lg shadow-purple-950/10 transition duration-300 ease-in-out focus:outline-none hover:-translate-y-1 hover:scale-[1.03] hover:shadow-2xl hover:shadow-purple-800/20 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black {isInStock ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}"
	aria-label="View details for {product.name}"
>
	<!-- Product Image Area -->
	<div class="relative aspect-square w-full flex-shrink-0">
		{#if product.images && product.images.length > 0 && !imageError} <img src={product.images[0]} alt={product.name || 'صورة المنتج'} class="h-full w-full object-cover transition-opacity duration-300 {imageLoaded ? 'opacity-100' : 'opacity-0'}" loading="lazy" on:load={() => imageLoaded = true} on:error={() => imageError = true} /> {#if !imageLoaded} <div class="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]"></div> {/if}
		{:else} <div class="flex h-full w-full items-center justify-center bg-gray-800/50"><span class="text-sm text-gray-500">لا توجد صورة</span></div> {/if}
		{#if !isInStock} <div class="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-[1px]"><span class="rounded border border-red-500/50 bg-red-900/80 px-3 py-1 text-sm font-semibold text-red-300 tracking-wider">نفدت الكمية</span></div> {/if}
	</div>

	<!-- Product Details Area -->
	<div class="flex flex-grow flex-col p-4 sm:p-5"> <h3 class="mb-1 flex-grow truncate font-semibold text-lg text-purple-100/90 transition duration-300 group-hover:text-purple-200" title={product.name}>{product.name}</h3> <p class="mb-3 mt-1 text-xl font-bold text-purple-400 price-glow">{product.price} <span class="text-sm font-normal text-gray-400"></span></p> {#if isInStock && availableSizesInStock.length > 0} <div class="mt-auto pt-2 text-xs text-gray-400"><span class="font-medium">المقاسات المتوفرة:</span><span class="mr-1 space-x-1 font-mono font-medium text-gray-300">{#each availableSizesInStock as size (size)}<span>{size}</span>{/each}</span></div> {:else if !isInStock} <div class="mt-auto pt-2 text-xs text-red-400/80">غير متوفر حالياً</div> {/if} </div>

	 <!-- Subtle Bottom Border Highlight -->
	 <div class="h-1 w-full bg-gradient-to-r from-purple-800 via-pink-700/50 to-purple-800 opacity-0 transition-opacity duration-300 group-hover:opacity-60"></div>

</button> <!-- End Button Wrapper -->


<!-- Render the Modal Conditionally, passing position -->
{#if showModal && modalPosition}
    <!-- FIXED: Pass 'modalPosition' to the 'position' prop of the modal -->
	<ProductDetailModal {product} position={modalPosition} on:close={closeModal} />
{/if}

<style>
	.price-glow { text-shadow: 0 0 5px rgba(192, 132, 252, 0.4); }
</style>