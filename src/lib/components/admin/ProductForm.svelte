<!-- === Code for src/lib/components/admin/ProductForm.svelte (Allow 2 Images) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Product } from '$lib/types';

	// --- Props & Dispatcher ---
	export let productData: Product | null = null;
	const dispatch = createEventDispatcher<{ close: { success: boolean } }>();

	// --- Basic Product State ---
	let name = productData?.name || '';
	let description = productData?.description || '';
	let price: number = productData?.price ?? 0;
	let managedSizes: { [size: string]: number } = JSON.parse(JSON.stringify(productData?.sizes_stock || { S: 0, M: 0, L: 0 }));

	// --- Category State ---
    interface CategoryOption { id: string; name: string; }
	let categories: CategoryOption[] = [];
	let selectedCategoryId: string | null = productData?.category_id || null;
    let loadingCategories = true;

	// --- Image State ---
	let imageFiles: FileList | null = null; // Holds newly selected files
    // Initialize with max 2 existing images
	let existingImages: string[] = [...(productData?.images?.slice(0, 2) || [])];

	// --- Loading & Error State ---
	let imageUploadLoading = false;
	let formLoading = false;
	let error: string | null = null;
	const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

	// --- Fetch Categories ---
	onMount(async () => { /* Category fetch logic unchanged */ loadingCategories = true; try { const { data, error: catError } = await supabase.from('categories').select('id, name').order('name'); if (catError) throw catError; categories = data || []; } catch (err) { console.error("Err loading categories:", err); error = "Fshl tHmyl alqsAm."; } finally { loadingCategories = false; } });

	// --- Size/Stock Functions (Unchanged) ---
	function updateStock(s:string,v:string){const k=parseInt(v,10);if(!isNaN(k))managedSizes[s]=Math.max(0,k);else if(v.trim()==='')managedSizes[s]=0;managedSizes=managedSizes;} function addSize(s:string){if(!managedSizes.hasOwnProperty(s)){managedSizes[s]=0;managedSizes=managedSizes;}} function removeSize(s:string){delete managedSizes[s];managedSizes=managedSizes;}

    // --- Image Handling (Limit to 2) ---
	async function handleImageUpload(): Promise<string[]> {
        let finalImageUrls: string[] = [...existingImages]; // Start with images user hasn't removed

        if (!imageFiles || imageFiles.length === 0) {
			return finalImageUrls.slice(0, 2); // Return max 2 existing if no new files
		}

        // Limit new uploads if combined with existing exceeds 2
        const filesToUpload = Array.from(imageFiles);
        const remainingSlots = 2 - finalImageUrls.length;
        if (filesToUpload.length > remainingSlots) {
            error = `يمكنك إضافة ${remainingSlots} صورة أخرى فقط (الحد الأقصى 2).`;
            // Optionally trim the filesToUpload array:
            // filesToUpload = filesToUpload.slice(0, remainingSlots);
             // For now, let's just show error and not upload extras if too many selected
             imageFiles = null; // Clear selection
             const fileInput = document.getElementById('images') as HTMLInputElement | null; if(fileInput) fileInput.value = '';
             return finalImageUrls; // Return only existing
        }


		imageUploadLoading = true; error = null; // Clear previous upload errors
		const uploadPromises = filesToUpload.map(async (file) => {
			const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
			try {
				const { data, error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
				if (uploadError) throw uploadError;
				const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
				return urlData.publicUrl || null;
			} catch (err: any) { console.error(`Failed to upload ${fileName}:`, err); error = `فشل رفع الصورة ${file.name}: ${err.message}`; return null; }
		});

		const results = await Promise.allSettled(uploadPromises);
		results.forEach(result => { if (result.status === 'fulfilled' && result.value) { finalImageUrls.push(result.value); } });

        imageUploadLoading = false; imageFiles = null;
        const fileInput = document.getElementById('images') as HTMLInputElement | null; if(fileInput) fileInput.value = '';

        // Ensure we only return max 2 URLs
		return finalImageUrls.slice(0, 2);
	}
	function removeExistingImage(urlToRemove: string) { existingImages = existingImages.filter(url => url !== urlToRemove); }

    // --- Form Submission Logic ---
	async function handleSubmit() {
		formLoading = true; error = null;
		// Validations (unchanged)
        if (!name.trim()) { error = 'اسم المنتج مطلوب.'; formLoading = false; return; }
		if (isNaN(price) || price < 0) { error = 'السعر رقم موجب.'; formLoading = false; return; }
		try {
			const finalImageUrls = await handleImageUpload(); // Gets max 2 URLs
            if (error) throw new Error("Image upload issue."); // Use existing error

			const productPayload = { name: name.trim(), description: description.trim() || null, price: price, images: finalImageUrls, sizes_stock: managedSizes, category_id: selectedCategoryId || null };

			let dbError: any;
			if (productData?.id) { const { error: uError } = await supabase.from('products').update(productPayload).match({ id: productData.id }); dbError = uError; }
            else { const { error: iError } = await supabase.from('products').insert([productPayload]); dbError = iError; }
			if (dbError) throw dbError;

			dispatch('close', { success: true });
		} catch (err: any) { error = error || ('حدث خطأ: ' + err.message); console.error('Form submit error:', err); }
        finally { formLoading = false; }
	}
	function closeForm() { dispatch('close', { success: false }); }
</script>

<!-- Modal Structure -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn" on:click|self={closeForm} role="dialog" aria-modal="true" aria-labelledby="form-title">
	<form on:submit|preventDefault={handleSubmit} class="relative w-full max-w-3xl rounded-xl border border-purple-900/30 bg-gradient-to-br from-gray-950 via-black to-gray-950 shadow-2xl shadow-purple-950/30 max-h-[90vh] overflow-y-auto">
         <button type="button" on:click={closeForm} aria-label="Close" class="absolute top-3 right-3 z-10 p-1 text-gray-500 transition hover:text-red-400"> <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg> </button>
         <h2 id="form-title" class="sticky top-0 z-[5] border-b border-purple-900/30 bg-gray-950/80 px-6 py-4 text-center text-xl font-semibold text-purple-300 backdrop-blur-sm title-glow"> {productData ? 'تعديل المنتج' : 'إضافة منتج جديد'} </h2>
         <div class="p-6 space-y-6">
            {#if error} <p class="animate-fadeIn rounded border border-red-700 bg-red-900/60 p-3 text-center text-sm text-red-300"> {error} </p> {/if}
			<div class="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
				<!-- Left Column -->
				<div class="space-y-5">
					<div> <label for="name" class="label">اسم المنتج <span class="text-red-500">*</span></label> <input type="text" id="name" bind:value={name} required class="input-field" /> </div>
                    <div> <label for="category" class="label">القسم (اختياري)</label> <select id="category" bind:value={selectedCategoryId} class="input-field" disabled={loadingCategories}> <option value={null}>-- اختر القسم --</option> {#if loadingCategories} <option disabled>جاري تحميل الأقسام...</option> {:else if categories.length > 0} {#each categories as category (category.id)} <option value={category.id}>{category.name}</option> {/each} {:else} <option disabled>لا توجد أقسام.</option> {/if} </select> </div>
                    <div> <label for="price" class="label" >السعر (أرقام فقط) <span class="text-red-500">*</span></label > <input type="number" id="price" bind:value={price} required min="0" step="any" class="input-field" /> </div>
					<div> <label for="description" class="label">الوصف (اختياري)</label> <textarea id="description" bind:value={description} rows="5" class="input-field"></textarea> </div>
				</div>
				<!-- Right Column -->
				<div class="space-y-5">
					<div>
						<label for="images" class="label">صور المنتج (حد أقصى صورتين)</label>
						{#if existingImages && existingImages.length > 0} <div class="mb-3 flex flex-wrap gap-3"> {#each existingImages as imgUrl (imgUrl)} <div class="relative group"> <img src={imgUrl} alt="صورة حالية" class="h-20 w-20 rounded-md object-cover shadow-md border-2 border-gray-700"/> <button type="button" on:click={() => removeExistingImage(imgUrl)} aria-label="Remove image" class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs opacity-80 transition hover:opacity-100 hover:scale-110" > × </button> </div> {/each} </div> {/if}
						<input type="file" id="images" on:change={(e) => imageFiles = e.currentTarget.files} multiple accept="image/png, image/jpeg, image/webp, image/gif" class="block w-full text-sm text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-purple-700/80 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-100 transition file:duration-150 hover:file:bg-purple-700 hover:file:cursor-pointer disabled:opacity-50" disabled={imageUploadLoading || formLoading || existingImages.length >= 2}/>
						{#if imageUploadLoading} <p class="mt-1.5 text-xs text-blue-400 animate-pulse">جاري رفع الصور...</p> {/if} <p class="mt-1.5 text-xs text-gray-500">يمكنك اختيار صور متعددة (حتى {2 - existingImages.length} متبقي).</p>
					</div>
					<div>
						<label class="label">المقاسات والمخزون <span class="text-red-500">*</span></label>
                        <div class="space-y-3 rounded-md border border-gray-700/80 bg-gray-950/30 p-3 max-h-48 overflow-y-auto"> {#each Object.entries(managedSizes) as [size, stock] (size)} <div class="flex items-center gap-2"> <span class="w-12 flex-shrink-0 text-sm font-medium text-gray-200">{size}:</span> <input type="number" aria-label={`Stock for size ${size}`} min="0" value={stock} on:input={(e) => updateStock(size, e.currentTarget.value)} class="input-field flex-grow p-1.5 text-sm" placeholder="الكمية"/> <button type="button" aria-label={`Remove size ${size}`} on:click={() => removeSize(size)} class="flex-shrink-0 text-xs text-red-500 transition hover:text-red-400"> حذف </button> </div> {/each} {#if Object.keys(managedSizes).length === 0} <p class="text-center text-xs text-gray-500 py-2">أضف مقاسات.</p> {/if} </div>
						<div class="mt-3 flex flex-wrap items-center gap-2"> <span class="text-sm text-gray-400">إضافة مقاس:</span> {#each availableSizes as size} {#if !managedSizes.hasOwnProperty(size)} <button type="button" on:click={() => addSize(size)} class="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 transition hover:bg-purple-800 hover:text-white"> {size} </button> {/if} {/each} </div>
					</div>
				</div>
			</div>
         </div>
		<div class="sticky bottom-0 z-[5] mt-6 flex justify-end gap-3 rounded-b-xl border-t border-purple-900/30 bg-gray-950/80 px-6 py-4 backdrop-blur-sm"> <button type="button" on:click={closeForm} disabled={formLoading} class="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-50"> إلغاء </button> <button type="submit" disabled={formLoading || imageUploadLoading} class="rounded-md bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-2 text-sm font-medium text-white shadow-md shadow-purple-900/30 transition duration-150 ease-in-out hover:scale-105 hover:from-purple-500 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-60 disabled:cursor-not-allowed glow-effect"> {#if formLoading || imageUploadLoading} <span class="animate-pulse">جاري الحفظ...</span> {:else if productData} حفظ التعديلات {:else} إضافة المنتج {/if} </button> </div>
	</form>
 </div>

<style> .label { @apply mb-1.5 block text-sm font-medium text-gray-300; } .input-field { @apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none; } select.input-field { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: left 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-left: 2.5rem; } .title-glow { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; } div[class*="max-h-48"]::-webkit-scrollbar { width: 6px; } div[class*="max-h-48"]::-webkit-scrollbar-track { background: theme('colors.gray.800'); border-radius: 3px; } div[class*="max-h-48"]::-webkit-scrollbar-thumb { background: theme('colors.purple.800'); border-radius: 3px; } div[class*="max-h-48"]::-webkit-scrollbar-thumb:hover { background: theme('colors.purple.700'); } </style>