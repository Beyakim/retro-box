/**
 * Retro Box Server (v9-team-name-and-retro-number)
 * Node.js + Express + Postgres + Socket.io
 * NEW: Edit team name + retro_number tracking
 *
 * FIX (Feb 2026):
 * ✅ Ensure there is ALWAYS an active collecting box when adding notes / reading state
 * (prevents: {"error":"no_active_box"} on POST /teams/:teamCode/notes)
 */

require("dotenv").config();
if (process.env.DATABASE_URL) {
  const safeDbUrl = process.env.DATABASE_URL.replace(/:(.*?)@/, ":*****@");
  console.log("DB =", safeDbUrl);
}
console.log("BOOT: v9-team-name-and-retro-number, file:", __filename);

const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const db = require("./db");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

/* =========================================================
   Uploads folder
   ========================================================= */

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 uploads folder created at:", uploadsDir);
}

const app = express();
app.use("/uploads", express.static(uploadsDir));

app.get("/debug/uploads", (req, res) => {
  try {
    const exists = fs.existsSync(uploadsDir);
    const files = exists ? fs.readdirSync(uploadsDir).slice(0, 20) : [];
    res.json({ uploadsDir, exists, sampleFiles: files });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes(".vercel.app") ||
        origin === "http://localhost:5173"
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ["GET", "POST", "PATCH"],
    credentials: true,
  },
});

/* =========================================================
   CORS + JSON
   ========================================================= */

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://retro-box-five.vercel.app",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
      if (origin && origin.includes(".vercel.app")) return callback(null, true);
      return callback(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "256kb" }));

/* =========================================================
   Uploads (Images)
   ========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images allowed"));
    }

    // Optional: block HEIC/HEIF if you want (Chrome often can't render)
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".heic" || ext === ".heif") {
      return cb(new Error("HEIC not supported. Please upload JPG/PNG/WebP."));
    }

    cb(null, true);
  },
});

app.post("/upload", upload.single("file"), (req, res) => {
  console.log("UPLOAD DEBUG:", { file: req.file, body: req.body });
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const imageUrl = `/uploads/${req.file.filename}`;
  return res.json({ imageUrl });
});

/* =========================================================
   Helpers
   ========================================================= */

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function generateTeamCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function getTeamByCode(teamCode) {
  const result = await db.query(
    `SELECT id, name, team_code AS "teamCode", created_at AS "createdAt"
     FROM public.teams
     WHERE team_code = $1`,
    [teamCode],
  );
  return result.rows[0] || null;
}

async function getActiveBoxByTeamId(teamId) {
  const result = await db.query(
    `SELECT id, team_id AS "teamId", status,
            retro_number AS "retroNumber",
            created_at AS "createdAt",
            closed_at AS "closedAt"
     FROM public.boxes
     WHERE team_id = $1 AND status <> 'closed'
     ORDER BY created_at DESC
     LIMIT 1`,
    [teamId],
  );
  return result.rows[0] || null;
}

/**
 * ✅ CRITICAL INVARIANT:
 * Always have an active box (status <> 'closed').
 * If none exists → create a new 'collecting' box with next retro_number.
 */
async function ensureActiveBoxByTeamId(teamId) {
  const existing = await db.query(
    `SELECT id, team_id AS "teamId", status,
            retro_number AS "retroNumber",
            created_at AS "createdAt",
            closed_at AS "closedAt"
     FROM public.boxes
     WHERE team_id = $1 AND status <> 'closed'
     ORDER BY created_at DESC
     LIMIT 1`,
    [teamId],
  );

  if (existing.rows.length > 0) return existing.rows[0];

  const nextNumberRes = await db.query(
    `SELECT COALESCE(MAX(retro_number), 0) + 1 AS next
     FROM public.boxes
     WHERE team_id = $1`,
    [teamId],
  );

  const nextRetroNumber = nextNumberRes.rows[0].next;

  const insertRes = await db.query(
    `INSERT INTO public.boxes (team_id, status, retro_number)
     VALUES ($1, 'collecting', $2)
     RETURNING id, team_id AS "teamId", status,
               retro_number AS "retroNumber",
               created_at AS "createdAt",
               closed_at AS "closedAt"`,
    [teamId, nextRetroNumber],
  );

  console.log(
    `📦 ensureActiveBoxByTeamId: created collecting box #${nextRetroNumber} for teamId=${teamId}`,
  );

  return insertRes.rows[0];
}

