const jwt = require('jsonwebtoken');
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            // FIX: Changed status code from 403 to 401. This is the correct code for an
            // expired or invalid token, and it's what the frontend's axios interceptor
            // is expecting in order to trigger the token refresh mechanism.
            return res.sendStatus(401); // Unauthorized (was 403 Forbidden)
        }
        req.user = user;
        next();
    });
};

module.exports = authMiddleware;