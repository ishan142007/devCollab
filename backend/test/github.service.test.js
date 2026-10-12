import assert from "node:assert/strict";
import test from "node:test";
import {
    GitHubApiError,
    getPublicRepository,
    getRepositoryEvidence,
    getPublicUserRepositories,
    normalizeCommitEvidence,
    normalizePullRequestEvidence,
    parseGitHubRepositoryUrl
} from "../services/github.service.js";
import { normalizeDiscoveredRepository } from "../services/githubDiscovery.service.js";

test("repository URLs are restricted to canonical GitHub repositories", () => {
    assert.deepEqual(parseGitHubRepositoryUrl("https://github.com/DevCollab/sample.git"), {
        owner: "DevCollab",
        repository: "sample"
    });
    assert.equal(parseGitHubRepositoryUrl("http://github.com/user/repo"), null);
    assert.equal(parseGitHubRepositoryUrl("https://github.com.evil.example/user/repo"), null);
    assert.equal(parseGitHubRepositoryUrl("https://github.com/user/repo/issues"), null);
    assert.equal(parseGitHubRepositoryUrl("https://user:secret@github.com/user/repo"), null);
});

test("public repository discovery follows pagination and requests owner repositories only", async (context) => {
    const originalFetch = globalThis.fetch;
    const requested = [];
    context.after(() => { globalThis.fetch = originalFetch; });
    globalThis.fetch = async (input) => {
        const url = new URL(input);
        requested.push(url);
        const page = Number(url.searchParams.get("page"));
        const nextParams = new URLSearchParams(url.searchParams);
        nextParams.set("page", "2");
        const next = page === 1 ? `<https://api.github.com${url.pathname}?${nextParams}>; rel="next"` : "";
        return new Response(JSON.stringify([{ id: page }]), {
            status: 200,
            headers: { "content-type": "application/json", ...(next ? { link: next } : {}) }
        });
    };

    const result = await getPublicUserRepositories("devcollab");
    assert.deepEqual(result.items.map((repository) => repository.id), [1, 2]);
    assert.equal(result.truncated, false);
    assert.equal(requested.length, 2);
    assert.equal(requested[0].pathname, "/users/devcollab/repos");
    assert.equal(requested[0].searchParams.get("type"), "owner");
    assert.equal(requested[0].searchParams.get("per_page"), "100");
});

test("public repository discovery reports when its maximum page count truncates results", async (context) => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;
    context.after(() => { globalThis.fetch = originalFetch; });
    globalThis.fetch = async (input) => {
        attempts += 1;
        const url = new URL(input);
        const nextParams = new URLSearchParams(url.searchParams);
        nextParams.set("page", String(Number(url.searchParams.get("page")) + 1));
        return new Response(JSON.stringify([{ id: attempts }]), {
            status: 200,
            headers: {
                "content-type": "application/json",
                link: `<https://api.github.com${url.pathname}?${nextParams}>; rel="next"`
            }
        });
    };

    const result = await getPublicUserRepositories("devcollab");
    assert.equal(result.items.length, 10);
    assert.equal(result.truncated, true);
    assert.equal(attempts, 10);
});

test("transient GitHub server failures are retried once", async (context) => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;
    context.after(() => { globalThis.fetch = originalFetch; });
    globalThis.fetch = async () => {
        attempts += 1;
        if (attempts === 1) return new Response("unavailable", { status: 503 });
        return new Response(JSON.stringify({
            id: 12,
            owner: { id: 34, login: "owner" },
            name: "repo",
            full_name: "owner/repo",
            private: false,
            html_url: "https://github.com/owner/repo"
        }), { status: 200, headers: { "content-type": "application/json" } });
    };

    await getPublicRepository({ owner: "owner", repository: "repo" });
    assert.equal(attempts, 2);
});

