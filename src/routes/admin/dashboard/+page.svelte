<!-- === Code for src/routes/admin/dashboard/+page.svelte (Elegant Styling) === -->
<script lang="ts">
	// Import Supabase client
	import { supabase } from '$lib/supabaseClient';

	// THIS PASSWORD MUST EXACTLY MATCH THE ONE IN YOUR LOGIN PAGE CODE
	// from src/routes/admin/login/+page.svelte
	const PASSWORD_TO_SET_IN_SUPABASE = 'SillyYara123';

	async function forceSetSupabasePassword() {
		const confirmation = confirm(
			`This will attempt to change the password for the currently logged-in Supabase user ` +
			`to: "${PASSWORD_TO_SET_IN_SUPABASE}".\n\n` +
			`This should be the same password your login page code expects.\n\n` +
			`Are you sure you want to proceed?`
		);

		if (!confirmation) {
			alert('Password update cancelled.');
			return;
		}

		const { data, error } = await supabase.auth.updateUser({
			password: PASSWORD_TO_SET_IN_SUPABASE
		});

		if (error) {
			alert('Error updating password in Supabase: ' + error.message);
			console.error('Supabase password update error:', error);
		} else {
			alert(
				'Password successfully updated in Supabase to: "' + PASSWORD_TO_SET_IN_SUPABASE + '"\n\n' +
				'Please LOG OUT completely and then try logging back in manually using "Yara" and this new password.'
			);
			console.log('Supabase password update success:', data);
		}
	}
</script>

<svelte:head>
	<title>لوحة التحكم - بعيد وقريب</title>
</svelte:head>

<!-- Elegant Dashboard Content -->
<div class="space-y-10"> <!-- Increased spacing -->
	<!-- Styled Heading -->
	<h2 class="animate-fadeIn border-b-2 border-purple-800/30 pb-4 text-center text-3xl font-bold tracking-tight text-purple-300/90 title-glow sm:text-right sm:text-4xl">
		✨ أهلاً بكِ في لوحة التحكم ✨
	</h2>

	<!-- Introductory text -->
	<p class="animate-fadeInUp text-center text-lg text-gray-300 sm:text-right">
		اختاري القسم الذي ترغبين بإدارته من البطاقات أدناه:
	</p>

    <!-- TEMPORARY SECTION - REMOVE AFTER USE -->
    <div style="margin-top: 30px; padding: 15px; border: 2px solid red; background-color: #ffe0e0; border-radius: 8px; text-align: center;">
        <h2 style="color: red; font-weight: bold; font-size: 1.25rem; margin-bottom: 10px;">أداة مزامنة كلمة المرور المؤقتة</h2>
        <p style="color: #333; margin-bottom: 10px;">
            استخدمي هذا الزر فقط لمزامنة كلمة مرور Supabase للمستخدم المسؤول
            (<code>omarhamam13@yahoo.com</code>) مع كلمة المرور المضمنة في كود صفحة تسجيل الدخول
            (حالياً "<strong>{PASSWORD_TO_SET_IN_SUPABASE}</strong>").
        </p>
        <button
            on:click={forceSetSupabasePassword}
            style="background-color: #dc3545; color: white; padding: 10px 15px; border: none; cursor: pointer; font-size: 16px; margin-top: 10px; border-radius: 5px;"
        >
            فرض تعيين كلمة مرور Supabase إلى "{PASSWORD_TO_SET_IN_SUPABASE}"
        </button>
        <p style="margin-top: 10px; color: #555;">
            <small><strong>مهم:</strong> بعد تسجيل الدخول يدوياً بنجاح، قومي بإزالة هذا القسم المؤقت بالكامل من الكود الخاص بك.</small>
        </p>
    </div>
    <!-- END OF TEMPORARY SECTION -->


	<!-- Grid for Stylish Link Cards -->
	<div class="grid grid-cols-1 gap-8 pt-4 md:grid-cols-2 lg:gap-10">
		<!-- Elegant Card 1: Manage Products -->
		<a
			href="/admin/products"
			class="group relative block transform overflow-hidden rounded-2xl border border-purple-900/30 bg-gradient-to-br from-gray-900/70 via-black/60 to-gray-900/70 p-6 shadow-xl shadow-purple-950/20 backdrop-blur-sm transition duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-purple-600/20 hover:shadow-2xl sm:p-8"
		>
			<div class="relative z-10">
				<h3 class="mb-4 flex items-center text-2xl font-semibold text-purple-400 transition duration-300 group-hover:text-purple-300 card-title-glow">
					<svg xmlns="http://www.w3.org/2000/svg" class="ml-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
					  </svg>
					إدارة المنتجات
				</h3>
				<p class="text-base text-gray-400 transition duration-300 group-hover:text-gray-300">
					إضافة منتجات جديدة، تعديل التفاصيل والأسعار، رفع الصور، وتحديد المقاسات والمخزون المتوفر.
				</p>
			</div>
			<!-- Animated Glowing edge effect on hover -->
			<div class="absolute bottom-0 left-0 h-1.5 w-full origin-center scale-x-0 transform bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 opacity-0 transition-all duration-500 ease-out group-hover:scale-x-100 group-hover:opacity-100"></div>
		</a>

		<!-- Elegant Card 2: Site Settings -->
		<a
			href="/admin/settings"
			class="group relative block transform overflow-hidden rounded-2xl border border-purple-900/30 bg-gradient-to-br from-gray-900/70 via-black/60 to-gray-900/70 p-6 shadow-xl shadow-purple-950/20 backdrop-blur-sm transition duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-purple-600/20 hover:shadow-2xl sm:p-8"
		>
			<div class="relative z-10">
				<h3 class="mb-4 flex items-center text-2xl font-semibold text-purple-400 transition duration-300 group-hover:text-purple-300 card-title-glow">
					<svg xmlns="http://www.w3.org/2000/svg" class="ml-3 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					  </svg>
					إعدادات الموقع
				</h3>
				<p class="text-base text-gray-400 transition duration-300 group-hover:text-gray-300">
					تحديث معلومات التواصل (الهاتف والعنوان)، ساعات العمل، روابط الشبكات الاجتماعية، ونصوص الموقع الرئيسية.
				</p>
			</div>
			<!-- Animated Glowing edge effect on hover -->
			<div class="absolute bottom-0 left-0 h-1.5 w-full origin-center scale-x-0 transform bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 opacity-0 transition-all duration-500 ease-out group-hover:scale-x-100 group-hover:opacity-100"></div>
		</a>
	</div>
</div>

<style>
	/* Add specific styles if needed, e.g., glow for card titles */
	.title-glow {
		text-shadow: 0 0 8px rgba(216, 180, 254, 0.4); /* Adjust color/intensity as needed */
	}
    .card-title-glow {
         text-shadow: 0 0 6px rgba(192, 132, 252, 0.3); /* Softer glow for card titles */
    }

    /* Re-use fade-in animations from admin layout */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
	.animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }

	@keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
	.animate-fadeInUp { opacity: 0; animation: fadeInUp 0.5s 0.3s ease-out forwards; /* Delay slightly more */ }
</style>
