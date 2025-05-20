    <!-- Code for src/routes/admin/login/+page.svelte -->
    <script lang="ts">
    	import { supabase } from '$lib/supabaseClient'; // Import our Supabase helper
    	import { goto } from '$app/navigation'; // Import helper for redirecting
    	import { authStore } from '$lib/stores/authStore'; // Import the auth store we created

    	// Variables to hold the form input values
    	let usernameInput = 'Yara'; // Default username shown in the input field
    	let password = '';          // Holds the password typed by the user

    	// Variables for loading state and error messages
    	let loading = false;
    	let error: string | null = null;

    	// --- Supabase uses this email internally. The user logging in never sees it ---
    	const adminEmail = 'omarhamam13@yahoo.com'; // <<< UPDATED TO YAHOO EMAIL

    	// This is a Svelte 'reactive statement'. It runs automatically whenever
    	// the value of '$authStore' changes.
    	$: if ($authStore) {
            console.log('[Login Page] $authStore changed, redirecting to dashboard.');
    		goto('/admin/dashboard', { replaceState: true });
    	}

    	// This function runs when the login form is submitted
    	async function handleLogin() {
            console.log('[Login Page] handleLogin started'); // Debug log
    		loading = true; // Indicate loading process started
    		error = null;   // Clear any previous error messages

    		try {
                console.log('[Login Page] Checking username/password input'); // Debug log
    			// --- User Input Check ---
    			if (usernameInput !== 'Yara' || password !== 'SillyYara123') {
                    console.log('[Login Page] Input check failed'); // Debug log
    				throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    			}

                console.log('[Login Page] Input check passed. Calling Supabase signInWithPassword...'); // Debug log
    			// --- Supabase Authentication ---
    			const { data, error: authError } = await supabase.auth.signInWithPassword({
    				email: adminEmail,
    				password: password
    			});
                console.log('[Login Page] Supabase signInWithPassword response:', { data: data, authError: authError }); // Debug log

    			if (authError) {
                    // Check if the specific error is "Email not confirmed"
                    if (authError.message === 'Email not confirmed') {
                        error = 'لم يتم تأكيد البريد الإلكتروني. يرجى التحقق من بريدك الوارد (والبريد العشوائي).';
                        // Optionally add a button/logic here to resend confirmation if needed
                    } else {
                        // Handle other potential auth errors like invalid credentials
                        console.error('[Login Page] Supabase authError detected:', authError); // Log specific Supabase error
                        throw authError; // Re-throw to be caught below
                    }
    			} else {
                    // Only log success if there was no authError initially
                    console.log('[Login Page] Supabase login appears successful (before redirect check in layout)'); // Debug log
                }

    		} catch (err: any) {
                // Catch errors thrown manually or re-thrown from Supabase
                console.error('[Login Page] Error in handleLogin catch block:', err); // Log any caught error
                // Only set the user-facing 'error' if it wasn't the specific "Email not confirmed" message handled above
    			if (error === null) { // Avoid overwriting the specific confirmation error
                    if (err.message === 'Invalid login credentials') {
                        error = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
                    } else {
                        error = err.message || 'حدث خطأ أثناء تسجيل الدخول.';
                    }
                }
    		} finally {
    			loading = false;
                console.log('[Login Page] handleLogin finished'); // Debug log
    		}
    	}
    </script>

    <svelte:head>
    	<title>تسجيل دخول الأدمن - بعيد وقريب</title>
    </svelte:head>

    <div class="flex items-center justify-center min-h-[80vh]">
    	<form
    		on:submit|preventDefault={handleLogin}
    		class="bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-sm border border-gray-700"
    	>
    		<h1 class="text-2xl font-bold mb-6 text-center text-white">تسجيل دخول الأدمن</h1>
    		{#if error}
    			<p class="bg-red-800 border border-red-700 text-white p-3 rounded mb-4 text-center text-sm">
    				{error}
    			</p>
    		{/if}
    		<div class="mb-4">
    			<label for="username" class="block mb-2 text-sm font-medium text-gray-300">اسم المستخدم</label>
    			<input
    				type="text"
    				id="username"
    				bind:value={usernameInput}
    				required
    				class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5 placeholder-gray-500"
    				placeholder="Yara"
    			/>
    		</div>
    		<div class="mb-6">
    			<label for="password" class="block mb-2 text-sm font-medium text-gray-300">كلمة المرور</label>
    			<input
    				type="password"
    				id="password"
    				bind:value={password}
    				required
    				class="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5 placeholder-gray-500"
    				placeholder="••••••••"
    			/>
    		</div>
    		<button
    			type="submit"
    			disabled={loading}
    			class="w-full text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:outline-none focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed glow-effect transition duration-200"
    		>
    			{loading ? 'جاري الدخول...' : 'دخول'}
    		</button>
    	</form>
    </div>
