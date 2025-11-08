import { text } from '@sveltejs/kit';

export async function GET() {
	return text('frontend_up 1\n', {
		headers: { 'Content-Type': 'text/plain; version=0.0.4' }
	});
}
