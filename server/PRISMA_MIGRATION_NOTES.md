# Mongoose → Prisma conversion conventions (Supabase Postgres)

The DB moved from MongoDB/Mongoose to Supabase Postgres via Prisma. Follow these rules
exactly when converting a controller/route/job so behavior stays identical.

## Client
- Replace `const X = require("../models/X")` with `const prisma = require("../lib/prisma");`
- Keep `bcryptjs` where password hashing is needed (see below).
- Keep all non-DB code (validation, email sending via mailService, storageService uploads) unchanged.

## Delegate names (accessor on `prisma`)
Admin→`prisma.admin`, Faculty→`prisma.faculty`, HOD→`prisma.hOD`, Student→`prisma.student`,
Employee→`prisma.employee`, StudentProfile→`prisma.studentProfile`, AptitudeTest→`prisma.aptitudeTest`,
TestQuestion→`prisma.testQuestion`, TestBatch→`prisma.testBatch`, TestAttempt→`prisma.testAttempt`,
TestAnalytics→`prisma.testAnalytics`, MockInterview→`prisma.mockInterview`,
ResumeAnalysis→`prisma.resumeAnalysis`, NOC→`prisma.nOC`, Notification→`prisma.notification`.

## IDs
- Every `_id` becomes `id` (a String). In responses return `user.id`, not `user._id`.
- `doc._id.toString()` → `doc.id`. Never use `mongoose.Types.ObjectId`.

## Query translations
| Mongoose | Prisma |
|---|---|
| `M.findById(id)` | `prisma.x.findUnique({ where: { id } })` |
| `M.findOne({ email })` (unique field) | `prisma.x.findUnique({ where: { email } })` |
| `M.findOne(q)` (non-unique) | `prisma.x.findFirst({ where: q })` |
| `M.find(q)` | `prisma.x.findMany({ where: q })` |
| `M.find(q).sort({ f: -1 })` | `prisma.x.findMany({ where: q, orderBy: { f: "desc" } })` |
| `M.find().limit(n)` | `prisma.x.findMany({ take: n })` |
| `.select("-password")` | add `omit: { password: true }` (Prisma 6 supports `omit`), or just don't return it |
| `M.countDocuments(q)` | `prisma.x.count({ where: q })` |
| `M.findByIdAndUpdate(id, data, { new: true })` | `prisma.x.update({ where: { id }, data })` |
| `M.findByIdAndDelete(id)` / `M.findByIdAndRemove` | `prisma.x.delete({ where: { id } })` |
| `M.deleteOne({_id:id})` / `M.deleteMany(q)` | `prisma.x.delete({where:{id}})` / `prisma.x.deleteMany({where:q})` |
| `M.updateMany(q, data)` | `prisma.x.updateMany({ where: q, data })` |
| `new M(data); await doc.save()` | `await prisma.x.create({ data })` |
| `doc.field = v; await doc.save()` | `await prisma.x.update({ where: { id: doc.id }, data: { field: v } })` |

## Filters / operators
- `{ field: { $in: arr } }` → `{ field: { in: arr } }`
- `{ field: { $ne: v } }` → `{ field: { not: v } }`
- `{ field: { $gt: v } }` → `{ field: { gt: v } }`, `$lt`→`lt`, `$gte`→`gte`, `$lte`→`lte`
- `{ $or: [...] }` → `{ OR: [...] }`, `$and` → `AND`
- Regex `{ field: /x/i }` → `{ field: { contains: "x", mode: "insensitive" } }`
- Empty `$in: []` matched nothing in Mongo; keep that guard (`if (arr.length)`).

## Password hashing (IMPORTANT)
The Mongoose user models hashed passwords in a `pre('save')` hook. Prisma has NO hooks.
Whenever you create OR update a user (Admin/Faculty/HOD/Student) with a password, hash it first:
```js
const bcrypt = require("bcryptjs");
const hashed = await bcrypt.hash(plainPassword, 10);
// ...create/update with password: hashed
```
Do NOT re-hash an already-hashed value (only hash when the plaintext password is provided).

## populate()
There are no Prisma relations declared. Replace `.populate('studentId')` etc. with a manual
second query and attach it, e.g.:
```js
const noc = await prisma.nOC.findUnique({ where: { id } });
const student = await prisma.student.findUnique({ where: { id: noc.studentId } });
noc.student = student; // shape the response as the frontend expects
```
For lists, collect the ref ids, fetch with `findMany({ where: { id: { in: ids } } })`, and map.

## JSON / array columns
These columns store objects/arrays directly (already migrated): e.g. `attachment`, `recipients`,
`isRead`, `resumeFile`, `analysis`, `options`, `responses`, `proctoring`, `stats`, `schedule`,
`questions`, `overallFeedback`, StudentProfile groups (`classX`, `father`, `permanentAddress`, ...).
Read/write them as plain JS objects. To mutate an array (e.g. push to `isRead`), read the row,
modify the array in JS, then `update({ data: { isRead: newArray } })`.

## Numbers
`admissionYear`, `passoutYear`, `duration`, `semester`, counts are Int columns — `parseInt(x,10)`
if the value comes from `req.body` as a string. Scores/percentages are Float.

## Timestamps
`createdAt`/`updatedAt` are managed automatically (`@default(now())` / `@updatedAt`). Don't set them.

## Model instance methods
Some Mongoose models had methods (e.g. `attempt.calculateScore()`, `profile.calculateCompletion()`).
Prisma returns plain objects with NO methods. Port the method's logic into a plain function in the
controller (or a service) that takes the row + returns/writes the computed values.

## Verify after converting a file
1. `node -e "require('dotenv').config(); require('./controllers/<file>')"` → must print nothing/no throw.
2. Grep the file: no remaining `require("../models/`, `.save(`, `._id`, `findById`, `new <Model>(`.
