<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SensorData, Field } from '$lib/types';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { goto } from '$app/navigation';
	import { Button, type ButtonProps } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let latest = $state<SensorData[]>([]);
	let fields = $state<Field[]>([]);
	let loading = $state(false);
	let fieldsLoading = true;
	let error = $state<string | null>(null);
	let fieldsError = $state<string | null>(null);

	let showModal = $state(false);
	let newFieldName = $state('');
	let validationError = $state<string | null>(null);

	function generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	function openModal(_event?: MouseEvent) {
		newFieldName = '';
		validationError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function addField() {
		if (!newFieldName.trim()) {
			validationError = 'Field name cannot be empty.';
			return;
		}
		const newField: Field = {
			field_id: generateUUID(),
			field_name: newFieldName.trim()
		};
		fields = [...fields, newField];
		showModal = false;
	}

	onMount(async () => {
		try {
			const res = await fetch('http://localhost:8080/latest');
			if (!res.ok) throw new Error(`Status ${res.status}`);

			const raw = await res.json();

			if (raw && Array.isArray(raw.data)) {
				latest = raw.data.map((s: SensorData) => ({
					value: s.value,
					timestamp: s.timestamp
				}));
			} else if (raw && raw.data === null) {
				// explicitly handle no data
				latest = [];
			} else {
				error = 'Unexpected response format';
			}
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	});

	onMount(async () => {
		try {
			const res = await fetch(
				'http://localhost:8080/fields?user_id=550e8400-e29b-41d4-a716-446655440000'
			);
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const raw = await res.json();

			if (raw && Array.isArray(raw.data)) {
				fields = raw.data.map((f: Field) => ({
					field_id: f.field_id,
					field_name: f.field_name
				}));
			} else {
				fieldsError = 'Unexpected response format';
			}
		} catch (err) {
			fieldsError = (err as Error).message;
		} finally {
			fieldsLoading = false;
		}
	});

	function openField(field_id: string) {
		goto(`/fields/${field_id}`);
	}
</script>

<!-- Full height dashboard -->
<div class="flex h-[calc(100vh-4rem)]">
	<!-- Sidebar: edge aligned -->
	<aside
		class="w-64 bg-gradient-to-b from-emerald-50 to-emerald-100 border-r border-emerald-200 shadow-sm p-5 flex flex-col overflow-y-auto"
	>
		<h2 class="text-lg font-bold mb-6 text-emerald-700 text-center">Live Feed (Latest 5)</h2>

		<div class="flex-1">
			{#if loading}
				<ul class="space-y-3 animate-pulse">
					{#each Array(5) as _}
						<li class="h-20 bg-gray-200 rounded-lg"></li>
					{/each}
				</ul>
			{:else if error}
				<Card class="shadow bg-red-50 border border-red-200">
					<CardContent class="p-4 text-center">
						<p class="text-red-600 font-semibold">Error: {error}</p>
					</CardContent>
				</Card>
			{:else if latest.length === 0}
				<p class="text-gray-500 text-center">No data</p>
			{:else}
				<ul class="space-y-3">
					{#each latest.slice(0, 5) as item, i (i)}
						<li in:fade={{ duration: 200 }} out:fade={{ duration: 150 }}>
							<Card class="shadow-md hover:shadow-lg border border-gray-200 rounded-xl">
								<CardContent class="px-5 flex flex-col items-center text-center space-y-2">
									<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">
										{new Date(item.timestamp).toLocaleTimeString([], {
											hour: '2-digit',
											minute: '2-digit'
										})}
									</p>
									<p class="text-2xl font-semibold text-emerald-600">
										{item.value}
										<span class="text-sm text-gray-500 ml-1">units</span>
									</p>
									<div class="w-8 h-px bg-emerald-100"></div>
									<p class="text-xs text-gray-400">Latest reading</p>
								</CardContent>
							</Card>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</aside>

	<!-- Main content: now padded separately -->
	<main class="flex-1 p-10 overflow-y-auto bg-white">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-2xl font-bold text-emerald-800">My Fields</h2>
			<Button
				onclick={openModal}
				class="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
			>
				Add Field
			</Button>
		</div>

		<!-- Your fields grid goes here -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each fields as field}
				<a href={`/fields/${field.field_id}`} class="block">
					<Card class="shadow hover:shadow-lg transition-shadow border border-emerald-200">
						<CardContent class="p-6 text-center">
							<p class="text-lg font-semibold text-emerald-700">{field.field_name}</p>
							<p class="text-sm text-gray-500">ID: {field.field_id}</p>
						</CardContent>
					</Card>
				</a>
			{/each}
		</div>
	</main>
</div>

<!-- Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h3 class="text-xl font-bold mb-4 text-emerald-700">Add a New Field</h3>

			<div class="space-y-2 mb-4">
				<label for="fieldName" class="text-sm font-medium text-gray-700">Field Name</label>
				<Input
					id="fieldName"
					type="text"
					bind:value={newFieldName}
					placeholder="Enter field name"
				/>
				{#if validationError}
					<p class="text-red-600 text-sm">{validationError}</p>
				{/if}
			</div>

			<div class="flex justify-end space-x-3">
				<Button
					onclick={closeModal}
					class="bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer"
				>
					Cancel
				</Button>
				<Button
					onclick={addField}
					class="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
				>
					Add
				</Button>
			</div>
		</div>
	</div>
{/if}
