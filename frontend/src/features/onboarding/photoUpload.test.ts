import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const app = readFileSync(join(root, "app", "MilaanApp.tsx"), "utf8");
const edit = readFileSync(join(root, "features", "onboarding", "screens", "ProfileSetupScreen.tsx"), "utf8");

describe("profile photos reach the server", () => {
  it("sign-up uploads the picked photo before saving it", () => {
    expect(app).toContain("uploadedPhoto = await uploadPhoto(quickProfile.photoUri, accessToken)");
  });

  it("Edit profile never keeps a local link when the upload fails", () => {
    expect(edit).not.toContain("uploadPhotoOrKeepLocal");
    expect(edit).toContain("const uploadedUrl = accessToken ? await uploadPhoto(uri, accessToken) : uri;");
  });
});
