import assert from "node:assert/strict";
import test from "node:test";
import { GitHubAccountLinkError, linkGitHubIdentity } from "../services/githubAccountLink.service.js";

const createUserModel = (users) => {
    const byId = new Map(users.map((user) => [String(user._id), user]));
    return {
        findById: async (id) => byId.get(String(id)) ?? null,
        findOne: async ({ githubId }) => [...byId.values()].find((user) => user.githubId === githubId) ?? null,
        findOneAndUpdate: async (filter, update) => {
            const user = byId.get(String(filter._id));
            if (!user || (user.githubId && user.githubId !== update.$set.githubId)) return null;
            Object.assign(user, update.$set);
            return user;
        }
    };
};

test("linking stores GitHub's stable identity on the current DevCollab account", async () => {
    const account = {
        _id: "devcollab-user-1",
        name: "DevCollab Name",
        email: "account@example.com",
        save: async () => {}
    };
    const userModel = createUserModel([account]);

    const linked = await linkGitHubIdentity({
        userId: account._id,
        githubProfile: { id: 12345, login: "github-user", html_url: "https://github.com/github-user" },
        UserModel: userModel
    });

    assert.equal(linked.githubId, "12345");
    assert.equal(linked.githubUsername, "github-user");
    assert.equal(linked.githubProfileUrl, "https://github.com/github-user");
    assert.equal(linked.name, "DevCollab Name");
    assert.equal(linked.email, "account@example.com");
});

test("reconnecting the same GitHub account refreshes its username without changing profile fields", async () => {
    const account = {
        _id: "devcollab-user-2",
        name: "DevCollab Name",
        email: "account@example.com",
        githubId: "12345",
        githubUsername: "old-login"
    };

    const linked = await linkGitHubIdentity({
        userId: account._id,
        githubProfile: { id: 12345, login: "new-login", html_url: "https://github.com/new-login" },
        UserModel: createUserModel([account])
    });

    assert.equal(linked.githubId, "12345");
    assert.equal(linked.githubUsername, "new-login");
    assert.equal(linked.name, "DevCollab Name");
    assert.equal(linked.email, "account@example.com");
});

test("linking rejects a GitHub identity owned by a different DevCollab account", async () => {
    const account = { _id: "target", save: async () => assert.fail("must not save on conflict") };
    const owner = { _id: "owner", githubId: "12345" };

    await assert.rejects(
        linkGitHubIdentity({
            userId: account._id,
            githubProfile: { id: 12345, login: "github-user" },
            UserModel: createUserModel([account, owner])
        }),
        GitHubAccountLinkError
    );
});

test("linking does not silently replace a different GitHub identity already on the account", async () => {
    const account = {
        _id: "target",
        githubId: "67890",
    };

    await assert.rejects(
        linkGitHubIdentity({
            userId: account._id,
            githubProfile: { id: 12345, login: "another-user" },
            UserModel: createUserModel([account])
        }),
        GitHubAccountLinkError
    );
});

test("linking cannot overwrite an identity added concurrently after the initial check", async () => {
    const persistedAccount = { _id: "target", githubId: "67890" };
    const staleAccount = { _id: "target" };
    const userModel = {
        findById: async () => staleAccount,
        findOne: async () => null,
        findOneAndUpdate: async (filter) => {
            assert.ok(filter.$or.some((clause) => clause.githubId === "12345"));
            return null;
        }
    };

    await assert.rejects(
        linkGitHubIdentity({
            userId: persistedAccount._id,
            githubProfile: { id: 12345, login: "another-user" },
            UserModel: userModel
        }),
        GitHubAccountLinkError
    );
    assert.equal(persistedAccount.githubId, "67890");
});

test("linking rejects an unknown DevCollab account", async () => {
    await assert.rejects(
        linkGitHubIdentity({
            userId: "missing",
            githubProfile: { id: 12345, login: "github-user" },
            UserModel: createUserModel([])
        }),
        /no longer exists/
    );
});
