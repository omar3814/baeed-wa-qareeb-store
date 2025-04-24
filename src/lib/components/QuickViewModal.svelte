<!-- src/lib/components/QuickViewModal.svelte (Cleaned - Final Attempt) -->
<script lang="ts">
    import { quickViewProduct, closeQuickView, type QuickViewProduct } from '$lib/stores/quickViewStore';
    import { fade } from 'svelte/transition';
    import { onDestroy } from 'svelte';

    let currentProduct: QuickViewProduct | null = null;
    let currentImageIndex = 0;

    const unsubscribe = quickViewProduct.subscribe(value => {
        currentProduct = value;
        currentImageIndex = 0;
    });

    onDestroy(unsubscribe);

    $: currentImageUrl = currentProduct?.images?.[currentImageIndex] ?? '';
    $: imageCount = currentProduct?.images?.length ?? 0;
    $: hasMultipleImages = imageCount > 1;

    function nextImage() {
        if (currentProduct && currentImageIndex < imageCount - 1) {
            currentImageIndex++;
        }
    }

    function prevImage() {
        if (currentProduct && currentImageIndex > 0) {
            currentImageIndex--;
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (currentProduct && event.key === 'Escape') {
            closeQuickView();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown}/>

{#if currentProduct}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
        on:click={closeQuickView}
        transition:fade={{ duration: 150 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
    >
        <!-- Modal Content Box -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="relative flex w-full max-w-3xl flex-col gap-3 rounded-lg bg-gray-900 p-4 text-white shadow-xl md:max-h-[85vh] md:flex-row md:gap-4 border border-purple-800/30"
            on:click|stopPropagation
        >
            <!-- Close Button -->
            <button
                class="absolute -top-2.5 -left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-purple-700 text-lg text-white shadow-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 md:top-1.5 md:left-1.5"
                on:click={closeQuickView}
                aria-label="Close modal"
            >{'\u00D7'}</button>

            <!-- Image Gallery Section -->
            <div class="relative w-full md:w-3/5">
                {#if imageCount > 0}
                     <div class="relative aspect-[4/5] w-full overflow-hidden rounded bg-gray-800">
                        {#key currentImageIndex}
                            <img
                                src={currentImageUrl}
                                alt="{currentProduct.name} - Image {currentImageIndex + 1}"
                                class="absolute inset-0 h-full w-full object-contain animate-modalImageFadeIn"
                                loading="lazy"
                            />
                         {/key}
                     </div>

                    {#if hasMultipleImages}
                        <!-- Next Button (Left for RTL) -->
                        <button
                            class="arrow-button left-1.5"
                            on:click|stopPropagation={nextImage}
                            disabled={currentImageIndex === imageCount - 1}
                            aria-label="Next image"
                        >{'>'}</button>

                        <!-- Prev Button (Right for RTL) -->
                        <button
                            class="arrow-button right-1.5"
                            on:click|stopPropagation={prevImage}
                            disabled={currentImageIndex === 0}
                            aria-label="Previous image"
                        >{'<'}</button>

                        <div class="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5">
                            {#each { length: imageCount } as _, i}
                                <button
                                    class:bg-purple-500={i === currentImageIndex}
                                    class:bg-gray-600={i !== currentImageIndex}
                                    class="h-1.5 w-1.5 rounded-full hover:bg-gray-400 transition"
                                    on:click|stopPropagation={() => currentImageIndex = i}
                                    aria-label="Go to image {i + 1}"
                                ></button>
                            {/each}
                        </div>
                    {/if}
                {:else}
                    <div class="flex aspect-[4/5] w-full items-center justify-center rounded bg-gray-800 text-gray-500">No image available</div>
                {/if}
            </div>

            <!-- Product Details Section -->
            <div class="w-full md:w-2/5 md:max-h-[80vh] md:overflow-y-auto pr-1 pl-2">
                <h2 id="modal-title" class="mb-1.5 text-xl font-bold text-purple-300">{currentProduct.name}</h2>
                <p class="mb-3 text-lg font-semibold text-purple-400">{currentProduct.price} {currentProduct.currency || 'شيكل'}</p>

                {#if currentProduct.description}
                	<h4 class="mb-1 mt-3 text-xs font-semibold text-gray-400">الوصف:</h4>
                	<p class="text-sm text-gray-300 whitespace-pre-wrap">{currentProduct.description}</p>
                {/if}
            </div>
        </div>
    </div>
{/if}

<!-- Styles -->
<style>
    .arrow-button {
        @apply absolute top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-lg font-bold text-white transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-gray-900 disabled:opacity-30 disabled:cursor-not-allowed;
    }
     @keyframes modalImageFadeIn {
        from { opacity: 0.6; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
     }
    .animate-modalImageFadeIn {
         animation: modalImageFadeIn 0.3s ease-out forwards;
     }
</style>