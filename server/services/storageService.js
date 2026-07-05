// Central Supabase Storage helper.
// Replaces local-disk (multer diskStorage + express.static) file handling.
// All uploads go into ONE public bucket (default "uploads") under purpose folders,
// e.g. avatars/student, resumes, noc, notifications, proctoring, test_pdfs.
//
// We store the FULL PUBLIC URL in MongoDB so the frontend can use it directly.
const path = require("path");
const { supabase, isStorageConfigured, SUPABASE_URL } = require("../lib/supabase");

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

// Folder names per upload purpose (kept close to the old on-disk layout).
const FOLDERS = {
  AVATAR_ADMIN: "avatars/admin",
  AVATAR_FACULTY: "avatars/faculty",
  AVATAR_HOD: "avatars/hod",
  AVATAR_STUDENT: "avatars/student",
  AVATAR_OTHERS: "avatars/others",
  RESUME: "resumes",
  OPTIMIZED_RESUME: "optimized_resumes",
  NOC: "noc",
  NOTIFICATION: "notifications",
  PROCTORING: "proctoring",
  TEST_PDF: "test_pdfs",
};

/**
 * Create the storage bucket if it doesn't already exist. Safe to call on every boot.
 * Requires the service-role key (has admin rights).
 */
async function ensureBucket() {
  if (!isStorageConfigured) return false;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;

    const exists = buckets.some((b) => b.name === BUCKET);
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "15MB",
      });
      if (createErr) throw createErr;
      console.log(`✅ Supabase Storage bucket "${BUCKET}" created (public)`);
    } else {
      console.log(`✅ Supabase Storage bucket "${BUCKET}" ready`);
    }
    return true;
  } catch (err) {
    console.error("❌ Failed to ensure Supabase bucket:", err.message);
    return false;
  }
}

/** Build a unique object key like "resumes/resume-1712345678901-123456789.pdf". */
function buildObjectPath(folder, originalName, fieldName = "file") {
  const ext = path.extname(originalName || "").toLowerCase();
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${folder}/${fieldName}-${uniqueSuffix}${ext}`;
}

/** Return the permanent public URL for an object path (public bucket). */
function getPublicUrl(objectPath) {
  if (!isStorageConfigured) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

/**
 * Upload a Buffer (from multer memoryStorage) to Supabase Storage.
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
async function uploadBuffer(buffer, { folder, originalName, mimetype, fieldName }) {
  if (!isStorageConfigured) {
    throw new Error("Supabase Storage is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  const objectPath = buildObjectPath(folder, originalName, fieldName);
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: mimetype || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return { path: objectPath, publicUrl: getPublicUrl(objectPath) };
}

/**
 * Convenience for the common controller pattern: takes a multer file
 * ({ buffer, originalname, mimetype, fieldname }) and returns { path, publicUrl }.
 */
async function uploadMulterFile(file, folder) {
  return uploadBuffer(file.buffer, {
    folder,
    originalName: file.originalname,
    mimetype: file.mimetype,
    fieldName: file.fieldname || "file",
  });
}

/** Turn a stored value (full public URL OR bare object path) back into an object path. */
function toObjectPath(urlOrPath) {
  if (!urlOrPath) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx !== -1) return urlOrPath.slice(idx + marker.length);
  // Legacy "/uploads/..." disk paths won't exist in Storage; ignore those.
  if (urlOrPath.startsWith("http")) return null;
  return urlOrPath.replace(/^\/+/, "");
}

/** Delete an object given its stored URL or path. Never throws (best-effort cleanup). */
async function remove(urlOrPath) {
  if (!isStorageConfigured) return;
  const objectPath = toObjectPath(urlOrPath);
  if (!objectPath) return;
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
    if (error) console.warn("Storage remove warning:", error.message);
  } catch (err) {
    console.warn("Storage remove failed:", err.message);
  }
}

/** Download an object as a Buffer (for server-side processing, if ever needed). */
async function downloadBuffer(urlOrPath) {
  if (!isStorageConfigured) throw new Error("Supabase Storage is not configured");
  const objectPath = toObjectPath(urlOrPath);
  const { data, error } = await supabase.storage.from(BUCKET).download(objectPath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

module.exports = {
  BUCKET,
  FOLDERS,
  ensureBucket,
  uploadBuffer,
  uploadMulterFile,
  getPublicUrl,
  remove,
  downloadBuffer,
  toObjectPath,
};
