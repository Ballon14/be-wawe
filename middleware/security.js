const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');

// Rate limiting untuk auth endpoints (mencegah brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // 5 request per window
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting untuk general API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // 100 request per window
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting untuk chat (mencegah spam)
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 10, // 10 pesan per menit
    message: 'Too many messages, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Input validation middleware
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors.array() 
        });
    };
};

// Sanitize input (basic)
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Remove potential script tags
                req.body[key] = req.body[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .trim();
            }
        });
    }
    next();
};

module.exports = {
    authLimiter,
    apiLimiter,
    chatLimiter,
    validate,
    sanitizeInput
};

