<!-- === Code for src/routes/admin/orders/+page.svelte (with Stock Return & Deduction) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	// Define a type for orders locally
	interface Order {
		id: string;
		created_at: string;
		customer_name: string;
		customer_phone: string;
		customer_address: string;
		order_details: {
			productId?: string;
			productName?: string;
			size?: string;
			quantity?: number;
			price?: number;
			imageUrl?: string;
		};
		status: string;
		total_price: number;
	}

	let orders: Order[] = [];
	let loading = true;
	let error: string | null = null;
	let selectedStatusFilter: string = 'new'; // Default filter
	const statuses = ['new', 'processing', 'shipped', 'cancelled', 'all'];
	let updatingStatus: { [orderId: string]: boolean } = {}; // Track loading state per order

	async function fetchOrders() {
		if (loading && orders.length > 0) return;
		loading = true;
		error = null;
		console.log(`[Orders Page] Fetching orders with status: ${selectedStatusFilter}`);
		try {
			let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
			if (selectedStatusFilter !== 'all') {
				query = query.eq('status', selectedStatusFilter);
			}
			const { data, error: dbError } = await query;
			if (dbError) throw dbError;
			orders = data || [];
			console.log(`[Orders Page] Fetched ${orders.length} orders.`);
		} catch (err: any) {
			error = 'حدث خطأ أثناء جلب الطلبات: ' + err.message;
			console.error('[Orders Page] Fetch orders error:', err);
		} finally {
			loading = false;
		}
	}

	// --- UPDATED Function to update order status (handles stock return AND deduction) ---
	async function updateStatus(orderId: string, newStatus: string) {
		if (!statuses.includes(newStatus) || newStatus === 'all') return;

		const orderToUpdate = orders.find((o) => o.id === orderId);
		if (!orderToUpdate) {
			console.error(`[Orders Page] Could not find order ${orderId} locally to update status.`);
			alert('لم يتم العثور على الطلب لتحديثه.');
			return;
		}

		const oldStatus = orderToUpdate.status;
		if (oldStatus === newStatus) {
			console.log(`[Orders Page] Status for order ${orderId} is already ${newStatus}. No update needed.`);
			// Reset the dropdown visually if needed (though binding should handle it)
            const selectEl = document.querySelector(`select[data-order-id="${orderId}"]`) as HTMLSelectElement | null;
            if(selectEl) selectEl.value = oldStatus;
			return;
		}

		console.log(`[Orders Page] Updating order ${orderId} from status '${oldStatus}' to '${newStatus}'`);
		updatingStatus[orderId] = true;
		updatingStatus = updatingStatus;

		let stockUpdateErrorOccurred = false;
		let stockCheckPassed = true; // Assume stock check passes unless it fails

		// --- Stock Adjustment Logic ---
		const details = orderToUpdate.order_details;
		const productId = details?.productId;
		const size = details?.size;
		const quantity = details?.quantity;

		// Check if we have details needed for stock adjustment
		if (productId && size && quantity && quantity > 0) {
			// --- Scenario 1: Moving TO 'cancelled' ---
			if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
				console.log(`[Orders Page] Order ${orderId} cancelled. Returning stock.`);
				try {
					const { data: productData, error: fetchErr } = await supabase
						.from('products').select('sizes_stock').eq('id', productId).single();
					if (fetchErr) throw new Error(`Failed to fetch product stock: ${fetchErr.message}`);
					if (!productData) throw new Error(`Product ${productId} not found.`);

					const currentStock = productData.sizes_stock || {};
					const currentSizeStock = currentStock[size] || 0;
					const newSizeStock = currentSizeStock + quantity; // ADD stock back
					const newSizesStockData = { ...currentStock, [size]: newSizeStock };

					console.log(`[Orders Page] Returning Stock - Product ${productId}, Size ${size}: Current ${currentSizeStock}, Returning ${quantity}, New ${newSizeStock}`);
					const { error: stockErr } = await supabase
						.from('products').update({ sizes_stock: newSizesStockData }).match({ id: productId });
					if (stockErr) throw new Error(`Failed to update product stock: ${stockErr.message}`);
					console.log(`[Orders Page] Stock returned successfully.`);

				} catch (stockErr: any) {
					stockUpdateErrorOccurred = true;
					console.error(`[Orders Page] CRITICAL: Failed to return stock for cancelled order ${orderId}:`, stockErr);
					alert(`!! تنبيه !! تم إلغاء الطلب ${orderId} ولكن فشل تحديث المخزون. يرجى التحقق يدوياً. الخطأ: ${stockErr.message}`);
				}
			}
			// --- Scenario 2: Moving FROM 'cancelled' TO an active status ---
			else if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
				console.log(`[Orders Page] Order ${orderId} un-cancelled. Deducting stock.`);
				try {
					// 1. Fetch current stock
					console.log(`[Orders Page] Fetching current stock for product ${productId}`);
					const { data: productData, error: fetchErr } = await supabase
						.from('products').select('sizes_stock').eq('id', productId).single();
					if (fetchErr) throw new Error(`Failed to fetch product stock: ${fetchErr.message}`);
					if (!productData) throw new Error(`Product ${productId} not found.`);

					// 2. Check if enough stock exists NOW
					const currentStock = productData.sizes_stock || {};
					const currentSizeStock = currentStock[size] || 0;
                    console.log(`[Orders Page] Deducting Stock - Product ${productId}, Size ${size}: Current ${currentSizeStock}, Required ${quantity}`);

					if (currentSizeStock < quantity) {
                        stockCheckPassed = false; // Flag that check failed
						console.warn(`[Orders Page] Insufficient stock to un-cancel order ${orderId}. Available: ${currentSizeStock}, Required: ${quantity}`);
						alert(`لا يمكن إعادة تفعيل الطلب ${orderId}. لا يوجد مخزون كافي للمقاس ${size}. المتوفر حالياً: ${currentSizeStock}.`);
                        // Do NOT proceed with stock or status update
					} else {
						// 3. Calculate and Update stock if sufficient
						const newSizeStock = currentSizeStock - quantity; // DEDUCT stock
						const newSizesStockData = { ...currentStock, [size]: newSizeStock };
						console.log(`[Orders Page] Deducting Stock - New stock will be ${newSizeStock}`);
						const { error: stockErr } = await supabase
							.from('products').update({ sizes_stock: newSizesStockData }).match({ id: productId });
						if (stockErr) throw new Error(`Failed to update product stock: ${stockErr.message}`);
						console.log(`[Orders Page] Stock deducted successfully.`);
					}

				} catch (stockErr: any) {
					stockUpdateErrorOccurred = true; // Flag that stock update logic failed
                    stockCheckPassed = false; // Assume check failed if any error occurred during check/deduction
					console.error(`[Orders Page] CRITICAL: Failed to deduct stock for un-cancelled order ${orderId}:`, stockErr);
					alert(`!! تنبيه !! فشل تحديث المخزون عند محاولة إعادة تفعيل الطلب ${orderId}. لم يتم تغيير حالة الطلب. الخطأ: ${stockErr.message}`);
					// Stop the process if stock deduction failed
				}
			}
		} else if (oldStatus === 'cancelled' || newStatus === 'cancelled') {
            // Log if stock adjustment was needed but details were missing
            console.warn(`[Orders Page] Cannot adjust stock for order ${orderId}: Missing product details (ID: ${productId}, Size: ${size}, Qty: ${quantity})`);
        }
		// --- End Stock Adjustment Logic ---


		// --- Update Order Status if Stock Check Passed ---
        // Only proceed to update the order status if the stock check passed (or wasn't needed)
        if (stockCheckPassed) {
            try {
                console.log(`[Orders Page] Updating order ${orderId} status to '${newStatus}' in database...`);
                const { error: statusUpdateError } = await supabase
                    .from('orders')
                    .update({ status: newStatus })
                    .match({ id: orderId });

                if (statusUpdateError) throw statusUpdateError; // Throw DB error

                console.log(`[Orders Page] Order ${orderId} status updated successfully in DB.`);
                // Update local state
                orders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);

            } catch (err: any) {
                alert(`!! فشل تحديث حالة الطلب ${orderId} في قاعدة البيانات !! الخطأ: ${err.message}`);
                console.error("[Orders Page] Status update database error:", err);
                fetchOrders(); // Refetch to get original state if DB update fails
            }
        } else {
             console.log(`[Orders Page] Order ${orderId} status update skipped due to failed stock check/update.`);
             // Reset the dropdown visually since the update didn't happen
             const selectEl = document.querySelector(`select[data-order-id="${orderId}"]`) as HTMLSelectElement | null;
             if(selectEl) selectEl.value = oldStatus;
             orders = [...orders]; // Trigger reactivity to maybe reset visual state if needed
        }

        // --- Final Cleanup ---
		updatingStatus[orderId] = false;
		updatingStatus = updatingStatus;
	}

	// Delete Order function remains the same
	async function deleteOrder(orderId: string) {
		if (!confirm(`هل أنت متأكد من حذف الطلب رقم ${orderId}؟ لا يمكن التراجع.`)) { return; }
		console.log(`[Orders Page] Deleting order ${orderId}`);
		updatingStatus[orderId] = true; updatingStatus = updatingStatus;
		try {
			const { error: deleteError } = await supabase.from('orders').delete().match({ id: orderId });
			if (deleteError) throw deleteError;
			orders = orders.filter((o) => o.id !== orderId);
			console.log(`[Orders Page] Order ${orderId} deleted.`);
		} catch (err: any) {
			alert(`فشل حذف الطلب: ${err.message}`);
			console.error('[Orders Page] Delete order error:', err);
		} finally {
             updatingStatus[orderId] = false; updatingStatus = updatingStatus;
        }
	}

	// Realtime/Mount/Filter logic remains the same
	onMount(() => {
		const channel = supabase.channel('public:orders')
			.on<Order>( 'postgres_changes', { event: '*', schema: 'public', table: 'orders' },
				(payload) => { console.log('[Orders Page] Realtime Order change received!', payload); fetchOrders(); } )
			.subscribe((status, err) => {
                 if (status === 'SUBSCRIBED') console.log('[Orders Page] Orders Realtime subscribed!');
                 if (err) console.error('[Orders Page] Orders Realtime error:', err);
            });
		return () => { supabase.removeChannel(channel); };
	});
	$: fetchOrders(selectedStatusFilter);

