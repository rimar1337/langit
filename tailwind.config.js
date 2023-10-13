import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			spacing: {
				7.5: '1.875rem',
				13: '3.25rem',
				17: '4.24rem',
				30: '7.5rem',
			},
			minWidth: {
				14: '3.5rem',
			},
			maxHeight: {
				141: '35.25rem',
				'50vh': '50vh',
			},
			flexGrow: {
				4: '4',
			},
			aspectRatio: {
				banner: '3 / 1',
			},
			keyframes: {
				indeterminate: {
					'0%': {
						translate: '-100%',
					},
					'100%': {
						translate: '400%',
					},
				},
			},
			animation: {
				indeterminate: 'indeterminate 1s linear infinite',
			},
		},
		colors: {
			accent: 'rgb(var(--accent))',
			background: 'rgb(var(--background))',
			primary: {
				DEFAULT: 'rgb(var(--primary))',
				fg: 'rgb(var(--primary-fg))',
			},
			secondary: {
				DEFAULT: 'rgb(var(--secondary))',
				fg: 'rgb(var(--secondary-fg))',
			},
			hinted: {
				DEFAULT: 'rgb(var(--hinted))',
				fg: 'rgb(var(--hinted-fg))',
			},
			muted: {
				DEFAULT: 'rgb(var(--muted))',
				fg: 'rgb(var(--muted-fg))',
			},
			input: 'rgb(var(--input))',
			divider: 'rgb(var(--divider))',

			transparent: 'transparent',
			black: colors.black,
			white: colors.white,
			red: colors.red,
			green: colors.green,
			blue: colors.blue,
			cyan: colors.cyan,
			sky: colors.sky,
		},
		fontFamily: {
			sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
			mono: `"JetBrains Mono NL", ui-monospace, monospace`,
		},
	},
	corePlugins: {
		outlineStyle: false,
	},
	darkMode: ['class', '.is-dark'],
	plugins: [
		plugin(({ addVariant, addUtilities }) => {
			addVariant('modal', '&:modal');

			addUtilities({
				'.scrollbar-hide': {
					'-ms-overflow-style': 'none',
					'scrollbar-width': 'none',

					'&::-webkit-scrollbar': {
						display: 'none',
					},
				},

				'.outline-none': { 'outline-style': 'none' },
				'.outline': { 'outline-style': 'solid' },
				'.outline-dashed': { 'outline-style': 'dashed' },
				'.outline-dotted': { 'outline-style': 'dotted' },
				'.outline-double': { 'outline-style': 'double' },
			});
		}),
	],
};
