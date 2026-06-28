const express=require("express")
const cors = require('cors');
const { errorHandler } = require("./Middlewares/ErrorHandler")
const requestLogger = require("./Middlewares/Logger")
const ControllersManager = require("./Controllers/ControllersManager")
const GamesDatabase = require("./Models/DatabaseManagers/GamesDatabase");
const GamesController = require("./Controllers/GamesController");
const UsersDatabase = require("./Models/DatabaseManagers/UsersDatabase")
const UsersController = require("./Controllers/UsersController")

// TODO : users and games databases are not async (actually, am not sure)
const app=express()

app.use(cors())
app.use(requestLogger)
app.use(express.json())

const gamesDatabase = new GamesDatabase()
const gamesController = new GamesController(gamesDatabase)
const usersDatabase = new UsersDatabase()
const usersController = new UsersController(usersDatabase)

const controllerManager = new ControllersManager(usersController,gamesController)

const userRoutes=require("./Routes/Users")
const gamesRouter=require("./Routes/Games")
const authRouter=require("./Routes/Auth") // ⚠️ ADDED FOR ASSIGNMENT 3
const settingsRouter=require("./Routes/Settings") // ⚠️ ADDED FOR ASSIGNMENT 3

app.use("/api/users",userRoutes(controllerManager))
app.use("/api/games",gamesRouter(controllerManager))
app.use("/api/auth",authRouter(controllerManager)) // ⚠️ ADDED FOR ASSIGNMENT 3
app.use("/api/settings",settingsRouter(controllerManager)) // ⚠️ ADDED FOR ASSIGNMENT 3

// Catch-all for undefined rou
app.use(errorHandler)

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