/* =========================================================
   Health
   ========================================================= */

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "v9-team-name-and-retro-number" });
});

/* =========================================================
   Teams
   ========================================================= */

app.post("/teams", async (req, res) => {
  try {
    const name = asTrimmedString(req.body?.name);

    if (!name) return res.status(400).json({ error: "name_is_required" });
    if (name.length > 80)
      return res.status(400).json({ error: "name_too_long" });

    let createdRow = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const teamCode = generateTeamCode(6);

      try {
        const result = await db.query(
          `INSERT INTO public.teams (name, team_code)
           VALUES ($1, $2)
           RETURNING id, name, team_code AS "teamCode", created_at AS "createdAt"`,
          [name, teamCode],
        );
        createdRow = result.rows[0];
        break;
      } catch (err) {
        if (err.code === "23505") continue;
        throw err;
      }
    }

    if (!createdRow) {
      return res
        .status(500)
        .json({ error: "failed_to_generate_unique_team_code" });
    }

    // Auto-create first box for the new team
    try {
      await db.query(
        `INSERT INTO public.boxes (team_id, status, retro_number)
         VALUES ($1, 'collecting', 1)`,
        [createdRow.id],
      );
      console.log(
        `📦 Auto-created first box for team ${createdRow.teamCode} (#1)`,
      );
    } catch (e) {
      console.error("Auto-create box failed for team:", createdRow.teamCode, e);
    }

    return res.status(201).json(createdRow);
  } catch (err) {
    console.error("POST /teams failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* =========================================================
   PATCH Team Name
   ========================================================= */

app.patch("/teams/:teamCode", async (req, res) => {
  try {
    const teamCode = asTrimmedString(req.params.teamCode);
    const newName = asTrimmedString(req.body?.name);

    if (!teamCode)
      return res.status(400).json({ error: "teamCode_is_required" });
    if (!newName) return res.status(400).json({ error: "name_is_required" });
    if (newName.length < 2)
      return res.status(400).json({ error: "name_too_short", minLength: 2 });
    if (newName.length > 50)
      return res.status(400).json({ error: "name_too_long", maxLength: 50 });

    const result = await db.query(
      `UPDATE public.teams
       SET name = $1
       WHERE team_code = $2
       RETURNING team_code AS "teamCode", name`,
      [newName, teamCode],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "team_not_found" });
    }

    const updated = result.rows[0];

    io.to(teamCode).emit("team-name-updated", {
      teamCode: updated.teamCode,
      name: updated.name,
    });

    console.log(`✏️ Team ${teamCode} renamed to: ${newName}`);
    return res.json(updated);
  } catch (err) {
    console.error("PATCH /teams/:teamCode failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* =========================================================
   Boxes
   ========================================================= */

app.post("/teams/:teamCode/boxes", async (req, res) => {
  const teamCode = asTrimmedString(req.params.teamCode);
  if (!teamCode) return res.status(400).json({ error: "teamCode_is_required" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const teamRes = await client.query(
      `SELECT id, name, team_code AS "teamCode"
       FROM public.teams
       WHERE team_code = $1`,
      [teamCode],
    );
    if (teamRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "team_not_found" });
    }
    const team = teamRes.rows[0];

    const activeRes = await client.query(
      `SELECT id, team_id AS "teamId", status,
              retro_number AS "retroNumber",
              created_at AS "createdAt",
              closed_at AS "closedAt"
       FROM public.boxes
       WHERE team_id = $1 AND status <> 'closed'
       ORDER BY created_at DESC
       LIMIT 1`,
      [team.id],
    );

    if (activeRes.rows.length > 0) {
      await client.query("COMMIT");
      return res
        .status(200)
        .json({ team, box: activeRes.rows[0], created: false });
    }

    const nextNumberRes = await client.query(
      `SELECT COALESCE(MAX(retro_number), 0) + 1 AS "nextNumber"
       FROM public.boxes
       WHERE team_id = $1`,
      [team.id],
    );
    const nextRetroNumber = nextNumberRes.rows[0].nextNumber;

    const insertRes = await client.query(
      `INSERT INTO public.boxes (team_id, status, retro_number)
       VALUES ($1, 'collecting', $2)
       RETURNING id, team_id AS "teamId", status,
                 retro_number AS "retroNumber",
                 created_at AS "createdAt",
                 closed_at AS "closedAt"`,
      [team.id, nextRetroNumber],
    );

    await client.query("COMMIT");

    console.log(
      `📦 Created box for team ${teamCode}, retro #${nextRetroNumber}`,
    );
    io.to(teamCode).emit("box-created", insertRes.rows[0]);

    return res
      .status(201)
      .json({ team, box: insertRes.rows[0], created: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /teams/:teamCode/boxes failed:", err);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

app.get("/teams/:teamCode/active-box", async (req, res) => {
  try {
    const teamCode = asTrimmedString(req.params.teamCode);
    if (!teamCode)
      return res.status(400).json({ error: "teamCode_is_required" });

    const team = await getTeamByCode(teamCode);
    if (!team) return res.status(404).json({ error: "team_not_found" });

    // ✅ ensure active box
    const box = await ensureActiveBoxByTeamId(team.id);
    return res.json({ team, box });
  } catch (err) {
    console.error("GET /teams/:teamCode/active-box failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

app.get("/teams/:teamCode/state", async (req, res) => {
  try {
    const teamCode = asTrimmedString(req.params.teamCode);
    if (!teamCode)
      return res.status(400).json({ error: "teamCode_is_required" });

    const team = await getTeamByCode(teamCode);
    if (!team) return res.status(404).json({ error: "team_not_found" });

    // ✅ ensure active box
    const activeBox = await ensureActiveBoxByTeamId(team.id);

    const countsRes = await db.query(
      `SELECT
         COUNT(*)::int AS "total",
         COUNT(*) FILTER (WHERE opened = false)::int AS "unopened"
       FROM public.notes
       WHERE box_id = $1`,
      [activeBox.id],
    );

    const notes = countsRes.rows[0] || { total: 0, unopened: 0 };

    return res.json({ team, activeBox, notes });
  } catch (err) {
    console.error("GET /teams/:teamCode/state failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* =========================================================
   START RETRO - Assign Host + Pull Mode
   ========================================================= */

app.post("/teams/:teamCode/active-box/start-retro", async (req, res) => {
  const teamCode = asTrimmedString(req.params.teamCode);
  if (!teamCode) return res.status(400).json({ error: "teamCode_is_required" });

  const hostClientId = req.body?.clientId || req.headers["x-client-id"];
  if (!hostClientId)
    return res.status(400).json({ error: "clientId_is_required" });

  console.log("DEBUG start-retro body:", req.body);

  const pullOrderRaw = req.body?.pullOrder;
  const allowedPullOrders = new Set(["random", "keep-first", "improve-first"]);
  const pullMode = allowedPullOrders.has(pullOrderRaw)
    ? pullOrderRaw
    : "sequential";

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const teamRes = await client.query(
      `SELECT id FROM public.teams WHERE team_code = $1`,
      [teamCode],
    );
    if (teamRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "team_not_found" });
    }
    const teamId = teamRes.rows[0].id;

    // ✅ ensure there is an active box before start
    // BUT: start-retro logic expects row lock, so we continue with FOR UPDATE query
    const boxRes = await client.query(
      `SELECT id, status, host_client_id AS "hostClientId",
              current_note_id AS "currentNoteId",
              retro_number AS "retroNumber",
              pull_mode AS "pullMode"
       FROM public.boxes
       WHERE team_id = $1 AND status <> 'closed'
       ORDER BY created_at DESC
       FOR UPDATE
       LIMIT 1`,
      [teamId],
    );

    if (boxRes.rows.length === 0) {
      // no active box at all → create one (collecting) inside tx, then refetch FOR UPDATE
      const nextNumberRes = await client.query(
        `SELECT COALESCE(MAX(retro_number), 0) + 1 AS next
         FROM public.boxes
         WHERE team_id = $1`,
        [teamId],
      );
      const nextRetroNumber = nextNumberRes.rows[0].next;

      await client.query(
        `INSERT INTO public.boxes (team_id, status, retro_number)
         VALUES ($1, 'collecting', $2)`,
        [teamId, nextRetroNumber],
      );

      const refetch = await client.query(
        `SELECT id, status, host_client_id AS "hostClientId",
                current_note_id AS "currentNoteId",
                retro_number AS "retroNumber",
                pull_mode AS "pullMode"
         FROM public.boxes
         WHERE team_id = $1 AND status <> 'closed'
         ORDER BY created_at DESC
         FOR UPDATE
         LIMIT 1`,
        [teamId],
      );

      if (refetch.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(500).json({ error: "failed_to_create_active_box" });
      }

      boxRes.rows.push(refetch.rows[0]);
    }

    const box = boxRes.rows[0];

    if (box.status === "in_retro") {
      if (box.hostClientId && box.hostClientId !== hostClientId) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          error: "not_host",
          message: "Retro already started by another host",
          hostClientId: box.hostClientId,
        });
      }

      await client.query("COMMIT");
      return res.json({
        message: "already_in_retro",
        boxId: box.id,
        hostClientId: box.hostClientId,
        retroNumber: box.retroNumber,
        pullMode: box.pullMode ?? "sequential",
      });
    }

    if (box.status !== "collecting") {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "invalid_box_status", status: box.status });
    }

    if (box.hostClientId && box.hostClientId !== hostClientId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "not_host",
        message: "Only the host who created this retro can start it",
        hostClientId: box.hostClientId,
      });
    }

    await client.query(
      `UPDATE public.boxes
       SET status = 'in_retro',
           host_client_id = COALESCE(host_client_id, $1),
           pull_mode = $2
       WHERE id = $3`,
      [hostClientId, pullMode, box.id],
    );

    await client.query("COMMIT");

    io.to(teamCode).emit("retro-started", {
      boxId: box.id,
      hostClientId,
      retroNumber: box.retroNumber,
      pullMode,
    });

    console.log(
      `🎁 Retro #${box.retroNumber} started for team ${teamCode}, host: ${hostClientId}, pullMode: ${pullMode}`,
    );

    return res.json({
      message: "retro_started",
      boxId: box.id,
      hostClientId,
      retroNumber: box.retroNumber,
      pullMode,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /teams/:teamCode/active-box/start-retro failed:", err);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

/* =========================================================
   PULL NEXT NOTE - HOST ONLY
   ========================================================= */

app.post("/teams/:teamCode/retro/pull-next", async (req, res) => {
  const teamCode = asTrimmedString(req.params.teamCode);
  if (!teamCode) return res.status(400).json({ error: "teamCode_is_required" });

  const clientId = req.body?.clientId || req.headers["x-client-id"];
  if (!clientId) return res.status(400).json({ error: "clientId_is_required" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const teamRes = await client.query(
      `SELECT id FROM public.teams WHERE team_code = $1`,
      [teamCode],
    );
    if (teamRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "team_not_found" });
    }
    const teamId = teamRes.rows[0].id;

    const boxRes = await client.query(
      `SELECT id, status, host_client_id AS "hostClientId",
              current_note_id AS "currentNoteId",
              retro_number AS "retroNumber",
              pull_mode AS "pullMode"
       FROM public.boxes
       WHERE team_id = $1 AND status <> 'closed'
       ORDER BY created_at DESC
       FOR UPDATE
       LIMIT 1`,
      [teamId],
    );

    if (boxRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "no_active_box" });
    }

    const box = boxRes.rows[0];

    if (box.status !== "in_retro") {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "retro_not_in_progress", status: box.status });
    }

    if (box.hostClientId !== clientId) {
      await client.query("ROLLBACK");
      console.log(
        `❌ Non-host ${clientId} tried to pull note (host is ${box.hostClientId})`,
      );
      return res
        .status(403)
        .json({
          error: "not_host",
          message: "Only the facilitator can pull notes",
        });
    }

    const pullMode = box.pullMode || "sequential";

    let pickSql = `
      SELECT id
      FROM public.notes
      WHERE box_id = $1 AND opened = false
    `;

    if (pullMode === "random") {
      pickSql += ` ORDER BY random() `;
    } else if (pullMode === "keep-first") {
      pickSql += `
        ORDER BY
          CASE
            WHEN type IN ('keep','shoutout') THEN 0
            WHEN type = 'improve' THEN 1
            ELSE 2
          END,
          id ASC
      `;
    } else if (pullMode === "improve-first") {
      pickSql += `
        ORDER BY
          CASE
            WHEN type = 'improve' THEN 0
            WHEN type IN ('keep','shoutout') THEN 1
            ELSE 2
          END,
          id ASC
      `;
    } else {
      pickSql += ` ORDER BY id ASC `;
    }

    pickSql += `
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    const pick = await client.query(pickSql, [box.id]);

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS remaining
       FROM public.notes
       WHERE box_id = $1 AND opened = false`,
      [box.id],
    );
    const remainingCount = countRes.rows[0]?.remaining || 0;

    if (pick.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({
        currentNote: null,
        retro: {
          status: box.status,
          remainingCount: 0,
          hostClientId: box.hostClientId,
          retroNumber: box.retroNumber,
        },
      });
    }

    const noteId = pick.rows[0].id;

    const updated = await client.query(
      `UPDATE public.notes
       SET opened = true
       WHERE id = $1
       RETURNING
         id,
         box_id AS "boxId",
         type,
         author_name AS "authorName",
         content,
         image_url AS "imageUrl",
         anonymous,
         opened`,
      [noteId],
    );

    const note = updated.rows[0];

    await client.query(
      `UPDATE public.boxes
       SET current_note_id = $1
       WHERE id = $2`,
      [noteId, box.id],
    );

    await client.query("COMMIT");

    io.to(teamCode).emit("current-note-changed", {
      currentNote: note,
      retro: {
        status: box.status,
        remainingCount: Math.max(remainingCount - 1, 0),
        hostClientId: box.hostClientId,
        retroNumber: box.retroNumber,
      },
    });

    return res.json({
      currentNote: note,
      retro: {
        status: box.status,
        remainingCount: Math.max(remainingCount - 1, 0),
        hostClientId: box.hostClientId,
        retroNumber: box.retroNumber,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /teams/:teamCode/retro/pull-next failed:", err);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

/* =========================================================
   GET RETRO STATE
   ========================================================= */

app.get("/teams/:teamCode/retro/state", async (req, res) => {
  try {
    const teamCode = asTrimmedString(req.params.teamCode);
    if (!teamCode)
      return res.status(400).json({ error: "teamCode_is_required" });

    const team = await getTeamByCode(teamCode);
    if (!team) return res.status(404).json({ error: "team_not_found" });

    // ✅ ensure active box (may be collecting)
    const box = await ensureActiveBoxByTeamId(team.id);

    let currentNote = null;
    if (box.status === "in_retro" && box.currentNoteId) {
      const noteRes = await db.query(
        `SELECT
          id,
          box_id AS "boxId",
          type,
          author_name AS "authorName",
          content,
          image_url AS "imageUrl",
          anonymous,
          opened
         FROM public.notes
         WHERE id = $1`,
        [box.currentNoteId],
      );
      currentNote = noteRes.rows[0] || null;
    }

    const countsRes = await db.query(
      `SELECT
         COUNT(*)::int AS "total",
         COUNT(*) FILTER (WHERE opened = false)::int AS "unopened"
       FROM public.notes
       WHERE box_id = $1`,
      [box.id],
    );

    const notes = countsRes.rows[0] || { total: 0, unopened: 0 };

    return res.json({
      team,
      retro: {
        id: box.id,
        status: box.status,
        hostClientId: box.hostClientId ?? null,
        retroNumber: box.retroNumber,
      },
      currentNote,
      remainingCount: notes.unopened,
    });
  } catch (err) {
    console.error("GET /teams/:teamCode/retro/state failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* =========================================================
   CLOSE RETRO (host gating is already done by "notes remaining" rule)
   ========================================================= */

app.post("/teams/:teamCode/active-box/close", async (req, res) => {
  const teamCode = asTrimmedString(req.params.teamCode);
  if (!teamCode) return res.status(400).json({ error: "teamCode_is_required" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const teamRes = await client.query(
      `SELECT id FROM public.teams WHERE team_code = $1`,
      [teamCode],
    );

    if (teamRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "team_not_found" });
    }

    const teamId = teamRes.rows[0].id;

    const boxRes = await client.query(
      `SELECT id, status, retro_number AS "retroNumber"
       FROM public.boxes
       WHERE team_id = $1 AND status <> 'closed'
       ORDER BY created_at DESC
       FOR UPDATE
       LIMIT 1`,
      [teamId],
    );

    if (boxRes.rows.length === 0) {
      // even this: create collecting box and treat as "nothing to close"
      const nextNumberRes = await client.query(
        `SELECT COALESCE(MAX(retro_number), 0) + 1 AS next
         FROM public.boxes
         WHERE team_id = $1`,
        [teamId],
      );

      const nextRetroNumber = nextNumberRes.rows[0].next;
      await client.query(
        `INSERT INTO public.boxes (team_id, status, retro_number)
         VALUES ($1, 'collecting', $2)`,
        [teamId, nextRetroNumber],
      );

      await client.query("COMMIT");
      return res.json({
        message: "no_box_to_close_but_created_collecting",
        createdRetroNumber: nextRetroNumber,
      });
    }

    const box = boxRes.rows[0];

    const remainingRes = await client.query(
      `SELECT COUNT(*)::int AS remaining
       FROM public.notes
       WHERE box_id = $1 AND opened = false`,
      [box.id],
    );

    const remaining = remainingRes.rows[0].remaining;

    if (remaining > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "notes_remaining",
        message: "Cannot close retro before all notes are revealed",
        remaining,
      });
    }

    await client.query(
      `UPDATE public.boxes
       SET status = 'closed',
           closed_at = NOW()
       WHERE id = $1`,
      [box.id],
    );

    const nextNumberRes = await client.query(
      `SELECT COALESCE(MAX(retro_number), 0) + 1 AS next
       FROM public.boxes
       WHERE team_id = $1`,
      [teamId],
    );

    const nextRetroNumber = nextNumberRes.rows[0].next;

    await client.query(
      `INSERT INTO public.boxes (team_id, status, retro_number)
       VALUES ($1, 'collecting', $2)`,
      [teamId, nextRetroNumber],
    );

    await client.query("COMMIT");

    io.to(teamCode).emit("retro-closed", { boxId: box.id });

    console.log(
      `✅ Closed retro #${box.retroNumber} and created new collecting box #${nextRetroNumber}`,
    );

    return res.json({
      message: "retro_closed",
      previousRetroNumber: box.retroNumber,
      createdRetroNumber: nextRetroNumber,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Close retro failed:", err);
    return res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

/* =========================================================
   Notes
   ========================================================= */

app.post("/teams/:teamCode/notes", async (req, res) => {
  try {
    console.log("TEAM CODE =", req.params.teamCode);
    console.log("DEBUG /notes body =", req.body);

    const teamCode = asTrimmedString(req.params.teamCode);
    if (!teamCode)
      return res.status(400).json({ error: "teamCode_is_required" });

    const team = await getTeamByCode(teamCode);
    if (!team) return res.status(404).json({ error: "team_not_found" });

    // ✅ ensure active box always exists
    const activeBox = await ensureActiveBoxByTeamId(team.id);

    if (activeBox.status !== "collecting") {
      return res
        .status(409)
        .json({ error: "box_not_collecting", status: activeBox.status });
    }

    const type = asTrimmedString(req.body?.type);
    const authorName = asTrimmedString(req.body?.authorName);
    const content = asTrimmedString(req.body?.content);
    const imageUrl = asTrimmedString(req.body?.imageUrl);
    const anonymous = !!req.body?.anonymous;

    if (!type) return res.status(400).json({ error: "type_is_required" });
    if (!content && !imageUrl) {
      return res.status(400).json({ error: "content_or_image_required" });
    }

    if (authorName.length > 50)
      return res.status(400).json({ error: "author_too_long" });
    if (content && content.length > 2000)
      return res.status(400).json({ error: "content_too_long" });
    if (imageUrl && !imageUrl.startsWith("/uploads/")) {
      return res.status(400).json({ error: "invalid_image_url" });
    }

    const result = await db.query(
      `INSERT INTO public.notes (box_id, type, author_name, content, image_url, anonymous, opened)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING id`,
      [
        activeBox.id,
        type,
        authorName || null,
        content || "",
        imageUrl || null,
        anonymous,
      ],
    );

    io.to(teamCode).emit("note-added", {
      noteId: result.rows[0].id,
      boxId: activeBox.id,
    });
    return res.status(201).json({ id: result.rows[0].id, boxId: activeBox.id });
  } catch (err) {
    console.error("DEBUG /notes err =", err);
    console.error("POST /teams/:teamCode/notes failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

app.get("/teams/:teamCode/notes", async (req, res) => {
  try {
    const teamCode = asTrimmedString(req.params.teamCode);
    if (!teamCode)
      return res.status(400).json({ error: "teamCode_is_required" });

    const team = await getTeamByCode(teamCode);
    if (!team) return res.status(404).json({ error: "team_not_found" });

    // ✅ ensure active box always exists
    const activeBox = await ensureActiveBoxByTeamId(team.id);

    const result = await db.query(
      `SELECT
        id,
        box_id AS "boxId",
        type,
        author_name AS "authorName",
        content,
        image_url AS "imageUrl",
        anonymous,
        opened,
        created_at AS "createdAt"
      FROM public.notes
      WHERE box_id = $1
      ORDER BY created_at ASC`,
      [activeBox.id],
    );

    return res.json({ notes: result.rows, boxId: activeBox.id });
  } catch (err) {
    console.error("GET /teams/:teamCode/notes failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* =========================================================
   DEV-ONLY admin
   ========================================================= */

const ALLOW_DEV_ADMIN = process.env.ALLOW_DEV_ADMIN === "true";

app.post("/notes/reset", async (req, res) => {
  try {
    if (!ALLOW_DEV_ADMIN) return res.status(403).json({ error: "forbidden" });
    await db.query(`UPDATE public.notes SET opened = false`);
    return res.json({ message: "All notes reset to unopened" });
  } catch (err) {
    console.error("POST /notes/reset failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

app.post("/notes/clear", async (req, res) => {
  try {
    if (!ALLOW_DEV_ADMIN) return res.status(403).json({ error: "forbidden" });
    await db.query(`DELETE FROM public.notes`);
    return res.json({ message: "All notes cleared" });
  } catch (err) {
    console.error("POST /notes/clear failed:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* =========================================================
   Error handler + Socket.io + Listen
   ========================================================= */

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-team", (teamCode) => {
    socket.join(teamCode);
    console.log(`Socket ${socket.id} joined team ${teamCode}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, () => {
  console.log(
    `🚀 Server running on ${PORT} with Socket.io (Team Name + Retro Number)`,
  );
});
