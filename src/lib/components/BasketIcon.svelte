<!-- === Code for src/lib/components/BasketIcon.svelte === -->
<script lang="ts">
	import { basketStore } from '$lib/stores/basketStore'; // Import basket store
	import { tweened } from 'svelte/motion'; // For smooth count animation
	import { cubicOut } from 'svelte/easing'; // Easing function

    export let onOpenBasket: () => void; // Function prop to open the basket view

	let itemCount = 0;

    // Use a tweened store for the count number for a nicer animation on change
    const displayCount = tweened(0, { duration: 300, easing: cubicOut });

    // Subscribe to the basket store to update item count
	const unsubscribe = basketStore.subscribe(items => {
        const totalItems = basketStore.getTotalItems(items);
		itemCount = totalItems;
        displayCount.set(totalItems); // Animate the display count
	});

    // Ensure unsubscribe happens when component is destroyed
    import { onDestroy } from 'svelte';
    onDestroy(unsubscribe);

    // Function to format count for display (e.g., 9+)
    function formatCount(count: number): string {
        const roundedCount = Math.round(count); // Use rounded value from tween
        if (roundedCount <= 0) return '';
        if (roundedCount > 9) return '9+';
        return roundedCount.toString();
    }

</script>

<!-- Only show the button if the basket has items -->
{#if itemCount > 0}
	<button
        on:click={onOpenBasket}
		title="عرض السلة ({itemCount} منتجات)"
		aria-label="Open Shopping Basket"
		class="fixed bottom-4 right-4 z-[100] flex h-14 w-14 items-center justify-center rounded-full border-2 border-purple-500/50 bg-gradient-to-br from-purple-700 to-purple-900 text-white shadow-xl shadow-purple-900/30 transition duration-300 ease-out hover:scale-110 hover:from-purple-600 hover:to-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-500/50 glow-effect animate-fadeIn"
	>
		<!-- Shopping Bag Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>

        <!-- Item Count Badge -->
        {#if $displayCount > 0}
        <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
            {formatCount($displayCount)}
        </span>
        {/if}
	</button>
{/if}

<style>
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
	.animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
</style>