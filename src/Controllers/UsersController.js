const User = require("../Models/User");
const { AppError } = require("../Middlewares/ErrorHandler");

class UsersController {
    constructor(usersDatabase) {
        this.usersDatabase = usersDatabase;
        this.nextId = 1;
    }

    async getAllUsers(){
        return await this.usersDatabase.getAllUsers();
    }

    async getUserById(id){
        if (!id){
            throw new AppError("Please provide id , no id was provided", 400 , "BAD_REQUEST", ["id"]);
        }
        const user = await this.usersDatabase.getUserById(id);
        if (!user) {
            throw new AppError(`User with id ${id} not found`, 404 , "NOT_FOUND", ["id"]);
        }
        return user;
    }

    async createUser(firstName, lastName, userRole) {
        if (!firstName || !lastName || !userRole) {
            throw new AppError("Please provide firstName, lastName and userRole", 400, "BAD_REQUEST", ["firstName","lastName","userRole"]);
        }
        try {
            const userId = this.nextId++;
            const createDate = new Date();
            const updateDate = new Date();
            const user = new User(userId, firstName, lastName, userRole, createDate, updateDate);
            return await this.usersDatabase.createUser(user);
        }catch (err) {
            throw new AppError(`failed to add user to database`, 400, "DATABASE_ERROR", ["firstName","lastName","userRole"]);
        }
    }

    async updateUser(id, firstName, lastName, userRole) {
        if (!firstName || !lastName || !userRole || !id) {
            throw new AppError("Please provide id, firstName, lastName and userRole", 400, "BAD_REQUEST", ["id","firstName","lastName","userRole"]);
        }

        const user = await this.getUserById(id);
        if (user === null) {
            throw new AppError(`User with id ${id} not found`, 404 , "NOT_FOUND", ["id"]);
        }
        user.firstName = firstName;
        user.lastName = lastName;
        user.userRole = userRole;
        user.updateDate = new Date();

        if (! await this.usersDatabase.updateUser(user)) {
            throw new AppError(`failed to update user in database`, 500, "DATABASE_ERROR", ["id"]);
        }
    }

    async deleteUser(id) {
        if (!id) {
            throw new AppError("Please provide id , no id was provided", 400 , "BAD_REQUEST", ["id"]);
        }

        const user = await this.getUserById(id);
        if (user === null) {
            throw new AppError(`User with id ${id} not found`, 404 , "NOT_FOUND", ["id"]);
        }

        const deleted = await this.usersDatabase.deleteUser(id);
        if (!deleted) {
            throw new AppError(`User with id ${id} failed to be updated`, 500, "DATABASE_ERROR", ["id"]);
        }
        return true;
    }
}

module.exports = UsersController;
