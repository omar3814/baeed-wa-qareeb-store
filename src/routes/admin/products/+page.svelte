<!-- === Code for src/routes/admin/products/+page.svelte === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Product } from '$lib/types'; // We'll define this type soon
	import ProductForm from '$lib/components/admin/ProductForm.svelte'; // We'll create this component next

	let products: Product[] = []; // Array to hold the products fetched from DB
	let loading = true; // Flag for loading state
	let error: string | null = null; // To store any error messages
	let showForm = false; // Flag to control visibility of the ProductForm modal
	let productToEdit: Product | null = null; // Holds product data when editing

	// Function to fetch products from Supabase
	async function fetchProducts() {
		console.log('[Products Page] Fetching products...');
		loading = true;
		error = null;
		try {
			// Select all columns from the 'products' table, order by creation date descending
			const { data, error: dbError } = await supabase
				.from('products')
				.select('*')
				.order('created_at', { ascending: false });

			if (dbError) throw dbError; // Throw error if Supabase returns one

			products = data || []; // Update the products array, default to empty array if data is null
			console.log('[Products Page] Products fetched:', products.length);
		} catch (err: any) {
			error = 'حدث خطأ أثناء جلب المنتجات: ' + err.message;
			console.error('[Products Page] Fetch products error:', err);
		} finally {
			loading = false; // Set loading to false when done
		}
	}

	// Function to handle deleting a product
	async function deleteProduct(id: string, imagesToDelete: string[] | null | undefined) {
		// Show confirmation dialog
		if (!confirm('هل أنت متأكدة من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) {
			return; // Stop if user cancels
		}

		console.log(`[Products Page] Attempting to delete product ${id}`);
		try {
			// --- Step 1 (Optional but Recommended): Delete associated images from Storage ---
			if (imagesToDelete && imagesToDelete.length > 0) {
				// Extract filenames from URLs (assuming URLs are public Supabase storage URLs)
				const filePaths = imagesToDelete.map(url => {
                    try {
                        // Attempt to parse the URL and get the path part after the bucket name
                        const urlParts = new URL(url);
                        const pathParts = urlParts.pathname.split('/');
                        // The actual path within the bucket is usually the last part(s) after '/object/public/bucket-name/'
                        // This might need adjustment based on your exact URL structure.
                        // Find the index of the bucket name
                        const bucketNameIndex = pathParts.indexOf('product-images');
                        if (bucketNameIndex !== -1 && bucketNameIndex < pathParts.length - 1) {
                           return pathParts.slice(bucketNameIndex + 1).join('/');
                        }
                        return null; // Could not parse path reliably
                    } catch (e) {
                        console.error("Error parsing image URL for deletion:", url, e);
                        return null; // Skip if URL is invalid
                    }
                }).filter(path => path !== null) as string[]; // Filter out nulls and assert as string array


				if (filePaths.length > 0) {
                    console.log('[Products Page] Deleting image files from storage:', filePaths);
					const { data: storageData, error: storageError } = await supabase.storage
						.from('product-images') // Your bucket name
						.remove(filePaths);

					if (storageError) {
						// Log storage error but maybe proceed with DB deletion anyway? Or stop?
						console.error('[Products Page] Error deleting images from storage:', storageError);
						// Optionally: alert('Could not delete associated images, but proceeding with product deletion.');
                        // Or: throw new Error('Failed to delete product images.'); // To stop the process
					} else {
                        console.log('[Products Page] Images deleted from storage successfully:', storageData);
                    }
                }
			}

			// --- Step 2: Delete the product record from the database ---
			const { error: deleteError } = await supabase.from('products').delete().match({ id });

			if (deleteError) throw deleteError; // Throw error if DB deletion fails

			console.log(`[Products Page] Product ${id} deleted successfully from database.`);

            // UI Update: Remove the product locally immediately for responsiveness.
            // The realtime listener will eventually confirm this change from the DB broadcast.
			products = products.filter((p) => p.id !== id);

		} catch (err: any) {
			alert('حدث خطأ أثناء حذف المنتج: ' + err.message);
			console.error('[Products Page] Delete product error:', err);
		}
	}

	// Function to open the form for editing an existing product
	function openEditForm(product: Product) {
		productToEdit = product; // Set the product data to pass to the form
		showForm = true; // Show the form modal
	}

	// Function to open the form for adding a new product
	function openAddForm() {
		productToEdit = null; // Ensure no existing data is passed for adding
		showForm = true; // Show the form modal
	}

	// Function to handle the 'close' event emitted by the ProductForm component
	function handleFormClose(event: CustomEvent<{ success: boolean }>) {
		console.log('[Products Page] ProductForm closed. Success:', event.detail.success);
		showForm = false; // Hide the form modal
		productToEdit = null; // Clear editing state

		// If the form indicated success (product added/updated), we might refetch.
        // However, the realtime subscription should handle updates automatically.
        // A manual refetch can be a fallback if realtime seems unreliable.
		// if (event.detail.success) {
		//     fetchProducts();
		// }
	}

	// --- Realtime Subscription ---
	// onMount runs once when the component loads in the browser
	onMount(() => {
		fetchProducts(); // Fetch initial list of products

		// Set up the Supabase realtime channel
		const channel = supabase
			.channel('public:products') // Unique channel name
			.on<Product>( // Specify the type of payload expected (Product)
				'postgres_changes', // Listen to database changes
				{
					event: '*', // Listen for INSERT, UPDATE, DELETE
					schema: 'public',
					table: 'products' // Specify the table
				},
				(payload) => {
					// This function runs whenever a change happens on the 'products' table
					console.log('[Products Page] Realtime change received!', payload);

					// Update the local 'products' array based on the event type
					if (payload.eventType === 'INSERT') {
						// Add the new product to the beginning of the array
                        // Make sure the new record is not already in the list (avoids duplicates if fetch runs too)
                        if (!products.some(p => p.id === payload.new.id)) {
						    products = [payload.new, ...products];
                        }
					} else if (payload.eventType === 'UPDATE') {
						// Find the product in the array and replace it with the updated data
						products = products.map((p) => (p.id === payload.new.id ? payload.new : p));
					} else if (payload.eventType === 'DELETE') {
						// Remove the deleted product from the array
						products = products.filter((p) => p.id !== payload.old.id);
					}
				}
			)
			.subscribe((status, err) => {
                // Optional: Log subscription status changes or errors
                if (status === 'SUBSCRIBED') {
                    console.log('[Products Page] Realtime channel subscribed successfully!');
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    console.error(`[Products Page] Realtime channel error/closed: ${status}`, err);
                    // Optionally: Attempt to resubscribe or notify the user
                }
            });

		// Cleanup function: Runs when the component is destroyed
		return () => {
			console.log('[Products Page] Unsubscribing from realtime channel.');
			supabase.removeChannel(channel); // Important to remove the channel
		};
	});
</script>

<svelte:head>
	<title>إدارة المنتجات - بعيد وقريب</title>
</svelte:head>

<!-- Header Section for the Page -->
<div class="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
	<h2 class="text-2xl font-semibold text-purple-300/90 title-glow">🛍️ المنتجات</h2>
	<button
		on:click={openAddForm}
		class="transform rounded-md bg-gradient-to-r from-green-600 to-green-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-900/30 transition duration-300 ease-in-out hover:scale-105 hover:from-green-500 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 glow-effect"
	>
		+ إضافة منتج جديد
	</button>
</div>

<!-- Loading State -->
{#if loading}
	<p class="text-center text-purple-300/70">جاري تحميل المنتجات...</p>
<!-- Error State -->
{:else if error}
	<p class="rounded border border-red-700 bg-red-900/50 p-4 text-center text-red-300">{error}</p>
<!-- Empty State -->
{:else if products.length === 0}
	<p class="text-center text-gray-400">لم تتم إضافة أي منتجات بعد. إضغطي على "إضافة منتج جديد" للبدء.</p>
<!-- Product Table -->
{:else}
	<div class="overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-950/30 shadow-md">
		<table class="min-w-full table-auto text-sm text-left text-gray-300">
			<thead class="bg-gray-800/50 text-xs uppercase text-purple-300/80">
				<tr>
					<th scope="col" class="px-4 py-3 text-center sm:px-6">الصورة</th>
					<th scope="col" class="px-4 py-3 sm:px-6">الاسم</th>
					<th scope="col" class="px-4 py-3 sm:px-6">السعر</th>
					<th scope="col" class="px-4 py-3 text-center sm:px-6 sm:text-right">المقاسات/المخزون</th>
					<th scope="col" class="px-4 py-3 text-center sm:px-6">الإجراءات</th>
				</tr>
			</thead>
			<tbody>
				{#each products as product (product.id)}
					<tr class="border-b border-gray-700/50 transition duration-150 ease-in-out hover:bg-gray-800/60">
						<!-- Image -->
						<td class="px-4 py-3 text-center sm:px-6">
							{#if product.images && product.images.length > 0}
								<img
									src={product.images[0]}
									alt={product.name}
									class="mx-auto h-14 w-14 rounded-md object-cover shadow-sm"
                                    loading="lazy"
								/>
							{:else}
								<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-gray-700/50 text-xs text-gray-500">
									لا صورة
								</div>
							{/if}
						</td>
						<!-- Name -->
						<th scope="row" class="whitespace-nowrap px-4 py-3 font-medium text-white sm:px-6">
							{product.name}
						</th>
						<!-- Price -->
						<td class="px-4 py-3 sm:px-6">{product.price}</td>
						<!-- Sizes/Stock -->
						<td class="px-4 py-3 sm:px-6">
							{#if product.sizes_stock && Object.keys(product.sizes_stock).length > 0}
								<ul class="space-y-0.5 text-xs">
									{#each Object.entries(product.sizes_stock) as [size, stock]}
										<li class:text-red-500={stock <= 0} class:text-gray-400={stock > 0}>
                                            <span class="font-mono">{size}:</span> {stock}
                                            {#if stock <= 0} (نفدت){/if}
                                        </li>
									{/each}
								</ul>
							{:else}
								<span class="text-xs text-gray-500">غير محدد</span>
							{/if}
						</td>
						<!-- Actions -->
						<td class="whitespace-nowrap px-4 py-3 text-center sm:px-6">
							<button
								on:click={() => openEditForm(product)}
								class="mr-3 font-medium text-blue-400 transition hover:text-blue-300 hover:underline"
								>تعديل</button
							>
							<button
								on:click={() => deleteProduct(product.id, product.images)}
								class="font-medium text-red-500 transition hover:text-red-400 hover:underline"
								>حذف</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<!-- Product Form Modal/Component -->
<!-- This renders the form component when showForm is true -->
{#if showForm}
	<ProductForm productData={productToEdit} on:close={handleFormClose} />
{/if}


<style>
    /* Reuse glow effect for title */
    .title-glow {
		text-shadow: 0 0 8px rgba(216, 180, 254, 0.4);
	}
</style>