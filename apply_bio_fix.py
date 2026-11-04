import re
import shutil
import sys

if len(sys.argv) != 2:
    sys.exit("Usage: python apply_bio_fix.py path/to/App.tsx")

path = sys.argv[1]
src = open(path, encoding="utf-8").read()

if "saveProfileAndSync" in src:
    sys.exit("Already patched (saveProfileAndSync found). Nothing to do.")

HELPERS = '''/** Server may call this field `about` or `bio`; accept both. */
const readBio = (profile: any, fallback = ""): string =>
  profile?.about ?? profile?.bio ?? fallback;

/** Send both keys so it saves whichever one the backend expects. */
const buildProfilePayload = (draft: any) => ({
  firstName: draft.firstName,
  gender: draft.gender,
  age: draft.age,
  height: draft.height,
  city: draft.city,
  profession: draft.profession,
  religion: draft.religion,
  community: draft.community,
  bio: draft.bio ?? "",
  about: draft.bio ?? "",
});

'''
anchor1 = "// The signed-out policy. Used before there is a session, and by the showcase."
assert src.count(anchor1) == 1, "Patch 1 anchor not found"
src = src.replace(anchor1, HELPERS + anchor1)

SYNC = '''  /** Saves the profile, re-reads it from the server and confirms the bio stuck. */
  const saveProfileAndSync = async (token: string, draft: any) => {
    await profileApi.updateProfile(token, buildProfilePayload(draft));
    const fresh = await profileApi.getMyProfile(token);
    const savedBio = String(readBio(fresh?.profile, "")).trim();
    const wantedBio = String(draft.bio ?? "").trim();
    if (savedBio !== wantedBio) {
      throw new Error(
        "Bio server par save nahi hua. Backend /profile update me bio/about field check karo.",
      );
    }
    setProfileDraft((current: any) => ({ ...current, bio: savedBio }));
  };
'''
anchor2 = "  const refreshServerMatches = async () => {"
assert src.count(anchor2) == 1, "Patch 2 anchor not found"
src = src.replace(anchor2, SYNC + anchor2)

old3 = 'bio: profileData.profile.about ?? "", // <-- YEH ADD KARO'
assert src.count(old3) == 1, "Patch 3 anchor not found"
src = src.replace(old3, 'bio: readBio(profileData.profile, (current as any).bio ?? ""),')

pat4 = re.compile(
    r"(community: profileData\.profile\.community \?\? current\.community,)"
    r"(\s*\}\)\);\s*setVerified\(!!profileData\.profile\.verified\);\s*setQuickProfile\()"
)
assert len(pat4.findall(src)) == 1, "Patch 4 anchor not found"
src = pat4.sub(r'\1\n          bio: readBio(profileData.profile, (current as any).bio ?? ""),\2', src)

UPDATE_BLOCK = (
    r'await profileApi\.updateProfile\(accessToken, \{[^}]*?'
    r'bio: \(profileDraft as any\)\.bio \|\| "",[^\n]*\n\s*\}\);'
)
pat5 = re.compile(
    UPDATE_BLOCK
    + r'(?=\s*await profileApi\.updatePhotos\(accessToken, profilePhotos\);'
    r'\s*setAppNotice\(\{\s*title: "Profile updated")'
)
assert len(pat5.findall(src)) == 1, "Patch 5 anchor not found"
src = pat5.sub("await saveProfileAndSync(accessToken, profileDraft);", src)

pat6 = re.compile(UPDATE_BLOCK)
assert len(pat6.findall(src)) == 1, "Patch 6 anchor not found"
src = pat6.sub(
    "await profileApi.updateProfile(\n          accessToken,\n          buildProfilePayload(profileDraft),\n        );",
    src,
)

pat7 = re.compile(
    r"await profileApi\.updateProfile\(accessToken, \{\s*firstName: next\.firstName,[^}]*\}\);"
)
assert len(pat7.findall(src)) == 1, "Patch 7 anchor not found"
src = pat7.sub("await profileApi.updateProfile(accessToken, buildProfilePayload(next));", src)

shutil.copyfile(path, path + ".bak")
open(path, "w", encoding="utf-8").write(src)
print("Done. All 7 patches applied. Backup:", path + ".bak")
