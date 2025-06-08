module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "theme-primary": "#F8F7F4", // Soft ivory
        "theme-secondary": "#EAE7DC", // Warm cream
        "theme-accent": "#BFCDB2", // Muted sage
        "theme-text": "#2D2E2E", // Deep charcoal
        "theme-highlight": "#D4B88E", // Subtle gold
        // Mood colors can remain or be updated to fit the new theme
        mood: {
          happy: "#FFD700", // Gold - consider a more muted gold if needed
          chill: "#A4C8D5", // Softer blue
          energetic: "#F5A684", // Softer orange/red
          anxious: "#C3B4D8", // Softer purple
          focused: "#A8D8B9", // Softer green
          social: "#E6B2C6", // Softer pink
        },
      },
      borderRadius: {
        DEFAULT: "8px", // Default for most elements
        lg: "8px", // Overriding lg to be 8px as well, or use a specific name like 'card'
        card: "8px",
        button: "8px",
        input: "8px",
        bubble: "50%", // Keep for mood bubbles if they remain circular
      },
      boxShadow: {
        subtle: "0 2px 4px rgba(0, 0, 0, 0.05)", // Softer shadow
        DEFAULT: "0 2px 4px rgba(0, 0, 0, 0.05)",
        md: "0 4px 8px rgba(0, 0, 0, 0.07)",
        lg: "0 8px 16px rgba(0, 0, 0, 0.07)",
        // Remove 'glass' and 'soft' if not fitting the new theme
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      // Remove other theme extensions not fitting the new design
      // For example, specific gradients or blurs if they are too flashy
      backdropBlur: {}, // Remove glass blur if not used
      gap: {
        section: "2rem",
      },
      animation: {
        bounce: 'bounce 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite alternate',
      }
    },
  },
  plugins: [],
};
