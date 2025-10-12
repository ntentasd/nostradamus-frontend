<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { RefreshCw } from 'lucide-svelte';
	import type { Pipeline } from '$lib/types';

	const pipelines = writable<Map<string, Pipeline>>(new Map());
	const orderIds = writable<string[]>([]);
	const isInitializing = writable(true);
	const errorMsg = writable<string | null>(null);
	const jobStatuses = writable<Map<string, string>>(new Map());

	const sortedPipelines = derived(
		[pipelines, orderIds],
		([$pipelines, $orderIds]) =>
			$orderIds.map((id) => $pipelines.get(id)).filter(Boolean) as Pipeline[]
	);

	let interval: ReturnType<typeof setInterval>;

	let showModal = false;
	let pipelineName = '';
	let parallelism = 2;
	let validationError: string | null = null;

	async function fetchPipelines() {
		try {
			const res = await fetch('http://localhost:8080/pipelines');
			if (!res.ok) throw new Error(`Failed to fetch pipelines: ${res.status}`);

			const json = await res.json();

			const newData: Pipeline[] = (json.data ?? []).map((p: Pipeline) => ({
				id: p.id,
				name: p.name
			}));

			const newIds = newData.map((p) => p.id);
			pipelines.set(new Map(newData.map((p) => [p.id, p])));
			orderIds.set(newIds);
			errorMsg.set(null);
			isInitializing.set(false);

			await Promise.all(newData.map((p) => fetchJobStatus(p.id)));
		} catch (e) {
			errorMsg.set((e as Error).message);
			isInitializing.set(false);
		}
	}

	async function fetchJobStatus(id: string) {
		try {
			const res = await fetch(`http://localhost:8080/jobs/${id}`);
			if (!res.ok) throw new Error(`Failed to fetch job ${id}: ${res.status}`);

			const json = await res.json();

			// Adjust this based on your backend’s response structure
			const state = json.data?.state ?? 'Unknown';

			jobStatuses.update((prev) => {
				const newMap = new Map(prev);
				newMap.set(id, state);
				return newMap;
			});
		} catch (e) {
			jobStatuses.update((prev) => {
				const newMap = new Map(prev);
				newMap.set(id, 'Error');
				return newMap;
			});
		}
	}

	async function restartPipeline(id: string) {
		try {
			const res = await fetch(`http://localhost:8080/pipelines/${id}/restart`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ force: true })
			});
			if (!res.ok) throw new Error(`Failed to restart pipeline: ${res.status}`);
			await fetchJobStatus(id); // refresh the state for that pipeline
		} catch (err) {
			console.error('Restart failed:', err);
			jobStatuses.update((prev) => new Map(prev).set(id, 'Error'));
		}
	}

	function openModal() {
		pipelineName = '';
		parallelism = 2;
		validationError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function createPipeline() {
		if (!pipelineName.trim()) {
			validationError = 'Pipeline name cannot be empty.';
			return;
		}
		const payload = {
			name: pipelineName.trim(),
			parallelism: Number(parallelism)
		};

		try {
			const res = await fetch('http://localhost:8080/jobs/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error(`Failed to create pipeline: ${res.status}`);
			showModal = false;
			await fetchPipelines();
		} catch (err) {
			validationError = (err as Error).message;
		}
	}

	onMount(() => {
		fetchPipelines();
		interval = setInterval(fetchPipelines, 4000);
	});
	onDestroy(() => clearInterval(interval));
</script>

<div
	class="min-h-[calc(100vh-4rem)] flex flex-col gap-6 p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100"
>
	<Card class="border border-gray-200 shadow-lg backdrop-blur-md bg-white/70 rounded-xl">
		<CardHeader>
			<div class="flex flex-row justify-between gap-2">
				<div>
					<CardTitle class="text-2xl font-semibold text-gray-800 tracking-tight">
						Pipeline Executions
					</CardTitle>
					<p class="text-sm text-gray-500">
						Monitor and manage your real-time data processing pipelines.
					</p>
				</div>

				<!-- fixed right-side control area -->
				<div class="flex items-center min-h-[32px]">
					<!-- consistent color button -->
					<Button
						onclick={openModal}
						class="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-md shadow-sm transition-colors duration-150 cursor-pointer"
					>
						+ New Pipeline
					</Button>
				</div>
			</div>
		</CardHeader>

		<CardContent>
			{#if $isInitializing}
				<div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each Array(4) as _}
						<div
							class="p-5 border border-gray-200 rounded-xl shadow-sm bg-white h-[88px] animate-pulse"
						/>
					{/each}
				</div>
			{:else if $errorMsg}
				<p class="text-red-600 font-medium py-4">Error: {$errorMsg}</p>
			{:else if $sortedPipelines.length === 0}
				<p class="text-gray-500 py-4">No active pipelines found.</p>
			{:else}
				<div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each $sortedPipelines as pipeline (pipeline.id)}
						<div
							class="p-5 border border-gray-200 rounded-xl shadow-sm bg-white hover:shadow-md hover:scale-[1.0025] transform transition duration-300 ease h-[88px]"
						>
							<div class="flex items-center justify-between mb-3">
								<div class="flex flex-col">
									<h2 class="text-sm font-semibold text-gray-900 truncate font-mono">
										{pipeline.name}
									</h2>
									<p class="text-xs text-gray-500 mt-1">
										id: {pipeline.id}
									</p>
								</div>

								<div class="flex items-center gap-2">
									<!-- Status pill -->
									<span
										class={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
											($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Running'
												? 'text-green-600 bg-green-100 animate-pulse'
												: ($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Failed'
													? 'text-red-600 bg-red-100'
													: 'text-gray-700 bg-gray-100'
										}`}
									>
										<span
											class={`h-2 w-2 rounded-full ${
												($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Running'
													? 'bg-green-500'
													: ($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Failed'
														? 'bg-red-500'
														: 'bg-gray-400'
											}`}
										></span>
										{$jobStatuses.get(pipeline.id) ?? 'Unknown'}
									</span>

									<!-- Restart button -->
									{#if ($jobStatuses.get(pipeline.id) ?? 'Unknown') !== 'Running'}
										<button
											on:click={() => restartPipeline(pipeline.id)}
											class="p-1 rounded-md bg-gray-100 hover:bg-lime-100 text-lime-600 hover:text-lime-700 transition-colors cursor-pointer"
											title="Restart pipeline"
										>
											<RefreshCw size={14} strokeWidth={2} />
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Create Pipeline Modal -->
	{#if showModal}
		<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
				<h3 class="text-xl font-bold mb-4 text-lime-600">Create a New Pipeline</h3>

				<div class="space-y-2 mb-4">
					<label for="pipelineName" class="text-sm font-medium text-gray-700">
						Pipeline Name
					</label>
					<Input id="pipelineName" bind:value={pipelineName} placeholder="Enter pipeline name" />
				</div>

				<div class="flex gap-3 mb-4">
					<div class="flex-1 space-y-1">
						<label for="parallelism" class="text-sm font-medium text-gray-700"> Parallelism </label>
						<Input
							id="parallelism"
							type="number"
							bind:value={parallelism}
							min="1"
							inputmode="numeric"
						/>
					</div>
				</div>

				{#if validationError}
					<p class="text-red-600 text-sm mb-2">{validationError}</p>
				{/if}

				<div class="flex justify-end space-x-3">
					<Button
						onclick={closeModal}
						class="bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer"
					>
						Cancel
					</Button>
					<Button
						onclick={createPipeline}
						class="bg-lime-600 hover:bg-lime-700 text-white shadow-md cursor-pointer"
					>
						Create
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
