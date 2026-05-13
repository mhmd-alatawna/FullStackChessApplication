const Game = require('../models/Game');
const {AppError} = require("../Middlewares/ErrorHandler");

// TODO : all functions are normal ones , not async !
class GamesController {
    constructor(gamesDatabase) {
        this.gamesDatabase = gamesDatabase;
        this.nextId = 1;
    }


    // 1. Matchmaking logic
    // TODO : no proper error management (we should throw AppError objects ...)
    requestMatch(userId, duration) {
        const pendingGame = this.gamesDatabase.getPendingGame(duration);

        if (pendingGame) {
            // Prevent self-matching
            if (pendingGame.white_player_id === userId) {
                return pendingGame.getId()
            }

            pendingGame.black_player_id = userId;
            pendingGame.initializeBoard();
            pendingGame.status = 'active';

            this.gamesDatabase.saveGame(pendingGame);
            this.gamesDatabase.removePendingGame(pendingGame.getId());
            return pendingGame.getId();
        }

        // Create new game
        const newGame = new Game(userId, null, duration, this.nextId);
        this.nextId = this.nextId + 1;

        this.gamesDatabase.setPendingGame(duration, newGame);

        const playerColor = newGame.getPlayerColor(userId)
        if (playerColor === null)
            throw new AppError("...")

        return [newGame.getId(), playerColor];
    }

    // 2. Fetch state logic
    // TODO : no proper error management (we should throw AppError objects ...)
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
    // TODO : no proper error management (we should throw AppError objects ...)
    makeMove(gameId, userId, from, to) {
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

        const legalMoves = game.getAllLegalMoves();
        const isLegal = legalMoves.some(m => m.from === from && m.to === to);
        if (!isLegal)
            throw new AppError("ILLEGAL_MOVE");

        game.applyMove(from, to);

        if (game.status === 'finished') {
            // TODO : update users statistics !
        }

        const res = this.gamesDatabase.updateGame(gameId, game);
        if (!res){
            throw new AppError("FAILED TO UPDATE GAME AFTER PLAYING MOVE")
        }
        return true;
    }

    // TODO : no proper error management (we should throw AppError objects ...)
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