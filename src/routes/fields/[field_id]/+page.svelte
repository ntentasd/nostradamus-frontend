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

	let showModal = false;
	let newSensorName = '';
	let newSensorType: string | undefined = undefined;
	let validationError: string | null = null;

	let submitting = false;

	// Credentials modal state
	let selectedSensor: Sensor | null = null;
	let selectedCredentials: { user: string; pass: string } | null = null;
	let showCredsModal = false;
	// Helper to copy text to clipboard
	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}
	// Show credentials for a sensor
	async function showCredentials(sensor_id: string) {
		selectedCredentials = null;
		validationError = null;
		showCredsModal = true; // open immediately
		try {
			const res = await fetch(`http://localhost:8080/sensors/credentials?sensor_id=${sensor_id}`);
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.data) {
				selectedCredentials = { user: data.data.username, pass: data.data.password };
			} else {
				validationError = data.error || 'Failed to fetch credentials';
			}
		} catch (err) {
			validationError = (err as Error).message;
		}
	}

	async function loadFieldAndSensors() {
		try {
			// Fetch field name first
			const fieldRes = await fetch(`http://localhost:8080/field?field_id=${params.field_id}`);
			if (!fieldRes.ok) throw new Error(`Failed to fetch field: ${fieldRes.status}`);
			const fieldRaw = await fieldRes.json();
			if (fieldRaw.data) {
				field = {
					field_id: fieldRaw.data.field_id,
					field_name: fieldRaw.data.field_name
				};
			} else {
				error = 'Field not found';
				return;
			}

			// Fetch sensors
			const sensorRes = await fetch(`http://localhost:8080/sensors?field_id=${params.field_id}`);
			if (!sensorRes.ok) throw new Error(`Failed to fetch sensors: ${sensorRes.status}`);
			const sensorRaw = await sensorRes.json();
			if (Array.isArray(sensorRaw.data)) {
				sensors = sensorRaw.data;
			} else if (Array.isArray(sensorRaw.data?.sensors)) {
				sensors = sensorRaw.data.sensors;
			} else {
				sensors = [];
			}
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}
	onMount(loadFieldAndSensors);

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

	function openModal() {
		newSensorName = '';
		newSensorType = undefined;
		validationError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function addSensor() {
		if (!newSensorName.trim()) {
			validationError = 'Sensor name cannot be empty.';
			return;
		}
		if (!newSensorType) {
			validationError = 'Please select a sensor type.';
			return;
		}

		validationError = null;
		submitting = true;

		try {
			const res = await fetch('http://localhost:8080/sensors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field_id: params.field_id,
					sensor_name: newSensorName.trim(),
					sensor_type: Number(newSensorType)
				})
			});

			const result = await res.json().catch(() => ({}));

			if (!res.ok) {
				validationError = result?.error || `Error ${res.status}`;
				return;
			}

			if (result?.data) {
				// Reset modal
				showModal = false;
				newSensorName = '';
				newSensorType = undefined;

				// Refresh the field and sensors list to ensure consistent data
				await loadFieldAndSensors();
			} else {
				validationError = 'Failed to add sensor: unexpected response from server.';
			}
		} catch (err) {
			validationError = (err as Error).message;
		} finally {
			submitting = false;
		}
	}

	function mqttTopic(sensorType: number, fieldName: string): string {
		const base = 't';
		let type: string;
		switch (sensorType) {
			case SensorType.Temperature:
				type = 'temperatures';
				break;
			case SensorType.Humidity:
				type = 'humidities';
				break;
			case SensorType.PHLevel:
				type = 'ph_levels';
				break;
			default:
				type = 'unknown';
		}
		return `${base}/${type}/${fieldName || 'unknown_field'}`;
	}
</script>

