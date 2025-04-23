<!-- === Code for src/routes/admin/orders/+page.svelte (Stock Update on Shipped/Cancelled) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

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
	let selectedStatusFilter: string = 'new';
	const statuses = ['new', 'processing', 'shipped', 'cancelled', 'all'];
    let updatingStatus: { [orderId: string]: boolean } = {};


	async function fetchOrders() {
		// Fetch logic remains the same...
        if (loading && orders.length > 0) return;
		loading = true; error = null;
		try {
            let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
            if (selectedStatusFilter !== 'all') { query = query.eq('status', selectedStatusFilter); }
            const { data, error: dbError } = await query;
            if (dbError) throw dbError;
            orders = data || [];
		} catch (err: any) { error = 'حدث خطأ أثناء جلب الطلبات: ' + err.message; console.error('Fetch orders error:', err); }
        finally { loading = false; }
	}

	// --- UPDATED Function to update order status & Adjust Stock ---
	async function updateStatus(orderId: string, newStatus: string) {
		if (!statuses.includes(newStatus) || newStatus === 'all') return;

        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) { alert('لم يتم العثور على الطلب لتحديثه.'); return; }

        const oldStatus = orderToUpdate.status;
        if (oldStatus === newStatus) return; // No change needed

		console.log(`[Orders Page] Updating order ${orderId} from status '${oldStatus}' to '${newStatus}'`);
        updatingStatus[orderId] = true; updatingStatus = updatingStatus;
        error = null; // Clear previous errors

        const details = orderToUpdate.order_details;
        const productId = details?.productId;
        const size = details?.size;
        const quantity = details?.quantity;
        let stockAdjustmentSuccessful = true; // Assume success initially

        // --- Stock Adjustment Logic ---
        try {
            let stockChange = 0;
            // DECREMENT stock if moving TO shipped FROM a state where stock wasn't taken yet (new, processing)
            if (newStatus === 'shipped' && (oldStatus === 'new' || oldStatus === 'processing')) {
                stockChange = -quantity!; // Use ! because quantity should exist if we reach here
                console.log(`[Orders Page] Order ${orderId} shipped. Decrementing stock by ${quantity}.`);
            }
            // INCREMENT stock if moving TO cancelled FROM a state where stock *was* previously taken (shipped, maybe processing depending on your rules)
            else if (newStatus === 'cancelled' && (oldStatus === 'shipped' || oldStatus === 'processing')) { // Adjust condition based on when you consider stock "taken"
                stockChange = +quantity!; // Use ! because quantity should exist
                console.log(`[Orders Page] Order ${orderId} cancelled after shipping/processing. Incrementing stock by ${quantity}.`);
            }

            // If a stock change is needed and we have details
            if (stockChange !== 0 && productId && size && quantity && quantity > 0) {
                // 1. Fetch current stock
                 console.log(`[Orders Page] Fetching current stock for product ${productId}`);
                 const { data: productData, error: fetchErr } = await supabase
                    .from('products')
                    .select('sizes_stock')
                    .eq('id', productId)
                    .single();

                if (fetchErr || !productData) throw new Error(`فشل جلب مخزون المنتج ${productId}: ${fetchErr?.message}`);

                // 2. Calculate new stock
                const currentStock = productData.sizes_stock || {};
                const currentSizeStock = currentStock[size] || 0;
                 // Safety check before decrementing: ensure stock wouldn't go negative
                if (stockChange < 0 && currentSizeStock < Math.abs(stockChange)) {
                     throw new Error(`لا يمكن شحن الطلب. المخزون غير كاف للمقاس ${size}. المتوفر: ${currentSizeStock}`);
                }
                const newSizeStock = currentSizeStock + stockChange;
                const newSizesStockData = { ...currentStock, [size]: newSizeStock };
                console.log(`[Orders Page] Product ${productId}, Size ${size}: Current stock ${currentSizeStock}, Change ${stockChange}, New stock ${newSizeStock}`);


                // 3. Update the product's stock
                 const { error: stockErr } = await supabase
                    .from('products')
                    .update({ sizes_stock: newSizesStockData })
                    .match({ id: productId });

                 if (stockErr) throw new Error(`فشل تحديث المخزون: ${stockErr.message}`);
                 console.log(`[Orders Page] Stock updated successfully for product ${productId}, size ${size}.`);

            } else if (stockChange !== 0) {
                // If stock change was needed but details were missing
                 console.warn(`[Orders Page] Cannot adjust stock for order ${orderId}: Missing product details (ID: ${productId}, Size: ${size}, Qty: ${quantity})`);
                 throw new Error(`!! تنبيه !! لم يتم تحديث المخزون للطلب ${orderId} بسبب نقص تفاصيل المنتج.`);
            }
        } catch (stockErr: any) {
            stockAdjustmentSuccessful = false;
            console.error(`[Orders Page] Stock adjustment error for order ${orderId}:`, stockErr);
            error = `خطأ تحديث المخزون: ${stockErr.message}`; // Display stock error
            // Do not proceed with status update if decrementing stock failed
             if (stockChange < 0) {
                  updatingStatus[orderId] = false; updatingStatus = updatingStatus;
                  return; // Stop the entire status update
             }
             // If incrementing stock failed (less critical), we still update the order status but warn
             if (stockChange > 0) {
                 alert(`!! تنبيه !! تم إلغاء الطلب ${orderId} ولكن فشل إرجاع المخزون. الخطأ: ${stockErr.message}`);
             }
        }

        // --- Update Order Status (only if stock logic didn't stop us) ---
        if (stockAdjustmentSuccessful || stockChange >= 0) { // Proceed if stock update worked OR if returning stock failed (still cancel order)
            try {
                console.log(`[Orders Page] Updating order ${orderId} status to '${newStatus}' in database...`);
                const { error: statusUpdateError } = await supabase
                    .from('orders')
                    .update({ status: newStatus })
                    .match({ id: orderId });

                if (statusUpdateError) throw statusUpdateError;

                console.log(`[Orders Page] Order ${orderId} status updated successfully in DB.`);
                // Update local state immediately
                orders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);

            } catch (err: any) {
                alert(`!! فشل تحديث حالة الطلب ${orderId} في قاعدة البيانات !! الخطأ: ${err.message}`);
                console.error("[Orders Page] Status update database error:", err);
                fetchOrders(); // Refetch to ensure consistency if DB update failed
            }
        }

        updatingStatus[orderId] = false; updatingStatus = updatingStatus; // Clear loading state regardless
	}

	// --- Function to Delete Order (Unchanged) ---
	async function deleteOrder(orderId: string) { if (!confirm(`هل أنت متأكد من حذف الطلب رقم ${orderId}؟ لا يمكن التراجع.`)) { return; } updatingStatus[orderId] = true; updatingStatus = updatingStatus; try { const { error: deleteError } = await supabase.from('orders').delete().match({ id: orderId }); if (deleteError) throw deleteError; orders = orders.filter((o) => o.id !== orderId); } catch (err: any) { alert(`فشل حذف الطلب: ${err.message}`); console.error('Delete order error:', err); } finally { updatingStatus[orderId] = false; updatingStatus = updatingStatus; } }

	// --- Realtime Subscription and Mount logic (Unchanged) ---
	onMount(() => { const channel = supabase .channel('public:orders') .on<Order>( 'postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => { console.log('[Orders Page] Realtime Order change received!', payload); fetchOrders(); } ) .subscribe((status, err) => { if (err) console.error('[Orders Page] Orders Realtime error:', err); }); return () => { supabase.removeChannel(channel); }; });
	$: fetchOrders(selectedStatusFilter); // Refetch when filter changes

</script>

<svelte:head> <title>إدارة الطلبات - بعيد وقريب</title> </svelte:head>

<!-- Page Header -->
<div class="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"> <h2 class="text-2xl font-semibold text-purple-300/90 title-glow">📋 إدارة الطلبات</h2> <div class="flex items-center gap-2"> <label for="statusFilter" class="text-sm text-gray-300 flex-shrink-0">عرض حسب الحالة:</label> <select id="statusFilter" bind:value={selectedStatusFilter} class="input-field !w-auto !py-1.5 !text-sm !bg-gray-700/60 !border-gray-600" disabled={loading}> {#each statuses as statusValue} <option value={statusValue}> {#if statusValue === 'new'}جديد {:else if statusValue === 'processing'}قيد التجهيز {:else if statusValue === 'shipped'}تم الشحن {:else if statusValue === 'cancelled'}ملغي {:else if statusValue === 'all'}الكل {/if} </option> {/each} </select> </div> </div>

<!-- Content Area -->
{#if loading && orders.length === 0} <p class="text-center text-purple-300/70 animate-pulse py-10">جاري تحميل الطلبات...</p>
{:else if error} <p class="rounded border border-red-700 bg-red-900/50 p-4 text-center text-red-300">{error}</p>
{:else if orders.length === 0 && !loading} <p class="rounded border border-gray-700 bg-gray-800/40 p-6 text-center text-xl text-gray-400"> 😕 لا توجد طلبات للعرض {selectedStatusFilter !== 'all' ? `بالحالة '${selectedStatusFilter}'` : ''}. </p>
{:else}
	<!-- Orders Table Wrapper -->
	<div class="overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-950/30 shadow-md relative">
        {#if loading} <div class="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg"> <p class="text-purple-300/70 animate-pulse">جاري التحديث...</p> </div> {/if}
		<table class="min-w-full table-auto text-sm text-left text-gray-300 align-top">
			<thead class="bg-gray-800/50 text-xs uppercase text-purple-300/80 sticky top-0 z-[5]"> <tr> <th scope="col" class="px-4 py-3 text-center">المنتج</th> <th scope="col" class="px-4 py-3 whitespace-nowrap">تاريخ الطلب</th> <th scope="col" class="px-4 py-3">اسم الزبون</th> <th scope="col" class="px-4 py-3">الهاتف</th> <th scope="col" class="px-4 py-3">العنوان</th> <th scope="col" class="px-4 py-3">تفاصيل المنتج</th> <th scope="col" class="px-4 py-3 text-center">الحالة</th> <th scope="col" class="px-4 py-3 text-center whitespace-nowrap">إجراءات</th> </tr> </thead>
			<tbody class:opacity-50={loading}>
				{#each orders as order (order.id)}
					<tr class="border-b border-gray-700/50 hover:bg-gray-800/60" class:opacity-40={updatingStatus[order.id]}>
                        <td class="px-4 py-3 text-center"> {#if order.order_details?.imageUrl} <img src={order.order_details.imageUrl} alt={order.order_details?.productName || 'Product'} class="h-14 w-14 object-cover rounded-md inline-block shadow-sm"> {:else} <div class="h-14 w-14 bg-gray-700 rounded-md inline-flex items-center justify-center text-xs text-gray-500">?</div> {/if} </td>
						<td class="px-4 py-3 whitespace-nowrap">{new Date(order.created_at).toLocaleString('ar-EG', {dateStyle: 'short', timeStyle: 'short'})}</td>
						<td class="px-4 py-3">{order.customer_name}</td>
						<td class="px-4 py-3 whitespace-nowrap ltr-input">{order.customer_phone}</td>
                        <td class="px-4 py-3 text-xs">{order.customer_address}</td>
						<td class="px-4 py-3 text-xs"> {order.order_details?.productName || 'N/A'} ({order.order_details?.size || 'N/A'}) <br> <span class="text-gray-400">الكمية:</span> {order.order_details?.quantity || 'N/A'} / <span class="text-gray-400">السعر:</span> {order.order_details?.price || 'N/A'} <br> <span class="font-semibold">الإجمالي: {order.total_price}</span> </td>
                        <td class="px-4 py-3 text-center whitespace-nowrap"> <span class="px-2 py-0.5 rounded-full text-xs font-medium" class:bg-blue-900={order.status === 'new'} class:text-blue-200={order.status === 'new'} class:bg-yellow-800={order.status === 'processing'} class:text-yellow-100={order.status === 'processing'} class:bg-green-800={order.status === 'shipped'} class:text-green-100={order.status === 'shipped'} class:bg-red-800={order.status === 'cancelled'} class:text-red-200={order.status === 'cancelled'} > {#if order.status === 'new'}جديد {:else if order.status === 'processing'}قيد التجهيز {:else if order.status === 'shipped'}تم الشحن {:else if order.status === 'cancelled'}ملغي {:else}{order.status} {/if} </span> </td>
						<td class="px-4 py-3 text-center whitespace-nowrap space-y-2">
                            <select on:change={(e) => updateStatus(order.id, e.currentTarget.value)} value={order.status} class="input-field !w-full !py-1 !px-2 !text-xs !bg-gray-700/50 !border-gray-600 block" disabled={updatingStatus[order.id]}> {#each statuses.filter(s => s !== 'all') as statusValue} <option value={statusValue} selected={order.status === statusValue}> {#if statusValue === 'new'}جديد {:else if statusValue === 'processing'}قيد التجهيز {:else if statusValue === 'shipped'}تم الشحن {:else if statusValue === 'cancelled'}ملغي {/if} </option> {/each} </select>
                            <button on:click={() => deleteOrder(order.id)} class="text-red-500 hover:text-red-400 text-xs block w-full text-center hover:underline transition duration-150 disabled:opacity-50" disabled={updatingStatus[order.id]}> حذف الطلب </button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style> .title-glow { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); } .input-field { @apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none; } .ltr-input { direction: ltr; text-align: left; } tbody td, tbody th { vertical-align: top; padding-top: 0.75rem; padding-bottom: 0.75rem; } </style>