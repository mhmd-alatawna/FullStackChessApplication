const express=require("express")
const router=express.Router()
const UsersDatabase = require("../Models/DatabaseManagers/UsersDatabase")
const UsersController = require("../Controllers/UsersController")
const authorize = require("../Middlewares/Auth")

const usersDatabase = new UsersDatabase()
const usersController = new UsersController(usersDatabase)

router.get("/", authorize(['admin', 'manager']), async(req,res,next)=>{
    try {
        const arr = await usersController.getAllUsers()
        res.status(200).json({success: true, data: arr, error: null})
    } catch (err) {
        next(err)
    }
})

router.get("/:id", authorize(['admin', 'manager', 'user']), async(req,res,next)=>{
    try {
        const id=req.params.id
        const user = await usersController.getUserById(id)
        res.status(200).json({success: true, data: user, error: null})
    } catch (err) {
        next(err)
    }
})

router.post("/", async (req,res,next)=>{
    try {
        const { firstName, lastName, userRole } = req.body
        const userId = await usersController.createUser(firstName,lastName,userRole)
        res.status(201).json({success: true, data: {userId: userId}, error: null})
    } catch (err) {
        next(err)
    }
})

router.put("/:id", authorize(['admin', 'manager', 'user']), async(req,res,next)=>{
    try {
        const id=req.params.id
        const { firstName, lastName, userRole } = req.body
        await usersController.updateUser(id,firstName,lastName,userRole)
        res.status(200).json({success: true, data: {userId: parseInt(id)}, error: null})
    } catch (err) {
        next(err)
    }
})

router.delete("/:id", authorize(['admin','user']), async(req,res,next)=>{
    try {
        const id=req.params.id
        await usersController.deleteUser(id)
        res.status(200).json({success: true, data: {userId: parseInt(id)}, error: null})
    } catch (err) {
        next(err)
    }
})

module.exports=router