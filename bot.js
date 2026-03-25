const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;

app.use(express.json());

// Generate QR code and provide it as an image
app.get('/api/qr', async (req, res) => {
    try {
        const qrData = 'Your data to encode'; // replace with your data
        const qrImage = await QRCode.toDataURL(qrData);
        res.json({ qrImage });
    } catch (err) {
        res.status(500).send('Error generating QR code');
    }
});

// Provide the status
app.get('/api/status', (req, res) => {
    res.json({ status: 'Server is running', availableCommands: ['start', 'stop'] });
});

// Connection handling
app.listen(PORT, () => {
    console.log(`Web interface is available at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    process.exit();
});
