const express = require("express");
const path = require("path");
const QRCode = require("qrcode");

// Import your bot (bot.js is unchanged)
const whatsappClient = require("./bot");

const app = express();
const port = process.env.PORT || 3000;

// Serve static files (like index.html)
app.use(express.static(path.join(__dirname)));

// Store latest QR
let latestQR = null;

// Intercept QR events from bot
whatsappClient.on("qr", (qr) => {
	latestQR = qr;
	console.log("QR updated. Open the web page to scan.");
});

// Endpoint for QR
app.get("/qr", async (req, res) => {
	if (!latestQR) return res.send("No QR generated yet.");

	const qrDataUrl = await QRCode.toDataURL(latestQR);
	res.send(qrDataUrl);
});

// Root serves index.html
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
