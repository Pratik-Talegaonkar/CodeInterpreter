import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#09090b", // zinc-950
                foreground: "#fafafa", // zinc-50
                card: {
                    DEFAULT: "#18181b", // zinc-900
                    foreground: "#fafafa",
                },
                popover: {
                    DEFAULT: "#18181b",
                    foreground: "#fafafa",
                },
                primary: {
                    DEFAULT: "#3b82f6", // blue-500
                    foreground: "#ffffff",
                },
                secondary: {
                    DEFAULT: "#27272a", // zinc-800
                    foreground: "#fafafa",
                },
                muted: {
                    DEFAULT: "#27272a",
                    foreground: "#a1a1aa",
                },
                accent: {
                    DEFAULT: "#27272a",
                    foreground: "#fafafa",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#fafafa",
                },
                border: "#27272a",
                input: "#27272a",
                ring: "#3b82f6",
            },
            borderRadius: {
                lg: "0.5rem",
                md: "calc(0.5rem - 2px)",
                sm: "calc(0.5rem - 4px)",
            },
        },
    },
    plugins: [],
};
export default config;