</script>

<svelte:head>
	<title>إدارة الطلبات - بعيد وقريب</title>
</svelte:head>

<!-- Page Header remains the same -->
<div class="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
	<h2 class="text-2xl font-semibold text-purple-300/90 title-glow">📋 إدارة الطلبات</h2>
    <div class="flex items-center gap-2">
        <label for="statusFilter" class="text-sm text-gray-300 flex-shrink-0">عرض حسب الحالة:</label>
        <select id="statusFilter" bind:value={selectedStatusFilter} class="input-field !w-auto !py-1.5 !text-sm !bg-gray-700/60 !border-gray-600" disabled={loading}>
            {#each statuses as statusValue} <option value={statusValue}> {#if statusValue === 'new'}جديد {:else if statusValue === 'processing'}قيد التجهيز {:else if statusValue === 'shipped'}تم الشحن {:else if statusValue === 'cancelled'}ملغي {:else if statusValue === 'all'}الكل {/if} </option> {/each}
        </select>
    </div>
</div>

<!-- Loading / Error / Empty states remain the same -->
{#if loading && orders.length === 0}
	<p class="text-center text-purple-300/70 animate-pulse py-10">جاري تحميل الطلبات...</p>
{:else if error}
	<p class="rounded border border-red-700 bg-red-900/50 p-4 text-center text-red-300">{error}</p>
{:else if orders.length === 0 && !loading}
	<p class="rounded border border-gray-700 bg-gray-800/40 p-6 text-center text-xl text-gray-400">
        😕 لا توجد طلبات للعرض {selectedStatusFilter !== 'all' ? `بالحالة '${selectedStatusFilter}'` : ''}.
    </p>
{:else}
	<!-- Orders Table Wrapper -->
	<div class="overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-950/30 shadow-md relative">
        {#if loading} <div class="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg"><p class="text-purple-300/70 animate-pulse">جاري التحديث...</p></div> {/if}
		<table class="min-w-full table-auto text-sm text-left text-gray-300 align-top">
			<thead class="bg-gray-800/50 text-xs uppercase text-purple-300/80 sticky top-0 z-[5]">
				<tr>
                    <th scope="col" class="px-4 py-3 text-center">المنتج</th>
					<th scope="col" class="px-4 py-3 whitespace-nowrap">تاريخ الطلب</th>
					<th scope="col" class="px-4 py-3">اسم الزبون</th>
					<th scope="col" class="px-4 py-3">الهاتف</th>
					<th scope="col" class="px-4 py-3">العنوان</th>
					<th scope="col" class="px-4 py-3">تفاصيل المنتج</th>
                    <th scope="col" class="px-4 py-3 text-center">الحالة</th>
					<th scope="col" class="px-4 py-3 text-center whitespace-nowrap">إجراءات</th>
				</tr>
			</thead>
			<tbody class:opacity-50={loading}>
				{#each orders as order (order.id)}
					<tr class="border-b border-gray-700/50 hover:bg-gray-800/60" class:opacity-40={updatingStatus[order.id]}>
                        <td class="px-4 py-3 text-center">
                            {#if order.order_details?.imageUrl} <img src={order.order_details.imageUrl} alt={order.order_details?.productName || 'Product'} class="h-14 w-14 object-cover rounded-md inline-block shadow-sm"> {:else} <div class="h-14 w-14 bg-gray-700 rounded-md inline-flex items-center justify-center text-xs text-gray-500">?</div> {/if}
                        </td>
						<td class="px-4 py-3 whitespace-nowrap">{new Date(order.created_at).toLocaleString('ar-EG', {dateStyle: 'short', timeStyle: 'short'})}</td>
						<td class="px-4 py-3">{order.customer_name}</td>
						<td class="px-4 py-3 whitespace-nowrap ltr-input">{order.customer_phone}</td>
                        <td class="px-4 py-3 text-xs">{order.customer_address}</td>
						<td class="px-4 py-3 text-xs"> {order.order_details?.productName || 'N/A'} ({order.order_details?.size || 'N/A'}) <br> <span class="text-gray-400">الكمية:</span> {order.order_details?.quantity || 'N/A'} / <span class="text-gray-400">السعر:</span> {order.order_details?.price || 'N/A'} <br> <span class="font-semibold">الإجمالي: {order.total_price}</span> </td>
                        <td class="px-4 py-3 text-center whitespace-nowrap">
                             <span class="px-2 py-0.5 rounded-full text-xs font-medium" class:bg-blue-900={order.status === 'new'} class:text-blue-200={order.status === 'new'} class:bg-yellow-800={order.status === 'processing'} class:text-yellow-100={order.status === 'processing'} class:bg-green-800={order.status === 'shipped'} class:text-green-100={order.status === 'shipped'} class:bg-red-800={order.status === 'cancelled'} class:text-red-200={order.status === 'cancelled'} > {#if order.status === 'new'}جديد {:else if order.status === 'processing'}قيد التجهيز {:else if order.status === 'shipped'}تم الشحن {:else if order.status === 'cancelled'}ملغي {:else}{order.status}{/if} </span>
                        </td>
						<td class="px-4 py-3 text-center whitespace-nowrap space-y-2">
                            <select data-order-id={order.id} on:change={(e) => updateStatus(order.id, e.currentTarget.value)} value={order.status} class="input-field !w-full !py-1 !px-2 !text-xs !bg-gray-700/50 !border-gray-600 block" disabled={updatingStatus[order.id]}>
                                {#each statuses.filter(s => s !== 'all') as statusValue} <option value={statusValue} selected={order.status === statusValue}> {#if statusValue === 'new'}جديد {:else if statusValue === 'processing'}قيد التجهيز {:else if statusValue === 'shipped'}تم الشحن {:else if statusValue === 'cancelled'}ملغي {/if} </option> {/each}
                            </select>
                            <button on:click={() => deleteOrder(order.id)} class="text-red-500 hover:text-red-400 text-xs block w-full text-center hover:underline transition duration-150 disabled:opacity-50" disabled={updatingStatus[order.id]}> حذف الطلب </button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
    /* Styles remain the same */
    .title-glow {	text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); }
    .input-field { @apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none; }
    .ltr-input { direction: ltr; text-align: left; }
    tbody td, tbody th { vertical-align: top; padding-top: 0.75rem; padding-bottom: 0.75rem; }
</style>