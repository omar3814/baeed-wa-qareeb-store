<!-- === Code for src/lib/components/BasketView.svelte (Uses maxStock for Qty Update) === -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { basketStore, type BasketItem } from '$lib/stores/basketStore';
	import { supabase } from '$lib/supabaseClient';

	const dispatch = createEventDispatcher<{ close: {} }>();

	let basketItems: BasketItem[] = [];
	let customerName: string = '';
	let customerPhone: string = '';
	let customerAddress: string = '';
	let submitting = false;
	let error: string | null = null;
	let successMessage: string | null = null;

	const unsubscribe = basketStore.subscribe((items) => { basketItems = items; });
	import { onDestroy } from 'svelte';
	onDestroy(unsubscribe);

	$: totalItems = basketStore.getTotalItems(basketItems);
	$: totalPrice = basketStore.getTotalPrice(basketItems);

	function closeView() { dispatch('close'); }

    // --- UPDATED updateQuantity to use stored maxStock ---
    function updateQuantity(uniqueId: string, change: number) {
        const item = basketItems.find(i => i.uniqueId === uniqueId);
        if (!item) return;
        const newQuantity = item.quantity + change;

        // Check against the maxStock stored with the item
        if (newQuantity > item.maxStock) {
             alert(`لا يمكن طلب أكثر من الكمية المتوفرة (${item.maxStock}) لهذا المقاس.`);
             return; // Don't update if requested exceeds max known stock
        }

        // Update store (handles removal if newQuantity <= 0)
        basketStore.updateItemQuantity(uniqueId, newQuantity);
    }
    function removeItem(uniqueId: string) { basketStore.removeItem(uniqueId); }

	// --- handleOrderSubmit now includes pre-check against DB stock ---
	async function handleOrderSubmit() {
		submitting = true; error = null; successMessage = null;
		if (basketItems.length === 0) { error = 'سلة التسوق فارغة!'; submitting = false; return; }
		if (!customerName.trim()) { error = 'يرجى إدخال الاسم.'; submitting = false; return; }
		if (!customerPhone.trim()) { error = 'يرجى إدخال رقم الهاتف.'; submitting = false; return; }
		if (!customerAddress.trim()) { error = 'يرجى إدخال العنوان بالتفصيل.'; submitting = false; return; }
		try {
            let stockValidationError = null;
            for (const item of basketItems) {
                 const { data: productStockData, error: stockFetchError } = await supabase .from('products') .select('sizes_stock') .eq('id', item.productId) .single();
                 if (stockFetchError || !productStockData) { stockValidationError = `لا يمكن التحقق من مخزون: ${item.name}.`; break; }
                 const currentStock = productStockData.sizes_stock?.[item.size] ?? 0;
                 if (item.quantity > currentStock) { stockValidationError = `نفدت الكمية لـ "${item.name}" (${item.size}). المتوفر: ${currentStock}.`; break; }
            }
            if (stockValidationError) { error = stockValidationError; submitting = false; return; }

            const orderPayload = { customer_name: customerName.trim(), customer_phone: customerPhone.trim(), customer_address: customerAddress.trim(), order_details: basketItems.map(item => ({ productId: item.productId, productName: item.name, size: item.size, quantity: item.quantity, price: item.price, imageUrl: item.imageUrl })), status: 'new', total_price: totalPrice };
			const { error: insertError } = await supabase.from('orders').insert([orderPayload]); if (insertError) throw insertError;
            successMessage = 'تم إرسال طلبك بنجاح! سنتواصل معك قريباً.';
			setTimeout(() => { basketStore.clearBasket(); closeView(); }, 2500);
		} catch (err: any) { console.error('Order submission error:', err); if (err.message.includes('violates')) { error = 'خطأ في الأذونات.'; } else { error = err.message || 'حدث خطأ غير متوقع.'; } }
        finally { submitting = false; }
	}
</script>

