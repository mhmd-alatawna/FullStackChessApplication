const Game = require('../models/Game');
const {AppError} = require("../Middlewares/ErrorHandler");

// TODO : all functions are normal ones , not async !

// TODO : validate userId in all functions , shouldn't we check
//  if the user is even in our database ? ==> move it to routes layer !

// TODO : handle race conditions !!

// TODO : just change the content of the AppError object to something more meaningful
class GamesController {
    constructor(gamesDatabase) {
        this.gamesDatabase = gamesDatabase;
    }


    // 1. Matchmaking logic
    requestMatch(userId, duration) {
        if (duration < 0)
            throw new AppError("...")
        const pendingGame = this.gamesDatabase.getPendingGame(duration);

        if (pendingGame) {
            // Prevent self-matching
            if (pendingGame.white_player_id === userId) {
                const playerColor = pendingGame.getPlayerColor(userId)
                if (playerColor === null)
                    throw new AppError("...")
                return [pendingGame.getId(), playerColor];
            }

            pendingGame.black_player_id = userId;
            pendingGame.initializeBoard();
            pendingGame.status = 'active';

            const res = this.gamesDatabase.saveAndRemovePendingGame(pendingGame.getId() , pendingGame);
            if (res === false)
                throw new AppError("...")
            const playerColor = pendingGame.getPlayerColor(userId)
            if (playerColor === null)
                throw new AppError("...")
            return [pendingGame.getId(), playerColor];
        }

        // Create new game
        const newGame = new Game(userId, null, duration, -1);

        const res = this.gamesDatabase.setPendingGame(duration, newGame);
        if (res === false)
            throw new AppError("...")

        const playerColor = newGame.getPlayerColor(userId)
        if (playerColor === null)
            throw new AppError("...")

        return [newGame.getId(), playerColor];
    }

    // 2. Fetch state logic
    // NOTW THAT THIS FUNCTION IGNORES PENDING GAMES , THE LOGIC IS IMPLEMENTED IN THE DB , HOWEVER WE RETURN THE GAME ITSELF !
    getGameState(gameId, userId, userRole) {
        const game = this.gamesDatabase.getGame(gameId);
        if (!game)
            throw new AppError("GAME_NOT_FOUND");

        if (userRole !== 'admin' && game.white_player_id !== userId && game.black_player_id !== userId) {
            throw new AppError("UNAUTHORIZED");
        }

        return game;
    }

    // 3. Move logic
    makeMove(gameId, userId, from, to) {
        // 1. Consistency check: Ensure IDs are handled as numbers if nextId is numeric
        const parsedGameId = Number(gameId);

        if (this.gamesDatabase.isGamePending(parsedGameId))
            throw new AppError("GAME_PENDING", 400);

        const game = this.gamesDatabase.getGame(parsedGameId);
        if (!game)
            throw new AppError("GAME_NOT_FOUND", 404);

        // 2. State Validation
        if (game.status !== 'active')
            throw new AppError("GAME_NOT_ACTIVE", 400);

        // 3. Authorization & Turn Validation
        let userColor;
        if (game.white_player_id === userId)
            userColor = 'white';
        else if (game.black_player_id === userId)
            userColor = 'black';
        else
            throw new AppError("UNAUTHORIZED_PLAYER");

        if (game.current_turn !== userColor)
            throw new AppError("NOT_YOUR_TURN", 400);

        const legalMoves = game.getAllLegalMoves();
        const isLegal = legalMoves.some(m => m.from === from && m.to === to);
        if (!isLegal)
            throw new AppError("ILLEGAL_MOVE");

        // 5. Execution
        // applyMove should now also handle checking for Checkmate/Stalemate internally
        game.applyMove(from, to);

        // 6. Persistence
        const res = this.gamesDatabase.updateGame(parsedGameId, game);
        if (!res) {
            throw new AppError("FAILED_TO_UPDATE_GAME", 500);
        }

        return {success: true , gameStatus: game.status , gameWinner: game.winner , whitePlayerId: game.white_player_id , blackPlayerId: game.black_player_id};
    }

    getAllLegalMoves(gameId, userId) {
        if (this.gamesDatabase.isGamePending(gameId))
            throw new AppError("GAME_PENDING");

        const game = this.gamesDatabase.getGame(gameId);
        if(!game)
            throw new AppError("GAME_NOT_FOUND");
        if (game.status !== 'active')
            throw new AppError("GAME_NOT_ACTIVE");

        let userColor;
        if (game.white_player_id === userId)
            userColor = 'white';
        else if (game.black_player_id === userId)
            userColor = 'black';
        else
            throw new AppError("UNAUTHORIZED_PLAYER");

        if (game.current_turn !== userColor)
            throw new AppError("NOT_YOUR_TURN");

        return game.getAllLegalMoves();
    }
}

module.exports = GamesController;