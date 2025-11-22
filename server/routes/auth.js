const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;

  // Verifica password
  if (password === process.env.ADMIN_PASSWORD) {
    // Genera JWT token
    const token = jwt.sign(
      { admin: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      message: 'Login effettuato con successo'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Password errata'
  });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const { token } = req.body;

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ success: true, valid: true });
  } catch (error) {
    return res.json({ success: true, valid: false });
  }
});

module.exports = router;