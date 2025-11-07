// lib/validateSearchParam.ts
// import { z } from "zod";

export function validateSearchParam(
	key: string,
	searchParams: { [key: string]: string | string[] | undefined },
	options?: { regex?: RegExp; maxLength?: number; required?: boolean }
): string | null {
	const value = searchParams[key];

	// Handle array case
	const str = Array.isArray(value) ? value[0] : value;

	if (!str) {
		if (options?.required) {
			throw new Error(`Missing required search param: ${key}`);
		}
		return null;
	}

	// Trim
	const cleaned = str.trim();

	// Length check
	if (options?.maxLength && cleaned.length > options.maxLength) {
		throw new Error(`Search param "${key}" too long`);
	}

	// Regex validation
	if (options?.regex && !options.regex.test(cleaned)) {
		throw new Error(`Invalid format for search param: ${key}`);
	}

	return cleaned;
}
