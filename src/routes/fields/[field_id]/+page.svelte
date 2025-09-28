<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import type { Field, Sensor } from '$lib/types';
	import { onMount } from 'svelte';
	import { SensorType } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

	export let params: { field_id: string };

	let field: Field | null = null;
	let sensors: Sensor[] = [];
	let loading = true;
	let error: string | null = null;

	// --- Modal state
	let showModal = false;
	let newSensorName = '';
	let newSensorType: string | undefined = undefined;
	let validationError: string | null = null;

	onMount(async () => {
		try {
			const res = await fetch(`http://localhost:8080/sensors?field_id=${params.field_id}`);
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const raw = await res.json();

			// set field info
			if (raw.field) {
				field = {
					field_id: raw.field.field_id,
					field_name: raw.field.field_name
				};
			}

			// set sensors
			if (raw && Array.isArray(raw.data)) {
				sensors = raw.data.map((s: any) => ({
					sensor_id: s.sensor_id,
					sensor_name: s.sensor_name,
					sensor_type: s.sensor_type
				}));
			} else {
				error = 'Unexpected response format';
			}
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	});

	// Map numeric sensor_type to readable string + color
	function sensorTypeLabel(type: number): { label: string; color: string } {
		switch (type) {
			case SensorType.Temperature:
				return { label: 'Temperature', color: 'text-red-600' };
			case SensorType.Humidity:
				return { label: 'Humidity', color: 'text-blue-600' };
			case SensorType.PHLevel:
				return { label: 'pH Level', color: 'text-green-600' };
			default:
				return { label: 'Unknown', color: 'text-gray-500' };
		}
	}

	function generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	function openModal() {
		newSensorName = '';
		newSensorType = undefined;
		validationError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function addSensor() {
		if (!newSensorName.trim()) {
			validationError = 'Sensor name cannot be empty.';
			return;
		}
		if (!newSensorType) {
			validationError = 'Please select a sensor type.';
			return;
		}

		const sensorTypeNum = Number(newSensorType);
		const newSensor: Sensor = {
			sensor_id: generateUUID(),
			sensor_name: newSensorName.trim(),
			sensor_type: sensorTypeNum
		};

		sensors = [...sensors, newSensor];
		showModal = false;
	}
</script>

<div class="max-w-6xl mx-auto py-10 px-6">
	<!-- Title -->
	<h1 class="text-3xl font-bold text-emerald-800 mb-6">
		Field Dashboard {#if field}
			– {field.field_name}{/if}
	</h1>

	<!-- Field overview card -->
	<Card class="mb-8 shadow border border-emerald-100">
		<CardContent class="p-6">
			<h2 class="text-xl font-semibold text-emerald-700 mb-2">
				Field: <span class="text-gray-600">{field?.field_name}</span>
			</h2>
			<p class="text-gray-500">
				Field ID: <span class="font-mono">{params.field_id}</span>
			</p>
			<p class="text-gray-500 mt-2">
				This field is connected to <span class="font-semibold">{sensors.length}</span> sensors.
			</p>
		</CardContent>
	</Card>

	<!-- Header with Add Sensor -->
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-emerald-800">Sensors</h2>
		<Button
			onclick={openModal}
			class="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
		>
			Add Sensor
		</Button>
	</div>

	<!-- Sensors grid -->
	{#if loading}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
			{#each Array(6) as _}
				<Card class="shadow">
					<CardContent class="p-6 space-y-3">
						<div class="h-4 bg-gray-200 rounded w-1/2"></div>
						<div class="h-6 bg-gray-200 rounded w-2/3"></div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if sensors.length === 0}
		<p class="text-gray-500 italic">No sensors are registered for this field yet.</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each sensors as sensor}
				{@const type = sensorTypeLabel(sensor.sensor_type)}
				<Card class="shadow hover:shadow-lg transition-shadow border border-gray-200">
					<CardContent class="p-6 space-y-3 text-center">
						<div
							class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6 text-emerald-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</div>
						<p class="text-lg font-semibold text-emerald-700">{sensor.sensor_name}</p>
						<p class={`text-sm font-medium ${type.color}`}>{type.label}</p>
						<p class="text-xs text-gray-500 break-all">ID: {sensor.sensor_id}</p>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Sensor Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h3 class="text-xl font-bold mb-4 text-emerald-700">Add a New Sensor</h3>

			<div class="space-y-2 mb-4">
				<label for="sensorName" class="text-sm font-medium text-gray-700">Sensor Name</label>
				<Input
					id="sensorName"
					type="text"
					bind:value={newSensorName}
					placeholder="Enter sensor name"
				/>
			</div>

			<div class="space-y-2 mb-4">
				<label
					id="sensor-type-label"
					for="sensorType"
					class="text-sm font-medium text-gray-700 cursor-default select-none"
				>
					Sensor Type
				</label>
				<Select bind:value={newSensorType} type="single">
					<SelectTrigger
						class="w-full border border-gray-300 rounded px-3 py-2 text-sm cursor-pointer"
					>
						{newSensorType
							? ['Temperature', 'Humidity', 'pH Level'][Number(newSensorType)]
							: 'Select a type'}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={SensorType.Temperature.toString()} class="cursor-pointer"
							>Temperature</SelectItem
						>
						<SelectItem value={SensorType.Humidity.toString()} class="cursor-pointer"
							>Humidity</SelectItem
						>
						<SelectItem value={SensorType.PHLevel.toString()} class="cursor-pointer"
							>pH Level</SelectItem
						>
					</SelectContent>
				</Select>
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
					onclick={addSensor}
					class="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
				>
					Add
				</Button>
			</div>
		</div>
	</div>
{/if}
