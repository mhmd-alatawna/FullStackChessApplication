class Game {
    constructor(white_player_id, black_player_id, game_duration) {
        this.white_player_id = white_player_id
        this.black_player_id = black_player_id
        this.game_duration = game_duration
        this.current_turn = "white"
        this.move_history = []
        this.game_state = [];

        // White pawns
        for (let i = 1; i <= 8; i++) {
            const x = String.fromCharCode(96 + i); // 'a' through 'h'
            const y = 2;
            this.game_state.push(["pawn", "white", `${x}${y}`, true]);
        }

        // Black pawns
        for (let i = 1; i <= 8; i++) {
            const x = String.fromCharCode(96 + i);
            const y = 7;
            this.game_state.push(["pawn", "black", `${x}${y}`, true]);
        }

        // Setup for the back ranks
        const backRankPieces = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];

        // White back rank (Row 1)
        for (let i = 0; i < 8; i++) {
            const x = String.fromCharCode(97 + i); // 97 is 'a'
            this.game_state.push([backRankPieces[i], "white", `${x}1`, true]);
        }

        // Black back rank (Row 8)
        for (let i = 0; i < 8; i++) {
            const x = String.fromCharCode(97 + i);
            this.game_state.push([backRankPieces[i], "black", `${x}8`, true]);
        }
    }


    copy() {
        const copy_game = new Game(this.white_player_id, this.black_player_id, this.game_duration);
        copy_game.current_turn = this.current_turn;

        // Native deep cloning (cleaner and safer)
        copy_game.move_history = structuredClone(this.move_history);
        copy_game.game_state = structuredClone(this.game_state);

        return copy_game;
    }

    static fromJSON(parsedData) {
        // 1. Create a fresh instance using the base properties
        const gameInstance = new Game(
            parsedData.white_player_id,
            parsedData.black_player_id,
            parsedData.game_duration
        );

        // 2. Overwrite the state.
        // We do this just in case the backend sends us a game that
        // is already on move 20, rather than a brand new board.
        gameInstance.current_turn = parsedData.current_turn;
        gameInstance.move_history = parsedData.move_history;
        gameInstance.game_state = parsedData.game_state;

        return gameInstance;
    }

    toJSON() {
        return {
            game_state: this.game_state
        };
    }
}

module.exports = Game;