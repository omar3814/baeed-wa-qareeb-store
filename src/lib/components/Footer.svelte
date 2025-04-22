<!-- === Code for src/lib/components/Footer.svelte (Props + CORRECT Icons FIXED) === -->
<script lang="ts">
	import type { SiteSettings } from '$lib/types';

	// Declare the 'siteSettings' prop using 'export let'
	export let siteSettings: Partial<SiteSettings> = {};

</script>

<!-- Footer Section - Enhanced Styling -->
<footer class="mt-16 border-t border-purple-900/20 bg-gradient-to-t from-black via-gray-950/70 to-gray-950 py-10 text-gray-400">
	<div class="container mx-auto grid grid-cols-1 gap-8 px-4 text-center md:grid-cols-3 md:text-right">
		<!-- Contact Info -->
		<div class="space-y-3 animate-fadeIn">
			<h4 class="mb-3 text-lg font-semibold text-purple-300">تواصلوا معنا</h4>
			{#if siteSettings.phone_number}
				<p class="text-sm">
					<span class="font-medium text-gray-300">الهاتف:</span>
					<a href="tel:{siteSettings.phone_number}" class="inline-block transition duration-300 hover:text-purple-400 ltr-text" dir="ltr">
						{siteSettings.phone_number}
					</a>
				</p>
			{/if}
			{#if siteSettings.address}
				<p class="text-sm">
					<span class="font-medium text-gray-300">العنوان:</span> {siteSettings.address}
				</p>
			{/if}
		</div>

		<!-- Working Hours -->
		<div class="space-y-3 animate-fadeIn animation-delay-100">
			<h4 class="mb-3 text-lg font-semibold text-purple-300">أوقات الدوام والتوصيل</h4>
			{#if siteSettings.working_hours}
				<p class="border-r-2 border-purple-600/50 pr-3 text-sm italic text-purple-300/90">
					{siteSettings.working_hours}
				</p>
			{/if}
			{#if siteSettings.delivery_message}
				<p class="text-sm">{siteSettings.delivery_message}</p>
			{/if}
		</div>

		<!-- Social Links -->
		<div class="space-y-4 animate-fadeIn animation-delay-200 md:text-left">
			<h4 class="mb-3 text-lg font-semibold text-purple-300">تابعونا</h4>
			<div class="flex items-center justify-center gap-6 md:justify-start">
				{#if siteSettings.instagram_url}
					<a href={siteSettings.instagram_url} target="_blank" rel="noopener noreferrer" class="text-gray-400 transition duration-300 hover:scale-110 hover:text-pink-500 social-icon-glow" title="Instagram">
						<!-- Instagram SVG Icon -->
						<svg class="h-7 w-7"
                             xmlns="http://www.w3.org/2000/svg"
                             viewBox="0 0 24 24" fill="currentColor" >
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
						</svg>
					</a>
				{/if}
				{#if siteSettings.snapchat_url}
					<a href={siteSettings.snapchat_url} target="_blank" rel="noopener noreferrer" class="text-gray-400 transition duration-300 hover:scale-110 hover:text-yellow-400 social-icon-glow" title="Snapchat">
						<!-- Snapchat Ghost SVG Icon -->
						<svg class="h-7 w-7"
                             xmlns="http://www.w3.org/2000/svg"
                             viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                             <path d="M14.5 20.7a19.2 19.2 0 0 1-7 0C4.7 19.4 2.9 16.5 3 13.1c0-2.3 1.2-4.7 3.4-6.3C8.1 5.3 10 4.4 12 4.4c2 0 3.9.9 5.6 2.4 2.2 1.6 3.4 4 3.4 6.3.1 3.4-1.7 6.3-4.5 7.6Z"/>
                             <path d="M14.7 13.3a1.2 1.2 0 0 1-2.4 0c0-.6.5-1.1 1.2-1.1.7 0 1.2.5 1.2 1.1Z"/>
                             <path d="M9.3 13.3a1.2 1.2 0 0 1-2.4 0c0-.6.5-1.1 1.2-1.1.6 0 1.2.5 1.2 1.1Z"/>
						</svg> <!-- Updated Snapchat Path -->
					</a>
				{/if}
			</div>
		</div>
	</div>
    <!-- Copyright -->
	<div class="mt-8 border-t border-purple-900/20 pt-6 text-center text-xs text-gray-500">
		جميع الحقوق محفوظة © {new Date().getFullYear()} {siteSettings.store_name || 'بعيد وقريب'}
	</div>
</footer>

<style>
	.ltr-text { direction: ltr; display: inline-block; }
	.social-icon-glow { filter: drop-shadow(0 0 4px rgba(200, 200, 255, 0.2)); }
	.social-icon-glow:hover { filter: drop-shadow(0 0 8px currentColor); }
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { opacity: 0; animation: fadeIn 0.6s ease-out forwards; }
    .animation-delay-100 { animation-delay: 0.1s; }
    .animation-delay-200 { animation-delay: 0.2s; }
</style>