const User = require("../Models/User");
const { AppError } = require("../Middlewares/ErrorHandler");

class UsersController {
    constructor(usersDatabase) {
        this.usersDatabase = usersDatabase;
    }

    async getAllUsers(){
        return await this.usersDatabase.getAllUsers();
    }

    async getUserById(id){
        if (!id || isNaN(parseInt(id))){
            throw new AppError("Please provide id , no id was provided", 400 , "VALIDATION_ERROR", { field: "id" });
        }
        const user = await this.usersDatabase.getUserById(id);
        if (!user) {
            throw new AppError(`User with id ${id} not found`, 404 , "NOT_FOUND",  { field: "id", value: id });
        }
        return user;
    }

    async getUserByEmail(email){ // ⚠️ ADDED FOR ASSIGNMENT 3
        return this.usersDatabase.getUserByEmail(email);
    }

    // Updates only firstName, lastName (and optionally password) — role stays unchanged. // ⚠️ ADDED FOR ASSIGNMENT 3
    async updateUserSettings(id, firstName, lastName, password = null) { // ⚠️ ADDED FOR ASSIGNMENT 3
        if (!firstName || !lastName || !id || isNaN(parseInt(id))) {
            throw new AppError("Please provide id, firstName and lastName", 400, "BAD_REQUEST", { required: ["id", "firstName", "lastName"] });
        }
        const user = await this.getUserById(id);
        user.firstName = firstName;
        user.lastName = lastName;
        if (password !== null && password !== "") {
            user.password = password; // only update if a new password was provided
        }
        user.updateDate = new Date();
        const success = this.usersDatabase.updateUser(user);
        if (!success) {
            throw new AppError(`Failed to update user ${id}`, 500, "DATABASE_ERROR", {});
        }
        return user.userId;
    }

    async createUser(firstName, lastName, userRole, email = null, password = null) { // ⚠️ ADDED FOR ASSIGNMENT 3: email, password params
        if (!firstName || !lastName || !userRole) {
            throw new AppError("Please provide firstName, lastName and userRole", 400, "BAD_REQUEST", { required: ["firstName", "lastName", "userRole"] });
        }
        if (!this.isValidUserRole(userRole)) {
            throw new AppError(
                "Invalid userRole. Allowed roles are: admin, manager, user",
                400,
                "VALIDATION_ERROR",
                { field: "userRole", allowedValues: ["admin", "manager", "user"] }
            );
        }

        try {
            const createDate = new Date();
            const updateDate = new Date();

            const user = new User(null, firstName, lastName, userRole, createDate, updateDate, 0, 0, 0, email, password); // ⚠️ ADDED FOR ASSIGNMENT 3
            return await this.usersDatabase.createUser(user);
        }catch (err) {
            throw new AppError(`failed to add user to database`, 500, "DATABASE_ERROR", {});
        }
    }

    async updateUser(id, firstName, lastName, userRole) {
        if (!firstName || !lastName || !userRole || !id || isNaN(parseInt(id))) {
            throw new AppError("Please provide id, firstName, lastName and userRole", 400, "BAD_REQUEST", { required: ["id", "firstName", "lastName", "userRole"] });
        }
        if (!this.isValidUserRole(userRole)) {
            throw new AppError(
                "Invalid userRole. Allowed roles are: admin, manager, user",
                400,
                "VALIDATION_ERROR",
                { field: "userRole", allowedValues: ["admin", "manager", "user"] }
            );
        }

        const user = await this.getUserById(id);
        if (user === null) {
            throw new AppError(`User with id ${id} not found`, 404 , "NOT_FOUND", { field: "id", value: id });
        }
        user.firstName = firstName;
        user.lastName = lastName;
        user.userRole = userRole;
        user.updateDate = new Date();

        if (! await this.usersDatabase.updateUser(user)) {
            throw new AppError(`failed to update user in database`, 500, "DATABASE_ERROR", { field: "id", value: id });
        }
        return parseInt(id);
    }

    async deleteUser(id) {
        if (!id || isNaN(parseInt(id))) {
            throw new AppError("Please provide id , no id was provided", 400 , "VALIDATION_ERROR", { field: "id" });
        }

        const user = await this.getUserById(id);
        if (user === null) {
            throw new AppError(`User with id ${id} not found`, 404 , "NOT_FOUND", { field: "id" });
        }

        const deleted = await this.usersDatabase.deleteUser(id);
        if (!deleted) {
            throw new AppError(`User with id ${id} failed to be updated`, 500, "DATABASE_ERROR", { field: "id", value: id });
        }
        return parseInt(id);
    }

    async updateUserGameStats(id, result) {
        if (!id || isNaN(parseInt(id))) {
            throw new AppError("Please provide a valid user id", 400, "VALIDATION_ERROR",{ field: "id" });
        }

        const allowedResults = ["win", "loss", "draw"];

        if (!allowedResults.includes(result)) {
            throw new AppError("Invalid game result. Allowed values are: win, loss, draw", 400,"VALIDATION_ERROR", { field: "result", allowedValues: allowedResults });
        }

        const user = await this.getUserById(id);

        if (result === "win") {
            user.wins++;
        } else if (result === "loss") {
            user.losses++;
        } else {
            user.draws++;
        }

        user.updateDate = new Date();

        const updated = await this.usersDatabase.updateUser(user);

        if (!updated) {
            throw new AppError("Failed to update user statistics", 500, "DATABASE_ERROR", { field: "id", value: id });
        }

        return user;
    }


    isValidUserRole(userRole) {
        const allowedRoles = ["admin", "manager", "user"];
        return allowedRoles.includes(userRole);
    }
}

module.exports = UsersController;
