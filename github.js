// github.js
import fetch from "node-fetch";

// Helper: safely parse JSON
async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
}

// Helper: checks response and throws error if not ok
async function checkResponse(res, errorMessage) {
    if (!res.ok) {
        const body = await safeJson(res);
        // Check for specific GitHub API errors (e.g., rate limit)
        const message = body?.message || errorMessage;
        if (res.status === 403 && message.includes("rate limit exceeded")) {
             throw new Error("GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.");
        }
        throw new Error(message);
    }
    return res.json();
}

// Helper: formats a number with locale settings
const formatNumber = (n) => Intl.NumberFormat("en-US").format(Math.max(0, Math.round(n)));

export async function getGitHubStats(username) {
    if (!username) return { error: true, message: "Username required" };

    const token = process.env.GITHUB_TOKEN || null;
    const headers = token ? { Authorization: `token ${token}` } : {};
    const encodedUsername = encodeURIComponent(username);

    try {
        // 1️⃣ Fetch user profile and first page of repos in parallel
        const userPromise = fetch(`https://api.github.com/users/${encodedUsername}`, { headers })
            .then(res => checkResponse(res, "GitHub user fetch failed."));

        const reposPromise = fetch(`https://api.github.com/users/${encodedUsername}/repos?per_page=100&page=1`, { headers })
            .then(res => checkResponse(res, "Initial repos fetch failed."));
        
        const [user, firstPageRepos] = await Promise.all([userPromise, reposPromise]);
        
        if (!Array.isArray(firstPageRepos)) {
            return { error: true, message: firstPageRepos?.message || "Unexpected repos response" };
        }

        // 2️⃣ Handle pagination for remaining pages
        let repos = firstPageRepos.filter(r => r.fork === false); // Filter out forks to count owned repositories only
        let page = 2;
        while (firstPageRepos.length === 100) { // Only loop if the first page was full
            const res = await fetch(`https://api.github.com/users/${encodedUsername}/repos?per_page=100&page=${page}`, { headers });
            
            // If any subsequent page fails, we still return results collected so far
            if (!res.ok) break; 
            
            const data = await safeJson(res);
            if (!Array.isArray(data) || data.length === 0) break;
            
            repos = repos.concat(data.filter(r => r.fork === false));
            
            if (data.length < 100) break;
            if (page >= 50) break; // Safety limit
            page++;
        }

        // 3️⃣ Aggregate stats (only from non-forked repos)
        const stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
        const forks = user.total_private_repos === 0 ? repos.reduce((sum, r) => sum + (r.forks_count || 0), 0) : 0; // Fork count is complex, often best to omit or get from different endpoint
        const followers = user.followers || 0;
        const public_repos = user.public_repos || repos.length;
        
        // Use the raw score calculation from the original github.js for consistency
        const rawScore = stars + forks + followers; // Simplified raw score for base comparison

        // 4️⃣ Compute score, grade, level, XP, tier (Raw Score based logic)
        // Score thresholds from your original index.js logic
        const score = rawScore; // Using the raw score as the base
        const level = Math.floor(score / 50);
        const xpPercent = Math.min(100, (score % 50) * 2);

        const grade = score >= 300 ? "A+" :
                      score >= 200 ? "A" :
                      score >= 100 ? "B" :
                      score >= 50  ? "C" : "D";

        const tier = grade === "A+" ? "Mythic" :
                     grade === "A"  ? "Legendary" :
                     grade === "B"  ? "Gold" :
                     grade === "C"  ? "Silver" : "Iron";

        return {
            username: user.login,
            name: user.name || "",
            avatar_url: user.avatar_url || null,
            // Stats used in trophy (formatted for direct display)
            formatted_followers: formatNumber(followers),
            formatted_stars: formatNumber(stars),
            formatted_repos: formatNumber(public_repos),
            // Metrics used for coloring/levels
            score,
            level,
            xpPercent,
            grade,
            tier
        };

    } catch (err) {
        return { error: true, message: err?.message || "Unknown error" };
    }
}