const express=require("express")
const authorize = require("../Middlewares/Auth");
const GamesController = require("../Controllers/GamesController");
const UsersController = require("../Controllers/UsersController");
const ControllersManager = require("../Controllers/ControllersManager");

// TODO : userId validation is ignored at all levels !!
module.exports= (controllersManager) => {
    const router=express.Router()

    let gamesController = controllersManager.getGamesController()
    let usersController = controllersManager.getUsersController()

    // 1. Submit request for a game (Matchmaking)
    router.post('/new_game', authorize(['admin', 'manager', 'user']),async (req, res, next) => {
        try {
            const userId = Number(req.body.userId);
            const duration = Number(req.body.duration);

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
            const gameId = Number(req.params.gameId);
            const userId = Number(req.get("userId"));
            const userRole = req.get("userRole");

            const game = await gamesController.getGameState(gameId, userId, userRole);
            return res.status(200).json(game.toJSON());

        } catch (error) {
            next(error)
        }
    });

// 3. Submit a move
// TODO : update users statistics on game finished !
    router.put('/move/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
        try {
            const gameId = Number(req.params.gameId);
            const userId = Number(req.get("userId"));
            const { from, to } = req.body;

            const result = await controllersManager.performGameMoveAndUpdateUsers(gameId, userId, from, to);
            if (result)
                return res.status(200).json({success: true});
            throw new Error("failed to perform move")
        } catch (error) {
            next(error)
        }
    });

    router.get("/legal_moves/:gameId", authorize(['admin', 'manager', 'user']), async (req, res, next) => {
        try {
            const gameId = Number(req.params.gameId);
            const userId = Number(req.get("userId"));

            const moves = await gamesController.getAllLegalMoves(gameId, userId);

            res.status(200).json({
                legal_moves: moves
            });
        }catch (err) {
            next(err)
        }
    });

    return router
}