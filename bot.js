require("dotenv").config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const P = require("pino")

// ================= CONFIG =================
const prefix = process.env.BOT_PREFIX || "."
const botName = process.env.BOT_NAME || "AMASHIA MD BOT V.2"
const number = process.env.PAIRING_NUMBER

// ================= START BOT =================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    process.env.SESSIONS_DIR || "sessions"
  )

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" })
  })

  // 🔑 PAIRING CODE
  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(number)
    console.log("🔑 PAIRING CODE:", code)
  }

  sock.ev.on("creds.update", saveCreds)

  // 🔄 CONNECTION HANDLER
  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log(`✅ Connected: ${botName}`)
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect) startBot()
    }
  })

  // ================= WELCOME SYSTEM =================
  const welcomedUsers = new Set()

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    // 👋 WELCOME MESSAGE (ONLY ONCE)
    if (!welcomedUsers.has(from)) {
      welcomedUsers.add(from)

      await sock.sendMessage(from, {
        text: `👋 HELLO!

🤖 I am *${botName}*

📌 I am an automated WhatsApp assistant designed to help you with:

🎧 Music downloads
🎵 TikTok downloads
🌍 Text translation
📝 Lyrics search
⚡ Smart automation features

👥 COMMUNITY LINKS:

📢 WhatsApp Group:
https://chat.whatsapp.com/LdT5MwR8Vhm7bMlQ3I05YF?mode=gi_t

📺 WhatsApp Channel:
https://whatsapp.com/channel/0029VbCqMJyCHDyeLQvGQR2k

📋 Type *.menu* to explore all commands

💡 Enjoy using *${botName}* 🚀`
      })
    }

    // ================= COMMAND SYSTEM =================
    if (!body.startsWith(prefix)) return

    const args = body.slice(prefix.length).trim().split(" ")
    const command = args.shift().toLowerCase()

    // 📋 MENU
    if (command === "menu") {
      await sock.sendMessage(from, {
        text: `🤖 *${botName}*

📋 COMMAND MENU:

🎧 MEDIA
.play <song> → Search music
.tiktok <link> → Download video

📝 TEXT
.lyrics <song> → Get lyrics
.trad <lang> <text> → Translate text

👥 COMMUNITY
.group → Join group
.channel → Join channel

🔗 LINKS:
📢 Group:
https://chat.whatsapp.com/LdT5MwR8Vhm7bMlQ3I05YF?mode=gi_t

📺 Channel:
https://whatsapp.com/channel/0029VbCqMJyCHDyeLQvGQR2k

💡 Powered by AMASHIA MD SYSTEM 🚀`
      })
    }

    // 🎧 PLAY
    if (command === "play") {
      const query = args.join(" ")
      await sock.sendMessage(from, {
        text: `🎧 Searching music for:
${query}`
      })
    }

    // 🎵 TIKTOK
    if (command === "tiktok") {
      const link = args[0]
      await sock.sendMessage(from, {
        text: `📥 Processing TikTok video:
${link}`
      })
    }

    // 🌍 TRANSLATE
    if (command === "trad") {
      const lang = args[0]
      const text = args.slice(1).join(" ")

      await sock.sendMessage(from, {
        text: `🌍 Translation request:
Language: ${lang}
Text: ${text}`
      })
    }

    // 📝 LYRICS
    if (command === "lyrics") {
      const song = args.join(" ")

      await sock.sendMessage(from, {
        text: `📝 Searching lyrics for:
${song}`
      })
    }

    // 👥 GROUP LINK
    if (command === "group") {
      await sock.sendMessage(from, {
        text: `📢 Join our WhatsApp Group:
https://chat.whatsapp.com/LdT5MwR8Vhm7bMlQ3I05YF?mode=gi_t`
      })
    }

    // 📺 CHANNEL LINK
    if (command === "channel") {
      await sock.sendMessage(from, {
        text: `📺 Subscribe to our Channel:
https://whatsapp.com/channel/0029VbCqMJyCHDyeLQvGQR2k`
      })
    }
  })
}

// ================= RUN BOT =================
startBot()