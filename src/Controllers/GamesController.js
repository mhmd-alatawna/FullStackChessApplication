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
        if (duration < 0)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
        const pendingGame = await this.gamesDatabase.getPendingGame(duration);

        if (pendingGame) {
            // Prevent self-matching
            if (pendingGame.white_player_id === userId) {
                const playerColor = pendingGame.getPlayerColor(userId)
                if (playerColor === null)
                    throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
                return [pendingGame.getId(), playerColor];
            }

            pendingGame.black_player_id = userId;
            pendingGame.initializeBoard();
            pendingGame.status = 'active';

            const res = await this.gamesDatabase.saveAndRemovePendingGame(pendingGame.getId() , pendingGame);
            if (res === false)
                throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
            const playerColor = pendingGame.getPlayerColor(userId)
            if (playerColor === null)
                throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
            return [pendingGame.getId(), playerColor];
        }

        // Create new game
        const newGame = new Game(userId, null, duration, -1);

        const res = await this.gamesDatabase.setPendingGame(duration, newGame);
        if (res === false)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        const playerColor = newGame.getPlayerColor(userId)
        if (playerColor === null)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        return [newGame.getId(), playerColor];
    }

    // 2. Fetch state logic
    // NOTW THAT THIS FUNCTION IGNORES PENDING GAMES , THE LOGIC IS IMPLEMENTED IN THE DB , HOWEVER WE RETURN THE GAME ITSELF !
    async getGameState(gameId, userId, userRole) {
        const game = await this.gamesDatabase.getGame(gameId);
        if (!game)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        if (userRole !== 'admin' && game.white_player_id !== userId && game.black_player_id !== userId) {
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
        }

        return game;
    }

    // 3. Move logic
    async makeMove(gameId, userId, from, to) {
        // 1. Consistency check: Ensure IDs are handled as numbers if nextId is numeric
        const parsedGameId = Number(gameId);

        if (await this.gamesDatabase.isGamePending(parsedGameId))
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        const game = await this.gamesDatabase.getGame(parsedGameId);
        if (!game)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        // 2. State Validation
        if (game.status !== 'active')
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        // 3. Authorization & Turn Validation
        let userColor;
        if (game.white_player_id === userId)
            userColor = 'white';
        else if (game.black_player_id === userId)
            userColor = 'black';
        else
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        if (game.current_turn !== userColor)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        const legalMoves = game.getAllLegalMoves();
        const isLegal = legalMoves.some(m => m.from === from && m.to === to);
        if (!isLegal)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        // 5. Execution
        // applyMove should now also handle checking for Checkmate/Stalemate internally
        game.applyMove(from, to);

        // 6. Persistence
        const res = await this.gamesDatabase.updateGame(parsedGameId, game);
        if (!res) {
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
        }

        return {success: true , gameStatus: game.status , gameWinner: game.winner , whitePlayerId: game.white_player_id , blackPlayerId: game.black_player_id};
    }

    async getAllLegalMoves(gameId, userId) {
        if (await this.gamesDatabase.isGamePending(gameId))
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        const game = await this.gamesDatabase.getGame(gameId);
        if(!game)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
        if (game.status !== 'active')
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        let userColor;
        if (game.white_player_id === userId)
            userColor = 'white';
        else if (game.black_player_id === userId)
            userColor = 'black';
        else
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        if (game.current_turn !== userColor)
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");

        return game.getAllLegalMoves();
    }
}

module.exports = GamesController;