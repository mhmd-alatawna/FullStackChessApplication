const User = require("../User");

class UsersDatabase {
    constructor() {
        //this.usersList = [];
        const now = new Date();
        this.usersList = [
            new User(1, "Admin", "User", "admin", now, now),
            new User(2, "Manager", "User", "manager", now, now),
            new User(3, "Regular", "User", "user", now, now)
        ];
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

    createUser(user) {
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