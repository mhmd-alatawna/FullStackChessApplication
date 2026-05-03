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
            return next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
        }

        // Admin has full access
        if (userRole === 'admin' && allowedRoles.includes('admin')) {
            return next();
        }

        // Manager access
        if (userRole === 'manager' && allowedRoles.includes('manager')) {
            return next();
        }

        // User access: only allowed for specific routes and only for their own data
        if (userRole === 'user') {
            // If the route specifically allows 'user'
            if (allowedRoles.includes('user')) {
                // Check if they are accessing their own data (if :id is in params)
                if (req.params.id) {
                    if (userIdHeader === req.params.id) {
                        return next();
                    } else {
                        return next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
                    }
                }
                return next();
            }
        }

        // Check if role is in allowedRoles for other roles
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        return next(new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN"));
    };
};

module.exports = authorize;
