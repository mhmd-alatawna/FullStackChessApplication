const express=require("express")
const authorize = require("../Middlewares/Auth");
const GamesController = require("../Controllers/GamesController");
const UsersController = require("../Controllers/UsersController");
const ControllersManager = require("../Controllers/ControllersManager");

const { AppError } = require("../Middlewares/ErrorHandler");
// TODO : when receiving userId we ignore the need for checking if it exists in the usersDB first !
module.exports= (controllersManager) => {
    const router=express.Router()

    let gamesController = controllersManager.getGamesController()
    let usersController = controllersManager.getUsersController()

    // 1. Submit request for a game (Matchmaking)
    router.post('/new_game', authorize(['admin', 'manager', 'user']),async (req, res, next) => {
        try {
            const { userId, duration } = req.body || {};
            if (userId === undefined || duration === undefined) {
                throw new AppError("userId and duration are required", 400, "VALIDATION_ERROR", { required: ["userId", "duration"] });
            }

            const parsedUserId = Number(userId);
            const parsedDuration = Number(duration);

            if (isNaN(parsedUserId) || isNaN(parsedDuration)) {
                throw new AppError("userId and duration must be valid numbers", 400, "VALIDATION_ERROR", { userId, duration });
            }

            const pair = await gamesController.requestMatch(parsedUserId, parsedDuration);
            const newGameId = pair[0]
            const playerColor = pair[1]

            return res.status(201).json({
                success: true,
                data: {
                    gameId : newGameId,
                    playerColor : playerColor
                },
                error: null
            });
        } catch (error) {
            next(error)
        }
    });

    // 2. Fetch game state
    router.get('/game/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
        try {
            if (!req.params.gameId || isNaN(Number(req.params.gameId))) {
                throw new AppError("A valid gameId is required", 400, "VALIDATION_ERROR", { field: "gameId", value: req.params.gameId });
            }
            const gameId = Number(req.params.gameId);
            const userId = Number(req.get("userId"));
            const userRole = req.get("userRole");


            const game = await gamesController.getGameState(gameId, userId, userRole);
            return res.status(200).json({
                success: true,
                data: game.toJSON(),
                error: null
            });

        } catch (error) {
            next(error)
        }
    });

    // 3. Submit a move
    // TODO : update users statistics on game finished !
    router.put('/move/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
        try {
            if (!req.params.gameId || isNaN(Number(req.params.gameId))) {
                throw new AppError("A valid gameId is required", 400, "VALIDATION_ERROR", { field: "gameId", value: req.params.gameId });
            }
            const gameId = Number(req.params.gameId);
            const userId = Number(req.get("userId"));
            const { from, to } = req.body || {};

            if (!from || !to) {
                throw new AppError("Both 'from' and 'to' positions are required", 400, "VALIDATION_ERROR", { required: ["from", "to"] });
            }

            const result = await controllersManager.performGameMoveAndUpdateUsers(gameId, userId, from, to);
            if (result)
                return res.status(200).json({
                    success: true,
                    data: { success: true },
                    error: null
                });
            throw new AppError("Failed to perform move", 500, "INTERNAL_ERROR");
        } catch (error) {
            next(error)
        }
    });

    router.get("/legal_moves/:gameId", authorize(['admin', 'manager', 'user']), async (req, res, next) => {
        try {
            if (!req.params.gameId || isNaN(Number(req.params.gameId))) {
                throw new AppError("A valid gameId is required", 400, "VALIDATION_ERROR", { field: "gameId", value: req.params.gameId });
            }
            const gameId = Number(req.params.gameId);
            const userId = Number(req.get("userId"));

            const moves = await gamesController.getAllLegalMoves(gameId, userId);

            res.status(200).json({
                success: true,
                data: {
                    legal_moves: moves
                },
                error: null
            });
        }catch (err) {
            next(err)
        }
    });
    
    // ⚠️ ADDED FOR ASSIGNMENT 3: returns only the games the logged-in user participated in
    // Accessible by all roles — uses x-user-id header to identify the caller
    // NOTE: must be registered BEFORE '/' and '/game/:gameId' to avoid Express mis-routing
    router.get('/my_games', authorize(['admin', 'manager', 'user']), async (req, res, next) => { // ⚠️ ADDED FOR ASSIGNMENT 3
        try {
            const userId = Number(req.headers['x-user-id']);
            if (!userId || isNaN(userId)) {
                throw new AppError("x-user-id header is required", 400, "VALIDATION_ERROR", { header: "x-user-id" });
            }
            const allGames = await gamesController.getAllGames();
            const myGames = allGames
                .filter(g => g.white_player_id === userId || g.black_player_id === userId)
                .map(g => g.toJSON());
            return res.status(200).json({ success: true, data: myGames, error: null });
        } catch (error) {
            next(error);
        }
    });

    // 5. Get all games (admin/manager only)
    router.get('/', authorize(['admin', 'manager']), async (req, res, next) => {
        try {
            const games = await gamesController.getAllGames();
            return res.status(200).json({
                success: true,
                data: { gamesList : games.map(g => g.toJSON()) },
                error: null
            });
        } catch (error) {
            next(error)
        }
    });

    // 6. Delete a game
    router.delete('/game/:id', authorize(['admin']), async (req, res, next) => {
        try {
            if (!req.params.id || isNaN(Number(req.params.id))) {
                throw new AppError("A valid game id is required", 400, "VALIDATION_ERROR", { field: "id", value: req.params.id });
            }
            const gameId = Number(req.params.id);
            await gamesController.deleteGame(gameId);
            return res.status(200).json({
                success: true,
                data: { success: true },
                error: null
            });
        } catch (error) {
            next(error)
        }
    });

    return router
}