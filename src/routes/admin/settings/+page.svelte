<!-- === Code for src/routes/admin/settings/+page.svelte === -->
<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { SiteSettings } from '$lib/types'; // Using the type defined earlier

	// Store the settings data. Partial<> allows fields to be initially undefined/null
	let settings: Partial<SiteSettings> = {};
	// Loading and saving states
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let successMessage: string | null = null;
	let successTimeout: ReturnType<typeof setTimeout>; // To clear success message

	// --- Fetch Settings ---
	async function fetchSettings() {
		console.log('[Settings Page] Fetching settings...');
		loading = true;
		error = null;
		try {
			// Select all columns from 'site_settings' table
			// We expect only one row (id=1), so use .limit(1) and .single()
			const { data, error: dbError } = await supabase
				.from('site_settings')
				.select('*')
				.limit(1) // Ensure we only get max 1 row
				.single(); // Converts the result from an array [{...}] to a single object {...} or null

			// .single() throws an error if > 1 row found.
			// It returns { data: null, error: {...} } if 0 rows found (code PGRST116). We ignore this specific error.
			if (dbError && dbError.code !== 'PGRST116') {
				throw dbError; // Throw any other database error
			}

			// If data is null (no settings row found yet), initialize with default id
			// Otherwise, use the fetched data.
			settings = data || { id: 1 };
			console.log('[Settings Page] Settings fetched:', settings);

		} catch (err: any) {
			error = 'حدث خطأ أثناء جلب الإعدادات: ' + err.message;
			console.error('[Settings Page] Fetch settings error:', err);
			// Keep partial settings if fetch fails after initial load? Optional.
			// settings = settings || { id: 1 };
		} finally {
			loading = false;
		}
	}

	// --- Save Settings ---
	async function saveSettings() {
		saving = true;
		error = null;
		successMessage = null;
		clearTimeout(successTimeout); // Clear previous success message timeout

		console.log('[Settings Page] Attempting to save settings:', settings);

		try {
			// Prepare payload - ensure required fields have fallbacks if empty,
			// and set explicitly null for optional fields if desired.
			// CRITICAL: Include the 'id: 1' for upsert to work correctly.
			const payload: Partial<SiteSettings> = {
				...settings, // Spread current settings
				id: 1, // Ensure ID is always 1 for upsert condition
				// Provide defaults for fields that shouldn't be empty (match DB defaults if possible)
				store_name: settings.store_name?.trim() || 'بعيد وقريب',
				address: settings.address?.trim() || 'جنين - طلعة جبل أبو ظهير - مقابل مدرسة وليد أبو مويس (الغربية)',
				working_hours: settings.working_hours?.trim() || 'ننتظركم من الساعة 12 ظهراً حتى 6:30 مساءً.',
				delivery_message: settings.delivery_message?.trim() || 'خدمة التوصيل متوفرة لجميع المناطق.',
				collection_title: settings.collection_title?.trim() || 'تشكيلتنا',
				// Set optional fields to null if they are empty strings after trimming
				phone_number: settings.phone_number?.trim() || null,
				instagram_url: settings.instagram_url?.trim() || null,
				snapchat_url: settings.snapchat_url?.trim() || null,
				banner_image_url: settings.banner_image_url?.trim() || null,
			};

            console.log('[Settings Page] Payload for upsert:', payload);

			// Use 'upsert' to either INSERT the row (if id=1 doesn't exist)
			// or UPDATE the row (if id=1 already exists).
			const { error: saveError } = await supabase
				.from('site_settings')
				.upsert(payload, { onConflict: 'id' }); // Specify 'id' as the conflict target

			if (saveError) throw saveError; // Throw error if upsert fails

            console.log('[Settings Page] Settings saved successfully.');
			successMessage = 'تم حفظ الإعدادات بنجاح!';
			// Automatically clear the success message after 3 seconds
			successTimeout = setTimeout(() => (successMessage = null), 3000);

		} catch (err: any) {
			error = 'حدث خطأ أثناء حفظ الإعدادات: ' + err.message;
			console.error('[Settings Page] Save settings error:', err);
		} finally {
			saving = false;
		}
	}

	// --- Realtime Subscription (Optional but good practice) ---
	onMount(() => {
		fetchSettings(); // Initial fetch

		// Subscribe to changes specifically for the row with id=1 in site_settings
		const channel = supabase
			.channel('public:site_settings')
			.on<SiteSettings>(
				'postgres_changes',
				{
					event: 'UPDATE', // Only listen for updates
					schema: 'public',
					table: 'site_settings',
					filter: `id=eq.1` // Only listen for changes to our specific row
				},
				(payload) => {
					console.log('[Settings Page] Realtime settings update received!', payload);
					// Update local state carefully, merging new data with existing
					settings = { ...settings, ...payload.new };
				}
			)
			.subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Settings Page] Settings Realtime channel subscribed successfully!');
                }
                 if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    console.error(`[Settings Page] Settings Realtime channel error/closed: ${status}`, err);
                }
            });

		// Cleanup subscription on component destroy
		return () => {
			console.log('[Settings Page] Unsubscribing from settings realtime channel.');
			supabase.removeChannel(channel);
            clearTimeout(successTimeout); // Clear timeout if component is destroyed
		};
	});