<!-- HTML Template (Only change might be displaying item.maxStock in qty adjuster if needed) -->
<div class="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fadeIn sm:items-center" on:click|self={closeView} role="dialog" aria-modal="true" aria-labelledby="basket-title">
	<div class="relative flex flex-col w-full max-w-lg rounded-t-xl border-t border-l border-r border-purple-900/30 bg-gradient-to-br from-gray-950 via-black to-gray-950 shadow-2xl shadow-purple-950/30 max-h-[95vh] sm:rounded-xl sm:border-b sm:max-h-[90vh] animate-slideUp">
        <div class="flex items-center justify-between p-4 border-b border-purple-900/30 flex-shrink-0"> <h2 id="basket-title" class="text-xl font-semibold text-purple-300 title-glow">🛒 سلة التسوق ({totalItems})</h2> <button type="button" on:click={closeView} aria-label="Close" class="p-1 text-gray-500 transition hover:text-red-400"> <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg> </button> </div>
        <div class="flex-grow overflow-y-auto p-4 space-y-4"> {#if basketItems.length === 0} <p class="text-center text-gray-400 py-10">سلتك فارغة حالياً.</p> {:else} {#each basketItems as item (item.uniqueId)} <div class="flex items-center gap-3 border-b border-gray-800/60 pb-3 last:border-b-0"> <img src={item.imageUrl || '/placeholder.png'} alt={item.name} class="h-16 w-16 rounded-md object-cover border border-gray-700 flex-shrink-0"> <div class="flex-grow space-y-1"> <h3 class="font-semibold text-white">{item.name} <span class="text-sm text-gray-400">({item.size})</span></h3> <p class="text-sm text-purple-400">{item.price} شيكل</p> <div class="flex items-center gap-2"> <button type="button" on:click={() => updateQuantity(item.uniqueId, -1)} class="qty-button" aria-label="Decrease quantity">-</button> <span class="w-8 text-center font-medium">{item.quantity}</span> <button type="button" on:click={() => updateQuantity(item.uniqueId, 1)} class="qty-button" aria-label="Increase quantity">+</button> <span class="text-xs text-gray-500">(المتوفر: {item.maxStock})</span> </div> </div> <button type="button" on:click={() => removeItem(item.uniqueId)} class="text-gray-500 hover:text-red-500 transition ml-auto p-1 flex-shrink-0" aria-label="Remove item"> <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> </svg> </button> </div> {/each} {/if} </div>
        {#if basketItems.length > 0} <div class="flex-shrink-0 border-t border-purple-900/30 p-4 space-y-4"> <div class="flex justify-between font-semibold text-lg"> <span class="text-gray-300">المجموع:</span> <span class="text-purple-300">{totalPrice} شيكل</span> </div> <hr class="border-gray-700"> <div> <label for="basketCustomerName" class="label">الاسم <span class="text-red-500">*</span></label> <input type="text" id="basketCustomerName" bind:value={customerName} required class="input-field" placeholder="الاسم الكامل" /> </div> <div> <label for="basketCustomerPhone" class="label">رقم الهاتف <span class="text-red-500">*</span></label> <input type="tel" id="basketCustomerPhone" bind:value={customerPhone} required class="input-field ltr-input" placeholder="05xxxxxxxx" /> </div> <div> <label for="basketCustomerAddress" class="label">العنوان بالتفصيل <span class="text-red-500">*</span></label> <textarea id="basketCustomerAddress" bind:value={customerAddress} required rows="2" class="input-field" placeholder="المدينة - الشارع - أقرب معلم"></textarea> </div> {#if error} <p class="rounded border border-red-700 bg-red-900/60 p-3 text-center text-red-300 text-sm"> {error} </p> {/if} {#if successMessage} <p class="rounded border border-green-700 bg-green-900/60 p-3 text-center text-green-300 text-sm"> {successMessage} </p> {/if} <p class="pt-1 text-center text-sm text-yellow-300/80"> <svg xmlns="http://www.w3.org/2000/svg" class="inline h-4 w-4 align-text-bottom ml-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h12v6h2V6a2 2 0 00-2-2H4zm0 6a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H4zm4 4a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg> الدفع عند الاستلام </p> <button type="button" on:click={handleOrderSubmit} disabled={submitting} class="w-full rounded-md bg-gradient-to-r from-green-600 to-green-800 px-5 py-3 text-base font-medium text-white shadow-lg shadow-green-900/30 transition duration-150 ease-in-out hover:scale-[1.02] hover:from-green-500 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed glow-effect"> {#if submitting} <span class="animate-pulse">جاري إرسال الطلب...</span> {:else} إتمام الطلب {/if} </button> </div> {/if}
	</div>
</div>

<style> .label { @apply mb-1 block text-sm font-medium text-gray-300; } .input-field { @apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none; } .ltr-input { direction: ltr; text-align: left; } .title-glow { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); } .qty-button { @apply h-6 w-6 rounded border border-gray-600 bg-gray-700 text-gray-300 transition hover:bg-purple-700 hover:border-purple-600; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; } @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } .animate-slideUp { animation: fadeIn 0.3s ease-out forwards; } @screen sm { .animate-slideUp { animation: slideUp 0.3s ease-out forwards; } } </style>