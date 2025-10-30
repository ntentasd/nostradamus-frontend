import type { Handle, HandleFetch } from '@sveltejs/kit';

const API_BASE = process.env.API_URL || 'http://192.168.1.162:8080';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/')) {
		const target = `${API_BASE}${event.url.pathname.replace(/^\/api/, '')}${event.url.search}`;

		const response = await fetch(target, {
			method: event.request.method,
			headers: event.request.headers,
			body:
				event.request.method !== 'GET' && event.request.method !== 'HEAD'
					? await event.request.arrayBuffer()
					: undefined
		});

		return new Response(response.body, {
			status: response.status,
			headers: response.headers
		});
	}

	return resolve(event);
};

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
	if (request.url.startsWith(API_BASE)) {
		const proxied = request.url.replace(API_BASE, 'http://localhost:3000/api');
		return fetch(proxied, request);
	}
	return fetch(request);
};
