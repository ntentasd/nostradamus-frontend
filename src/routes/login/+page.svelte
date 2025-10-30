<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let email = '';
	let password = '';
	let loading = false;
	let message: string | null = null;
	let error: string | null = null;

	async function registerUser() {
		loading = true;
		message = null;
		error = null;

		try {
			const res = await fetch('/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if (!res.ok) {
				throw new Error(`Request failed: ${res.status}`);
			}

			const data = await res.json();
			message = data.message;
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
	<div class="w-full max-w-5xl bg-white shadow-lg rounded-xl flex overflow-hidden">
		<div class="w-full md:w-1/2 p-28">
			<h2 class="text-5xl font-semibold text-lime-700 mb-6">Welcome</h2>
			<p class="text-base text-gray-600 mb-10">Sign in or create an account</p>

			<form on:submit|preventDefault={registerUser} class="space-y-7">
				<div class="space-y-1">
					<label for="email" class="text-sm font-medium text-gray-700">Email</label>
					<Input
						id="email"
						type="email"
						bind:value={email}
						placeholder="you@example.com"
						class="text-base"
					/>
				</div>

				<div class="space-y-1">
					<label for="password" class="text-sm font-medium text-gray-700">Password</label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						placeholder="••••••••"
						class="text-base"
					/>
				</div>

				<Button
					type="submit"
					class="w-full bg-lime-600 hover:bg-lime-700 text-white text-base font-medium py-4 shadow cursor-pointer"
					disabled={loading}
				>
					{#if loading}
						Processing…
					{:else}
						Sign In / Register
					{/if}
				</Button>

				{#if message}
					<p class="text-sm text-lime-700 font-medium">{message}</p>
				{/if}
				{#if error}
					<p class="text-sm text-red-600">{error}</p>
				{/if}
			</form>
		</div>

		<div
			class="hidden md:flex w-1/2 bg-lime-50 border-l border-lime-200 items-center justify-center p-[32px]"
		>
			<div class="text-center max-w-sm">
				<h3 class="text-3xl font-semibold text-lime-700 mb-3">Nostradamus</h3>
				<p class="text-lg text-gray-600 leading-relaxed">
					Automated data pipelines for your fields and sensors.
				</p>
			</div>
		</div>
	</div>
</div>
