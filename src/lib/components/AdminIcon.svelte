<script lang="ts">
    import { page } from '$app/stores'; // Import the page store to check the current URL

    // Simple gear icon SVG (you can find others online)
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`;
</script>

<!--
  Conditionally render the link:
  - Check if the current page's URL path does NOT start with '/admin'.
  - This prevents the icon from showing up when already inside the admin area.
-->
{#if !$page.url.pathname.startsWith('/admin')}
    <a
        href="/admin/dashboard"
        title="لوحة تحكم الأدمن"
        aria-label="Admin Dashboard"
        class="fixed top-4 left-4 z-[100] bg-purple-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-purple-500 transition duration-300 glow-effect"
    >
        <!-- Render the SVG icon using Svelte's {@html ...} directive -->
        {@html iconSvg}
    </a>
{/if}