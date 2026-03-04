const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Game = require("./game/Game");
const Player = require("./game/Player");

const whatsappClient = new Client({
	authStrategy: new LocalAuth(),
});

whatsappClient.initialize();

whatsappClient.on("qr", (qr) => qrcode.generate(qr, { small: true }));
whatsappClient.on("ready", () => console.log("WhatsApp Client is ready!"));

const game = new Game("whatsapp-group");
const playersMap = {}; // senderId -> Player object

async function broadcastToGroup(chat, message) {
	await chat.sendMessage(message);
}

whatsappClient.on("message", async (msg) => {
	try {
		const chat = await msg.getChat();
		if (!chat.isGroup) return;

		let senderId = msg.from;
		if (msg.from.includes("@g.us")) {
			senderId = msg.author || msg.from;
		}

		const command = msg.body.trim();

		if (command.toLowerCase().startsWith("/join")) {
			if (playersMap[senderId]) {
				await broadcastToGroup(chat, "You already joined the game!");
				return;
			}
			const parts = command.split(" ");
			let nickname = parts.slice(1).join(" ").trim();
			if (!nickname) nickname = `Player-${senderId.slice(-4)}`;

			const player = new Player(senderId, nickname);
			playersMap[senderId] = player;
			game.addPlayer(player);

			await broadcastToGroup(chat, `${nickname} joined the game!`);
			return;
		}

		if (command === "/players") {
			if (game.players.length === 0) {
				await broadcastToGroup(chat, "No players in the game yet.");
				return;
			}

			let text = "Current players in the game:\n";
			game.players.forEach((p, index) => {
				text += `${index + 1}. ${p.name} - ${p.balance}$${p.folded ? " (folded)" : ""}\n`;
			});
			await broadcastToGroup(chat, text);
			return;
		}

		if (!playersMap[senderId]) {
			await whatsappClient.sendMessage(
				senderId,
				"You must join first using /join <nickname>",
			);
			return;
		}

		const player = playersMap[senderId];

		if (command === "/start") {
			if (game.status === "playing") {
				await broadcastToGroup(chat, "Game already started!");
				return;
			}
			if (game.players.length < 2) {
				await broadcastToGroup(chat, "Need at least 2 players to start!");
				return;
			}

			game.startRound();
			await broadcastToGroup(
				chat,
				`Game started! Starter: ${game.getCurrentPlayer().name}`,
			);

			for (const p of game.players) {
				const handText = p.hand.map((c) => c.rank + c.suit).join(", ");
				await whatsappClient.sendMessage(p.id, `Your hand: ${handText}`);
			}
			return;
		}

		if (command === "/stop") {
			const result = game.voteStop(senderId);
			await broadcastToGroup(chat, result.message);
			return;
		}

		if (command === "/leave") {
			const leavingPlayer = game.removePlayer(senderId);
			delete playersMap[senderId];

			if (leavingPlayer) {
				await broadcastToGroup(chat, `${leavingPlayer.name} left the game.`);
			}

			if (game.status === "finished") {
				if (game.startNextRound()) {
					await broadcastToGroup(
						chat,
						`New round started! Starter: ${game.getCurrentPlayer().name}`,
					);
					for (const p of game.players) {
						const handText = p.hand.map((c) => c.rank + c.suit).join(", ");
						await whatsappClient.sendMessage(
							p.id,
							`Your new hand: ${handText}`,
						);
					}
				} else {
					await broadcastToGroup(chat, "Game over!");
				}
			}
			return;
		}

		if (command === "/hand") {
			const hand = player.hand.map((c) => c.rank + c.suit).join(", ");
			await whatsappClient.sendMessage(senderId, `Your hand: ${hand}`);
			return;
		}

		if (command === "/balance") {
			await whatsappClient.sendMessage(
				senderId,
				`${player.name} balance: ${player.balance}$`,
			);
			return;
		}

		const response = game.handleCommand(senderId, command);

		if (
			["/bet", "/fold", "/check", "/open"].some((c) => command.startsWith(c))
		) {
			await broadcastToGroup(chat, response);
		}

		if (game.status === "finished") {
			if (game.startNextRound()) {
				await broadcastToGroup(
					chat,
					`New round started! Starter: ${game.getCurrentPlayer().name}`,
				);

				for (const p of game.players) {
					const handText = p.hand.map((c) => c.rank + c.suit).join(", ");
					await whatsappClient.sendMessage(p.id, `Your new hand: ${handText}`);
				}
			} else {
				await broadcastToGroup(chat, "Game over!");
			}
		}
	} catch (err) {
		console.error("Error handling message:", err);
	}
});

module.exports = whatsappClient;
