// index.js
import express from "express";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit"; // New import
import { getGitHubStats } from "./github.js";
import { generateTrophySVG } from "./trophy.js";

const app = express();
app.use(cors());
app.use(compression());

// ------------------------
// CONFIG
// ------------------------
// Removed PORT definition as it's not used in serverless mode
const CACHE_TIME_SECONDS = 60 * 60 * 6; // 6h response cache (Client & Proxy Cache)
const CACHE_TTL_MS = CACHE_TIME_SECONDS * 1000; // In-memory cache TTL

// ------------------------
// MIDDLEWARE
// ------------------------

// Rate Limiter: Allows 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    standardHeaders: true, 
    legacyHeaders: false, 
});
app.use(limiter);

// ------------------------
// IN-MEMORY CACHE
// ------------------------
const cache = new Map();

function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function setCache(key, value, ttlMs = CACHE_TTL_MS) {
    cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
    });
}

// ------------------------
// HELPERS
// ------------------------

// Parses columns and enforces a max of 4
function parseColumns(input) {
    const v = parseInt(input, 10);
    if (Number.isInteger(v) && v >= 1 && v <= 4) return v;
    return 3;
}

// XML escaping for safety
function escapeXml(unsafe) {
    return String(unsafe).replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case '"': return "&quot;";
            case "'": return "&#39;";
            default: return c;
        }
    });
}

// Sends a minimal SVG error card
function sendErrorSVG(res, message) {
    const safe = escapeXml(String(message || "Error"));
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", `public, max-age=60, s-maxage=60`); // Cache errors briefly

    return res.status(400).send(`
<svg width="400" height="60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" rx="8" fill="#141924"/>
    <text x="50%" y="50%" fill="#ff5f56" font-size="14"
        text-anchor="middle" alignment-baseline="middle"
        font-family="Segoe UI, Roboto, Arial, sans-serif">
        Error: ${safe}
    </text>
</svg>`);
}

// ------------------------
// MAIN ROUTE
// ------------------------
// Note: Changed the route from "/trophy" to "/" to match the common Vercel link structure:
// https://[your-app].vercel.app/?username=...
// If you must use "/trophy" you need to update the "routes" in vercel.json
app.get("/", async (req, res) => {
    try {
        const username = String(req.query.username || "").trim();
        // Fallback theme is now 'dark_high_contrast' for a unique look
        const theme = String(req.query.theme || "dark_high_contrast"); 
        const columns = parseColumns(req.query.columns);

        if (!username) {
            return sendErrorSVG(res, "GitHub username is required.");
        }

        // CACHE KEY (includes username, theme, and columns)
        const cacheKey = `trophy:${username}:${theme}:${columns}`;
        const cached = getCache(cacheKey);

        if (cached) {
            res.setHeader("Content-Type", "image/svg+xml");
            res.setHeader("Cache-Control", `public, max-age=${CACHE_TIME_SECONDS}, s-maxage=${CACHE_TIME_SECONDS}`);
            return res.send(cached);
        }

        // FETCH GITHUB STATS
        const stats = await getGitHubStats(username);

        if (!stats || stats.error) {
            const msg = stats?.message || "Failed to fetch GitHub data";
            console.error("GitHub fetch error:", msg);
            // Check if it's a specific API error message
            if (msg.includes("API rate limit exceeded")) {
                return sendErrorSVG(res, "GitHub API rate limit exceeded. Try again later.");
            }
            return sendErrorSVG(res, msg);
        }

        // GENERATE SVG
        const svg = generateTrophySVG(stats, theme, columns);

        // SAVE TO CACHE
        setCache(cacheKey, svg);

        // SEND SVG RESPONSE
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", `public, max-age=${CACHE_TIME_SECONDS}, s-maxage=${CACHE_TIME_SECONDS}`);
        return res.send(svg);

    } catch (error) {
        console.error("Server error:", error);
        return sendErrorSVG(res, "Internal Server Error");
    }
});

// ------------------------
// SERVERLESS EXPORT (REQUIRED FOR VERCEl)
// ------------------------
// This line replaces app.listen and makes the Express app callable as a serverless function.
export default app;