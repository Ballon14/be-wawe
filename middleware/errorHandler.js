// Centralized error handler untuk routes
function handleError(err, res, customMessage = "Operation failed") {
    console.error('Error:', err);
    
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Jangan expose error detail di production
    if (isDevelopment) {
        return res.status(500).json({ 
            error: customMessage,
            details: err.message 
        });
    }
    
    return res.status(500).json({ error: customMessage });
}

module.exports = { handleError };






