// themes.js

// --- 1. Tier Styles (Color scheme based on grade/tier) ---
export function getTierStyles(tier) {
    const tierStyles = {
        Mythic: { color: "#FF6347", edge: "#CC3311" }, // Tomato Red
        Legendary: { color: "#FFD700", edge: "#C4A000" }, // Gold
        Gold: { color: "#FFC72C", edge: "#D4A017" }, // Gold (Slightly less intense)
        Silver: { color: "#C0C0C0", edge: "#999999" }, // Silver
        Iron: { color: "#95A5A6", edge: "#6C7A89" }, // Grey/Iron
        default: { color: "#FFFFFF", edge: "#CCCCCC" }
    };
    return tierStyles[tier] || tierStyles.default;
}

// --- 2. Theme Colors (Visual look of the card) ---
export function getThemeColors(theme) {
    switch (theme) {
        case "dark_high_contrast":
            return {
                bg: "#0d1117",         // Deep GitHub Dark
                bg_dark: "#010409",    // Footer/Darker BG
                card: "#161b22",       // Main Card Color
                card_edge: "#30363d",  // Card Stroke
                panel: "#21262d",      // Inner Panel/Trophy Background
                panel_edge: "#484f58", // Inner Panel Stroke
                glow: "#00d4ff",       // Blue accent/XP start
                title_text: "#e6edf3", // Title
                text: "#c9d1d9",       // General Text
                meta_text: "#8b949e",  // Meta Text (Small labels)
                accent_text: "#79c0ff",// Accent Color (Numbers/Score)
            };
        case "classic_gamer":
            return {
                bg: "#081018",
                bg_dark: "#04080c",
                card: "#0f1a24",
                card_edge: "#203040",
                panel: "#0b151b",
                panel_edge: "#304050",
                glow: "#00d4ff",
                title_text: "#e6eef8",
                text: "#e6eef8",
                meta_text: "#9fb4c8",
                accent_text: "#ffd166",
            };
        default:
            return getThemeColors("dark_high_contrast");
    }
}