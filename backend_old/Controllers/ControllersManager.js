const {AppError} = require("../Middlewares/ErrorHandler");

class ControllersManager {
    constructor(usersController, gamesController) {
        this.usersController = usersController;
        this.gamesController = gamesController;
    }

    getUsersController(){
        return this.usersController
    }

    getGamesController(){
        return this.gamesController
    }

    async performGameMoveAndUpdateUsers(gameId, userId, from, to){
        const result = await this.gamesController.makeMove(gameId, userId, from, to);

        try {
            const {success, gameStatus, gameWinner, whitePlayerId, blackPlayerId} = result;
            if (success === true)
                if (gameStatus === "finished") {
                    let whiteRes = "win"
                    let blackRes = "loss"
                    if (gameWinner === "black") {
                        whiteRes = "loss"
                        blackRes = "win"
                    } else if (gameWinner === "draw") {
                        whiteRes = "draw"
                        blackRes = "draw"
                    }

                    await this.usersController.updateUserGameStats(whitePlayerId, whiteRes)
                    await this.usersController.updateUserGameStats(blackPlayerId, blackRes)
                }
            return true;
        }catch (e){
            if (e instanceof AppError) {
                throw e;
            }
            throw new AppError(e.message || `An unexpected error occurred during move update`, 500, "INTERNAL_ERROR");
        }
    }
}

module.exports = ControllersManager;