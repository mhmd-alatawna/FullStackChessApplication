const express=require("express")
const { errorHandler } = require("./Middlewares/ErrorHandler")
const requestLogger = require("./Middlewares/Logger")
const app=express()

app.use(requestLogger)
app.use(express.json())

const userRoutes=require("./Routes/Users")
const gamesRouter=require("./Routes/Games")

app.use("/users",userRoutes)
app.use("/games",gamesRouter)

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