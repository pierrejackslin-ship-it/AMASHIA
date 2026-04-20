require("dotenv").config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const P = require("pino")
const web = require("./server")

const prefix = process.env.BOT_PREFIX || "."
const botName = process.env.BOT_NAME || "AMASHIA MD BOT V.2"
const number = process.env.PAIRING_NUMBER

// ================= START BOT =================
async function startBot() {
  try {
    if (!number) {
      console.log("❌ PAIRING_NUMBER missing in .env")
      return
    }

    const { state, saveCreds } = await useMultiFileAuthState(
      process.env.SESSIONS_DIR || "sessions"
    )

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: P({ level: "silent" })
    })

    // ================= PAIRING CODE =================
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(number)
      console.log("🔑 PAIRING CODE:", code)
      web.setCode(code)
    }

    sock.ev.on("creds.update", saveCreds)

    // ================= CONNECTION =================
    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        console.log("✅ Connected:", botName)
        web.setStatus("ONLINE 🟢")
      }

      if (connection === "close") {
        web.setStatus("OFFLINE 🔴")

        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

        if (shouldReconnect) startBot()
      }
    })

    const welcomedUsers = new Set()

    // ================= MESSAGES =================
    sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0]
      if (!msg || !msg.message) return
      if (msg.key.fromMe) return

      const from = msg.key.remoteJid
      web.addUser(from)
      web.addMessage()

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ""

      // ================= WELCOME =================
      if (!welcomedUsers.has(from)) {
        welcomedUsers.add(from)

        await sock.sendMessage(from, {
          image: {
            url: "https://drive.google.com/uc?export=download&id=1-ONk_ZlyFGy3ne7rmZJkwk-8pcwB9WMJ"
          },
          caption: `👋 HELLO!

🤖 I am *${botName}*

🎧 Music Download
🎵 TikTok Download
🌍 Translation
📝 Lyrics
⚡ Automation Tools

📋 Type *.menu* to start

🚀 Enjoy!
━━━━━━━━━━━━━━━`
        })
      }

      if (!body.startsWith(prefix)) return

      const args = body.slice(prefix.length).trim().split(" ")
      const command = args.shift().toLowerCase()

      // ================= COMMANDS =================
      switch (command) {
        case "menu":
          await sock.sendMessage(from, {
            text: `🤖 *${bot