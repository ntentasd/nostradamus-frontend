<script lang="ts">
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
			const res = await fetch('http://localhost:8080/healthz');
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

<div
	class={`w-1/4 h-50 flex-col items-center justify-center outline-1 p-10 rounded-2xl shadow-md ${healthClass}`}
>
	<h2 class="text-2xl w-full justify-center items-center text-center font-semibold mb-4">
		System Health
	</h2>

	<div class="flex w-full justify-center text-center items-center space-x-2">
		{#if loading}
			<div
				class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex items-center justify-center"
				in:fade={{ duration: 150 }}
			></div>
		{:else if status}
			<!-- reserve spinner space so text doesn’t shift -->
			<div class="w-full flex items-center justify-center">
				<p class="text-lg leading-none min-h-[1.5rem]" in:fade={{ duration: 200 }}>
					{status}
				</p>
			</div>
		{/if}
	</div>
</div>
