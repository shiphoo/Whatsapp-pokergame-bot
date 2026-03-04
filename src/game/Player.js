class Player {
	constructor(id, name) {
		this.id = id;
		this.name = name;
		this.balance = 50;
		this.hand = [];
		this.currentBet = 0;
		this.folded = false;
		this.allIn = false;
	}

	resetForRound() {
		this.hand = [];
		this.folded = false;
		this.allIn = false;
		this.currentBet = 0;
	}
}

module.exports = Player;
