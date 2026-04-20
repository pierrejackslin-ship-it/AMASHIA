const express = require("express")
const app = express()

app.use(express.json())

let pairingCode = "WAITING..."
let botStatus = "OFFLINE"
let totalMessages = 0
let totalUsers = new Set()

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "amashia"

// ================= HOME LOGIN =================
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:#111;color:white;text-align:center;padding:50px;font-family:Arial">
    <h2>🔐 AMASHIA BOT LOGIN</h2>

    <input id="pass" type="password" placeholder="Enter password"/>
    <br><br>

    <button onclick="login()">Login</button>

    <script>
      function login(){
        const pass = document.getElementById("pass").value
        window.location.href = "/dashboard?pass=" + pass
      }
    </script>
  </body>
  </html>
  `)
})

// ================= AUTH CHECK =================
function checkAuth(req, res, next) {
  const pass = req.query.pass
  if (pass !== ADMIN_PASSWORD) {
    return res.send("❌ Unauthorized Access")
  }
  next()
}

// ================= DASHBOARD =================
app.get("/dashboard", checkAuth, (req, res) => {
  res.send(`
  <html>
  <head>
    <title>AMASHIA DASHBOARD</title>

    <script>
      async function loadData(){
        const res = await fetch('/api?pass=${ADMIN_PASSWORD}')
        const data = await res.json()

        document.getElementById("status").innerText = data.status
        document.getElementById("code").innerText = data.code
        document.getElementById("msg").innerText = data.messages
        document.getElementById("users").innerText = data.users
      }

      setInterval(loadData, 2000)

      function copyCode(){
        navigator.clipboard.writeText(document.getElementById("code").innerText)
        alert("Copied!")
      }

      async function restartBot(){
        await fetch('/restart?pass=${ADMIN_PASSWORD}')
        alert("Bot restarting...")
      }
    </script>
  </head>

  <body style="background:#0d0d0d;color:white;text-align:center;padding:40px;font-family:Arial">

    <h1 style="color:#00ff99">🤖 AMASHIA MD BOT</h1>

    <p>Status: <b id="status">...</b></p>

    <h2>🔑 Pairing Code</h2>
    <h1 id="code">WAITING...</h1>
    <button onclick="copyCode()">Copy Code</button>

    <hr>

    <h3>📊 Stats</h3>
    <p>Messages: <b id="msg">0</b></p>
    <p>Users: <b id="users">0</b></p>

    <hr>

    <button onclick="restartBot()">Restart Bot</button>

  </body>
  </html>
  `)
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

// ================= RESTART BOT =================
app.get("/restart", checkAuth, (req, res) => {
  res.send("Restarting...")
  process.exit()
})

// ================= EXPORT FUNCTIONS =================
module.exports = {
  setCode: (c) => (pairingCode = c),
  setStatus: (s) => (botStatus = s),
  addUser: (u) => totalUsers.add(u),
  addMessage: () => totalMessages++
}

// ================= START SERVER =================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("🌐 Dashboard running on port", PORT)
})