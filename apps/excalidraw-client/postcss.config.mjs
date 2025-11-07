const config = {
	plugins: {
		"@tailwindcss/postcss": {
			content: [
				// Scan app-specific files
				"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
				"./src/components/**/*.{js,ts,jsx,tsx,mdx}",

				// Scan shared UI package for Tailwind classes
				"../../packages/shad-ui/src/**/*.{js,ts,jsx,tsx,mdx}",
			],
		},
	},
};

export default config;
