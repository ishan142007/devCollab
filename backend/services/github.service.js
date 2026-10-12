const API_ROOT = "https://api.github.com";
const API_VERSION = "2026-03-10";
const PAGE_SIZE = 100;
const MAX_PAGES = 3;
const MAX_REPOSITORY_PAGES = 10;

export class GitHubApiError extends Error {
    constructor(message, status, retryAfter) {
        super(message);
        this.name = "GitHubApiError";
        this.status = status;
        this.retryAfter = retryAfter;
    }
}

const safeGitHubUrl = (value) => {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && url.hostname === "github.com" && !url.username && !url.password;
    } catch {
        return false;
    }
};

export const parseGitHubRepositoryUrl = (value) => {
    if (typeof value !== "string" || value.length > 2048) return null;
    try {
        const url = new URL(value);
        const parts = url.pathname.split("/").filter(Boolean);
        if (url.protocol !== "https:" || url.hostname !== "github.com" ||
            url.port || url.username || url.password || url.search || url.hash || parts.length !== 2) {
            return null;
        }
        const owner = parts[0];
        const repository = parts[1].replace(/\.git$/i, "");
        if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) return null;
        return { owner, repository };
    } catch {
        return null;
    }
};

const fetchJson = async (url) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": API_VERSION,
                    "User-Agent": "DevCollab"
                },
                signal: controller.signal
            });
            if (!response.ok) {
                const rateLimited = response.status === 429 ||
                    (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
                const message = rateLimited
                    ? "GitHub API rate limit reached. Try again later."
                    : response.status === 404
                        ? "GitHub repository or evidence was not found."
                        : "GitHub could not complete the request.";
                const error = new GitHubApiError(message, rateLimited ? 429 : response.status, response.headers.get("retry-after"));
                if (response.status >= 500 && attempt === 0) continue;
                throw error;
            }
            return { data: await response.json(), link: response.headers.get("link") };
        } catch (error) {
            if (error instanceof GitHubApiError && error.status >= 500 && attempt === 0) continue;
            if (error.name === "AbortError" && attempt === 0) continue;
            if (error.name === "AbortError") throw new GitHubApiError("GitHub request timed out. Try again.", 504);
            if (error instanceof GitHubApiError) throw error;
            if (attempt === 0) continue;
            throw new GitHubApiError("GitHub could not be reached. Try again later.", 502);
        } finally {
            clearTimeout(timeout);
        }
    }
    throw new GitHubApiError("GitHub could not be reached. Try again later.", 502);
};

export const getPublicRepository = async ({ owner, repository }) => {
    const { data } = await fetchJson(
        `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`
    );
    if (!data?.id || !data?.owner?.id || !data?.owner?.login ||
        !data?.name || !data?.full_name || typeof data.private !== "boolean" ||
        !safeGitHubUrl(data.html_url)) {
        throw new GitHubApiError("GitHub returned incomplete repository metadata.", 502);
    }
    return data;
};

const getNextPageUrl = (linkHeader) => {
    if (!linkHeader) return null;
    const next = linkHeader.split(",").map((part) => part.trim())
        .find((part) => /;\s*rel="next"/.test(part));
    const match = next?.match(/^<([^>]+)>/);
    if (!match) return null;
    try {
        const url = new URL(match[1]);
        const isGitHubListPath = url.pathname.startsWith("/users/") || url.pathname.startsWith("/repos/");
        return url.origin === API_ROOT && isGitHubListPath ? url.toString() : null;
    } catch {
        return null;
    }
};

const getPaginatedItems = async (url, maxPages = MAX_PAGES) => {
    const results = [];
    let nextUrl = url;
    let pages = 0;
    while (nextUrl && pages < maxPages) {
        const { data, link } = await fetchJson(nextUrl);
        if (!Array.isArray(data)) throw new GitHubApiError("GitHub returned an invalid list response.", 502);
        results.push(...data);
        nextUrl = getNextPageUrl(link);
        pages += 1;
    }
    return { items: results, truncated: Boolean(nextUrl) };
};

export const getPublicUserRepositories = async (username) => {
    const url = `${API_ROOT}/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=${PAGE_SIZE}&page=1`;
    return getPaginatedItems(url, MAX_REPOSITORY_PAGES);
};

export const getRepositoryEvidence = async ({ owner, repository }) => {
    const root = `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
    const params = `per_page=${PAGE_SIZE}&page=1`;
    const [commits, pullRequests] = await Promise.allSettled([
        getPaginatedItems(`${root}/commits?${params}`),
        getPaginatedItems(`${root}/pulls?state=all&sort=created&direction=desc&${params}`)
    ]);
    return { commits, pullRequests };
};

export const normalizeCommitEvidence = (commit) => {
    const author = commit?.author;
    const url = commit?.html_url;
    const occurredAt = commit?.commit?.author?.date || commit?.commit?.committer?.date;
    if (!commit?.sha || !author?.id || !safeGitHubUrl(url) || !occurredAt || Number.isNaN(Date.parse(occurredAt))) {
        return null;
    }
    return {
        type: "commit",
        externalId: commit.sha,
        githubUserId: String(author.id),
        title: String(commit.commit.message || "Commit").split(/\r?\n/, 1)[0].slice(0, 300),
        url,
        status: "recorded",
        occurredAt: new Date(occurredAt)
    };
};

export const normalizePullRequestEvidence = (pullRequest) => {
    const author = pullRequest?.user;
    const url = pullRequest?.html_url;
    const occurredAt = pullRequest?.merged_at || pullRequest?.updated_at || pullRequest?.created_at;
    if (!pullRequest?.number || !author?.id || !safeGitHubUrl(url) ||
        !occurredAt || Number.isNaN(Date.parse(occurredAt))) {
        return null;
    }
    return {
        type: "pull_request",
        externalId: String(pullRequest.number),
        githubUserId: String(author.id),
        title: String(pullRequest.title || "Pull request").slice(0, 300),
        url,
        status: pullRequest.merged_at ? "merged" : pullRequest.state === "open" ? "open" : "closed",
        occurredAt: new Date(occurredAt)
    };
};
