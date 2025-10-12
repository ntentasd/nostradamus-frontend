import { toast as svelteToast } from '@zerodevx/svelte-toast';

export const toast = svelteToast;

// Optional typed wrappers for convenience
export function success(message: string) {
	svelteToast.push(message, {
		theme: {
			'--toastBackground': '#10b981',
			'--toastBarBackground': '#065f46',
			'--toastColor': 'white'
		}
	});
}

export function error(message: string) {
	svelteToast.push(message, {
		theme: {
			'--toastBackground': '#ef4444',
			'--toastBarBackground': '#991b1b',
			'--toastColor': 'white'
		}
	});
}
