// Client-side validation functions

class Validation {
    static isValidEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    static isValidPassword(password) {
        // Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }

    static doPasswordsMatch(password, confirmPassword) {
        return password === confirmPassword;
    }

    static isEmpty(value) {
        return value.trim() === '';
    }
}