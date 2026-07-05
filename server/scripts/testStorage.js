// Quick Supabase Storage self-test.
// Run from the server folder:  node scripts/testStorage.js
// It verifies your credentials, creates the bucket, uploads a tiny file, and prints its public URL.
require("dotenv").config();
const storageService = require("../services/storageService");
const { isStorageConfigured } = require("../lib/supabase");

(async () => {
  if (!isStorageConfigured) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  console.log("1) Ensuring bucket exists...");
  const ok = await storageService.ensureBucket();
  if (!ok) process.exit(1);

  console.log("2) Uploading a test file...");
  const buffer = Buffer.from("hello from supabase storage test " + Date.now());
  const { path, publicUrl } = await storageService.uploadBuffer(buffer, {
    folder: "diagnostics",
    originalName: "test.txt",
    mimetype: "text/plain",
    fieldName: "test",
  });
  console.log("   uploaded object path:", path);
  console.log("   public URL:", publicUrl);

  console.log("3) Deleting the test file...");
  await storageService.remove(publicUrl);

  console.log("\n✅ Supabase Storage is fully working. Open the public URL above to confirm.");
  process.exit(0);
})().catch((err) => {
  console.error("❌ Storage test failed:", err.message);
  process.exit(1);
});