</script>

<svelte:head>
	<title>إعدادات الموقع - بعيد وقريب</title>
</svelte:head>

<!-- Page Header -->
<div class="mb-6 flex items-center justify-between">
    <h2 class="text-2xl font-semibold text-purple-300/90 title-glow">⚙️ إعدادات الموقع</h2>
    <!-- Placeholder for maybe a reset button later? -->
</div>


{#if loading}
	<p class="text-center text-purple-300/70">جاري تحميل الإعدادات...</p>
{:else}
	<!-- Main Form -->
	<form on:submit|preventDefault={saveSettings} class="space-y-8">

		<!-- Display Status Messages -->
		{#if error}
			<p class="animate-fadeIn rounded border border-red-700 bg-red-900/60 p-3 text-center text-red-300 text-sm">
				{error}
			</p>
		{/if}
		{#if successMessage}
			<p class="animate-fadeIn rounded border border-green-700 bg-green-900/60 p-3 text-center text-green-300 text-sm">
				{successMessage}
			</p>
		{/if}

		<!-- Text Settings Fieldset -->
		<fieldset class="rounded-lg border border-gray-700/80 p-4 pt-3 shadow-sm">
			<legend class="px-2 text-lg font-semibold text-purple-400">النصوص الرئيسية</legend>
			<div class="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
				<div>
					<label for="store_name" class="label">اسم المتجر (العنوان الرئيسي)</label>
					<input type="text" id="store_name" bind:value={settings.store_name} class="input-field" />
				</div>
				<div>
					<label for="collection_title" class="label">عنوان قسم التشكيلة</label>
					<input type="text" id="collection_title" bind:value={settings.collection_title} class="input-field"/>
				</div>
				<div>
					<label for="banner_image_url" class="label">رابط صورة البانر (اختياري)</label>
					<input type="url" id="banner_image_url" bind:value={settings.banner_image_url} class="input-field ltr-input" placeholder="https://..."/>
				</div>
			</div>
		</fieldset>

		<!-- Contact & Footer Settings Fieldset -->
		<fieldset class="rounded-lg border border-gray-700/80 p-4 pt-3 shadow-sm">
			<legend class="px-2 text-lg font-semibold text-purple-400">معلومات التواصل والفوتر</legend>
			<div class="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
				<div>
					<label for="phone_number" class="label">رقم الهاتف</label>
					<!-- ltr-input class forces LTR for phone/URLs -->
					<input type="tel" id="phone_number" bind:value={settings.phone_number} class="input-field ltr-input" placeholder="e.g., 05xxxxxxxx" />
				</div>
				<div>
					<label for="address" class="label">العنوان</label>
					<textarea id="address" bind:value={settings.address} rows="3" class="input-field"></textarea>
				</div>
				<div>
					<label for="working_hours" class="label">نص ساعات العمل</label>
					<input type="text" id="working_hours" bind:value={settings.working_hours} class="input-field"/>
				</div>
				<div>
					<label for="delivery_message" class="label">رسالة خدمة التوصيل</label>
					<input type="text" id="delivery_message" bind:value={settings.delivery_message} class="input-field"/>
				</div>
				<div>
					<label for="instagram_url" class="label">رابط انستغرام (كامل)</label>
					<input type="url" id="instagram_url" bind:value={settings.instagram_url} class="input-field ltr-input" placeholder="https://instagram.com/..."/>
				</div>
				<div>
					<label for="snapchat_url" class="label">رابط سناب شات (كامل)</label>
					<input type="url" id="snapchat_url" bind:value={settings.snapchat_url} class="input-field ltr-input" placeholder="https://snapchat.com/add/..."/>
				</div>
			</div>
		</fieldset>

		<!-- Save Button -->
		<div class="flex justify-end pt-4">
			<button
				type="submit"
				disabled={saving || loading}
				class="transform rounded-md bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-900/30 transition duration-150 ease-in-out hover:scale-105 hover:from-blue-500 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-60 disabled:cursor-not-allowed glow-effect"
			>
				{#if saving}
					<span class="animate-pulse">جاري الحفظ...</span>
				{:else}
					حفظ الإعدادات
				{/if}
			</button>
		</div>
	</form>
{/if}

<!-- Scoped Styles -->
<style>
	.label {
		@apply mb-1.5 block text-sm font-medium text-gray-300;
	}
	.input-field {
		@apply block w-full rounded-lg border border-gray-700 bg-gray-800/80 p-2.5 text-sm text-white placeholder-gray-500 transition duration-150 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none;
	}
    /* Style inputs intended for Left-to-Right text like URLs or phone numbers */
	.ltr-input {
		direction: ltr;
		text-align: left;
	}
    /* Reuse glow effect */
    .title-glow {
		text-shadow: 0 0 8px rgba(216, 180, 254, 0.4);
	}
    /* Basic fade-in for messages */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
</style>