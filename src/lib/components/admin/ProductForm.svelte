<!-- === Code for src/lib/components/admin/ProductForm.svelte === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { createEventDispatcher } from 'svelte';
	import type { Product } from '$lib/types';

	// Props: Accept existing product data for editing, or null for adding
	export let productData: Product | null = null;

	// Event Dispatcher: To notify the parent page (Product List) when the form closes
	const dispatch = createEventDispatcher<{ close: { success: boolean } }>();

	// Form state variables - initialize with existing data if editing
	let name = productData?.name || '';
	let description = productData?.description || '';
	// Ensure price is treated as a number, default to 0 if null/undefined
	let price: number = productData?.price ?? 0;
	// Use a more user-friendly way to manage sizes/stock
	let managedSizes: { [size: string]: number } = JSON.parse(JSON.stringify(productData?.sizes_stock || { S: 0, M: 0, L: 0 })); // Deep copy initial stock

	// State for image handling
	let imageFiles: FileList | null = null; // Holds newly selected files
	let existingImages: string[] = [...(productData?.images || [])]; // Copy existing image URLs

	// Loading and error states
	let imageUploadLoading = false;
	let formLoading = false;
	let error: string | null = null;
	let uploadProgress: { [fileName: string]: number } = {}; // To show individual upload progress

	// Define standard available sizes
	const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

	// --- Functions for managing Sizes & Stock ---
	function updateStock(size: string, value: string) {
		const stock = parseInt(value, 10);
		if (!isNaN(stock)) {
			managedSizes[size] = Math.max(0, stock); // Ensure stock is not negative
		} else if (value.trim() === '') {
            // If input is cleared, treat as 0 stock for that size
			managedSizes[size] = 0;
		}
        managedSizes = managedSizes; // Trigger Svelte reactivity
	}

	function addSize(size: string) {
		if (!managedSizes.hasOwnProperty(size)) {
			managedSizes[size] = 0; // Add new size with 0 stock
			managedSizes = managedSizes; // Trigger reactivity
		}
	}

	function removeSize(size: string) {
		delete managedSizes[size]; // Remove size from the object
		managedSizes = managedSizes; // Trigger reactivity
	}
    // --- End Size/Stock Functions ---


    // --- Functions for Image Handling ---
	async function handleImageUpload(): Promise<string[]> {
		if (!imageFiles || imageFiles.length === 0) {
			return existingImages || []; // Return existing if no new files selected
		}

		imageUploadLoading = true;
		uploadProgress = {}; // Reset progress tracking
		// Combine existing images with placeholders for new uploads
		const finalImageUrls: string[] = [...(existingImages || [])];

		const uploadPromises = Array.from(imageFiles).map(async (file) => {
			const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`; // Sanitize filename
			try {
                console.log(`Uploading ${fileName}...`);
				const { data, error: uploadError } = await supabase.storage
					.from('product-images') // Your bucket name
					.upload(fileName, file, {
						cacheControl: '3600',
						upsert: false // Don't overwrite existing files with the same name
					}
                    // Removed deprecated x-upsert-options
                    );

				if (uploadError) throw uploadError; // Throw if upload fails

                console.log(`Upload successful for ${fileName}, getting public URL...`);
				// Get public URL for the uploaded file
				const { data: urlData } = supabase.storage
					.from('product-images')
					.getPublicUrl(data.path);

				if (urlData?.publicUrl) {
                    console.log(`Public URL for ${fileName}: ${urlData.publicUrl}`);
					return urlData.publicUrl; // Return the public URL
				} else {
                    console.error(`Could not get public URL for ${fileName}`);
                    return null; // Indicate failure to get URL
                }
			} catch (err: any) {
				console.error(`Failed to upload ${fileName}:`, err);
				error = `فشل رفع الصورة ${file.name}: ${err.message}`; // Set specific error
				// We don't re-throw here, just return null so Promise.allSettled catches it
				return null;
			} finally {
                // Update progress (even on failure, consider it done)
                uploadProgress[file.name] = 100;
                uploadProgress = uploadProgress; // Trigger reactivity
            }
		});

		// Wait for all uploads to settle (either succeed or fail)
		const results = await Promise.allSettled(uploadPromises);

		// Process results: add successful URLs to the final list
		results.forEach(result => {
			if (result.status === 'fulfilled' && result.value) {
				finalImageUrls.push(result.value); // Add successfully uploaded image URL
			}
		});

        imageUploadLoading = false;
		imageFiles = null; // Clear the file input after processing
        // Reset file input visually (important for re-selecting the same file)
        const fileInput = document.getElementById('images') as HTMLInputElement | null;
        if(fileInput) fileInput.value = '';

		console.log("Final image URLs after upload:", finalImageUrls);
		return finalImageUrls; // Return the combined list of old and new URLs
	}

	function removeExistingImage(imageUrlToRemove: string) {
		existingImages = existingImages.filter((url) => url !== imageUrlToRemove);
        console.log("Removed existing image locally:", imageUrlToRemove);
        console.log("Remaining existing images:", existingImages);
	}
    // --- End Image Handling ---


    // --- Main Form Submission Logic ---
	async function handleSubmit() {
		formLoading = true;
		error = null; // Clear previous errors

		// --- Basic Validations ---
        if (!name.trim()) {
            error = 'اسم المنتج حقل مطلوب.';
            formLoading = false;
            return;
        }
		if (isNaN(price) || price < 0) {
			error = 'السعر يجب أن يكون رقماً موجباً.';
			formLoading = false;
			return;
		}
        // --- End Validations ---


		try {
			// 1. Upload any newly selected images and get the final list of URLs
			const finalImageUrls = await handleImageUpload();

            // If handleImageUpload set an error (e.g., one upload failed), stop here
            if (error) {
                throw new Error("Image upload failed, cannot save product.");
            }

			// 2. Prepare the final product data payload for Supabase
			const productPayload = {
				name: name.trim(),
				description: description.trim() || null, // Use null if description is empty
				price: price,
				images: finalImageUrls, // Use the combined list of URLs
				sizes_stock: managedSizes // Use the managed sizes object
			};

            console.log("Product Payload to save:", productPayload);

			// 3. Determine if adding a new product or updating an existing one
			let dbError: any;
			if (productData?.id) {
				// --- UPDATE existing product ---
                console.log(`Updating product ID: ${productData.id}`);
				const { error: updateError } = await supabase
					.from('products')
					.update(productPayload)
					.match({ id: productData.id });
				dbError = updateError;
                if (!dbError) console.log("Product updated successfully in DB.");
			} else {
				// --- INSERT new product ---
                console.log("Inserting new product...");
				const { error: insertError } = await supabase.from('products').insert([productPayload]);
				dbError = insertError;
                if (!dbError) console.log("Product inserted successfully in DB.");
			}

			// Check for database errors
			if (dbError) {
                console.error("Database save error:", dbError);
                throw dbError; // Throw error to be caught below
            }

			// 4. Success! Dispatch the close event with success: true
			dispatch('close', { success: true });

		} catch (err: any) {
			// Catch errors from validation, image upload, or database operations
			console.error('[ProductForm] Form submission error:', err);
			// Use existing error message if set during image upload, otherwise use generic/DB error
			error = error || 'حدث خطأ أثناء حفظ المنتج: ' + err.message;
		} finally {
			formLoading = false; // Ensure loading state is turned off
		}
	}

	// Function to dispatch the close event when Cancel button is clicked or modal overlay is clicked
	function closeForm() {
		dispatch('close', { success: false }); // Indicate no successful save occurred
	}
</script>

<!-- Modal Structure -->
<!-- Overlay: Covers the whole screen, closes form on click -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn"
	on:click|self={closeForm}
    aria-modal="true"
    role="dialog"
    aria-labelledby="form-title"
>
	<!-- Modal Content Box -->
	<form
		on:submit|preventDefault={handleSubmit}
		class="relative w-full max-w-3xl rounded-xl border border-purple-900/30 bg-gradient-to-br from-gray-950 via-black to-gray-950 shadow-2xl shadow-purple-950/30 max-h-[90vh] overflow-y-auto"
	>
        <!-- Close button top right -->
         <button type="button" on:click={closeForm} aria-label="Close" class="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition z-10 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
         </button>

        <!-- Form Header -->
        <h2 id="form-title" class="sticky top-0 z-[5] bg-gray-950/80 backdrop-blur-sm px-6 py-4 text-center text-xl font-semibold text-purple-300 border-b border-purple-900/30 title-glow">
            {productData ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        </h2>

        <!-- Form Body with Padding -->
		<div class="p-6 space-y-6">

            <!-- Display General Form Errors -->
            {#if error}
                <p class="rounded border border-red-700 bg-red-900/60 p-3 text-center text-red-300 text-sm animate-fadeIn">
                    {error}
                </p>
            {/if}

            <!-- Main Form Grid -->
			<div class="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">

				<!-- Left Column: Basic Info -->
				<div class="space-y-5">
					<div>
						<label for="name" class="label">اسم المنتج <span class="text-red-500">*</span></label>
						<input type="text" id="name" bind:value={name} required class="input-field" />
					</div>
					<div>
						<label for="price" class="label" >السعر (أرقام فقط) <span class="text-red-500">*</span></label >
						<input type="number" id="price" bind:value={price} required min="0" step="any" class="input-field" />
					</div>
					<div>
						<label for="description" class="label">الوصف (اختياري)</label>
						<textarea id="description" bind:value={description} rows="5" class="input-field"></textarea>
					</div>
				</div>

				<!-- Right Column: Images & Sizes -->
				<div class="space-y-5">
					<!-- Image Upload Section -->
					<div>
						<label for="images" class="label">صور المنتج</label>
						<!-- Display Existing Images -->
						{#if existingImages && existingImages.length > 0}
							<div class="mb-3 flex flex-wrap gap-3">
								{#each existingImages as imgUrl (imgUrl)}
									<div class="relative group">
										<img
											src={imgUrl}
											alt="صورة المنتج الحالية"
											class="h-20 w-20 rounded-md object-cover shadow-md border-2 border-gray-700"
										/>
										<button
											type="button"
											on:click={() => removeExistingImage(imgUrl)}
                                            aria-label="Remove image"
											class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs opacity-80 transition hover:opacity-100 hover:scale-110"
										>
											×
                                        </button>
									</div>
								{/each}
							</div>
						{/if}
                        <!-- File Input -->
						<input
							type="file"
							id="images"
							on:change={(e) => imageFiles = e.currentTarget.files}
							multiple
							accept="image/png, image/jpeg, image/webp, image/gif"
							class="block w-full text-sm text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-purple-700/80 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-100 transition file:duration-150 hover:file:bg-purple-700 hover:file:cursor-pointer disabled:opacity-50"
							disabled={imageUploadLoading || formLoading}
						/>
						{#if imageUploadLoading}
							<p class="mt-1.5 text-xs text-blue-400 animate-pulse">جاري رفع الصور...</p>
						{/if}
                        <p class="mt-1.5 text-xs text-gray-500">يمكنك اختيار صور متعددة.</p>
					</div>

					<!-- Sizes & Stock Section -->
					<div>
						<label class="label">المقاسات والمخزون المتوفر <span class="text-red-500">*</span></label>
						<!-- Container for size inputs -->
                        <div class="space-y-3 rounded-md border border-gray-700/80 bg-gray-950/30 p-3 max-h-48 overflow-y-auto">
							{#each Object.entries(managedSizes) as [size, stock] (size)}
								<div class="flex items-center gap-2">
									<span class="w-12 flex-shrink-0 text-sm font-medium text-gray-200">{size}:</span>
									<input
										type="number"
                                        aria-label={`Stock for size ${size}`}
										min="0"
										value={stock}
										on:input={(e) => updateStock(size, e.currentTarget.value)}
										class="input-field flex-grow p-1.5 text-sm"
										placeholder="الكمية"
									/>
									<button
										type="button"
                                        aria-label={`Remove size ${size}`}
										on:click={() => removeSize(size)}
										class="flex-shrink-0 text-xs text-red-500 transition hover:text-red-400"
									>
										حذف
                                    </button>
								</div>
							{/each}
                            {#if Object.keys(managedSizes).length === 0}
                                <p class="text-center text-xs text-gray-500 py-2">لم يتم إضافة مقاسات بعد.</p>
                            {/if}
						</div>
                        <!-- Buttons to add predefined sizes -->
						<div class="mt-3 flex flex-wrap items-center gap-2">
							<span class="text-sm text-gray-400">إضافة مقاس:</span>
							{#each availableSizes as size}
								{#if !managedSizes.hasOwnProperty(size)}
									<button
										type="button"
										on:click={() => addSize(size)}
										class="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 transition hover:bg-purple-800 hover:text-white"
									>
										{size}
									</button>
								{/if}
							{/each}
						</div>
					</div>
				</div> <!-- End Right Column -->
			</div> <!-- End Main Form Grid -->
        </div> <!-- End Form Body -->

		<!-- Form Footer/Actions -->
		<div class="sticky bottom-0 z-[5] mt-6 flex justify-end gap-3 rounded-b-xl border-t border-purple-900/30 bg-gray-950/80 px-6 py-4 backdrop-blur-sm">
			<button
				type="button"
				on:click={closeForm}
                disabled={formLoading}
				class="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-50"
			>
				إلغاء
			</button>
			<button
				type="submit"
				disabled={formLoading || imageUploadLoading}
				class="rounded-md bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-2 text-sm font-medium text-white shadow-md shadow-purple-900/30 transition duration-150 ease-in-out hover:scale-105 hover:from-purple-500 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-60 disabled:cursor-not-allowed glow-effect"
			>
				{#if formLoading}
					<span class="animate-pulse">جاري الحفظ...</span>
				{:else if productData}
					حفظ التعديلات
				{:else}
					إضافة المنتج
				{/if}
			</button>
		</div>
	</form> <!-- End Modal Content Box -->
</div> <!-- End Modal Overlay -->

<!-- Scoped Styles for the Form -->
<style>
	.label {
		@apply mb-1.5 block text-sm font-medium text-gray-300;
	}
	.input-field {
		@apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none;
	}
    /* Basic fade-in for the modal */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }

    /* Optional: Style scrollbar for size box */
    div[class*="max-h-48"]::-webkit-scrollbar {
        width: 6px;
    }
    div[class*="max-h-48"]::-webkit-scrollbar-track {
        background: theme('colors.gray.800');
        border-radius: 3px;
    }
    div[class*="max-h-48"]::-webkit-scrollbar-thumb {
        background: theme('colors.purple.800');
        border-radius: 3px;
    }
    div[class*="max-h-48"]::-webkit-scrollbar-thumb:hover {
        background: theme('colors.purple.700');
    }
    /* Reuse glow effect for title */
    .title-glow {
		text-shadow: 0 0 8px rgba(216, 180, 254, 0.4);
	}
</style>