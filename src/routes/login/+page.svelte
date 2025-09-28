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

<div class="flex max-w-4xl shadow-xl rounded-2xl overflow-hidden">
	<!-- Left: form -->
	<div class="w-full md:w-1/2 p-8 md:p-12 bg-white">
		<h2 class="text-3xl font-bold text-gray-800 mb-6">Welcome to Nostradamus</h2>
		<p class="text-gray-600 mb-8">
			Login or create your account to start managing your IoT data streams.
		</p>

		<form on:submit|preventDefault={registerUser} class="space-y-6">
			<div class="space-y-2">
				<label for="email" class="text-sm font-medium text-gray-700">Email</label>
				<Input id="email" type="email" bind:value={email} placeholder="you@example.com" />
			</div>

			<div class="space-y-2">
				<label for="password" class="text-sm font-medium text-gray-700">Password</label>
				<Input id="password" type="password" bind:value={password} placeholder="••••••••" />
			</div>

			<Button
				type="submit"
				class="w-full bg-lime-600 hover:bg-lime-700 text-white shadow-md cursor-pointer"
				disabled={loading}
			>
				{#if loading}
					Creating account…
				{:else}
					Login / Register
				{/if}
			</Button>
			{#if message}
				<p class="text-green-600">{message}</p>
			{/if}
			{#if error}
				<p class="text-red-600 items-center justify-center flex">{error}</p>
			{/if}
		</form>
	</div>

	<!-- Right: accent panel -->
	<div
		class="hidden md:flex w-1/2 bg-gradient-to-br from-gray-300 to-lime-700 items-center justify-center"
	>
		<div class="text-center px-8 text-white">
			<h3 class="text-2xl font-bold text-gray-900 mb-4">Real-time Agriculture</h3>
			<p class="opacity-90">
				Nostradamus provisions Kafka topics, MQTT mappings, and storage automatically for you.
			</p>
		</div>
	</div>
</div>
