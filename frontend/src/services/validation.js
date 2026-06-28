import config from "../config";

function validationError(message) {
    const error = new Error(message);
    error.code = "VALIDATION_ERROR";
    return error;
}

class Validation {
    constructor() {}

    validateEmail(email, setError){
        if (email === "" || email === null) {
            setError(validationError("Enter a valid email address."));
            return false;
        }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(validationError("Enter a valid email address."));
            return false;
        }
        return true;
    }

    validatePassword(password, setError){
        if (password === "" || password === null) {
            setError(validationError("password required"));
            return false;
        }
        if(password.length < 6) {
            setError(validationError("password should be longer than 6 characters"));
            return false;
        }
        return true ;
    }

    validateFirstAndLastName(firstName, lastName, setError){
        if (firstName === "" || firstName === null) {
            setError(validationError("First and last name are required."));
            return false;
        }
        if (lastName === "" || lastName === null) {
            setError(validationError("First and last name are required."));
            return false;
        }
        return true ;
    }

    validateTheme(theme, setError) {
        if (theme === null || theme === ""){
            setError(validationError("Theme is required."));
            return false;
        }
        if (theme !== "dark" && theme !== "light") {
            setError(validationError("Theme must be either 'dark' or 'light'."));
            return false;
        }
        return true;
    }
}

export default new Validation();
