const express = require('express');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = 3000;

// ================== WHATSAPP BOT ==================
const client = new Client();

client.on('qr', (qr) => {
    console.log('Scan QR code anba a 👇');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp konekte!');
});

client.on('message', (message) => {
    if (message.body.toLowerCase() === 'hi') {
        message.reply('Hello 👋 mwen la!');
    }
});

client.initialize();

// ================== WEB SERVER ==================
app.get('/', (req, res) => {
    res.send('🤖 Bot WhatsApp ap mache!');
});

app.get('/status', (req, res) => {
    res.json({ status: 'Bot ap mache' });
});

app.listen(PORT, () => {
    console.log(`🌐 Server ap mache sou http://localhost:${PORT}`);
});