const Game = require("../Models/Game");

const express=require("express")
const router=express.Router()

let testGame = new Game("white_player", "black_player", "10:00");

router.get("/", (req, res) => {
    res.status(200).json(testGame.toJSON());
});

router.get("/legal_moves", (req, res) => {
    const moves = testGame.getAllLegalMoves();

    res.status(200).json({
        current_turn: testGame.current_turn,
        legal_moves: moves
    });
});

// POST a new move
router.post('/move', (req, res) => {
    const { from, to } = req.body;
    testGame.applyMove(from, to);

    res.json({ message: "Move applied", state: testGame.toJSON() });
});

module.exports=router