class User {
    constructor(userId, firstName, lastName, userRole, createDate, updateDate, wins = 0, losses = 0, draws = 0, email = null, password = null) { // ⚠️ ADDED FOR ASSIGNMENT 3: email, password params
        this.userId = userId //numeric,
        this.firstName = firstName //string,
        this.lastName = lastName //string,
        this.createDate = createDate //datetime,
        this.updateDate = updateDate //datetime,
        this.userRole = userRole //string
        this.wins = wins;  //numeric,
        this.losses = losses;  //numeric,
        this.draws = draws;  //numeric,
        this.email = email;    // ⚠️ ADDED FOR ASSIGNMENT 3
        this.password = password; // ⚠️ ADDED FOR ASSIGNMENT 3
    }


    copy(){
        return new User(this.userId,this.firstName,this.lastName,this.userRole,this.createDate,this.updateDate, this.wins, this.losses, this.draws, this.email, this.password) // ⚠️ ADDED FOR ASSIGNMENT 3: propagate email/password
    }
}

module.exports = User;