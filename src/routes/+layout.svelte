<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
</script>

<div class="flex flex-col min-h-screen bg-gray-50 text-gray-900">
	<Navbar />

	<main class="flex-1 overflow-hidden">
		<slot />
	</main>
</div>
