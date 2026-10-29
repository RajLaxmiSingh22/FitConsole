import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/app.js";
import { conversationPairKey } from "../src/controllers/messageController.js";
import { Op } from "sequelize";
import { escapeLikePattern, getPagination, paginatedData, searchCondition } from "../src/utils/pagination.js";
import {
  clientHistoryQuerySchema,
  clientListQuerySchema,
  listMembershipsQuerySchema,
  messageQuerySchema,
  userListQuerySchema,
} from "../src/validation/index.js";

test("LIKE wildcards in search terms are escaped", () => {
  assert.equal(escapeLikePattern("50%_off\\"), "50\\%\\_off\\\\");
});

test("pagination is opt-in and keeps the array response otherwise", () => {
  assert.equal(getPagination({}), null);
  assert.deepEqual(paginatedData([1, 2], 2, null), [1, 2]);
  const pagination = getPagination({ page: 3 });
  assert.deepEqual(pagination, { page: 3, limit: 10, offset: 20 });
  assert.deepEqual(paginatedData([1], 21, pagination).pagination, { page: 3, limit: 10, total: 21, totalPages: 3 });
});

test("search conditions escape wildcards and are skipped when empty", () => {
  assert.equal(searchCondition("", ["fullName"]), null);
  const condition = searchCondition("50%", ["fullName", "email"]);
  const [first, second] = condition[Op.or];
  assert.deepEqual(first, { fullName: { [Op.iLike]: "%50\\%%" } });
  assert.deepEqual(second, { email: { [Op.iLike]: "%50\\%%" } });
});

test("list filters are validated", () => {
  assert.equal(clientListQuerySchema.validate({ search: " ana ", page: 1 }).value.search, "ana");
  assert.ok(clientListQuerySchema.validate({ trainerId: "nope" }).error);
  assert.equal(userListQuerySchema.validate({ active: "false" }).value.active, false);
  assert.ok(listMembershipsQuerySchema.validate({ courseId: "nope" }).error);
  assert.ok(clientHistoryQuerySchema.validate({ page: 0 }).error);
});

test("pagination limit is capped at 100", () => {
  assert.ok(listMembershipsQuerySchema.validate({ page: 1, limit: 101 }).error);
  assert.ok(messageQuerySchema.validate({ limit: 101 }).error);
});

test("conversation lock key does not depend on who starts it", () => {
  assert.equal(conversationPairKey("b", "a"), conversationPairKey("a", "b"));
});

test("public routes are not blocked by authenticated route groups", async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/public/trial-bookings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.notEqual(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
