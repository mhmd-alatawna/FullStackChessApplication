class GamesDatabase {
    // TODO : very basic implementation , implement multiple queues for different durations for pending games
    //  also save the pending games are not saved in the "games" database , they are seperated , make sure
    //  this is whats intended and it aligns with the general intentions of the API
    constructor() {
        // In-memory maps mimicking a real DB (e.g., Redis or MongoDB)
        this.games = new Map();
        this.pendingGame = null;
    }

    setPendingGame(duration, game) {
        if (this.pendingGame !== null) {
            return false
        }
        this.pendingGame = game.copy();
        return true;
    }

    getPendingGame(duration) {
        return this.pendingGame.copy();
    }

    saveGame(game) {
        this.games.set(game.getId(), game.copy());
        return true;
    }

    removePendingGame(gameId) {
        if (this.pendingGame === null) {
            return false;
        }
        if (gameId === this.pendingGame.getId()) {
            this.pendingGame = null;
            return true;
        }
    }

    getGame(gameId) {
        const activeGame = this.games.get(gameId)?.copy() || null;
        if (activeGame === null) {
            if (this.pendingGame !== null) {
                if (this.pendingGame.getId() === gameId) {
                    return this.pendingGame.copy();
                }
            }
        }
    }

    isGamePending(gameId){
        if(this.pendingGame !== null) {
            if(this.pendingGame.getId() === gameId){
                return true;
            }
        }
        return false;
    }

    updateGame(gameId, game){
        if (! this.games.has(gameId))
            return false;
        this.games.set(gameId, game.copy());
        return true;
    }

}

module.exports = GamesDatabase;