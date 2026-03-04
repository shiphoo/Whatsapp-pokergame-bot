const valueMap = {
	6: 6,
	7: 7,
	8: 8,
	9: 9,
	10: 10,
	J: 10,
	Q: 10,
	K: 10,
	A: 11,
};

function calculateScore(hand) {
	if (!hand || hand.length !== 3) {
		throw new Error("Hand must contain exactly 3 cards");
	}

	const values = hand.map((card) => valueMap[card.rank]);
	const suits = hand.map((card) => card.suit);
	const ranks = hand.map((card) => card.rank);

	const rankCounts = {};
	const suitGroups = {};
	let aceCount = 0;

	hand.forEach((card) => {
		rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
		suitGroups[card.suit] = suitGroups[card.suit] || [];
		suitGroups[card.suit].push(card);
		if (card.rank === "A") aceCount++;
	});

	const tripleRank = Object.entries(rankCounts).find(([r, c]) => c === 3);
	if (tripleRank) {
		return hand.reduce((sum, c) => sum + valueMap[c.rank], 0);
	}

	if (aceCount >= 2) {
		const acePoints = hand
			.filter((c) => c.rank === "A")
			.reduce((sum, c) => sum + valueMap[c.rank], 0);
		return acePoints;
	}

	const sameSuitGroup = Object.values(suitGroups).find(
		(group) => group.length > 1,
	);
	if (sameSuitGroup) {
		return sameSuitGroup.reduce((sum, c) => sum + valueMap[c.rank], 0);
	}

	return Math.max(...values);
}

module.exports = calculateScore;
