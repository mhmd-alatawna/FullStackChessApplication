const pendingGame = require("../Game");

class GamesDatabase {
    // TODO : very basic implementation , implement multiple queues for different durations for pending games
    //  also save the pending games are not saved in the "games" database , they are separated , make sure
    //  this is whats intended and it aligns with the general intentions of the API
    constructor() {
        // In-memory maps mimicking a real DB (e.g., Redis or MongoDB)
        this.games = new Map();
        this.pendingGame = null;
        this.nextId = 1;
    }

    setPendingGame(duration, game) {
        if (this.pendingGame !== null) {
            return false
        }
        game.setId(this.nextId)
        this.nextId += 1;
        this.pendingGame = game.copy();
        return true;
    }

    getPendingGame(duration) {
        if (this.pendingGame === null)
            return null;
        return this.pendingGame.copy();
    }

    saveAndRemovePendingGame(gameId , updatedGame) {
        if (this.pendingGame === null) {
            return false;
        }
        if (gameId !== updatedGame.getId()) {
            return false;
        }
        if (gameId === this.pendingGame.getId()) {
            this.games.set(gameId, updatedGame.copy())
            this.pendingGame = null;
            return true;
        }
        return false;
    }

    getGame(gameId) {
        const activeGame = this.games.get(gameId)?.copy() || null;
        if (activeGame === null) {
            if (this.pendingGame !== null) {
                if (this.pendingGame.getId() === gameId) {
                    return this.pendingGame.copy();
                }
            }
        }else
            return activeGame;
        return null;
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

    getAllGames() {
        const allGames = Array.from(this.games.values()).map(g => g.copy());
        if (this.pendingGame) {
            allGames.push(this.pendingGame.copy());
        }
        return allGames;
    }

    deleteGame(gameId) {
        if (this.games.has(gameId)) {
            this.games.delete(gameId);
            return true;
        }
        if (this.pendingGame && this.pendingGame.getId() === gameId) {
            this.pendingGame = null;
            return true;
        }
        return false;
    }

}

module.exports = GamesDatabase;