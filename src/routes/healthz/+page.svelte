<script lang="ts">
	import { API_URL } from '$lib/config';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	export let loading = true;
	export let status: string | null = null;

	$: healthClass =
		status === 'Healthy'
			? 'bg-green-50 border border-green-200'
			: status === 'Unhealthy'
				? 'bg-red-50 border border-red-200'
				: 'bg-gray-50 border border-gray-200';

	onMount(async () => {
		const start = Date.now();

		try {
			const res = await fetch(`${API_URL}/healthz`);
			status = res.ok ? 'Healthy' : 'Unhealthy';
		} catch {
			status = 'Unhealthy';
		} finally {
			const elapsed = Date.now() - start;
			const minTime = 500;
			setTimeout(() => (loading = false), Math.max(0, minTime - elapsed));
		}
	});
</script>

<div class="min-h-[calc(100vh-4rem)] bg-gray-50 flex justify-center pt-[120px]">
	<div class="inline-block w-full max-w-2xl">
		<div class={`max-w-lg w-full p-16 rounded-xl shadow border ${healthClass}`}>
			<h2 class="text-2xl text-center font-semibold mb-4">System Health</h2>

			<div class="flex justify-center items-center">
				{#if loading}
					<div
						class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
						in:fade={{ duration: 150 }}
					></div>
				{:else if status}
					<p class="text-lg font-medium" in:fade={{ duration: 200 }}>{status}</p>
				{/if}
			</div>
		</div>
	</div>
</div>
