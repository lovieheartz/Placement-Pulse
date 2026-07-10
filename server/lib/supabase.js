// Central Supabase client (service-role) used for Storage uploads.
// Reads credentials from .env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Storage is only usable when both the URL and the service-role key are present.
const isStorageConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// Create a client only when configured; otherwise export null so callers can
// fall back gracefully via isStorageConfigured.
const supabase = isStorageConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

if (!isStorageConfigured) {
  console.warn(
    "⚠️  Supabase Storage not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) — file uploads will be disabled."
  );
}

module.exports = { supabase, isStorageConfigured, SUPABASE_URL };
