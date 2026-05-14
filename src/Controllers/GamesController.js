const Game = require('../models/Game');
const {AppError} = require("../Middlewares/ErrorHandler");

// TODO : all functions are normal ones , not async ! fixed but maybe it should be normal ... ?

// TODO : validate userId in all functions , shouldn't we check
//  if the user is even in our database ? ==> move it to routes layer !

// TODO : handle race conditions !!

// TODO : just change the content of the AppError object to something more meaningful
class GamesController {
    constructor(gamesDatabase) {
        this.gamesDatabase = gamesDatabase;
    }


    // 1. Matchmaking logic
    async requestMatch(userId, duration) {
        if (userId === undefined || userId === null || isNaN(Number(userId))) {
            throw new AppError("A valid userId is required", 400, "VALIDATION_ERROR", { field: "userId", value: userId });
        }
        if (duration === undefined || duration === null || isNaN(Number(duration))) {
            throw new AppError("A valid duration is required", 400, "VALIDATION_ERROR", { field: "duration", value: duration });
        }
        if (duration < 0)
            throw new AppError( "Game duration must be a positive value",400, "VALIDATION_ERROR",{ field: "duration", value: duration }
            );
        const pendingGame = await this.gamesDatabase.getPendingGame(duration);

        if (pendingGame) {
            // Prevent self-matching
            if (pendingGame.white_player_id === userId) {
                const playerColor = pendingGame.getPlayerColor(userId)
                if (playerColor === null)
                    throw new AppError(
                        "Player is not part of this game",
                        403,
                        "UNAUTHORIZED_PLAYER",
                        { userId }
                    );
                return [pendingGame.getId(), playerColor];
            }

            pendingGame.black_player_id = userId;
            pendingGame.initializeBoard();
            pendingGame.status = 'active';

            const res = await this.gamesDatabase.saveAndRemovePendingGame(pendingGame.getId() , pendingGame);
            if (res === false)
                throw new AppError(
                    "Failed to save pending game",
                    500,
                    "DATABASE_ERROR",
                    {}
                );
            const playerColor = pendingGame.getPlayerColor(userId)
            if (playerColor === null)
                throw new AppError(
                    "Player is not part of this game",
                    403,
                    "UNAUTHORIZED_PLAYER",
                    { userId }
                );
            return [pendingGame.getId(), playerColor];
        }

        // Create new game
        const newGame = new Game(userId, null, duration, -1);

        const res = await this.gamesDatabase.setPendingGame(duration, newGame);

        if (res === false) {
            throw new AppError(
                "Failed to save pending game",
                500,
                "DATABASE_ERROR",
                {}
            );
        }

        const playerColor = newGame.getPlayerColor(userId)
        if (playerColor === null)
            throw new AppError(
                "Player is not part of this game",
                403,
                "UNAUTHORIZED_PLAYER",
                { userId }
            );

        return [newGame.getId(), playerColor];
    }

    // 2. Fetch state logic
    // NOTW THAT THIS FUNCTION IGNORES PENDING GAMES , THE LOGIC IS IMPLEMENTED IN THE DB , HOWEVER WE RETURN THE GAME ITSELF !
    async getGameState(gameId, userId, userRole) {
        if (gameId === undefined || gameId === null || isNaN(Number(gameId))) {
            throw new AppError("A valid gameId is required", 400, "VALIDATION_ERROR", { field: "gameId", value: gameId });
        }
        const game = await this.gamesDatabase.getGame(gameId);
        if (!game)
            throw new AppError(
                "Game not found",
                404,
                "GAME_NOT_FOUND",
                { gameId }
            );

        if (userRole !== 'admin' && game.white_player_id !== userId && game.black_player_id !== userId) {
            throw new AppError(
                "You do not have permission to access this game",
                403,
                "FORBIDDEN",
                { gameId, userId }
            );
        }

        return game;
    }

