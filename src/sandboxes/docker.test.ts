import { describe, expect, it } from "vitest";
import { docker } from "./docker.js";

describe("docker()", () => {
  it("returns a SandboxProvider with tag 'bind-mount' and name 'docker'", () => {
    const provider = docker();
    expect(provider.tag).toBe("bind-mount");
    expect(provider.name).toBe("docker");
  });

  it("accepts an imageName option", () => {
    const provider = docker({ imageName: "my-image:latest" });
    expect(provider.tag).toBe("bind-mount");
    expect(provider.name).toBe("docker");
  });

  it("has a create function", () => {
    const provider = docker();
    expect(typeof provider.create).toBe("function");
  });

  it("defaults branchStrategy to head", () => {
    const provider = docker();
    expect(provider.tag).toBe("bind-mount");
    if (provider.tag === "bind-mount") {
      expect(provider.branchStrategy).toEqual({ type: "head" });
    }
  });

  it("accepts and threads through branchStrategy", () => {
    const provider = docker({
      branchStrategy: { type: "merge-to-head" },
    });
    expect(provider.tag).toBe("bind-mount");
    if (provider.tag === "bind-mount") {
      expect(provider.branchStrategy).toEqual({ type: "merge-to-head" });
    }
  });
});
