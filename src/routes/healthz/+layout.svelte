<script lang="ts">
	import { onMount } from 'svelte';
</script>

<!-- Inherits Navbar from root layout automatically -->
<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
	<slot />
</div>
