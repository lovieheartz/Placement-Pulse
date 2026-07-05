// One-time data migration: MongoDB (Mongoose) -> Supabase Postgres (Prisma).
//
// Safe to re-run: every row is upserted by its original Mongo _id (kept as the
// Postgres primary key), so references and JWTs keep working and re-running just
// refreshes rows. Run AFTER `npx prisma db push` has created the tables.
//
//   node scripts/migrateToPostgres.js
//
require("dotenv").config();
const mongoose = require("mongoose");
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");

// Mongoose model  ->  Prisma delegate (accessor on the prisma client)
const MODELS = [
  { name: "Admin", model: require("../models/Admin"), delegate: "admin" },
  { name: "Faculty", model: require("../models/Faculty"), delegate: "faculty" },
  { name: "HOD", model: require("../models/HOD"), delegate: "hOD" },
  { name: "Student", model: require("../models/Student"), delegate: "student" },
  { name: "Employee", model: require("../models/Employee"), delegate: "employee" },
  { name: "StudentProfile", model: require("../models/StudentProfile"), delegate: "studentProfile" },
  { name: "AptitudeTest", model: require("../models/AptitudeTest"), delegate: "aptitudeTest" },
  { name: "TestQuestion", model: require("../models/TestQuestion"), delegate: "testQuestion" },
  { name: "TestBatch", model: require("../models/TestBatch"), delegate: "testBatch" },
  { name: "TestAttempt", model: require("../models/TestAttempt"), delegate: "testAttempt" },
  { name: "TestAnalytics", model: require("../models/TestAnalytics"), delegate: "testAnalytics" },
  { name: "MockInterview", model: require("../models/MockInterview"), delegate: "mockInterview" },
  { name: "ResumeAnalysis", model: require("../models/ResumeAnalysis"), delegate: "resumeAnalysis" },
  { name: "NOC", model: require("../models/NOC"), delegate: "nOC" },
  { name: "Notification", model: require("../models/Notification"), delegate: "notification" },
];

// Field metadata per Prisma model (which fields exist, which are list/scalar).
function getFieldMeta(prismaModelName) {
  const meta = Prisma.dmmf.datamodel.models.find((m) => m.name === prismaModelName);
  if (!meta) throw new Error(`No Prisma model named ${prismaModelName}`);
  const fields = {};
  for (const f of meta.fields) {
    if (f.kind === "scalar" || f.kind === "enum") {
      fields[f.name] = { isList: f.isList, type: f.type };
    }
  }
  return fields;
}

// Coerce a scalar value to the Postgres column type (Mongo is loosely typed).
function coerce(val, type) {
  if (val == null) return val;
  switch (type) {
    case "String":
      return typeof val === "string" ? val : String(val);
    case "Int": {
      const n = typeof val === "number" ? val : parseInt(val, 10);
      return Number.isFinite(n) ? Math.trunc(n) : null;
    }
    case "Float": {
      const n = typeof val === "number" ? val : parseFloat(val);
      return Number.isFinite(n) ? n : null;
    }
    case "Boolean":
      return typeof val === "boolean" ? val : Boolean(val);
    default: // DateTime (ISO string ok), Json (leave as-is)
      return val;
  }
}

// Build a Prisma-ready row from a Mongo document.
// JSON round-trip turns ObjectId -> hex string and Date -> ISO string (both accepted by Prisma).
function toRow(doc, fieldMeta) {
  const obj = JSON.parse(JSON.stringify(doc.toObject()));
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;

  const row = {};
  for (const [name, info] of Object.entries(fieldMeta)) {
    let val = obj[name];
    // Skip null/undefined so column defaults (or NULL for optional cols) apply.
    if (val === undefined || val === null) {
      if (info.isList) row[name] = [];
      continue;
    }
    if (info.isList) {
      row[name] = (Array.isArray(val) ? val : [val]).map((v) => coerce(v, info.type));
    } else {
      row[name] = coerce(val, info.type);
    }
  }
  return row;
}

async function migrateModel({ name, model, delegate }) {
  const fieldMeta = getFieldMeta(name);
  const docs = await model.find({}).lean(false);
  let ok = 0;
  let failed = 0;

  for (const doc of docs) {
    const row = toRow(doc, fieldMeta);
    try {
      await prisma[delegate].upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      ok++;
    } catch (err) {
      failed++;
      if (failed <= 5) {
        console.error(`  ✗ ${name} ${row.id}: ${err.message.split("\n")[0]}`);
      }
    }
  }

  const total = await prisma[delegate].count();
  console.log(`✅ ${name}: migrated ${ok}/${docs.length} (failed ${failed}) — table now has ${total} rows`);
  return { name, mongo: docs.length, ok, failed, total };
}

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is empty. Add it to .env (Supabase -> Connect -> ORMs).");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is empty — needed to read the source data.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Starting migration...\n");

  const results = [];
  for (const m of MODELS) {
    try {
      results.push(await migrateModel(m));
    } catch (err) {
      console.error(`❌ ${m.name} failed entirely: ${err.message}`);
    }
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    const flag = r.mongo === r.ok ? "✓" : "⚠";
    console.log(`${flag} ${r.name}: ${r.ok}/${r.mongo} migrated`);
  }

  await mongoose.disconnect();
  await prisma.$disconnect();
  console.log("\nDone.");
  process.exit(0);
})().catch(async (err) => {
  console.error("❌ Migration crashed:", err);
  try { await mongoose.disconnect(); } catch {}
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
