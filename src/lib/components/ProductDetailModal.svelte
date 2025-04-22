<!-- === Code for src/lib/components/ProductDetailModal.svelte (Mobile Centering Fix) === -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Product } from '$lib/types';
	import { supabase } from '$lib/supabaseClient';

	// Props
	export let product: Product;

	// State
	let selectedSize: string | null = null;
	let quantity: number = 1;
	let customerName: string = '';
	let customerPhone: string = '';
	let customerAddress: string = '';
	let submitting = false;
	let error: string | null = null;
	let successMessage: string | null = null;
	let maxQuantity = 1;

	// Event Dispatcher
	const dispatch = createEventDispatcher<{ close: {} }>();

	// Reactive calculations
	$: availableSizes = Object.entries(product.sizes_stock ?? {})
		.filter(([size, stock]) => stock > 0)
		.map(([size]) => size);
	$: isInStock = availableSizes.length > 0;

	// Update max quantity when size changes
	$: {
		if (selectedSize && product.sizes_stock && product.sizes_stock[selectedSize]) {
			maxQuantity = product.sizes_stock[selectedSize];
			if (quantity > maxQuantity) {
				quantity = maxQuantity > 0 ? 1 : 0;
			}
			if (maxQuantity <= 0) {
				selectedSize = null;
			}
		} else {
			maxQuantity = 0;
			quantity = 0;
		}
	}

	// Ensure quantity doesn't exceed max
	function handleQuantityChange(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = parseInt(input.value, 10);
		if (isNaN(val) || val < 1) {
			val = 1;
		}
		if (selectedSize && val > maxQuantity) {
			val = maxQuantity;
		}
		quantity = val;
		input.value = quantity.toString();
	}

	function close() {
		dispatch('close');
	}

	async function handleOrderSubmit() {
		submitting = true;
		error = null;
		successMessage = null;

		// Validations
		if (!customerName.trim()) { error = 'يرجى إدخال الاسم.'; submitting = false; return; }
		if (!customerPhone.trim()) { error = 'يرجى إدخال رقم الهاتف.'; submitting = false; return; }
		if (!customerAddress.trim()) { error = 'يرجى إدخال العنوان بالتفصيل.'; submitting = false; return; }
		if (!selectedSize) { error = 'يرجى اختيار المقاس المطلوب.'; submitting = false; return; }
		if (quantity < 1 || quantity > maxQuantity) { error = `الكمية المطلوبة غير متوفرة لهذا المقاس (المتوفر: ${maxQuantity}).`; submitting = false; return; }

		// Prepare payload
		const orderPayload = {
			customer_name: customerName.trim(), customer_phone: customerPhone.trim(), customer_address: customerAddress.trim(),
			order_details: { productId: product.id, productName: product.name, size: selectedSize, quantity: quantity, price: product.price, imageUrl: product.images && product.images.length > 0 ? product.images[0] : null },
			status: 'new', total_price: product.price * quantity
		};

		try {
			// Re-check stock
			const { data: currentProductData, error: fetchError } = await supabase.from('products').select('sizes_stock').eq('id', product.id).single();
			if (fetchError || !currentProductData) { throw new Error("Could not verify product stock."); }
			const currentStock = currentProductData.sizes_stock[selectedSize] ?? 0;
			if (quantity > currentStock) { error = `نفدت الكمية للمقاس ${selectedSize}. (المتوفر الآن: ${currentStock})`; submitting = false; return; }

			// Insert order
			const { error: insertError } = await supabase.from('orders').insert([orderPayload]);
			if (insertError) throw insertError;

			// Update Stock
			const newStockLevel = currentStock - quantity;
			const updatedSizesStock = { ...currentProductData.sizes_stock };
			updatedSizesStock[selectedSize] = newStockLevel;
			const { error: stockUpdateError } = await supabase.from('products').update({ sizes_stock: updatedSizesStock }).eq('id', product.id);
			if (stockUpdateError) { console.error("CRITICAL: Stock update failed:", product.id, stockUpdateError); }
			else { console.log("Stock updated successfully for product", product.id); }

			successMessage = 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.';
			setTimeout(() => { customerName = ''; customerPhone = ''; customerAddress = ''; selectedSize = null; quantity = 1; close(); }, 2500);

		} catch (err: any) {
			console.error('Order submission error:', err);
			if (err.message.includes('violates row-level security policy')) { error = 'خطأ في الأذونات.'; }
			else { error = 'حدث خطأ غير متوقع: ' + err.message; }
		} finally { submitting = false; }
	}
</script>

<!-- Modal Overlay -->
<!-- Updated classes for better mobile centering -->
<div
	class="fixed inset-0 z-[60] flex justify-center items-start overflow-y-auto bg-black/80 p-4 pt-10 backdrop-blur-sm animate-fadeIn md:items-center md:pt-4"
	on:click|self={close}
	role="dialog" aria-modal="true" aria-labelledby="product-modal-title"
