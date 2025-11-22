const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Prendi il token dall'header Authorization
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token non fornito' 
      });
    }

    // Verifica il token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token non valido o scaduto' 
    });
  }
};

module.exports = authMiddleware;