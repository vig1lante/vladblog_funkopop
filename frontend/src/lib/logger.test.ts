import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createClientLogger,
  isLogLevelEnabled,
  normalizeClientLogLevel,
} from "./logger";

describe("client logger level helpers", () => {
  it("normalizes supported log levels", () => {
    expect(normalizeClientLogLevel("debug")).toBe("debug");
    expect(normalizeClientLogLevel("INFO")).toBe("info");
    expect(normalizeClientLogLevel(" warn ")).toBe("warn");
    expect(normalizeClientLogLevel("ERROR")).toBe("error");
    expect(normalizeClientLogLevel("silent")).toBe("silent");
  });

  it("defaults unsupported log levels to warn", () => {
    expect(normalizeClientLogLevel(undefined)).toBe("warn");
    expect(normalizeClientLogLevel("verbose")).toBe("warn");
  });

  it("only enables messages at or above the configured level", () => {
    expect(isLogLevelEnabled("debug", "info")).toBe(false);
    expect(isLogLevelEnabled("info", "info")).toBe(true);
    expect(isLogLevelEnabled("error", "warn")).toBe(true);
    expect(isLogLevelEnabled("error", "silent")).toBe(false);
  });
});

describe("client logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not write messages below the configured level", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const logger = createClientLogger(() => "info");

    logger.debug("hidden diagnostic");

    expect(debug).not.toHaveBeenCalled();
  });

  it("writes messages at the configured level", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logger = createClientLogger(() => "warn");

    logger.warn("request failed", { status: 503 });

    expect(warn).toHaveBeenCalledWith("request failed", { status: 503 });
  });
});
