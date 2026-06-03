import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../utils/utility.js";

describe("ErrorHandler", () => {
  it("is an Error with the given message and status code", () => {
    const err = new ErrorHandler("Chat not found", 404);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Chat not found");
    expect(err.statusCode).toBe(404);
  });

  it("preserves the stack trace", () => {
    const err = new ErrorHandler("boom", 500);
    expect(typeof err.stack).toBe("string");
  });
});
