<!-- === Code for src/routes/admin/settings/+page.svelte (with Logo Upload Functionality) === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { SiteSettings } from '$lib/types';

	// Type for settings, explicitly including the optional logo URL
	type SettingsData = Partial<SiteSettings & { logo_image_url?: string | null }>;

	let settings: SettingsData = {};
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let successMessage: string | null = null;
	let successTimeout: ReturnType<typeof setTimeout>;

	// --- State specifically for Logo Upload ---
	let logoFile: FileList | null = null; // Holds the FileList from the input
	let logoFilePreviewUrl: string | null = null; // Holds Data URL for local preview OR existing DB URL
	let logoUploadLoading = false;

	// --- Fetch Settings ---
	async function fetchSettings() {
		loading = true; error = null;
		console.log('[Settings Page] Fetching settings...');
		try {
			const { data, error: dbError } = await supabase
				.from('site_settings')
				.select('*') // Select all columns, including new logo_image_url
				.limit(1)
				.single();
			if (dbError && dbError.code !== 'PGRST116') throw dbError;
			settings = data || { id: 1 }; // Initialize with ID 1 if null
            logoFilePreviewUrl = settings.logo_image_url || null; // Set initial preview
			console.log('[Settings Page] Settings fetched:', settings);
		} catch (err: any) {
			error = 'حدث خطأ أثناء جلب الإعدادات: ' + err.message; console.error('Fetch settings error:', err);
		} finally { loading = false; }
	}

	// --- Handle File Selection for Logo ---
	function handleLogoFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		error = null;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
            if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'].includes(file.type)) { error = 'صيغة الشعار يجب أن تكون PNG, JPG, WEBP, GIF, أو SVG.'; input.value = ''; logoFile = null; logoFilePreviewUrl = settings.logo_image_url || null; return; }
            if (file.size > 2 * 1024 * 1024) { error = 'حجم ملف الشعار يجب أن لا يتجاوز 2MB.'; input.value = ''; logoFile = null; logoFilePreviewUrl = settings.logo_image_url || null; return; }
			logoFile = input.files;
			const reader = new FileReader();
			reader.onload = (e) => { logoFilePreviewUrl = e.target?.result as string; };
			reader.readAsDataURL(file);
            console.log('[Settings Page] New logo file selected for preview:', file.name);
		} else {
			logoFile = null; logoFilePreviewUrl = settings.logo_image_url || null; console.log('[Settings Page] Logo file deselected, reverting preview.');
		}
	}

    // --- Function to Upload Logo (if selected) ---
    async function uploadSelectedLogo(): Promise<string | null | undefined> {
        if (!logoFile || logoFile.length === 0) { return undefined; } // No new file
        const file = logoFile[0];
        logoUploadLoading = true; error = null;
        const uniqueFileName = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
        console.log('[Settings Page] Uploading new logo:', uniqueFileName);
        try {
            // Optional: Delete Old Logo First
            if (settings.logo_image_url) {
                try {
                    const oldUrl = new URL(settings.logo_image_url); const oldPathParts = oldUrl.pathname.split('/');
                    const bucketIndex = oldPathParts.indexOf('site-assets');
                    if (bucketIndex !== -1 && bucketIndex < oldPathParts.length - 1) {
                        const oldFilePath = oldPathParts.slice(bucketIndex + 1).join('/');
                        console.log('[Settings Page] Attempting to delete old logo:', oldFilePath);
                        await supabase.storage.from('site-assets').remove([oldFilePath]);
                    }
                } catch (deleteError) { console.warn('[Settings Page] Could not delete old logo:', deleteError); }
            }
            // Upload new file
            const { data, error: uploadError } = await supabase.storage.from('site-assets').upload(uniqueFileName, file, { cacheControl: '3600', upsert: false });
            if (uploadError) throw uploadError;
            // Get public URL
            const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(data.path);
            if (!urlData?.publicUrl) { throw new Error('Could not get public URL for uploaded logo.'); }
            console.log('[Settings Page] Logo uploaded successfully. URL:', urlData.publicUrl);
            return urlData.publicUrl; // Return new URL
        } catch (err: any) { console.error('[Settings Page] Logo upload error:', err); error = `فشل رفع الشعار: ${err.message}`; return null; /* Indicate failure */ }
        finally { logoUploadLoading = false; logoFile = null; const fileInput = document.getElementById('logoFile') as HTMLInputElement | null; if (fileInput) fileInput.value = ''; }
    }

	// --- Save Settings (Handles Logo Upload First) ---
	async function saveSettings() {
		saving = true; error = null; successMessage = null; clearTimeout(successTimeout);
		console.log('[Settings Page] Starting save process...');
		try {
            const newLogoUrlResult = await uploadSelectedLogo();
            if (newLogoUrlResult === null) { saving = false; return; } // Stop if upload failed

            const payload: SettingsData = {
				...settings, id: 1,
                logo_image_url: newLogoUrlResult !== undefined ? newLogoUrlResult : settings.logo_image_url,
                store_name: settings.store_name?.trim() || 'بعيد وقريب', address: settings.address?.trim() || '', working_hours: settings.working_hours?.trim() || '', delivery_message: settings.delivery_message?.trim() || '', collection_title: settings.collection_title?.trim() || '', phone_number: settings.phone_number?.trim() || null, instagram_url: settings.instagram_url?.trim() || null, snapchat_url: settings.snapchat_url?.trim() || null, banner_image_url: settings.banner_image_url?.trim() || null,
			};
            if (settings.id === undefined) delete payload.id;
            console.log('[Settings Page] Payload for DB upsert:', payload);

			const { data: saveData, error: saveError } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
			if (saveError) throw saveError;
            console.log('[Settings Page] Settings saved successfully to DB.');

            settings = { ...settings, logo_image_url: payload.logo_image_url };
            logoFilePreviewUrl = settings.logo_image_url || null; // Update preview URL

			successMessage = 'تم حفظ الإعدادات بنجاح!';
			successTimeout = setTimeout(() => (successMessage = null), 3000);
		} catch (err: any) { error = error || ('حدث خطأ أثناء حفظ الإعدادات: ' + err.message); console.error('Save settings error:', err); }
        finally { saving = false; }
	}

	// --- onMount and Realtime Listener ---
	onMount(() => {
		fetchSettings();
		const channel = supabase.channel('public:site_settings:admin')
			.on<SiteSettings & { logo_image_url?: string | null }>( 'postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: `id=eq.1` },
				(payload) => { console.log('[Settings Page] Realtime settings update received!', payload); settings = { ...settings, ...payload.new }; logoFilePreviewUrl = settings.logo_image_url || null; })
			.subscribe();
		return () => { supabase.removeChannel(channel); clearTimeout(successTimeout); };
	});
