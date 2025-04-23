<!-- === Code for src/lib/components/LoginIcon.svelte (Adjusted Position) === -->
<script lang="ts">
    // Simple User/Login Icon SVG
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd" /></svg>`;
</script>

<a
    href="/admin/login"
    title="تسجيل دخول الأدمن"
    aria-label="Admin Login"
    class="fixed top-6 right-4 z-[100] flex h-10 w-10 items-center justify-center rounded-full border border-purple-600/50 bg-gray-800/70 text-purple-300 shadow-lg backdrop-blur-sm transition duration-300 ease-in-out hover:scale-110 hover:border-purple-500 hover:bg-gray-700/80 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black"
    > <!-- Changed top-4 to top-6 -->
    {@html iconSvg}
</a>