const express=require("express")
const authorize = require("../Middlewares/Auth");
const GamesDatabase = require("../Models/DatabaseManagers/GamesDatabase");
const GamesController = require("../Controllers/GamesController");
const usersController = require("../Controllers/UsersController");
const router=express.Router()


const gamesDatabase = new GamesDatabase()
const gamesController = new GamesController(gamesDatabase)

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
// TODO : update users statistics on game finished !
router.post('/move/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.user;
        const { from, to } = req.body;

        const result = await gamesController.makeMove(gameId, userId, from, to);

        try {
            const {success, gameStatus, gameWinner, whitePlayerId, blackPlayerId} = result;
            if (success === true)
                if (gameStatus === "finished") {
                    const whiteRes = "win"
                    const blackRes = "loss"
                    if (gameWinner === "black") {
                        whiteRes === "loss"
                        blackRes === "win"
                    } else if (gameWinner === "draw") {
                        whiteRes === "draw"
                        blackRes === "draw"
                    }

                    usersController.updateUserGameStats(whitePlayerId, whiteRes)
                    usersController.updateUserGameStats(blackPlayerId, blackRes)
                }
            return res.status(200).json({success: true});
        }catch (e){
            throw new AppError("....")
        }

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