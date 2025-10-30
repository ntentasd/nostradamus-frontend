<script lang="ts">
	import { API_URL } from '$lib/config';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { SensorData, Field } from '$lib/types';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button, type ButtonProps } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let latest = $state<SensorData[]>([]);
	let fields = $state<Field[]>([]);
	let loading = $state(false);
	let fieldsLoading = $state(true);

	let error = $state<string | null>(null);
	let fieldsError = $state<string | null>(null);

	let showModal = $state(false);
	let newFieldName = $state('');
	let validationError = $state<string | null>(null);

	function openModal(_event?: MouseEvent) {
		newFieldName = '';
		validationError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function addField() {
		if (!newFieldName.trim()) {
			validationError = 'Field name cannot be empty.';
			return;
		}

		const sanitizedFieldName = newFieldName
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '_')
			.replace(/[^a-z0-9_-]/g, '');

		const user_id = '550e8400-e29b-41d4-a716-446655440000';
		validationError = null;

		try {
			const res = await fetch(`${API_URL}/fields`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					user_id,
					field_name: sanitizedFieldName
				})
			});

			const raw = await res.json().catch(() => ({}));

			// Non-200 response → show error in modal
			if (!res.ok) {
				validationError = raw?.error ? raw.error : `Request failed with status ${res.status}`;
				return;
			}

			const data = raw?.data;
			if (!data || !data.field_id || !data.field_name) {
				validationError = 'Invalid response from server.';
				return;
			}

			const newField: Field = {
				field_id: data.field_id,
				field_name: data.field_name
			};

			fields = [...fields, newField];
			showModal = false;
			newFieldName = '';
			validationError = null;
		} catch (err) {
			validationError = (err as Error).message;
		}
	}

	// onMount(async () => {
	// 	try {
	// 		// fetch latest
	// 		const latestRes = await fetch(`${API_URL}/latest`);
	// 		if (!latestRes.ok) throw new Error(`Status ${latestRes.status}`);
	// 		const latestRaw = await latestRes.json();
	// 		if (Array.isArray(latestRaw.data)) latest = latestRaw.data;

	// 		// fetch fields
	// 		const fieldsRes = await fetch(
	// 			`${API_URL}/fields?user_id=550e8400-e29b-41d4-a716-446655440000`
	// 		);
	// 		if (!fieldsRes.ok) throw new Error(`Status ${fieldsRes.status}`);
	// 		const fieldsRaw = await fieldsRes.json();
	// 		if (Array.isArray(fieldsRaw.data)) fields = fieldsRaw.data;
	// 	} catch (err) {
	// 		error = (err as Error).message;
	// 	} finally {
	// 		loading = false;
	// 		fieldsLoading = false;
	// 	}
	// });

	onMount(async () => {
		try {
			const res = await fetch(`${API_URL}/fields?user_id=550e8400-e29b-41d4-a716-446655440000`);
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			showModal = false;
		}
	}
</script>

<div class="flex h-[calc(100vh-4rem)] bg-white justify-center">
	<main class="w-full max-w-6xl p-6 overflow-y-auto bg-white">
		<div class="flex items-center justify-between mb-4 border-b pb-3">
			<h2 class="text-xl font-semibold text-lime-700">My Fields</h2>
			<Button
				onclick={openModal}
				class="bg-lime-600 hover:bg-lime-700 text-white px-4 py-2 cursor-pointer"
			>
				Add Field
			</Button>
		</div>

		{#if fieldsLoading}
			<p class="text-gray-500 text-sm">Loading...</p>
		{:else if fieldsError}
			<p class="text-red-600 text-sm">{fieldsError}</p>
		{:else if fields.length === 0}
			<div class="text-gray-500 text-sm italic">No fields yet.</div>
		{:else}
			<div class="divide-y border border-gray-200 rounded-sm">
				{#each fields as field}
					<a href={`/fields/${field.field_id}`} class="block px-4 py-3 hover:bg-gray-50">
						<div class="flex items-center justify-between">
							<div class="font-medium text-lime-700">{field.field_name}</div>
							<div class="text-xs text-gray-500">{field.field_id}</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</main>
</div>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
		<div class="bg-white border border-gray-200 w-full max-w-sm p-5">
			<h3 class="text-lg font-semibold mb-3 text-lime-700">Add Field</h3>

			<label for="fieldName" class="block text-sm text-gray-700 mb-1">Field Name</label>
			<Input
				id="fieldName"
				type="text"
				bind:value={newFieldName}
				placeholder="field name"
				class="w-full mb-2"
			/>

			{#if validationError}
				<p class="text-xs text-red-600 mb-2">{validationError}</p>
			{/if}

			<div class="flex justify-end space-x-2 mt-2">
				<Button
					onclick={closeModal}
					class="bg-gray-200 text-gray-700 px-3 py-1 hover:bg-gray-300 cursor-pointer"
				>
					Cancel
				</Button>

				<Button
					onclick={addField}
					class="bg-lime-600 text-white px-3 py-1 hover:bg-lime-700 cursor-pointer"
				>
					Add
				</Button>
			</div>
		</div>
	</div>
{/if}
