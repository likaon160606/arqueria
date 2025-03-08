// auth.routes.js
import { Router } from 'express';
import pool from '../database.js';
import bcrypt from 'bcrypt';

const router = Router();

// Endpoint para realizar login
const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validación del formato del email
  if (!emailRegex.test(email)) {
    return res.status(400).render('index', { error: 'Email inválido' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).render('index', { error: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).render('index', { error: 'Contraseña incorrecta' });
    }

    // Autenticación exitosa: guardar más datos relevantes en la sesión
    req.session.userId = user.id;
    req.session.role = user.role_id;
    req.session.userName = user.name;  // Aquí guardamos el nombre del usuario

    return res.redirect('/add');
  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).render('index', { error: 'Error en el servidor' });
  }
});


// Endpoint para cerrar sesión
router.get('/logout', (req, res) => {
  // Destruir la sesión para cerrar sesión
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).render('index', { error: 'Error al cerrar sesión' });
    }
    // Redirigir a la página principal después de cerrar sesión
    res.redirect('/');
  });
});



export default router;
