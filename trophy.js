// trophy.js
import { getThemeColors, getTierStyles } from "./themes.js"; // New: Import theme helper

// Helper function (moved from index.js to keep trophy self-contained for XML escaping)
function escapeXml(unsafe) {
    return String(unsafe).replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return c;
        }
    });
}

// ------------------------------------------------
// MAIN EXPORT FUNCTION
// ------------------------------------------------
export function generateTrophySVG(stats = {}, theme = "dark_high_contrast", columns = 3) {
    // 1. Data Retrieval (Now rely only on pre-calculated stats)
    const username = escapeXml(String(stats.username || "unknown"));
    const tier = stats.tier || "Iron";
    const grade = stats.grade || "D";
    const level = stats.level || 0;
    const score = stats.score || 0;
    const xpPercent = stats.xpPercent || 0;
    const formatted_stars = stats.formatted_stars || "0";
    const formatted_repos = stats.formatted_repos || "0";
    const formatted_followers = stats.formatted_followers || "0";

    // 2. Theming & Styling
    const p = getThemeColors(theme); // Get palette based on requested theme
    const tierStyle = getTierStyles(tier); // Get tier colors

    // 3. Layout Metrics
    const padding = 24;
    const mainCardW = 600;
    const mainCardH = 200;
    const trophySize = 140; // The avatar/medal area size
    const logoW = 36;
    const logoH = 36;

    // Badge grid layout
    const usedColumns = Math.min(Math.max(1, parseInt(columns, 10) || 3), 4);
    const badgeW = 160;
    const badgeH = 72;
    const badgeGap = 20;
    const badgesPerRow = usedColumns;

    // Badges data
    const badges = [
        { label: "Stars", value: formatted_stars, icon: iconStar(tierStyle.color) },
        { label: "Repositories", value: formatted_repos, icon: iconRepo(tierStyle.color) },
        { label: "Followers", value: formatted_followers, icon: iconUsers(tierStyle.color) }
    ];

    // SVG Dimensions Calculation
    const badgeRows = Math.ceil(badges.length / badgesPerRow);
    const badgeGridWidth = badgesPerRow * badgeW + (badgesPerRow - 1) * badgeGap;
    const badgesHeight = badgeRows * badgeH + (badgeRows - 1) * badgeGap;

    const svgWidth = Math.max(mainCardW + 2 * padding, badgeGridWidth + 2 * padding);
    const svgHeight = padding + mainCardH + padding + badgesHeight + padding;
    const centerX = svgWidth / 2;
    const mainCardX = centerX - mainCardW / 2;


    // 4. Build Badge SVG (Refined Alignment)
    let badgeGroups = "";
    const badgeGridY = padding + mainCardH + padding;
    
    badges.forEach((b, i) => {
        const r = Math.floor(i / badgesPerRow);
        const c = i % badgesPerRow;
        
        // Center the whole badge grid
        const totalRowWidth = Math.min(badgesPerRow, badges.length - r * badgesPerRow) * badgeW + (Math.min(badgesPerRow, badges.length - r * badgesPerRow) - 1) * badgeGap;
        const startX = centerX - totalRowWidth / 2;
        
        const x = startX + c * (badgeW + badgeGap);
        const y = badgeGridY + r * (badgeH + badgeGap);

        badgeGroups += `
        <g transform="translate(${x}, ${y})">
            <rect x="0" y="0" rx="12" width="${badgeW}" height="${badgeH}" fill="${p.card}" stroke="${p.panel_edge}" stroke-width="1.2" />
            <g transform="translate(16, 18)">
                <g transform="translate(0, 0)">${b.icon}</g>
                <text x="46" y="12" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="14" fill="${p.text}" font-weight="700">${b.label}</text>
                <text x="46" y="34" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="16" fill="${p.accent_text}" font-weight="900">${b.value}</text>
            </g>
        </g>`;
    });

    // XP bar calculation
    const xpBarW = 280;
    const xpFilledW = Math.round((xpBarW * xpPercent) / 100);

    // 5. SVG Assembly
    return `
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub Trophy for ${username}">
  <defs>
    <linearGradient id="bgGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${p.bg}"/>
      <stop offset="100%" stop-color="${p.bg_dark}"/>
    </linearGradient>
    <linearGradient id="xpGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${p.glow}"/>
      <stop offset="100%" stop-color="${tierStyle.color}" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <style>
      .title { font-family: "Segoe UI", Roboto, Arial, sans-serif; font-size:22px; fill:${p.title_text}; font-weight:800; }
      .meta { font-family: "Segoe UI", Roboto, Arial, sans-serif; font-size:14px; fill:${p.meta_text}; }
      .small { font-family: "Segoe UI", Roboto, Arial, sans-serif; font-size:12px; fill:${p.meta_text}; }
    </style>
  </defs>

  <rect width="100%" height="100%" fill="url(#bgGrad)" />

  <g transform="translate(${mainCardX}, ${padding})">
    <rect x="0" y="0" rx="16" width="${mainCardW}" height="${mainCardH}" fill="${p.card}" stroke="${p.card_edge}" stroke-width="2" filter="url(#shadow)"/>
    
    <g transform="translate(24, 24)">
      <rect x="0" y="0" rx="12" width="${trophySize}" height="${mainCardH - 48}" fill="${p.panel}" stroke="${tierStyle.edge}" stroke-width="1.5"/>
      <g transform="translate(${trophySize / 2}, ${trophySize / 2})">
        <circle cx="0" cy="0" r="50" fill="${tierStyle.color}" stroke="#00000040" stroke-width="2" />
        <g transform="translate(-28, -28) scale(1)">
          ${iconMedalInner(p.card)}
        </g>
        <text x="0" y="68" font-size="12" font-family="Segoe UI, Roboto, Arial, sans-serif" fill="${p.text}" text-anchor="middle" font-weight="700">TIER: ${tier.toUpperCase()}</text>
      </g>
    </g>

    <g transform="translate(${trophySize + 48}, 32)">
      <text class="title" x="110" y="0" text-anchor="middle">🏆 GitHub Trophy</text>
      
      <text class="meta" x="0" y="32">
        Score: <tspan fill="${p.accent_text}" font-weight="800">${score}</tspan>  •  
        Grade: <tspan fill="${tierStyle.color}" font-weight="800">${grade}</tspan>  •  
        Level: <tspan fill="${p.glow}" font-weight="800">${level}</tspan>
      </text>

      <g transform="translate(0,68)">
        <rect x="0" y="0" rx="7" width="${xpBarW}" height="14" fill="#071018" stroke="${p.panel_edge}" stroke-width="1"/>
        <rect x="0" y="0" rx="7" width="${xpFilledW}" height="14" fill="url(#xpGrad)"/>
        <text x="${xpBarW + 12}" y="11" class="small">${xpPercent}% XP to Level ${level + 1}</text>
      </g>
    </g>
    
    <g transform="translate(${mainCardW - 84}, 18)">
      <rect x="0" y="0" rx="8" width="60" height="40" fill="${p.panel}" stroke="${tierStyle.edge}" stroke-width="1.2"/>
      <text x="30" y="26" font-size="18" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" fill="${tierStyle.color}" font-weight="900">${grade}</text>
    </g>
  </g>

  <text x="${centerX}" y="${badgeGridY - 10}" text-anchor="middle" font-size="14" fill="${p.meta_text}" font-weight="700">ACHIEVEMENTS</text>

  ${badgeGroups}

  <text x="${centerX}" y="${svgHeight - 10}" text-anchor="middle" class="small" fill="${p.meta_text}">Powered by GitHub API | Made in Love By Anindya</text>
</svg>
`;
}

// -----------------------------
// ICONS (Fill color is now dynamic based on tier or palette)
// -----------------------------

function iconMedalInner(fillColor) {
    return `
    <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 10 L33.5 22 L46 22 L36.5 29 L40 42 L28 34 L16 42 L19.5 29 L10 22 L22.5 22 Z" fill="${fillColor}" />
    </svg>`;
}

function iconStar(fillColor) {
    return `<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="${fillColor}" d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.558L19.335 24 12 20.201 4.665 24l1.635-8.692L.6 9.75l7.732-1.732z"/>
    </svg>`;
}

function iconRepo(fillColor) {
    return `<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="${fillColor}" d="M21 8V7l-9-4-9 4v1l9 4 9-4zM3 10v6l9 5 9-5v-6l-9 4-9-4z"/>
    </svg>`;
}

function iconUsers(fillColor) {
    return `<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="${fillColor}" d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM8 11c1.657 0 3-1.343 3-3S9.657 5 8 5 5 6.343 5 8s1.343 3 3 3zM8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.98.05 1.17.8 1.98 1.93 1.98 3.45V19h6v-2.5C23 14.17 18.33 13 16 13z"/>
    </svg>`;
}