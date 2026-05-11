const Game = require("../Models/Game");

const express=require("express")
const authorize = require("../Middlewares/Auth");
const GamesDatabase = require("../Models/DatabaseManagers/GamesDatabase");
const GamesController = require("../Controllers/GamesController");
const router=express.Router()

// let testGame = new Game("white_player", "black_player", "10:00");

// router.get("/", (req, res) => {
//     res.status(200).json(testGame.toJSON());
// });
//
// router.get("/legal_moves", (req, res) => {
//     const moves = testGame.getAllLegalMoves();
//
//     res.status(200).json({
//         current_turn: testGame.current_turn,
//         legal_moves: moves
//     });
// });

// // POST a new move
// router.post('/move', (req, res) => {
//     const { from, to } = req.body;
//     testGame.applyMove(from, to);
//
//     res.json({ message: "Move applied", state: testGame.toJSON() });
// });
//
// router.put('/new_game', authorize(['admin', 'manager', 'user']), async(req,res,next)=>{
//     try {
//         const id=req.params.id
//         const { firstName, lastName, userRole } = req.body
//         await usersController.updateUser(id,firstName,lastName,userRole)
//         res.status(200).json({status: true, data: id, error: null})
//     } catch (err) {
//         next(err)
//     }
// })


const gamesDatabase = new GamesDatabase()
const gamesController = new GamesController(gamesDatabase)

// TODO : work on this from the beginning , it was developed only for idea but its not actually suitable for API calling for now
// 1. Submit request for a game (Matchmaking)
router.post('/new_game', authorize(['admin', 'manager', 'user']),async (req, res, next) => {
    try {
        const userId = req.userId;
        const duration = req.duration

        const newGameId = await gamesController.requestMatch(userId, duration);
        return res.status(200).json(newGameId);

    } catch (error) {
        next(error)
    }
});

// 2. Fetch game state
router.get('/game/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.userId;
        const { userRole } = req.userRole;

        const result = await gamesController.getGameState(gameId, userId, userRole);
        return res.status(200).json(result);

    } catch (error) {
        next(error)
    }
});

// 3. Submit a move
router.post('/move/:gameId', authorize(['admin', 'manager', 'user']), async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.user;
        const { from, to } = req.body;

        const result = await gamesController.makeMove(gameId, userId, from, to);
        return res.status(200).json(result);

    } catch (error) {
        next(error)
    }
});

router.get("/legal_moves", authorize(['admin', 'manager', 'user']), async (req, res, next) => {
    try {
        const { gameId } = req.params;
        const { userId } = req.user;

        const moves = gamesController.getAllLegalMoves(gameId, userId);

        res.status(200).json({
            legal_moves: moves
        });
    }catch (err) {
        next(err)
    }
});
module.exports=router