import assert from "node:assert/strict";
import test from "node:test";
import { syncOwnedPublicRepositories } from "../services/githubDiscovery.service.js";

const validRepository = (id, name) => ({
    id,
    owner: { id: 345, login: "octocat" },
    name,
    full_name: `octocat/${name}`,
    private: false,
    html_url: `https://github.com/octocat/${name}`,
    topics: []
});

const makeUserModel = (user) => ({
    findOneAndUpdate: () => ({ select: async () => user }),
    findById: () => ({ select: async () => user })
});

test("repository refresh initializes indexes, upserts verified public repositories, and completes", async () => {
    const user = {
        _id: "user-1",
        githubId: "345",
        githubUsername: "octocat",
        save: async function () { this.savedStatus = this.githubRepositorySync.status; }
    };
    const operations = [];
    const sequence = [];
    let bulkOperations;
    const repositoryModel = {
        init: async () => { sequence.push("init"); },
        bulkWrite: async (writes, options) => {
            sequence.push("bulkWrite");
            bulkOperations = { writes, options };
        },
        updateMany: async (filter, update) => {
            sequence.push("updateMany");
            operations.push({ filter, update });
        }
    };

    const result = await syncOwnedPublicRepositories(user._id, {
        UserModel: makeUserModel(user),
        DiscoveredRepositoryModel: repositoryModel,
        listRepositories: async (username) => {
            assert.equal(username, "octocat");
            return {
                items: [
                    validRepository(1001, "valid-repository"),
                    { ...validRepository(1002, "not-owned"), owner: { id: 999, login: "someone-else" } },
                    { ...validRepository(1003, "private-repository"), private: true }
                ],
                truncated: false
            };
        }
    });

    assert.equal(result.status, "success");
    assert.equal(result.discovered, 1);
    assert.equal(result.truncated, false);
    assert.deepEqual(sequence, ["init", "bulkWrite", "updateMany"]);
    assert.equal(bulkOperations.writes.length, 1);
    assert.equal(bulkOperations.writes[0].updateOne.filter.githubRepositoryId, "1001");
    assert.equal(bulkOperations.writes[0].updateOne.update.$set.fullName, "octocat/valid-repository");
    assert.equal(bulkOperations.options.ordered, false);
    assert.equal(operations[0].filter.user, user._id);
    assert.ok(operations[0].filter.lastSeenAt.$lt instanceof Date);
    assert.equal(user.githubRepositorySync.status, "success");
    assert.equal(user.savedStatus, "success");
});

test("index initialization errors fail and persist refresh state, then allow a retry", async () => {
    const user = {
        _id: "user-2",
        githubId: "345",
        githubUsername: "octocat",
        save: async function () { this.savedStatus = this.githubRepositorySync.status; }
    };
    let initializationAttempts = 0;
    const repositoryModel = {
        init: async () => {
            initializationAttempts += 1;
            if (initializationAttempts === 1) throw new Error("index options conflict");
        },
        bulkWrite: async () => {},
        updateMany: async () => {}
    };
    const options = {
        UserModel: makeUserModel(user),
        DiscoveredRepositoryModel: repositoryModel,
        listRepositories: async () => ({ items: [], truncated: false })
    };

    await assert.rejects(syncOwnedPublicRepositories(user._id, options), /index options conflict/);
    assert.equal(user.githubRepositorySync.status, "failed");
    assert.equal(user.githubRepositorySync.message, "index options conflict");
    assert.equal(user.savedStatus, "failed");

    const retried = await syncOwnedPublicRepositories(user._id, options);
    assert.equal(retried.status, "success");
    assert.equal(initializationAttempts, 2);
});

test("a second refresh for the same user is rejected while one is running", async () => {
    const user = {
        _id: "user-3",
        githubId: "345",
        githubUsername: "octocat",
        save: async () => {}
    };
    let releaseList;
    const listPending = new Promise((resolve) => { releaseList = resolve; });
    const options = {
        UserModel: makeUserModel(user),
        DiscoveredRepositoryModel: { init: async () => {}, bulkWrite: async () => {}, updateMany: async () => {} },
        listRepositories: async () => listPending
    };

    const firstRefresh = syncOwnedPublicRepositories(user._id, options);
    await new Promise((resolve) => setImmediate(resolve));
    await assert.rejects(syncOwnedPublicRepositories(user._id, options), (error) => error.status === 409);
    releaseList({ items: [], truncated: false });
    assert.equal((await firstRefresh).status, "success");
});
