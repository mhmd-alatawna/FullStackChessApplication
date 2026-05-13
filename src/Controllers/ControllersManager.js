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
                    const whiteRes = "win"
                    const blackRes = "loss"
                    if (gameWinner === "black") {
                        whiteRes === "loss"
                        blackRes === "win"
                    } else if (gameWinner === "draw") {
                        whiteRes === "draw"
                        blackRes === "draw"
                    }

                    await this.usersController.updateUserGameStats(whitePlayerId, whiteRes)
                    await this.usersController.updateUserGameStats(blackPlayerId, blackRes)
                }
            return true;
        }catch (e){
            throw new AppError(`error not defined yet`, 500, "ERROR_NOT_DEFINED");
        }
    }
}

module.exports = ControllersManager;