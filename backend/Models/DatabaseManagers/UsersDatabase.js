const User = require("../User");

class UsersDatabase {
    constructor() {
        //this.usersList = [];
        const now = new Date();
        this.usersList = [
            new User(1, "Admin", "User", "admin", now, now, 1, 0, 0, "admin@chess.com", "123456"),     // ⚠️ ADDED FOR ASSIGNMENT 3: wins:1 (won Game #1 as white)
            new User(2, "Manager", "User", "manager", now, now, 0, 0, 0, "manager@chess.com", "123456"), // ⚠️ ADDED FOR ASSIGNMENT 3
            new User(3, "Regular", "User", "user", now, now, 0, 1, 0, "user@chess.com", "123456")       // ⚠️ ADDED FOR ASSIGNMENT 3: losses:1 (lost Game #1 as black)
        ];
        this.nextId = 4;
    }

    getAllUsers(){
        let listCopy = [];
        for (let i = 0; i < this.usersList.length; i++) {
            listCopy.push(this.usersList[i].copy())
        }
        return listCopy;
    }

    getUserById(id){
        const userId = parseInt(id);
        return this.usersList.find(user => user.userId === userId) || null;
    }

    getUserByEmail(email){ // ⚠️ ADDED FOR ASSIGNMENT 3
        return this.usersList.find(user => user.email === email) || null;
    }

    createUser(user) {
        user.userId = this.nextId
        this.nextId += 1;
        this.usersList.push(user.copy());
        return user.userId;
    }

    updateUser(updatedUser) {
        const index = this.usersList.findIndex(user => user.userId === updatedUser.userId);
        if (index !== -1) {
            this.usersList[index] = updatedUser.copy();
            return true;
        }
        return false;
    }

    deleteUser(id) {
        const userId = parseInt(id);
        const index = this.usersList.findIndex(user => user.userId === userId);
        if (index !== -1) {
            this.usersList.splice(index, 1);
            return userId;
        }
        return false;
    }
}

module.exports = UsersDatabase;