test("discovered repository normalization accepts only public repos owned by the connected GitHub ID", () => {
    const repository = {
        id: 123,
        owner: { id: 42, login: "DevCollab" },
        name: "sample",
        full_name: "DevCollab/sample",
        html_url: "https://github.com/DevCollab/sample",
        private: false,
        language: "JavaScript",
        topics: ["react", "node"],
        created_at: "2026-01-01T00:00:00Z"
    };
    const normalized = normalizeDiscoveredRepository(repository, "42", "devcollab", new Date("2026-02-01T00:00:00Z"));
    assert.equal(normalized.githubRepositoryId, "123");
    assert.equal(normalized.visibility, "public");
    assert.equal(normalized.ownership, "owned");
    assert.equal(normalized.primaryLanguage, "JavaScript");
    assert.equal(normalized.available, true);

    assert.equal(normalizeDiscoveredRepository({ ...repository, private: true }, "42", "devcollab"), null);
    assert.equal(normalizeDiscoveredRepository({ ...repository, owner: { id: 99, login: "DevCollab" } }, "42", "devcollab"), null);
    assert.equal(normalizeDiscoveredRepository({ ...repository, html_url: "https://github.com.attacker.test/DevCollab/sample" }, "42", "devcollab"), null);
});

test("commit and pull request normalization requires GitHub account IDs and canonical URLs", () => {
    const commit = normalizeCommitEvidence({
        sha: "abc123",
        html_url: "https://github.com/org/repo/commit/abc123",
        author: { id: 42 },
        commit: { message: "Add feature\nDetails", author: { date: "2026-01-01T12:00:00Z" } }
    });
    assert.equal(commit.githubUserId, "42");
    assert.equal(commit.title, "Add feature");
    assert.equal(normalizeCommitEvidence({
        sha: "abc123",
        html_url: "https://github.com/org/repo/commit/abc123",
        author: null,
        commit: { message: "unattributed", author: { date: "2026-01-01T12:00:00Z" } }
    }), null);

    const pullRequest = normalizePullRequestEvidence({
        number: 8,
        title: "Ship feature",
        html_url: "https://github.com/org/repo/pull/8",
        user: { id: 42 },
        state: "closed",
        merged_at: "2026-01-03T12:00:00Z"
    });
    assert.equal(pullRequest.status, "merged");
    assert.equal(pullRequest.externalId, "8");
});

test("evidence pagination follows GitHub next links but stays within the configured bound", async (context) => {
    const originalFetch = globalThis.fetch;
    const requestedPages = [];
    context.after(() => { globalThis.fetch = originalFetch; });
    globalThis.fetch = async (input) => {
        const url = new URL(input);
        const type = url.pathname.endsWith("/commits") ? "commits" : "pulls";
        const page = Number(url.searchParams.get("page"));
        requestedPages.push(`${type}:${page}`);
        const next = page < 5
            ? `<https://api.github.com${url.pathname}?${url.searchParams.toString().replace(`page=${page}`, `page=${page + 1}`)}>; rel="next"`
            : "";
        return new Response(JSON.stringify([{ type, page }]), {
            status: 200,
            headers: { "content-type": "application/json", ...(next ? { link: next } : {}) }
        });
    };

    const result = await getRepositoryEvidence({ owner: "org", repository: "repo" });
    assert.equal(result.commits.status, "fulfilled");
    assert.equal(result.pullRequests.status, "fulfilled");
    assert.equal(result.commits.value.items.length, 3);
    assert.equal(result.pullRequests.value.items.length, 3);
    assert.equal(result.commits.value.truncated, true);
    assert.equal(requestedPages.length, 6);
});

test("GitHub rate-limit responses remain errors and are not treated as repository data", async (context) => {
    const originalFetch = globalThis.fetch;
    context.after(() => { globalThis.fetch = originalFetch; });
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "rate limited" }), {
        status: 403,
        headers: { "content-type": "application/json", "x-ratelimit-remaining": "0", "retry-after": "60" }
    });

    await assert.rejects(
        getPublicRepository({ owner: "org", repository: "repo" }),
        (error) => error instanceof GitHubApiError && error.status === 429 &&
            error.retryAfter === "60" && /rate limit/i.test(error.message)
    );
});
