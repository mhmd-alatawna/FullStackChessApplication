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

    /**
     * Core function to get all actual, playable moves for the current player.
     */
    getAllLegalMoves() {
        const legalMoves = [];
        const currentPlayerPieces = this.game_state.filter(p => p[1] === this.current_turn && p[3]);

        for (const piece of currentPlayerPieces) {
            const currentPos = piece[2];
            // 1. Get where the piece CAN go physically
            const pseudoMoves = this.getPseudoLegalMoves(piece, this.game_state);

            for (const targetPos of pseudoMoves) {
                // 2. Simulate the move
                const simulatedGame = this.copy();
                simulatedGame.applyMove(currentPos, targetPos);

                // 3. Check if our king is safe in this new simulated reality
                if (!simulatedGame.isKingInCheck(this.current_turn)) {
                    legalMoves.push({ from: currentPos, to: targetPos });
                }
            }
        }
        return legalMoves;
    }

    /**
     * Executes a move on the board state, handling captures.
     */
    applyMove(fromPos, toPos) {
        // Find the piece being moved
        const pieceIndex = this.game_state.findIndex(p => p[2] === fromPos && p[3]);
        if (pieceIndex === -1) return;

        // Check if there's an enemy piece at the target position and "kill" it
        const targetIndex = this.game_state.findIndex(p => p[2] === toPos && p[3]);
        if (targetIndex !== -1) {
            this.game_state[targetIndex][3] = false; // Mark as dead
        }

        // Update position
        this.game_state[pieceIndex][2] = toPos;
        // In a real game, you'd toggle this.current_turn here, but for simulation,
        // we just need the board state updated.
    }

    /**
     * Checks if the specified color's king is currently under attack.
     */
    isKingInCheck(color) {
        // Find the king
        const king = this.game_state.find(p => p[0] === "king" && p[1] === color && p[3]);
        if (!king) return false; // Should never happen unless King is captured
        const kingPos = king[2];

        // Find all ALIVE enemy pieces
        const enemyColor = color === "white" ? "black" : "white";
        const enemyPieces = this.game_state.filter(p => p[1] === enemyColor && p[3]);

        // If any enemy piece can physically move to the king's square, it's in check
        for (const enemy of enemyPieces) {
            const enemyAttacks = this.getPseudoLegalMoves(enemy, this.game_state, true);
            if (enemyAttacks.includes(kingPos)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Generates raw mathematical moves for a piece, stopping at obstacles.
     * @param {Array} piece - The piece array [type, color, pos, alive]
     * @param {Array} state - The current game_state
     * @param {Boolean} isAttackSimulation - Used to modify pawn behavior (pawns attack diagonally, move straight)
     */
    getPseudoLegalMoves(piece, state, isAttackSimulation = false) {
        const [type, color, pos, isAlive] = piece;
        if (!isAlive) return [];

        const moves = [];
        const file = pos.charCodeAt(0); // 'a' = 97
        const rank = parseInt(pos[1]);

        // Helper to check what is on a square
        const getPieceAt = (f, r) => {
            const checkPos = `${String.fromCharCode(f)}${r}`;
            return state.find(p => p[2] === checkPos && p[3]);
        };

        // Helper for sliding pieces (Rooks, Bishops, Queens)
        const addSlidingMoves = (fileDirs, rankDirs) => {
            for (let i = 0; i < fileDirs.length; i++) {
                let currentFile = file + fileDirs[i];
                let currentRank = rank + rankDirs[i];

                while (currentFile >= 97 && currentFile <= 104 && currentRank >= 1 && currentRank <= 8) {
                    const obstacle = getPieceAt(currentFile, currentRank);
                    const targetStr = `${String.fromCharCode(currentFile)}${currentRank}`;

                    if (!obstacle) {
                        moves.push(targetStr);
                    } else {
                        // If it's an enemy, we can capture it, but we can't slide past it
                        if (obstacle[1] !== color) moves.push(targetStr);
                        break; // Stop sliding in this direction
                    }
                    currentFile += fileDirs[i];
                    currentRank += rankDirs[i];
                }
            }
        };

        // --- PIECE LOGIC ROUTER ---
        if (type === "rook") {
            addSlidingMoves([0, 0, 1, -1], [1, -1, 0, 0]);
        }
        else if (type === "bishop") {
            addSlidingMoves([1, 1, -1, -1], [1, -1, 1, -1]);
        }
        else if (type === "queen") {
            addSlidingMoves([0, 0, 1, -1, 1, 1, -1, -1], [1, -1, 0, 0, 1, -1, 1, -1]);
        }
        else if (type === "knight") {
            const knightJumps = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
            knightJumps.forEach(jump => {
                const f = file + jump[0];
                const r = rank + jump[1];
                if (f >= 97 && f <= 104 && r >= 1 && r <= 8) {
                    const obstacle = getPieceAt(f, r);
                    if (!obstacle || obstacle[1] !== color) moves.push(`${String.fromCharCode(f)}${r}`);
                }
            });
        }
        else if (type === "king") {
            const kingSteps = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
            kingSteps.forEach(step => {
                const f = file + step[0];
                const r = rank + step[1];
                if (f >= 97 && f <= 104 && r >= 1 && r <= 8) {
                    const obstacle = getPieceAt(f, r);
                    if (!obstacle || obstacle[1] !== color) moves.push(`${String.fromCharCode(f)}${r}`);
                }
            });
        }
        else if (type === "pawn") {
            const direction = color === "white" ? 1 : -1;
            const startRank = color === "white" ? 2 : 7;

            // Normal forward moves (only if we aren't simulating enemy attack patterns)
            if (!isAttackSimulation) {
                if (!getPieceAt(file, rank + direction)) {
                    moves.push(`${String.fromCharCode(file)}${rank + direction}`);
                    // Double move from start
                    if (rank === startRank && !getPieceAt(file, rank + (direction * 2))) {
                        moves.push(`${String.fromCharCode(file)}${rank + (direction * 2)}`);
                    }
                }
            }

            // Diagonal Captures
            const captureFiles = [file - 1, file + 1];
            captureFiles.forEach(f => {
                if (f >= 97 && f <= 104) {
                    const obstacle = getPieceAt(f, rank + direction);
                    // Pawns can only move diagonally if there is an enemy to capture OR if simulating attacks
                    if (isAttackSimulation || (obstacle && obstacle[1] !== color)) {
                        moves.push(`${String.fromCharCode(f)}${rank + direction}`);
                    }
                }
            });
        }

        return moves;
    }
}

module.exports = Game;