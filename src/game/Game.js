// Game.js
const Deck = require("./Deck");
const calculateScore = require("./Scoring");

class Game {
	constructor(groupId) {
		this.groupId = groupId;
		this.players = [];
		this.deck = new Deck();
		this.pot = 0;
		this.currentBet = 0;
		this.lastBet = 1;
		this.starterIndex = 0;
		this.turnIndex = 0;
		this.status = "waiting";
		this.stopVotes = new Set();
	}

	addPlayer(player) {
		if (this.status !== "waiting") return false;
		if (this.players.find((p) => p.id === player.id)) return false;
		this.players.push(player);
		return true;
	}

	removePlayer(playerId) {
		const index = this.players.findIndex((p) => p.id === playerId);
		if (index === -1) return null;
		return this.players.splice(index, 1)[0];
	}

	getCurrentPlayer() {
		return this.players[this.turnIndex];
	}

	getPreviousActivePlayer() {
		let index = this.turnIndex;
		do {
			index = (index - 1 + this.players.length) % this.players.length;
		} while (this.players[index].folded);
		return this.players[index];
	}

	nextTurn() {
		do {
			this.turnIndex = (this.turnIndex + 1) % this.players.length;
		} while (this.players[this.turnIndex].folded);
		return this.getCurrentPlayer();
	}

	rotateStarter() {
		this.starterIndex = (this.starterIndex + 1) % this.players.length;
	}

	activePlayers() {
		return this.players.filter((p) => !p.folded);
	}

	startRound() {
		if (this.players.length < 2) return false;

		this.status = "playing";
		this.pot = 0;
		this.currentBet = 1;
		this.lastBet = 1;
		this.deck.reset();
		this.stopVotes.clear();

		this.players.forEach((p) => {
			p.resetForRound();
			p.balance -= 1;
			p.currentBet = 1;
			this.pot += 1;
		});

		this.players.forEach((p) => {
			p.hand.push(this.deck.deal());
			p.hand.push(this.deck.deal());
			p.hand.push(this.deck.deal());
		});

		this.turnIndex = this.starterIndex;
		return true;
	}

	startNextRound() {
		this.players = this.players.filter((p) => p.balance > 0);
		if (this.players.length < 2) {
			this.status = "finished";
			return false;
		}

		this.rotateStarter();
		return this.startRound();
	}

	betCurrentPlayer(amount) {
		const player = this.getCurrentPlayer();
		const required = this.currentBet - player.currentBet;

		if (player.balance < this.lastBet)
			return "Not enough balance to match the last bet.";

		if (amount < this.lastBet) return `Minimum bet is ${this.lastBet}$`;

		if (amount < required)
			return `You must bet at least ${required}$ to match.`;

		if (amount > this.pot)
			return `You cannot bet more than the current pot (${this.pot}$).`;

		if (amount > player.balance) return "Insufficient balance.";

		player.balance -= amount;
		player.currentBet += amount;
		this.pot += amount;

		if (player.currentBet > this.currentBet)
			this.currentBet = player.currentBet;

		this.lastBet = amount;

		let message = `💰 ${player.name} bet ${amount}$\n`;
		message += `Pot is now: ${this.pot}$\n\nBalances:\n`;
		this.players.forEach((p) => {
			message += `${p.name}: ${p.balance}$${p.folded ? " (folded)" : ""}\n`;
		});

		const endCheck = this.checkImmediateWin();
		if (endCheck) return message + "\n" + endCheck;

		const nextPlayer = this.nextTurn();
		message += `\n➡️ Next turn: ${nextPlayer.name}`;

		return message;
	}

	checkCurrentPlayer() {
		const player = this.getCurrentPlayer();
		const previous = this.getPreviousActivePlayer();

		if (player.balance < this.lastBet)
			return "Not enough balance to match the last bet.";

		player.balance -= this.lastBet;
		player.currentBet += this.lastBet;
		this.pot += this.lastBet;

		const playerScore = calculateScore(player.hand);
		const prevScore = calculateScore(previous.hand);

		let message = `⚔️ ${player.name} checked against ${previous.name}\n`;

		if (playerScore <= prevScore) {
			player.folded = true;
			message += `${player.name} lost and folded.\n`;
		} else {
			previous.folded = true;
			message += `${previous.name} lost and folded.\n`;
		}

		message += `\nPot: ${this.pot}$\n\nBalances:\n`;
		this.players.forEach((p) => {
			message += `${p.name}: ${p.balance}$${p.folded ? " (folded)" : ""}\n`;
		});

		const endCheck = this.checkImmediateWin();
		if (endCheck) return message + "\n" + endCheck;

		const nextPlayer = this.nextTurn();
		message += `\n➡️ Next turn: ${nextPlayer.name}`;

		return message;
	}