<div class="max-w-6xl mx-auto py-10 px-6">
	<h1 class="text-3xl font-bold text-emerald-800 mb-6">
		Field Dashboard {#if field}– {field.field_name}{/if}
	</h1>

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

	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-emerald-800">Sensors</h2>
		<Button
			onclick={openModal}
			class="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
		>
			Add Sensor
		</Button>
	</div>

	{#if loading}
		<p class="text-gray-500 italic">Loading sensors...</p>
	{:else if error}
		<p class="text-red-600">{error}</p>
	{:else if sensors.length === 0}
		<p class="text-gray-500 italic">No sensors are registered for this field yet.</p>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each sensors as sensor}
				{@const type = sensorTypeLabel(sensor.sensor_type)}
				<div class="w-full text-left">
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
							<div class="mt-3 flex justify-center">
								<Button
									type="button"
									class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1 cursor-pointer"
									onclick={() => {
										selectedSensor = sensor;
										showCredentials(sensor.sensor_id);
									}}
								>
									Show Credentials
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			{/each}
		</div>
	{/if}
</div>

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
				<label class="text-sm font-medium text-gray-700">Sensor Type</label>
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
					disabled={submitting}
				>
					Cancel
				</Button>
				<Button
					onclick={addSensor}
					class="bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
					disabled={submitting}
				>
					{#if submitting}Adding...{:else}Add{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}

{#if showCredsModal && selectedSensor}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
		<div
			class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 border border-emerald-100 relative transition-all"
		>
			<h3 class="text-2xl font-bold mb-6 text-emerald-800 text-center">
				MQTT Credentials for
				<span class="text-gray-700 font-semibold">
					{selectedSensor.sensor_name}
				</span>
			</h3>

			<div class="space-y-5">
				<!-- MQTT Topic -->
				<div>
					<label class="text-sm font-medium text-gray-500 block mb-1">MQTT Topic</label>
					<div
						class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-100 transition"
					>
						{#if selectedSensor}
							<code class="font-mono text-sm text-gray-800 break-all">
								{mqttTopic(selectedSensor.sensor_type, field?.field_name || '')}
							</code>
							<button
								onclick={() =>
									selectedSensor &&
									copyToClipboard(mqttTopic(selectedSensor.sensor_type, field?.field_name || ''))}
								class="text-emerald-600 hover:text-emerald-800 transition cursor-pointer"
								aria-label="Copy MQTT Topic"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 16h8M8 12h8m-6-8h6a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z"
									/>
								</svg>
							</button>
						{:else}
							<p class="text-gray-500 italic text-sm mt-1">Loading MQTT Topic...</p>
						{/if}
					</div>
				</div>
				<!-- Sensor ID -->
				<div>
					<label class="text-sm font-medium text-gray-500 block mb-1">Sensor ID</label>
					<div
						class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-100 transition"
					>
						{#if selectedCredentials}
							<code class="font-mono text-sm text-gray-800 break-all">
								{selectedSensor.sensor_id}
							</code>
							<button
								onclick={() =>
									selectedSensor?.sensor_id && copyToClipboard(selectedSensor.sensor_id)}
								class="text-emerald-600 hover:text-emerald-800 transition cursor-pointer"
								aria-label="Copy Sensor ID"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 16h8M8 12h8m-6-8h6a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z"
									/>
								</svg>
							</button>
						{:else if validationError}
							<p class="text-red-600 text-sm mt-1">Error loading Sensor ID</p>
						{:else}
							<p class="text-gray-500 italic text-sm mt-1">Loading Sensor ID...</p>
						{/if}
					</div>
				</div>

				<!-- Username -->
				<div>
					<label class="text-sm font-medium text-gray-500 block mb-1">Username</label>
					<div
						class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-100 transition"
					>
						{#if selectedCredentials}
							<code class="font-mono text-sm text-gray-800 break-all"
								>{selectedCredentials.user}</code
							>
							<button
								onclick={() =>
									selectedCredentials?.user && copyToClipboard(selectedCredentials.user)}
								class="text-emerald-600 hover:text-emerald-800 transition cursor-pointer"
								aria-label="Copy Username"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 16h8M8 12h8m-6-8h6a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z"
									/>
								</svg>
							</button>
						{:else if validationError}
							<p class="text-red-600 text-sm mt-1">Error loading Username</p>
						{:else}
							<p class="text-gray-500 italic text-sm mt-1">Loading Username...</p>
						{/if}
					</div>
				</div>

				<!-- Password -->
				<div>
					<label class="text-sm font-medium text-gray-500 block mb-1">Password</label>
					<div
						class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-100 transition"
					>
						{#if selectedCredentials}
							<code class="font-mono text-sm text-gray-800 break-all"
								>{selectedCredentials.pass}</code
							>
							<button
								onclick={() =>
									selectedCredentials?.pass && copyToClipboard(selectedCredentials.pass)}
								class="text-emerald-600 hover:text-emerald-800 transition cursor-pointer"
								aria-label="Copy Password"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 16h8M8 12h8m-6-8h6a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z"
									/>
								</svg>
							</button>
						{:else if validationError}
							<p class="text-red-600 text-sm mt-1">Error loading Password</p>
						{:else}
							<p class="text-gray-500 italic text-sm mt-1">Loading Password...</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex justify-center mt-8">
				<Button
					class="bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-2 rounded-lg shadow cursor-pointer transition"
					onclick={() => {
						showCredsModal = false;
						selectedCredentials = null;
						selectedSensor = null;
						validationError = null;
					}}
				>
					Close
				</Button>
			</div>
		</div>
	</div>
{/if}
