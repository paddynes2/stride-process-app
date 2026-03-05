import { describe, it, expect } from "vitest";
import { successResponse, errorResponse } from "./response";

describe("successResponse", () => {
  it("returns data in envelope with null error", async () => {
    const res = successResponse({ id: "123", name: "test" });
    const body = await res.json();
    expect(body.data).toEqual({ id: "123", name: "test" });
    expect(body.error).toBeNull();
    expect(res.status).toBe(200);
  });

  it("respects custom status code", async () => {
    const res = successResponse("created", 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBe("created");
  });

  it("handles null data", async () => {
    const res = successResponse(null);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toBeNull();
  });
});

describe("errorResponse", () => {
  it("returns error in envelope with null data", async () => {
    const res = errorResponse("NOT_FOUND", "Resource not found", 404);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error).toEqual({
      code: "NOT_FOUND",
      message: "Resource not found",
    });
    expect(res.status).toBe(404);
  });

  it("defaults to 400 status", async () => {
    const res = errorResponse("VALIDATION", "Invalid input");
    expect(res.status).toBe(400);
  });
});
