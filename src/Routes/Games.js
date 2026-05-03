const Game = require("../Models/Game");

const express=require("express")
const router=express.Router()

router.get("/",(req,res)=>{
    const game = new Game()
    res.status(200).json(game.toJSON())
})

module.exports=router