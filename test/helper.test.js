import { describe, it, expect, beforeEach } from "vitest";
import { getOtherMember, getSockets } from "../lib/helper.js";
import { userSocketIDs } from "../lib/socketStore.js";

describe("getOtherMember", () => {
  it("returns the member who is not the current user", () => {
    const members = [{ _id: "a" }, { _id: "b" }];
    expect(getOtherMember(members, "a")._id).toBe("b");
    expect(getOtherMember(members, "b")._id).toBe("a");
  });

  it("handles ObjectId-like values via toString()", () => {
    const members = [{ _id: { toString: () => "a" } }, { _id: { toString: () => "b" } }];
    expect(getOtherMember(members, "a")._id.toString()).toBe("b");
  });
});

describe("getSockets", () => {
  beforeEach(() => {
    userSocketIDs.clear();
    userSocketIDs.set("u1", "socket-1");
    userSocketIDs.set("u2", "socket-2");
  });

  it("maps user ids to their socket ids", () => {
    expect(getSockets(["u1", "u2"])).toEqual(["socket-1", "socket-2"]);
  });

  it("drops users that have no active socket", () => {
    expect(getSockets(["u1", "offline"])).toEqual(["socket-1"]);
  });
});
