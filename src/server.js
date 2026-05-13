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


app.use("/users",userRoutes(controllerManager))
app.use("/games",gamesRouter(controllerManager))

// Catch-all for undefined routes
app.use((req, res, next) => {
    const { AppError } = require("./Middlewares/ErrorHandler");
    next(new AppError(`Server handling errors`, 500, "ERROR_NOT_HANDLED"));
});

app.use(errorHandler)

app.listen(3000,()=>{
    console.log("Server running on port http://localhost:3000")
})

module.exports = app