const { body } = require('express-validator');

// Validation rules untuk register
const registerValidation = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),
    body('nomor_hp')
        .optional()
        .matches(/^[0-9+\-\s()]+$/)
        .withMessage('Invalid phone number format')
        .isLength({ max: 20 })
        .withMessage('Phone number too long'),
    body('alamat')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Address too long'),
    body('role')
        .optional()
        .isIn(['admin', 'user'])
        .withMessage('Invalid role')
];

// Validation rules untuk login
const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Validation rules untuk chat message
const chatMessageValidation = [
    body('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters')
];

module.exports = {
    registerValidation,
    loginValidation,
    chatMessageValidation
};



