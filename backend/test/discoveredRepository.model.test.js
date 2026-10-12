import assert from "node:assert/strict";
import test from "node:test";
import DiscoveredRepository from "../model/DiscoveredRepository.model.js";

test("linked project uniqueness is user-scoped and avoids the legacy index name", () => {
    const indexes = DiscoveredRepository.schema.indexes();
    const linkedProjectIndex = indexes.find(([keys, options]) =>
        keys.user === 1 && keys.linkedProject === 1 && options.unique
    );

    assert.ok(linkedProjectIndex);
    assert.deepEqual(linkedProjectIndex[0], { user: 1, linkedProject: 1 });
    assert.deepEqual(linkedProjectIndex[1].partialFilterExpression, {
        linkedProject: { $type: "objectId" }
    });
    assert.equal(
        indexes.some(([keys, options]) =>
            Object.keys(keys).length === 1 && keys.linkedProject === 1 && options.unique
        ),
        false
    );
});