    // 3. Move logic
    async makeMove(gameId, userId, from, to) {
        if (gameId === undefined || gameId === null || isNaN(Number(gameId))) {
            throw new AppError("A valid gameId is required", 400, "VALIDATION_ERROR", { field: "gameId", value: gameId });
        }
        if (userId === undefined || userId === null || isNaN(Number(userId))) {
            throw new AppError("A valid userId is required", 400, "VALIDATION_ERROR", { field: "userId", value: userId });
        }
        if (!from || !to) {
            throw new AppError("Both 'from' and 'to' positions are required", 400, "VALIDATION_ERROR", { required: ["from", "to"] });
        }

        // 1. Consistency check: Ensure IDs are handled as numbers if nextId is numeric
        const parsedGameId = Number(gameId);

        if (await this.gamesDatabase.isGamePending(parsedGameId))
            throw new AppError(
                "Game is still pending and cannot accept moves yet",
                400,
                "GAME_PENDING",
                { gameId: parsedGameId }
            );

        const game = await this.gamesDatabase.getGame(parsedGameId);
        if (!game)
            throw new AppError(
                "Game not found",
                404,
                "GAME_NOT_FOUND",
                { gameId }
            );

        // 2. State Validation
        if (game.status !== 'active')
            throw new AppError(
                "Game is not active",
                400,
                "GAME_NOT_ACTIVE",
                { gameId: parsedGameId, status: game.status }
            );

        // 3. Authorization & Turn Validation
        let userColor;
        if (game.white_player_id === userId)
            userColor = 'white';
        else if (game.black_player_id === userId)
            userColor = 'black';
        else
            throw new AppError(
                "Player is not part of this game",
                403,
                "UNAUTHORIZED_PLAYER",
                { userId }
            );

        if (game.current_turn !== userColor)
            throw new AppError(
                "It is not your turn",
                400,
                "NOT_YOUR_TURN",
                { gameId: parsedGameId, currentTurn: game.current_turn, userColor }
            );

        const legalMoves = game.getAllLegalMoves();
        const isLegal = legalMoves.some(m => m.from === from && m.to === to);
        if (!isLegal)
            throw new AppError(
                "Illegal move",
                400,
                "ILLEGAL_MOVE",
                { from, to }
            );

        // 5. Execution
        // applyMove should now also handle checking for Checkmate/Stalemate internally
        game.applyMove(from, to);

        // 6. Persistence
        const res = await this.gamesDatabase.updateGame(parsedGameId, game);
        if (!res) {
            throw new AppError(
                "Failed to update game after move",
                500,
                "DATABASE_ERROR",
                { gameId: parsedGameId }
            );
        }

        return {success: true , gameStatus: game.status , gameWinner: game.winner , whitePlayerId: game.white_player_id , blackPlayerId: game.black_player_id};
    }

    async getAllLegalMoves(gameId, userId) {
        if (gameId === undefined || gameId === null || isNaN(Number(gameId))) {
            throw new AppError("A valid gameId is required", 400, "VALIDATION_ERROR", { field: "gameId", value: gameId });
        }
        if (userId === undefined || userId === null || isNaN(Number(userId))) {
            throw new AppError("A valid userId is required", 400, "VALIDATION_ERROR", { field: "userId", value: userId });
        }

        if (await this.gamesDatabase.isGamePending(gameId)) {
            throw new AppError(
                "Game is still pending and legal moves are not available yet",
                400,
                "GAME_PENDING",
                { gameId }
            );
        }

        const game = await this.gamesDatabase.getGame(gameId);

        if (!game) {
            throw new AppError(
                "Game not found",
                404,
                "GAME_NOT_FOUND",
                { gameId }
            );
        }

        if (game.status !== 'active') {
            throw new AppError(
                "Game is not active",
                400,
                "GAME_NOT_ACTIVE",
                { gameId, status: game.status }
            );
        }

        let userColor;

        if (game.white_player_id === userId) {
            userColor = 'white';
        }
        else if (game.black_player_id === userId) {
            userColor = 'black';
        }
        else {
            throw new AppError(
                "User is not a player in this game",
                403,
                "UNAUTHORIZED_PLAYER",
                { gameId, userId }
            );
        }

        if (game.current_turn !== userColor) {
            throw new AppError(
                "It is not your turn",
                400,
                "NOT_YOUR_TURN",
                {
                    gameId,
                    currentTurn: game.current_turn,
                    userColor
                }
            );
        }
        return game.getAllLegalMoves();
    }

    async getAllGames() {
        return await this.gamesDatabase.getAllGames();
    }

    async deleteGame(gameId) {
        if (gameId === undefined || gameId === null || isNaN(Number(gameId))) {
            throw new AppError("A valid gameId is required", 400, "VALIDATION_ERROR", { field: "gameId", value: gameId });
        }
        const res = await this.gamesDatabase.deleteGame(gameId);
        if (!res) {
            throw new AppError(
                "Game not found",
                404,
                "GAME_NOT_FOUND",
                { gameId }
            );
        }
        return true;
    }
}

module.exports = GamesController;