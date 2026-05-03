const express = require("express")
const fs = require("fs")
const path = require("path")

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode")
const app = express()

app.use(express.json())

// ================= STATE =================
let pairingCode = "WAITING..."
let botStatus = "OFFLINE"
let totalMessages = 0
let totalUsers = new Set()

let sock = null
let qrCodeBase64 = null

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "amashia"

// ================= DATABASE =================
const dbFile = path.join(__dirname, "database.json")

function getDB() {
  if (!fs.existsSync(dbFile)) return {}
  try {
    return JSON.parse(fs.readFileSync(dbFile))
  } catch {
    return {}
  }
}

function saveDB(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2))
}

// ================= STATIC FILES (UI) =================
app.use(express.static(path.join(__dirname, "public")))

// ================= AUTH =================
function checkAuth(req, res, next) {
  const pass = req.query.pass
  if (pass !== ADMIN_PASSWORD) {
    return res.send("❌ Unauthorized Access")
  }
  next()
}

// ================= HOME =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"))
})

// ================= DASHBOARD =================
app.get("/dashboard", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"))
})

// ================= API =================
app.get("/api", checkAuth, (req, res) => {
  res.json({
    code: pairingCode,
    status: botStatus,
    messages: totalMessages,
    users: totalUsers.size
  })
})

// ================= RESTART =================
app.get("/restart", checkAuth, (req, res) => {
  res.json({ success: true, message: "Restarting..." })
  setTimeout(() => process.exit(0), 1000)
})

// ================= REFERRAL =================
app.get("/referral", (req, res) => {
  const code = req.query.code || "NO CODE"

  res.send(`
  <html>
  <body style="background:#111;color:white;text-align:center;padding:40px;font-family:Arial">
    <h1>🎁 Referral System</h1>
    <h2>${code}</h2>
    <input style="width:90%" value="https://your-domain.com/referral?code=${code}" />
  </body>
  </html>
  `)
})

// ================= TRACK REF =================
app.get("/ref", (req, res) => {
  const ref = req.query.code
  let db = getDB()

  if (!ref) return res.json({ error: "no code" })

  let owner = Object.keys(db).find(u => db[u].code === ref)

  if (owner) {
    db[owner].referrals = (db[owner].referrals || 0) + 1
    saveDB(db)
  }

  res.json({ success: true })
})

// ================= EXPORT FUNCTIONS =================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      qrCodeBase64 = await qrcode.toDataURL(qr)
      botStatus = "QR_READY"
    }

    if (connection === "open") {
      botStatus = "CONNECTED"
      qrCodeBase64 = null
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      botStatus = "DISCONNECTED"

      if (shouldReconnect) {
        startBot()
      }
    }
  })

  sock.ev.on("messages.upsert", () => {
    totalMessages++
  })
}
app.get("/qr", (req, res) => {
  if (!qrCodeBase64) {
    return res.json({ status: botStatus, qr: null })
  }

  res.json({
    status: botStatus,
    qr: qrCodeBase64
  })
})
app.post("/pair", async (req, res) => {
  const { number } = req.body

  if (!number) {
    return res.status(400).json({ error: "Number required" })
  }

  botStatus = "STARTING"

  startBot()

  return res.json({
    success: true,
    message: "QR ap parèt sou /qr"
  })
})
module.exports = {
  setCode: (c) => (pairingCode = c),
  setStatus: (s) => (botStatus = s),
  addUser: (u) => totalUsers.add(u),
  addMessage: () => totalMessages++
}

// ================= START =================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("🌐 Dashboard running on port", PORT)
})
startBot()