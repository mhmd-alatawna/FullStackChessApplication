const { AppError } = require('./ErrorHandler');

/**
 * Middleware to enforce role-based access control.
 * @param {string[]} allowedRoles - Roles permitted for the route.
 * @returns {Function} Express middleware.
 */
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        const userRole = req.headers['x-user-role'];
        const userIdHeader = req.headers['x-user-id'];

        if (!userRole) {
            return next(new AppError("User role is missing from headers (x-user-role)", 403, "FORBIDDEN"));
        }

        const allowedSystemRoles = ['admin', 'manager', 'user'];
        if (!allowedSystemRoles.includes(userRole)) {
            return next(new AppError("Invalid user role provided", 403, "FORBIDDEN"));
        }

        // 1. Check if the role is allowed for this route
        if (!allowedRoles.includes(userRole)) {
            return next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
        }

        // 2. Regular user specific restriction: "regular user may only access and update their own data"
        if (userRole === 'user') {
            // Check if there is an :id param in the route (common for user profile routes)
            const targetId = req.params.id;
            
            if (targetId) {
                if (!userIdHeader) {
                    return next(new AppError("User ID is missing from headers (x-user-id)", 403, "FORBIDDEN"));
                }
                
                // Compare header ID with route parameter ID
                if (userIdHeader !== targetId) {
                    return next(new AppError("You can only access or update your own data.", 403, "FORBIDDEN"));
                }
            }
        }

        // If we got here, authorization is successful
        next();
    };
};

module.exports = authorize;
