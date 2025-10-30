<script lang="ts">
	import { API_URL } from '$lib/config';
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
	let newSensorType = '';

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
			const res = await fetch(`${API_URL}/sensors/credentials?sensor_id=${sensor_id}`);
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
			const fieldRes = await fetch(`${API_URL}/field?field_id=${params.field_id}`);
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
			const sensorRes = await fetch(`${API_URL}/sensors?field_id=${params.field_id}`);
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
	onMount(async () => {
		try {
			await loadFieldAndSensors();
		} catch (err) {
			error = (err as Error).message;
		}
	});

	function downloadEnvFile() {
		if (!selectedSensor || !selectedCredentials || !field) return;

		const topic = mqttTopic(selectedSensor.sensor_type, field.field_name);

		// fill static/defaults yourself, do not depend on UI state
		const content = [
			`export MQTT_BROKER_URI="192.168.1.159:8883"`,
			`export MQTT_BROKER_TOPIC="${topic}"`,
			`export MQTT_BROKER_USERNAME="${selectedCredentials.user}"`,
			`export MQTT_BROKER_PASSWORD="${selectedCredentials.pass}"`,
			`export MOCK_SENSOR_FREQUENCY="10"`,
			`export SENSOR_ID="${selectedSensor.sensor_id}"`
		].join('\n');

		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${field.field_name}_${selectedSensor.sensor_name}.env`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function openModal() {
		newSensorName = '';
		newSensorType = '';
		validationError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			showModal = false;
			showCredsModal = false;
		}
	}

	async function addSensor() {
		validationError = null;
		submitting = true;

		try {
			const res = await fetch(`${API_URL}/sensors`, {
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
				newSensorType = '';

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

<div class="flex-1 p-8 max-w-6xl mx-auto">
	<div class="mb-6 border-b pb-3 flex items-center justify-between">
		<h1 class="text-xl font-semibold text-lime-700">
			{field?.field_name}
		</h1>
		<Button
			onclick={openModal}
			class="bg-lime-600 hover:bg-lime-700 text-white px-4 py-2 cursor-pointer"
		>
			Add Sensor
		</Button>
	</div>

	<div class="border border-gray-200 rounded-sm p-4 mb-8 text-sm">
		<div class="flex items-center justify-between">
			<div>
				<div class="text-gray-600">Field ID:</div>
				<div class="font-mono text-gray-800">{params.field_id}</div>
			</div>
			<div class="text-gray-600">
				Sensors: <span class="font-semibold">{sensors.length}</span>
			</div>
		</div>
	</div>

	{#if sensors.length === 0}
		<div class="text-gray-500 italic text-sm">No sensors yet.</div>
	{:else}
		<div class="divide-y border border-gray-200 rounded-sm">
			{#each sensors as s}
				<div class="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
					<div>
						<div class="font-medium text-lime-700">{s.sensor_name}</div>
						<div class="text-xs text-gray-500 font-mono">{s.sensor_id}</div>
					</div>
					<Button
						type="button"
						class="bg-lime-600 hover:bg-lime-700 text-white text-xs px-3 py-1 cursor-pointer"
						onclick={() => {
							selectedSensor = s;
							showCredentials(s.sensor_id);
						}}
					>
						Credentials
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showModal}
	<div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
		<div class="bg-white border border-gray-200 w-full max-w-sm p-5">
			<h3 class="text-lg font-semibold mb-3 text-lime-700">Add Sensor</h3>

			<label for="sensorName" class="block text-sm text-gray-700 mb-1">Name</label>
			<Input id="sensorName" bind:value={newSensorName} class="w-full mb-3" />

			<label for="sensorType" class="block text-sm text-gray-700 mb-1">Type</label>
			<Select bind:value={newSensorType} type="single">
				<SelectTrigger
					class="w-full border border-gray-300 rounded px-3 py-2 text-sm cursor-pointer"
				>
					{newSensorType
						? ['Temperature', 'Humidity', 'pH Level'][Number(newSensorType)]
						: 'Select type'}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="0" class="cursor-pointer">Temperature</SelectItem>
					<SelectItem value="1" class="cursor-pointer">Humidity</SelectItem>
					<SelectItem value="2" class="cursor-pointer">pH Level</SelectItem>
				</SelectContent>
			</Select>

			{#if validationError}
				<p class="text-red-600 text-xs mt-2">{validationError}</p>
			{/if}

			<div class="flex justify-end space-x-2 mt-4">
				<Button
					onclick={closeModal}
					class="bg-gray-200 text-gray-700 px-3 py-1 hover:bg-gray-300 cursor-pointer"
				>
					Cancel
				</Button>
				<Button
					onclick={addSensor}
					class="bg-lime-600 text-white px-3 py-1 hover:bg-lime-700 cursor-pointer"
				>
					Add
				</Button>
			</div>
		</div>
	</div>
{/if}

<svelte:window on:keydown={handleKeydown} />

{#if showCredsModal && selectedSensor}
	<div class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
		<div class="bg-white border border-gray-200 w-full max-w-md p-6 text-sm">
			<h3 class="text-lg font-semibold text-lime-700 mb-4">Credentials</h3>

			{#each [['MQTT Topic', mqttTopic(selectedSensor.sensor_type, field?.field_name || '')], ['Sensor ID', selectedSensor.sensor_id], ['Username', selectedCredentials?.user], ['Password', selectedCredentials?.pass]] as [label, value]}
				<div class="mb-3">
					<div class="text-gray-600 mb-1">{label}</div>
					<div
						class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2"
					>
						<code class="font-mono text-gray-800 break-all">{value}</code>
						<button
							class="text-lime-600 hover:text-lime-800 text-xs cursor-pointer"
							onclick={() => value && copyToClipboard(value)}
						>
							Copy
						</button>
					</div>
				</div>
			{/each}

			<div class="flex justify-end mt-4 space-x-2">
				<Button
					class="bg-gray-200 text-gray-700 px-4 py-1 hover:bg-gray-300 mr-2 cursor-pointer"
					onclick={downloadEnvFile}
				>
					Download
				</Button>

				<Button
					class="bg-lime-600 text-white px-4 py-1 hover:bg-lime-700 cursor-pointer"
					onclick={() => {
						showCredsModal = false;
						selectedSensor = null;
						selectedCredentials = null;
						validationError = null;
					}}
				>
					Close
				</Button>
			</div>
		</div>
	</div>
{/if}
