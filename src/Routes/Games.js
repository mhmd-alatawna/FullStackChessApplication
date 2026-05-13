const Game = require("../Models/Game");

const express=require("express")
const authorize = require("../Middlewares/Auth");
const GamesDatabase = require("../Models/DatabaseManagers/GamesDatabase");
const GamesController = require("../Controllers/GamesController");
const router=express.Router()


const gamesDatabase = new GamesDatabase()
const gamesController = new GamesController(gamesDatabase)

// TODO : work on this from the beginning , it was developed only for idea but its not actually suitable for API calling for now
// 1. Submit request for a game (Matchmaking)
router.post('/new_game', authorize(['admin', 'manager', 'user']),async (req, res, next) => {
    try {
        const userId = req.userId;
        const duration = req.duration

        const pair = await gamesController.requestMatch(userId, duration);
        const newGameId = pair[0]
        const playerColor = pair[1]
        return res.status(200).json({
            gameId : newGameId,
            playerColor : playerColor
        });

    } catch (error) {
        next(error)
    }
});

// 2. Fetch game state
router.get('/game/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.userId;
        const { userRole } = req.userRole;

        const game = await gamesController.getGameState(gameId, userId, userRole);
        return res.status(200).json(game.toJSON());

    } catch (error) {
        next(error)
    }
});

// 3. Submit a move
router.post('/move/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.user;
        const { from, to } = req.body;

        const result = await gamesController.makeMove(gameId, userId, from, to);
        if (result === true)
            return res.status(200).json({success: true});

    } catch (error) {
        next(error)
    }
});

router.get("/legal_moves", authorize(['admin', 'manager', 'user']), async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.user;

        const moves = gamesController.getAllLegalMoves(gameId, userId);

        res.status(200).json({
            legal_moves: moves
        });
    }catch (err) {
        next(err)
    }
});
module.exports=router