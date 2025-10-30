<script lang="ts">
	import { API_URL } from '$lib/config';
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
			const res = await fetch(`${API_URL}/pipelines`);
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
			const res = await fetch(`${API_URL}/jobs/${id}`);
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
			const res = await fetch(`${API_URL}/pipelines/${id}/restart`, {
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
			const res = await fetch(`${API_URL}/jobs/run`, {
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

	onMount(async () => {
		fetchPipelines();
		interval = setInterval(fetchPipelines, 4000);
	});
	onDestroy(() => clearInterval(interval));
</script>

<div class="min-h-[calc(100vh-4rem)] flex flex-col gap-6 p-[32px] bg-white">
	<Card class="border border-gray-200 shadow-sm rounded-lg bg-white">
		<CardHeader class="pb-4 border-b border-gray-200">
			<div class="flex items-center justify-between">
				<div>
					<CardTitle class="text-xl font-semibold text-gray-800">Pipelines</CardTitle>
					<p class="text-sm text-gray-500 mt-1">Manage data processing pipelines</p>
				</div>

				<Button
					onclick={openModal}
					class="bg-lime-600 hover:bg-lime-700 text-white text-sm px-4 py-2 rounded-md cursor-pointer"
				>
					New Pipeline
				</Button>
			</div>
		</CardHeader>

		<CardContent class="pt-4">
			{#if $isInitializing}
				<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each Array(4) as _}
						<div class="h-[88px] border border-gray-200 rounded-md bg-gray-50 animate-pulse"></div>
					{/each}
				</div>
			{:else if $errorMsg}
				<p class="text-red-600 text-sm py-4">{$errorMsg}</p>
			{:else if $sortedPipelines.length === 0}
				<p class="text-gray-500 text-sm py-4">No pipelines found</p>
			{:else}
				<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each $sortedPipelines as pipeline (pipeline.id)}
						<div
							class="h-[88px] border border-gray-200 rounded-md bg-white p-4 hover:bg-gray-50 transition"
						>
							<div class="flex justify-between items-center h-full">
								<div class="overflow-hidden">
									<div class="text-sm font-medium text-gray-800 truncate font-mono">
										{pipeline.name}
									</div>
									<div class="text-[11px] text-gray-500 font-mono truncate mt-1">
										{pipeline.id}
									</div>
								</div>

								<div class="flex items-center gap-2">
									<span
										class={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded
											${
												($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Running'
													? 'text-lime-700 bg-lime-100'
													: ($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Failed'
														? 'text-red-700 bg-red-100'
														: 'text-gray-600 bg-gray-100'
											}`}
									>
										<span
											class={`h-2 w-2 rounded-full ${
												($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Running'
													? 'bg-lime-600'
													: ($jobStatuses.get(pipeline.id) ?? 'Unknown') === 'Failed'
														? 'bg-red-600'
														: 'bg-gray-500'
											}`}
										></span>
										{$jobStatuses.get(pipeline.id) ?? 'Unknown'}
									</span>

									{#if ($jobStatuses.get(pipeline.id) ?? 'Unknown') !== 'Running'}
										<button
											on:click={() => restartPipeline(pipeline.id)}
											class="p-1 rounded-md text-lime-600 hover:bg-gray-100 cursor-pointer"
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

	{#if showModal}
		<div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div class="bg-white border border-gray-200 w-full max-w-sm p-[32px] rounded-lg shadow">
				<h3 class="text-lg font-semibold mb-4 text-lime-700">New Pipeline</h3>

				<div class="space-y-2 mb-4">
					<label for="pipelineName" class="text-sm text-gray-700">Name</label>
					<Input id="pipelineName" bind:value={pipelineName} placeholder="pipeline_name" />
				</div>

				<div class="space-y-2 mb-4">
					<label for="parallelism" class="text-sm text-gray-700">Parallelism</label>
					<Input id="parallelism" type="number" bind:value={parallelism} min="1" />
				</div>

				{#if validationError}
					<p class="text-red-600 text-sm mb-2">{validationError}</p>
				{/if}

				<div class="flex justify-end gap-2">
					<Button
						onclick={closeModal}
						class="bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
					>
						Cancel
					</Button>

					<Button
						onclick={createPipeline}
						class="bg-lime-600 hover:bg-lime-700 text-white cursor-pointer"
					>
						Create
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