	foldCurrentPlayer() {
		const player = this.getCurrentPlayer();
		player.folded = true;

		const endCheck = this.checkImmediateWin();
		if (endCheck) return `${player.name} folded\n` + endCheck;

		const nextPlayer = this.nextTurn();
		return `${player.name} folded\n➡️ Next turn: ${nextPlayer.name}`;
	}

	openCardsForced(player) {
		if (player.balance < this.lastBet)
			return "Not enough balance to match the last bet.";

		const amount = Math.min(this.lastBet, player.balance, this.pot);
		player.balance -= amount;
		player.currentBet += amount;
		this.pot += amount;

		return this.revealCards();
	}

	revealCards() {
		const active = this.activePlayers();
		if (active.length !== 2)
			return "Open allowed only with 2 players remaining.";

		const [p1, p2] = active;
		const score1 = calculateScore(p1.hand);
		const score2 = calculateScore(p2.hand);

		let message = `${p1.name} score: ${score1}\n${p2.name} score: ${score2}\n`;

		if (score1 > score2) {
			p1.balance += this.pot;
			message += `${p1.name} wins the pot of ${this.pot}$!`;
		} else if (score2 > score1) {
			p2.balance += this.pot;
			message += `${p2.name} wins the pot of ${this.pot}$!`;
		} else {
			const split = Math.floor(this.pot / 2);
			p1.balance += split;
			p2.balance += split;
			message += "Tie! Pot split.";
		}

		this.pot = 0;
		this.status = "finished";
		return message;
	}

	checkImmediateWin() {
		const active = this.activePlayers();
		if (active.length === 1) {
			const winner = active[0];
			winner.balance += this.pot;
			const msg = `${winner.name} wins the pot of ${this.pot}$ by default!`;
			this.pot = 0;
			this.status = "finished";
			return msg;
		}
		return null;
	}

	voteStop(playerId) {
		if (this.status === "waiting") return { message: "Game is not running." };

		if (this.stopVotes.has(playerId))
			return { message: "You already voted to stop the game." };

		this.stopVotes.add(playerId);

		const totalPlayers = this.players.length;
		const votes = this.stopVotes.size;
		const requiredVotes =
			Math.floor(totalPlayers / 2) + (totalPlayers % 2 ? 1 : 0);

		if (votes >= requiredVotes) return { message: this.endGameByVote() };

		return {
			message: `Stop vote registered (${votes}/${requiredVotes} needed).`,
		};
	}

	endGameByVote() {
		let winner = this.players[0];
		for (const player of this.players)
			if (player.balance > winner.balance) winner = player;

		const message = `Game stopped by vote!\n🏆 Winner: ${winner.name} with ${winner.balance}$`;

		this.resetGame(true);

		return message;
	}

	resetGame(clearPlayers = false) {
		this.pot = 0;
		this.currentBet = 0;
		this.lastBet = 1;
		this.turnIndex = 0;
		this.starterIndex = 0;
		this.status = "waiting";
		this.stopVotes.clear();

		this.players.forEach((p) => {
			p.hand = [];
			p.folded = false;
			p.currentBet = 0;
		});

		if (clearPlayers) this.players = [];
	}

	handleCommand(playerId, input) {
		const player = this.players.find((p) => p.id === playerId);
		if (!player) return "Player not in game";

		const cmd = input.split(" ")[0];

		if (this.status !== "playing" && cmd !== "/balance")
			return "Round not active";

		if (
			player !== this.getCurrentPlayer() &&
			["/bet", "/fold", "/open", "/check"].includes(cmd)
		)
			return "Not your turn";

		switch (cmd) {
			case "/bet": {
				const amount = parseInt(input.split(" ")[1], 10);
				if (!amount || amount <= 0) return "Invalid bet.";
				return this.betCurrentPlayer(amount);
			}
			case "/check":
				return this.checkCurrentPlayer();
			case "/fold":
				return this.foldCurrentPlayer();
			case "/open":
				return this.openCardsForced(player);
			case "/balance":
				return `${player.name} balance: ${player.balance}$`;
			default:
				return "Unknown command.";
		}
	}
}

module.exports = Game;