</script>

<svelte:head> <title>إعدادات الموقع - بعيد وقريب</title> </svelte:head>

<!-- Page Header -->
<div class="mb-6 flex items-center justify-between"> <h2 class="text-2xl font-semibold text-purple-300/90 title-glow">⚙️ إعدادات الموقع</h2> </div>

{#if loading} <p class="text-center text-purple-300/70">جاري تحميل الإعدادات...</p>
{:else}
	<!-- Main Form -->
	<form on:submit|preventDefault={saveSettings} class="space-y-8">
		{#if error} <p class="animate-fadeIn rounded border border-red-700 bg-red-900/60 p-3 text-center text-red-300 text-sm">{error}</p> {/if}
		{#if successMessage} <p class="animate-fadeIn rounded border border-green-700 bg-green-900/60 p-3 text-center text-green-300 text-sm">{successMessage}</p> {/if}

		<!-- === ADDED Logo Settings Fieldset === -->
        <fieldset class="rounded-lg border border-gray-700/80 p-4 pt-3 shadow-sm">
			<legend class="px-2 text-lg font-semibold text-purple-400">الشعار (Logo)</legend>
            <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <!-- Logo Upload Input -->
                <div class="md:col-span-2">
                     <label for="logoFile" class="label">تحميل شعار جديد (اختياري)</label>
                     <input type="file" id="logoFile" on:change={handleLogoFileSelect} accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif" class="input-field file:mr-4 file:rounded-full file:border-0 file:bg-purple-700/80 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-100 transition file:duration-150 hover:file:bg-purple-700 hover:file:cursor-pointer disabled:opacity-50" disabled={logoUploadLoading || saving}/>
                     <p class="mt-1.5 text-xs text-gray-500">يفضل أن يكون مربعاً وبخلفية شفافة (PNG/SVG). الحد الأقصى 2MB.</p>
                     {#if logoUploadLoading} <p class="mt-1.5 text-xs text-blue-400 animate-pulse">جاري رفع الشعار...</p> {/if}
                </div>
                <!-- Logo Preview -->
                <div class="text-center md:text-left">
                    <label class="label text-center md:text-right">المعاينة / الشعار الحالي</label>
                    {#if logoFilePreviewUrl}
                        <img src={logoFilePreviewUrl} alt="Logo Preview" class="inline-block h-16 w-auto rounded-md border border-gray-600 bg-gray-700/50 p-1 object-contain shadow-md"/>
                    {:else}
                         <div class="inline-flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-gray-600 bg-gray-800/50 text-xs text-gray-500">لا يوجد شعار</div>
                    {/if}
                </div>
            </div>
		</fieldset>
        <!-- === END Logo Settings Fieldset === -->

		<!-- Text Settings Fieldset -->
		<fieldset class="rounded-lg border border-gray-700/80 p-4 pt-3 shadow-sm"> <legend class="px-2 text-lg font-semibold text-purple-400">النصوص الرئيسية</legend> <div class="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2"> <div> <label for="store_name" class="label">اسم المتجر</label> <input type="text" id="store_name" bind:value={settings.store_name} class="input-field" /> </div> <div> <label for="collection_title" class="label">عنوان التشكيلة</label> <input type="text" id="collection_title" bind:value={settings.collection_title} class="input-field"/> </div> <div> <label for="banner_image_url" class="label">رابط صورة البانر</label> <input type="url" id="banner_image_url" bind:value={settings.banner_image_url} class="input-field ltr-input" placeholder="https://..."/> </div> </div> </fieldset>

		<!-- Contact & Footer Settings Fieldset -->
		<fieldset class="rounded-lg border border-gray-700/80 p-4 pt-3 shadow-sm"> <legend class="px-2 text-lg font-semibold text-purple-400">معلومات التواصل والفوتر</legend> <div class="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2"> <div> <label for="phone_number" class="label">رقم الهاتف</label> <input type="tel" id="phone_number" bind:value={settings.phone_number} class="input-field ltr-input" placeholder="e.g., 05xxxxxxxx" /> </div> <div> <label for="address" class="label">العنوان</label> <textarea id="address" bind:value={settings.address} rows="3" class="input-field"></textarea> </div> <div> <label for="working_hours" class="label">نص ساعات العمل</label> <input type="text" id="working_hours" bind:value={settings.working_hours} class="input-field"/> </div> <div> <label for="delivery_message" class="label">رسالة التوصيل</label> <input type="text" id="delivery_message" bind:value={settings.delivery_message} class="input-field"/> </div> <div> <label for="instagram_url" class="label">رابط انستغرام</label> <input type="url" id="instagram_url" bind:value={settings.instagram_url} class="input-field ltr-input" placeholder="https://instagram.com/..."/> </div> <div> <label for="snapchat_url" class="label">رابط سناب شات</label> <input type="url" id="snapchat_url" bind:value={settings.snapchat_url} class="input-field ltr-input" placeholder="https://snapchat.com/add/..."/> </div> </div> </fieldset>

		<!-- Save Button -->
		<div class="flex justify-end pt-4"> <button type="submit" disabled={saving || loading || logoUploadLoading} class="transform rounded-md bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-900/30 transition duration-150 ease-in-out hover:scale-105 hover:from-blue-500 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed glow-effect"> {#if saving || logoUploadLoading} <span class="animate-pulse">جاري الحفظ...</span> {:else} حفظ الإعدادات {/if} </button> </div>
	</form>
{/if}

<!-- Scoped Styles -->
<style>
	.label { @apply mb-1.5 block text-sm font-medium text-gray-300; }
	.input-field { @apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none; }
    .ltr-input { direction: ltr; text-align: left; }
    .title-glow { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
</style>