require("dotenv").config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const P = require("pino")
const web = require("./server") // 🌐 DASHBOARD

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
    web.setCode(code)
  }

  sock.ev.on("creds.update", saveCreds)

  // 🔄 CONNECTION STATUS
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

  // ================= MESSAGES =================
  const welcomedUsers = new Set()

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid

    web.addUser(from)
    web.addMessage()

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    // 👋 WELCOME WITH IMAGE (PRO)
    if (!welcomedUsers.has(from)) {
      welcomedUsers.add(from)

      await sock.sendMessage(from, {
        image: {
          url: "https://drive.google.com/uc?export=download&id=1-ONk_ZlyFGy3ne7rmZJkwk-8pcwB9WMJ"
        },
        caption: `👋 HELLO!

🤖 I am *${botName}*

📌 I help with downloads, tools & automation

🎧 Music download
🎵 TikTok download
🌍 Translation
📝 Lyrics
⚡ Automation tools

👥 COMMUNITY:

📢 Group:
https://chat.whatsapp.com/LdT5MwR8Vhm7bMlQ3I05YF?mode=gi_t

📺 Channel:
https://whatsapp.com/channel/0029VbCqMJyCHDyeLQvGQR2k

📋 Type *.menu* to start

🚀 Enjoy using *${botName}*

━━━━━━━━━━━━━━━
⚙️ Made in *TOPFEROS TECH*
━━━━━━━━━━━━━━━`
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
.play <song>
.tiktok <link>

📝 TEXT
.lyrics <song>
.trad <lang> <text>

👥 COMMUNITY
.group
.channel

🔗 LINKS:
📢 https://chat.whatsapp.com/LdT5MwR8Vhm7bMlQ3I05YF?mode=gi_t
📺 https://whatsapp.com/channel/0029VbCqMJyCHDyeLQvGQR2k

💡 Powered by AMASHIA 🚀
⚙️ Made in *AMASHIA TECH*`
      })
    }

    if (command === "play") {
      const query = args.join(" ")
      await sock.sendMessage(from, {
        text: `🎧 Searching: ${query}`
      })
    }

    if (command === "tiktok") {
      const link = args[0]
      await sock.sendMessage(from, {
        text: `📥 Processing TikTok:\n${link}`
      })
    }

    if (command === "lyrics") {
      const song = args.join(" ")
      await sock.sendMessage(from, {
        text: `📝 Searching lyrics:\n${song}`
      })
    }

    if (command === "trad") {
      const lang = args[0]
      const text = args.slice(1).join(" ")
      await sock.sendMessage(from, {
        text: `🌍 Translate to ${lang}:\n${text}`
      })
    }

    if (command === "group") {
      await sock.sendMessage(from, {
        text: `📢 Join Group:
https://chat.whatsapp.com/LdT5MwR8Vhm7bMlQ3I05YF?mode=gi_t`
      })
    }

    if (command === "channel") {
      await sock.sendMessage(from, {
        text: `📺 Join Channel:
https://whatsapp.com/channel/0029VbCqMJyCHDyeLQvGQR2k`
      })
    }
  })
}

// ================= RUN =================
startBot()