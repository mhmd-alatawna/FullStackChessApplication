class User {
    constructor(userId, firstName, lastName, userRole, createDate, updateDate) {
        this.userId = userId //numeric,
        this.firstName = firstName //string,
        this.lastName = lastName //string,
        this.createDate = createDate //datetime,
        this.updateDate = updateDate //datetime,
        this.userRole = userRole //string
    }


    copy(){
        return new User(this.userId,this.firstName,this.lastName,this.userRole,this.createDate,this.updateDate)
    }
}

module.exports = User;