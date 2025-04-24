<!-- === Code for src/routes/admin/categories/+page.svelte === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	// Basic Category type (can enhance in types.ts later)
	interface Category { id: string; created_at: string; name: string; sort_order: number; }

	let categories: Category[] = [];
	let loading = true;
	let error: string | null = null;

	// State for Add/Edit Form
	let showForm = false;
	let categoryToEdit: Category | null = null;
	let formName = '';
	let formSortOrder = 0;
	let formSaving = false;
	let formError: string | null = null;


	async function fetchCategories() {
		loading = true; error = null;
		try {
			const { data, error: dbError } = await supabase
				.from('categories')
				.select('*')
				.order('sort_order', { ascending: true })
				.order('name', { ascending: true }); // Sort by name as secondary
			if (dbError) throw dbError;
			categories = data || [];
		} catch (err: any) { error = 'حدث خطأ أثناء جلب الأقسام: ' + err.message; console.error(err); }
        finally { loading = false; }
	}

	function openAddForm() {
		categoryToEdit = null;
		formName = '';
		formSortOrder = 0;
        formError = null;
		showForm = true;
	}

	function openEditForm(category: Category) {
		categoryToEdit = category;
		formName = category.name;
		formSortOrder = category.sort_order || 0;
        formError = null;
		showForm = true;
	}

    function closeForm() {
        showForm = false;
        categoryToEdit = null;
    }

	async function handleFormSubmit() {
        formSaving = true; formError = null;
        if (!formName.trim()) { formError = "اسم القسم مطلوب"; formSaving = false; return; }

        const payload = {
            name: formName.trim(),
            sort_order: formSortOrder || 0 // Ensure number or default
        };

        try {
            let dbError: any;
            if (categoryToEdit?.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('categories')
                    .update(payload)
                    .match({ id: categoryToEdit.id });
                dbError = updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('categories')
                    .insert([payload]); // insert needs an array
                dbError = insertError;
            }
            if (dbError) throw dbError;

            closeForm();
            fetchCategories(); // Refetch list after change

        } catch (err: any) {
             if (err.message.includes('duplicate key value violates unique constraint')) {
                 formError = 'اسم القسم هذا موجود بالفعل.';
             } else {
                 formError = 'حدث خطأ أثناء الحفظ: ' + err.message;
             }
             console.error(err);
        } finally {
            formSaving = false;
        }
    }

    async function deleteCategory(id: string, name: string) {
        if (!confirm(`هل أنت متأكدة من حذف القسم "${name}"؟ سيتم إلغاء ربط أي منتجات بهذا القسم.`)) return;

        try {
             // Foreign key is SET NULL, so we just delete the category
            const { error: deleteError } = await supabase
                .from('categories')
                .delete()
                .match({ id });
            if (deleteError) throw deleteError;
            fetchCategories(); // Refresh list
        } catch (err: any) {
            alert('فشل حذف القسم: ' + err.message);
            console.error(err);
        }
    }

	onMount(fetchCategories); // Fetch on load
    // Add realtime? Optional for categories as they change less often
</script>

<svelte:head><title>إدارة الأقسام - بعيد وقريب</title></svelte:head>

<!-- Page Header -->
<div class="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
	<h2 class="text-2xl font-semibold text-purple-300/90 title-glow">🏷️ إدارة الأقسام</h2>
	<button on:click={openAddForm} class="transform rounded-md bg-gradient-to-r from-green-600 to-green-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-900/30 transition duration-300 ease-in-out hover:scale-105 hover:from-green-500 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 glow-effect" >
		+ إضافة قسم جديد
	</button>
</div>

<!-- Loading/Error/Empty States -->
{#if loading} <p class="text-center text-purple-300/70">جاري تحميل الأقسام...</p>
{:else if error} <p class="rounded border border-red-700 bg-red-900/50 p-4 text-center text-red-300">{error}</p>
{:else if categories.length === 0} <p class="text-center text-gray-400">لم يتم إضافة أي أقسام بعد.</p>
<!-- Categories Table -->
{:else}
	<div class="overflow-x-auto rounded-lg border border-gray-700/50 bg-gray-950/30 shadow-md">
		<table class="min-w-full table-auto text-sm text-left text-gray-300">
			<thead class="bg-gray-800/50 text-xs uppercase text-purple-300/80">
				<tr>
					<th scope="col" class="px-6 py-3">اسم القسم</th>
					<th scope="col" class="px-6 py-3">ترتيب العرض</th>
					<th scope="col" class="px-6 py-3 text-center">الإجراءات</th>
				</tr>
			</thead>
			<tbody>
				{#each categories as category (category.id)}
					<tr class="border-b border-gray-700/50 hover:bg-gray-800/60">
						<th scope="row" class="whitespace-nowrap px-6 py-4 font-medium text-white">{category.name}</th>
						<td class="px-6 py-4">{category.sort_order || 0}</td>
						<td class="whitespace-nowrap px-6 py-4 text-center">
							<button on:click={() => openEditForm(category)} class="mr-3 font-medium text-blue-400 transition hover:text-blue-300 hover:underline">تعديل</button>
							<button on:click={() => deleteCategory(category.id, category.name)} class="font-medium text-red-500 transition hover:text-red-400 hover:underline">حذف</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<!-- Add/Edit Form Modal -->
{#if showForm}
 <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn" on:click|self={closeForm} role="dialog" aria-modal="true" aria-labelledby="cat-form-title">
	<form on:submit|preventDefault={handleFormSubmit} class="relative w-full max-w-md rounded-xl border border-purple-900/30 bg-gradient-to-br from-gray-950 via-black to-gray-950 p-6 shadow-2xl shadow-purple-950/30">
		<h2 id="cat-form-title" class="mb-5 text-center text-xl font-semibold text-purple-300 title-glow">
			{categoryToEdit ? 'تعديل القسم' : 'إضافة قسم جديد'}
		</h2>
         {#if formError} <p class="mb-4 rounded border border-red-700 bg-red-900/60 p-3 text-center text-red-300 text-sm">{formError}</p> {/if}
		<div class="mb-4">
			<label for="catName" class="label">اسم القسم <span class="text-red-500">*</span></label>
			<input type="text" id="catName" bind:value={formName} required class="input-field" />
		</div>
        <div class="mb-6">
			<label for="catSort" class="label">ترتيب العرض (الأقل أولاً)</label>
			<input type="number" id="catSort" bind:value={formSortOrder} class="input-field" />
		</div>
		<div class="mt-6 flex justify-end gap-3">
			<button type="button" on:click={closeForm} disabled={formSaving} class="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:opacity-50">إلغاء</button>
			<button type="submit" disabled={formSaving} class="rounded-md bg-gradient-to-r from-purple-600 to-purple-800 px-5 py-2 text-sm font-medium text-white shadow-md shadow-purple-900/30 transition duration-150 ease-in-out hover:scale-105 hover:from-purple-500 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-60 disabled:cursor-not-allowed glow-effect">
                {#if formSaving}<span class="animate-pulse">جاري الحفظ...</span>{:else}حفظ{/if}
            </button>
		</div>
	</form>
 </div>
{/if}

<style> .label { @apply mb-1.5 block text-sm font-medium text-gray-300; } .input-field { @apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none; } .title-glow { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; } </style>