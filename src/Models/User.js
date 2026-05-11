class User {
    constructor(userId, firstName, lastName, userRole, createDate, updateDate,wins = 0, losses = 0, draws = 0) {
        this.userId = userId //numeric,
        this.firstName = firstName //string,
        this.lastName = lastName //string,
        this.createDate = createDate //datetime,
        this.updateDate = updateDate //datetime,
        this.userRole = userRole //string
        this.wins = wins;  //numeric,
        this.losses = losses;  //numeric,
        this.draws = draws;  //numeric,
    }


    copy(){
        return new User(this.userId,this.firstName,this.lastName,this.userRole,this.createDate,this.updateDate, this.wins, this.losses, this.draws)
    }
}

module.exports = User;