<!-- === Code for src/routes/admin/+layout.svelte (Including Orders Link) === -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let checkingAuth = true;

	// Reactive redirect logic
	$: {
		if (!checkingAuth && !$authStore && $page.url.pathname !== '/admin/login') {
			goto('/admin/login', { replaceState: true });
		}
	}

	// onMount logic
	onMount(() => {
		const unsubscribe = authStore.subscribe((sessionValue) => {
			checkingAuth = false;
		});
		return () => unsubscribe();
	});

	// Logout function
	async function handleLogout() {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error('Error logging out:', error);
			alert('حدث خطأ أثناء تسجيل الخروج.');
		} else {
			goto('/');
		}
	}

	// isActive helper function
	function isActive(path: string) {
		return $page.url.pathname === path;
	}
</script>

<!-- Conditional Rendering based on auth state -->
{#if $authStore && !checkingAuth}
	<!-- Main container for the admin section -->
	<div class="admin-layout min-h-screen bg-gradient-to-b from-gray-950 via-black to-purple-950/10 p-4 text-gray-300 md:p-6 lg:p-8">
		<!-- Header Section -->
		<header class="mb-8 flex flex-col items-center gap-4 border-b border-purple-900/30 pb-6 sm:flex-row sm:justify-between">
			<h1 class="animate-fadeIn text-center text-2xl font-bold tracking-wider text-purple-300/90 sm:text-left lg:text-3xl title-glow">
				✨ لوحة تحكم - بعيد وقريب ✨
			</h1>
			<button
				on:click={handleLogout}
				class="transform rounded-md bg-gradient-to-r from-red-600 to-red-800 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-900/30 transition duration-300 ease-in-out hover:scale-105 hover:from-red-500 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black glow-effect"
			>
				تسجيل الخروج
			</button>
		</header>

		<!-- Navigation Menu -->
		<nav class="mb-10 rounded-xl border border-purple-900/20 bg-gray-900/60 p-4 shadow-2xl shadow-purple-950/20 backdrop-blur-lg">
			<ul class="flex flex-wrap justify-center gap-x-8 gap-y-4 md:justify-start">
				<li>
					<a
						href="/admin/dashboard"
						class="group relative px-1 pb-2 text-base font-medium transition duration-300 ease-in-out hover:text-purple-300"
						class:active-link={isActive('/admin/dashboard')}
						class:inactive-link={!isActive('/admin/dashboard')}
					>
						الرئيسية
						<span class="absolute bottom-0 left-0 block h-0.5 origin-left scale-x-0 transform bg-gradient-to-r from-purple-500 to-pink-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
							  class:scale-x-100={isActive('/admin/dashboard')}>
						</span>
					</a>
				</li>
				<li>
					<a
						href="/admin/products"
						class="group relative px-1 pb-2 text-base font-medium transition duration-300 ease-in-out hover:text-purple-300"
						class:active-link={isActive('/admin/products')}
						class:inactive-link={!isActive('/admin/products')}
					>
						إدارة المنتجات
						<span class="absolute bottom-0 left-0 block h-0.5 origin-left scale-x-0 transform bg-gradient-to-r from-purple-500 to-pink-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
							  class:scale-x-100={isActive('/admin/products')}>
						</span>
					</a>
				</li>
				<li>
					<a
						href="/admin/settings"
						class="group relative px-1 pb-2 text-base font-medium transition duration-300 ease-in-out hover:text-purple-300"
						class:active-link={isActive('/admin/settings')}
						class:inactive-link={!isActive('/admin/settings')}
					>
						إعدادات الموقع
						<span class="absolute bottom-0 left-0 block h-0.5 origin-left scale-x-0 transform bg-gradient-to-r from-purple-500 to-pink-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
							  class:scale-x-100={isActive('/admin/settings')}>
						</span>
					</a>
				</li>
				<!-- === ADDED ORDERS LINK === -->
				<li>
					<a
						href="/admin/orders"
						class="group relative px-1 pb-2 text-base font-medium transition duration-300 ease-in-out hover:text-purple-300"
						class:active-link={isActive('/admin/orders')}
						class:inactive-link={!isActive('/admin/orders')}
					>
						إدارة الطلبات
						<span class="absolute bottom-0 left-0 block h-0.5 origin-left scale-x-0 transform bg-gradient-to-r from-purple-500 to-pink-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
							  class:scale-x-100={isActive('/admin/orders')}>
						</span>
					</a>
				</li>
				<!-- === END OF ADDED LINK === -->
			</ul>
		</nav>

		<!-- Main content area -->
		<main class="animate-fadeInUp rounded-xl border border-gray-800/50 bg-gradient-to-br from-gray-900/80 via-black/50 to-gray-900/80 p-5 shadow-inner shadow-black/30 backdrop-blur-md sm:p-8">
			<slot /> <!-- Page content goes here -->
		</main>
	</div>
{:else if checkingAuth}
	<!-- Loading state -->
	<div class="flex h-screen items-center justify-center bg-black">
		<p class="animate-pulse text-lg text-purple-400">جاري التحقق...</p>
	</div>
{:else if !checkingAuth && $page.url.pathname === '/admin/login'}
	<!-- Wrapper for login page -->
	<div class="admin-login-wrapper min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/50 p-4">
		<slot />
	</div>
{/if}

<!-- Styles -->
<style>
	.active-link { @apply font-semibold text-purple-400; }
	.inactive-link { @apply text-gray-400 hover:text-purple-400/80; }
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
	@keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
	.animate-fadeInUp { opacity: 0; animation: fadeInUp 0.5s 0.2s ease-out forwards; }
	.title-glow { text-shadow: 0 0 10px rgba(216, 180, 254, 0.5), 0 0 20px rgba(192, 132, 252, 0.3), 0 0 30px rgba(167, 139, 250, 0.2); animation: pulseGlow 4s infinite ease-in-out; }
	@keyframes pulseGlow { 0%, 100% { text-shadow: 0 0 8px rgba(216, 180, 254, 0.4), 0 0 15px rgba(192, 132, 252, 0.25), 0 0 25px rgba(167, 139, 250, 0.15); } 50% { text-shadow: 0 0 12px rgba(216, 180, 254, 0.6), 0 0 25px rgba(192, 132, 252, 0.4), 0 0 40px rgba(167, 139, 250, 0.25); } }
</style>