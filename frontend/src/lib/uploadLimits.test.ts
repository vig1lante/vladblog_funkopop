import { describe, expect, it } from "vitest";

import {
  getPhotoTooLargeMessage,
  isPhotoTooLargeForQuickUpload,
  MAX_QUICK_PHOTO_UPLOAD_SIZE_BYTES,
  MAX_QUICK_PHOTO_UPLOAD_SIZE_MB,
} from "./uploadLimits";

describe("upload limits", () => {
  it("detects photos larger than the quick upload limit", () => {
    expect(
      isPhotoTooLargeForQuickUpload({
        size: MAX_QUICK_PHOTO_UPLOAD_SIZE_BYTES + 1,
      }),
    ).toBe(true);
    expect(
      isPhotoTooLargeForQuickUpload({
        size: MAX_QUICK_PHOTO_UPLOAD_SIZE_BYTES,
      }),
    ).toBe(false);
  });

  it("shows the configured limit in the user message", () => {
    expect(getPhotoTooLargeMessage()).toContain(
      `больше чем ${MAX_QUICK_PHOTO_UPLOAD_SIZE_MB} mb`,
    );
    expect(getPhotoTooLargeMessage()).toContain("вес сам урежется");
  });
});
