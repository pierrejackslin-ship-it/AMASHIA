require("dotenv").config()

const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason 
} = require("@whiskeysockets/baileys")

const P = require("pino")
const axios = require("axios")

const prefix = process.env.BOT_PREFIX || "."
const botName = process.env.BOT_NAME || "AMASHIA MD BOT V.2"

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    process.env.SESSIONS_DIR || "sessions"
  )

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: "silent" })
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect) startBot()
    } else if (connection === "open") {
      console.log("✅ Connected:", botName)
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    if (!body.startsWith(prefix)) return

    const args = body.slice(prefix.length).trim().split(" ")
    const command = args.shift().toLowerCase()

    try {

      // 📋 MENU
      if (command === "menu") {
        await sock.sendMessage(from, {
          text: `🤖 ${botName}

Prefix: ${prefix}

Commands:
.menu
.play <song>
.tiktok <link>
.lyrics <song>
.trad <lang> <text>`
        })
      }

      // 🎧 PLAY
      if (command === "play") {
        const query = args.join(" ")
        const res = await axios.get(`https://api.lyrics.ovh/suggest/${query}`)
        const data = res.data.data[0]

        await sock.sendMessage(from, {
          text: `🎧 Title: ${data.title}
🎤 Artist: ${data.artist.name}
🔗 ${data.preview}`
        })
      }

      // 🎵 TIKTOK
      if (command === "tiktok") {
        const link = args[0]
        const res = await axios.get(`https://api.tiklydown.me/api/download?url=${link}`)
        const video = res.data.video.noWatermark

        await sock.sendMessage(from, {
          video: { url: video },
          caption: "🎵 TikTok Download"
        })
      }

      // 📝 LYRICS
      if (command === "lyrics") {
        const song = args.join(" ")
        const res = await axios.get(`https://api.lyrics.ovh/v1/${song}`)

        await sock.sendMessage(from, {
          text: res.data.lyrics || "No lyrics found"
        })
      }

      // 🌍 TRANSLATE
      if (command === "trad") {
        const lang = args[0]
        const text = args.slice(1).join(" ")

        const res = await axios.post("https://libretranslate.de/translate", {
          q: text,
          source: "auto",
          target: lang,
          format: "text"
        })

        await sock.sendMessage(from, {
          text: `🌍 Translated:\n${res.data.translatedText}`
        })
      }

    } catch (err) {
      console.log(err)
      await sock.sendMessage(from, {
        text: "❌ Error occurred"
      })
    }
  })
}

startBot()