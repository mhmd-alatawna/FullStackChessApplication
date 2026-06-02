const express=require("express")
const UsersDatabase = require("../Models/DatabaseManagers/UsersDatabase")
const UsersController = require("../Controllers/UsersController")
const ControllersManager = require("../Controllers/ControllersManager")
const authorize = require("../Middlewares/Auth")

const { AppError } = require("../Middlewares/ErrorHandler");

module.exports=(controllersManager)=> {
    const router=express.Router()

    let usersController = controllersManager.getUsersController()

    router.get("/", authorize(['admin', 'manager']), async (req, res, next) => {
        try {
            const arr = await usersController.getAllUsers()
            res.status(200).json({success: true, data: arr, error: null})
        } catch (err) {
            next(err)
        }
    })

    // GET /users/me — returns logged-in user from x-user-id header // ⚠️ ADDED FOR ASSIGNMENT 3
    router.get("/me", authorize(['admin', 'manager', 'user']), async (req, res, next) => { // ⚠️ ADDED FOR ASSIGNMENT 3
        try {
            const userId = req.headers['x-user-id'];
            if (!userId || isNaN(Number(userId))) {
                throw new AppError("x-user-id header is required", 400, "VALIDATION_ERROR", { header: "x-user-id" });
            }
            const user = await usersController.getUserById(userId);
            res.status(200).json({ success: true, data: user, error: null });
        } catch (err) {
            next(err);
        }
    });

    router.get("/:id", authorize(['admin', 'manager', 'user']), async (req, res, next) => {
        try {
            if (!req.params.id || isNaN(Number(req.params.id))) {
                throw new AppError("A valid user id is required", 400, "VALIDATION_ERROR", { field: "id", value: req.params.id });
            }
            const id = req.params.id
            const user = await usersController.getUserById(id)
            res.status(200).json({success: true, data: user, error: null})
        } catch (err) {
            next(err)
        }
    })

    router.post("/", authorize(['admin', 'manager']), async (req, res, next) => {
        try {
            const {firstName, lastName, userRole} = req.body || {}
            if (!firstName || !lastName || !userRole) {
                throw new AppError("firstName, lastName and userRole are required", 400, "VALIDATION_ERROR", { required: ["firstName", "lastName", "userRole"] });
            }
            const userId = await usersController.createUser(firstName, lastName, userRole)
            res.status(201).json({success: true, data: {userId: userId}, error: null})
        } catch (err) {
            next(err)
        }
    })

    router.put("/:id", authorize(['admin', 'manager', 'user']), async (req, res, next) => {
        try {
            if (!req.params.id || isNaN(Number(req.params.id))) {
                throw new AppError("A valid user id is required", 400, "VALIDATION_ERROR", { field: "id", value: req.params.id });
            }
            const id = req.params.id
            const {firstName, lastName, userRole} = req.body || {}
            if (!firstName || !lastName || !userRole) {
                throw new AppError("firstName, lastName and userRole are required", 400, "VALIDATION_ERROR", { required: ["firstName", "lastName", "userRole"] });
            }
            await usersController.updateUser(id, firstName, lastName, userRole)
            res.status(200).json({success: true, data: {userId: parseInt(id)}, error: null})
        } catch (err) {
            next(err)
        }
    })

    router.delete("/:id", authorize(['admin']), async (req, res, next) => {
        try {
            if (!req.params.id || isNaN(Number(req.params.id))) {
                throw new AppError("A valid user id is required", 400, "VALIDATION_ERROR", { field: "id", value: req.params.id });
            }
            const id = req.params.id
            await usersController.deleteUser(id)
            res.status(200).json({success: true, data: {userId: parseInt(id)}, error: null})
        } catch (err) {
            next(err)
        }
    })

    return router
}