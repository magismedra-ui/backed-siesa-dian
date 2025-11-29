const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { username, password } = req.body;
  
  // TODO: Conectar con tabla de usuarios real.
  // Mock para demostración
  if (username === 'admin' && password === 'secret') {
    const secret = process.env.JWT_SECRET || 'default_secret_key';
    const token = jwt.sign(
      { username, role: 'admin' }, 
      secret, 
      { expiresIn: '2h' }
    );
    return res.json({ token });
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
};

module.exports = { login };

