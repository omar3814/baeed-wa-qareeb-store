<!-- === Code for src/routes/admin/products/+page.svelte (with Currency) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Product } from '$lib/types';
	import ProductForm from '$lib/components/admin/ProductForm.svelte';

	let products: Product[] = [];
	let loading = true;
	let error: string | null = null;
	let showForm = false;
	let productToEdit: Product | null = null;

	async function fetchProducts() { /* Function unchanged */ loading = true; error = null; try { const { data, error: dbError } = await supabase .from('products') .select('*') .order('created_at', { ascending: false }); if (dbError) throw dbError; products = data || []; } catch (err: any) { error = 'حدث خطأ أثناء جلب المنتجات: ' + err.message; console.error('Fetch products error:', err); } finally { loading = false; } }
	async function deleteProduct(id: string, imagesToDelete: string[] | null | undefined) { /* Function unchanged */ if (!confirm('هل أنت متأكدة من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) { return; } try { if (imagesToDelete && imagesToDelete.length > 0) { const filePaths = imagesToDelete.map(url => { try { const urlParts = new URL(url); const pathParts = urlParts.pathname.split('/'); const bucketNameIndex = pathParts.indexOf('product-images'); if (bucketNameIndex !== -1 && bucketNameIndex < pathParts.length - 1) { return pathParts.slice(bucketNameIndex + 1).join('/'); } return null; } catch (e) { console.error("Error parsing image URL:", url, e); return null; } }).filter(path => path !== null) as string[]; if (filePaths.length > 0) { const { error: storageError } = await supabase.storage.from('product-images').remove(filePaths); if (storageError) { console.error('Error deleting images:', storageError); /* Maybe alert user */ } } } const { error: deleteError } = await supabase.from('products').delete().match({ id }); if (deleteError) throw deleteError; products = products.filter((p) => p.id !== id); } catch (err: any) { alert('حدث خطأ أثناء حذف المنتج: ' + err.message); console.error('Delete product error:', err); } }
	function openEditForm(product: Product) { productToEdit = product; showForm = true; }
	function openAddForm() { productToEdit = null; showForm = true; }
	function handleFormClose(event: CustomEvent<{ success: boolean }>) { showForm = false; productToEdit = null; /* Realtime handles updates, fetch commented out */ /* if (event.detail.success) { fetchProducts(); } */ }

	// Realtime Subscription
	onMount(() => {
		fetchProducts();
		const channel = supabase.channel('public:products:admin') // Unique channel name for admin
			.on<Product>('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => { console.log('[Admin Products] Realtime change received!', payload); if (payload.eventType === 'INSERT') { if (!products.some(p => p.id === payload.new.id)) { products = [payload.new, ...products]; } } else if (payload.eventType === 'UPDATE') { products = products.map((p) => (p.id === payload.new.id ? payload.new : p)); } else if (payload.eventType === 'DELETE') { products = products.filter((p) => p.id !== payload.old.id); } })
			.subscribe((status, err) => { if (err) console.error("Realtime admin products error", err); });
		return () => { supabase.removeChannel(channel); };
	});
</script>

<svelte:head> <title>إدارة المنتجات - بعيد وقريب</title> </svelte:head>

<!-- Header Section -->
<div class="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
	<h2 class="text-2xl font-semibold text-purple-300/90 title-glow">🛍️ المنتجات</h2>
	<button on:click={openAddForm} class="transform rounded-md bg-gradient-to-r from-green-600 to-green-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-900/30 transition duration-300 ease-in-out hover:scale-105 hover:from-green-500 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 glow-effect" > + إضافة منتج جديد </button>
</div>

<!-- Content Area -->
{#if loading} <p class="text-center text-purple-300/70">جاري تحميل المنتجات...</p>
{:else if error} <p class="rounded border border-red-700 bg-red-900/50 p-4 text-center text-red-300">{error}</p>
{:else if products.length === 0} <p class="text-center text-gray-400">لم تتم إضافة أي منتجات بعد.</p>
{:else}
	<!-- Product Table -->
	<div class="overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-950/30 shadow-md">
		<table class="min-w-full table-auto text-sm text-left text-gray-300">
			<thead class="bg-gray-800/50 text-xs uppercase text-purple-300/80">
				<tr> <th scope="col" class="px-4 py-3 text-center sm:px-6">الصورة</th> <th scope="col" class="px-4 py-3 sm:px-6">الاسم</th> <th scope="col" class="px-4 py-3 sm:px-6">السعر</th> <th scope="col" class="px-4 py-3 text-center sm:px-6 sm:text-right">المقاسات/المخزون</th> <th scope="col" class="px-4 py-3 text-center sm:px-6">الإجراءات</th> </tr>
			</thead>
			<tbody>
				{#each products as product (product.id)}
					<tr class="border-b border-gray-700/50 transition duration-150 ease-in-out hover:bg-gray-800/60">
						<td class="px-4 py-3 text-center sm:px-6"> {#if product.images && product.images.length > 0} <img src={product.images[0]} alt={product.name} class="mx-auto h-14 w-14 rounded-md object-cover shadow-sm" loading="lazy"/> {:else} <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-gray-700/50 text-xs text-gray-500"> لا صورة </div> {/if} </td>
						<th scope="row" class="whitespace-nowrap px-4 py-3 font-medium text-white sm:px-6"> {product.name} </th>
						<td class="px-4 py-3 sm:px-6">{product.price} <span class="text-xs text-gray-400">شيكل</span></td> <!-- ADDED CURRENCY -->
						<td class="px-4 py-3 sm:px-6"> {#if product.sizes_stock && Object.keys(product.sizes_stock).length > 0} <ul class="space-y-0.5 text-xs"> {#each Object.entries(product.sizes_stock) as [size, stock]} <li class:text-red-500={stock <= 0} class:text-gray-400={stock > 0}> <span class="font-mono">{size}:</span> {stock} {#if stock <= 0} (نفدت){/if} </li> {/each} </ul> {:else} <span class="text-xs text-gray-500">غير محدد</span> {/if} </td>
						<td class="whitespace-nowrap px-4 py-3 text-center sm:px-6"> <button on:click={() => openEditForm(product)} class="mr-3 font-medium text-blue-400 transition hover:text-blue-300 hover:underline">تعديل</button> <button on:click={() => deleteProduct(product.id, product.images)} class="font-medium text-red-500 transition hover:text-red-400 hover:underline">حذف</button> </td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<!-- Product Form Modal -->
{#if showForm} <ProductForm productData={productToEdit} on:close={handleFormClose} /> {/if}

<style> .title-glow { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); } </style>