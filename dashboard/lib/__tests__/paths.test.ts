import { describe, it, expect } from "vitest";
import path from "path";
import { safeId, resolvePublicAsset } from "../paths";

describe("safeId", () => {
  it("passes through a plain id unchanged", () => {
    expect(safeId("run_12345")).toBe("run_12345");
  });

  it("strips directory traversal down to the basename", () => {
    expect(safeId("../../etc/passwd")).toBe("passwd");
  });

  it("strips a leading absolute path down to the basename", () => {
    expect(safeId("/etc/passwd")).toBe("passwd");
  });

  it("strips traversal mixed with a real-looking id", () => {
    expect(safeId("../../../run_evil")).toBe("run_evil");
  });
});

describe("resolvePublicAsset", () => {
  it("resolves a normal web path under public/", () => {
    const resolved = resolvePublicAsset("/visuals/foo.png");
    expect(resolved).toBe(path.join(process.cwd(), "public", "visuals", "foo.png"));
  });

  it("throws when the path tries to escape public/ via traversal", () => {
    expect(() => resolvePublicAsset("/../../.env")).toThrow(/Refusing to resolve path outside public/);
  });

  it("throws when the path tries to escape public/ with an encoded-looking traversal", () => {
    expect(() => resolvePublicAsset("/../.env")).toThrow(/Refusing to resolve path outside public/);
  });
});
