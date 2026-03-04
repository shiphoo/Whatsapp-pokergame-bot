class Deck {
	constructor() {
		this.cards = [];
		this.reset();
	}

	reset() {
		const suits = ["♠", "♥", "♦", "♣"];
		const ranks = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
		this.cards = [];
		for (let suit of suits) {
			for (let rank of ranks) {
				this.cards.push({ suit, rank });
			}
		}
		this.shuffle();
	}

	shuffle() {
		for (let i = this.cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
		}
	}

	deal() {
		return this.cards.pop();
	}
}

module.exports = Deck;
