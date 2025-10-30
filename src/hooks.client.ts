import type { HandleFetch } from '@sveltejs/kit';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
	if (request.url.startsWith(API_BASE)) {
		const proxied = request.url.replace(API_BASE, '/api');
		return fetch(proxied, request);
	}
	return fetch(request);
};