>
	<!-- Modal Content Box -->
    <!-- Updated classes to work with flex centering and overlay scroll -->
	<form
		on:submit|preventDefault={handleOrderSubmit}
		class="relative w-full max-w-lg rounded-xl border border-purple-900/30 bg-gradient-to-br from-gray-950 via-black to-gray-950 shadow-2xl shadow-purple-950/30 mb-auto mt-auto md:mb-0 md:mt-0"
	>
        <!-- Close Button -->
        <button type="button" on:click={close} aria-label="Close" class="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition z-10 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>
        </button>

        <!-- Product Image -->
        <div class="aspect-square w-full flex-shrink-0 rounded-t-xl overflow-hidden">
            {#if product.images && product.images.length > 0} <img src={product.images[0]} alt={product.name} class="h-full w-full object-cover" />
            {:else} <div class="flex h-full w-full items-center justify-center bg-gray-800/50"> <span class="text-sm text-gray-500">لا توجد صورة</span> </div> {/if}
        </div>

        <!-- Form Area -->
        <div class="p-6 space-y-4 flex-grow"> <!-- Changed outer form to div -->
            <h2 id="product-modal-title" class="text-2xl font-semibold text-purple-300 title-glow mb-1">{product.name}</h2>
            <p class="text-2xl font-bold text-purple-400 mb-3">{product.price} <span class="text-sm font-normal text-gray-400"></span></p>
            {#if product.description} <p class="text-sm text-gray-400 mb-4">{product.description}</p> {/if}

            <!-- Size Selection -->
            {#if isInStock}
            <div class="space-y-2">
                <label class="label !mb-1">اختيار المقاس <span class="text-red-500">*</span></label>
                <div class="flex flex-wrap gap-2">
                    {#each availableSizes as size (size)}
                         <button type="button" on:click={() => selectedSize = size} class="rounded-md px-3 py-1.5 text-sm border transition duration-150 ease-in-out" class:bg-purple-700={selectedSize === size} class:text-white={selectedSize === size} class:border-purple-600={selectedSize === size} class:bg-gray-800={selectedSize !== size} class:text-gray-300={selectedSize !== size} class:border-gray-700={selectedSize !== size} class:hover:bg-purple-800={selectedSize !== size} class:hover:border-purple-700={selectedSize !== size}>
                           {size} <span class="text-xs opacity-80">({product.sizes_stock[size]} متوفر)</span>
                         </button>
                    {/each}
                </div>
            </div>
             {#if selectedSize}
                 <div>
                    <label for="quantity" class="label">الكمية (المتوفر: {maxQuantity}) <span class="text-red-500">*</span></label>
                    <input type="number" id="quantity" bind:value={quantity} on:input={handleQuantityChange} min="1" max={maxQuantity} required disabled={maxQuantity < 1} class="input-field w-24 text-center" />
                 </div>
             {/if}
            {:else} <p class="rounded border border-red-600 bg-red-900/50 p-3 text-center text-red-300">عذراً، هذا المنتج غير متوفر حالياً.</p> {/if}

            {#if isInStock && selectedSize}
                <hr class="border-gray-700 my-5">
                <div> <label for="customerName" class="label">الاسم <span class="text-red-500">*</span></label> <input type="text" id="customerName" bind:value={customerName} required class="input-field" placeholder="الاسم الكامل" /> </div>
                <div> <label for="customerPhone" class="label">رقم الهاتف <span class="text-red-500">*</span></label> <input type="tel" id="customerPhone" bind:value={customerPhone} required class="input-field ltr-input" placeholder="05xxxxxxxx" /> </div>
                <div> <label for="customerAddress" class="label">العنوان بالتفصيل <span class="text-red-500">*</span></label> <textarea id="customerAddress" bind:value={customerAddress} required rows="3" class="input-field" placeholder="المدينة - الشارع - أقرب معلم"></textarea> </div>
                 {#if error} <p class="rounded border border-red-700 bg-red-900/60 p-3 text-center text-red-300 text-sm"> {error} </p> {/if}
                 {#if successMessage} <p class="rounded border border-green-700 bg-green-900/60 p-3 text-center text-green-300 text-sm"> {successMessage} </p> {/if}
                <div class="pt-4"> <button type="submit" disabled={submitting || quantity < 1} class="w-full rounded-md bg-gradient-to-r from-green-600 to-green-800 px-5 py-3 text-base font-medium text-white shadow-lg shadow-green-900/30 transition duration-150 ease-in-out hover:scale-[1.02] hover:from-green-500 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed glow-effect"> {#if submitting} <span class="animate-pulse">جاري إرسال الطلب...</span> {:else} تأكيد الطلب {/if} </button> </div>
            {/if}
        </div> <!-- End Form Area -->
	</form> <!-- End Modal Content Box -->
</div> <!-- End Modal Overlay -->

<style>
	.label { @apply mb-1.5 block text-sm font-medium text-gray-300; }
	.input-field { @apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none; }
    .ltr-input { direction: ltr; text-align: left; }
    .title-glow { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
</style>