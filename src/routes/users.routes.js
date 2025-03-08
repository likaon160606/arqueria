import { Router } from "express";
import pool from "../database.js";
import bcrypt from "bcrypt";
import { isAdminOrMaster } from '../middlewares/auth.js'

const router = Router();

// ** Ruta para acceder a usuarios
router.get('/users', isAdminOrMaster, async (req, res) => {
    try {
        // Obtener todos los usuarios con role_id = 2 (admin)
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.email, r.name AS role
            FROM users u
            INNER JOIN roles r ON u.role_id = r.id
            WHERE u.role_id = 2
        `);

        // Filtrar el usuario logueado de la lista de usuarios
        const filteredUsers = users.filter(user => user.id !== req.session.userId);

        // Pasar los usuarios filtrados a la vista
        res.render('participants/users', { 
            users: filteredUsers,
            isActiveAdd: false, 
            isActiveSeries: false, 
            isActiveList: false, 
            isActiveUsers: true,
            userId: req.session.userId, // Asegurarse de pasar la variable
            userName: req.session.userName,
            role: req.session.role
        });

    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).send('Error en el servidor');
    }
});


// **Crear un nuevo usuario**
router.post('/register', isAdminOrMaster, async (req, res) => {
    try {
        const { username, email, password, role_id } = req.body;

        // Validar que los campos no estén vacíos
        if (!username || !email || !password || !role_id) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // Verificar si el role_id existe en la base de datos
        const [roleCheck] = await pool.query('SELECT id FROM roles WHERE id = ?', [role_id]);
        if (roleCheck.length === 0) {
            return res.status(400).json({ error: 'El role_id especificado no es válido' });
        }

        // Si el rol es master, verificar si ya existe un usuario master
        if (role_id === 1) { // 1 es el ID del rol 'master'
            const [masterCheck] = await pool.query('SELECT id FROM users WHERE role_id = 1');
            if (masterCheck.length > 0) {
                return res.status(400).json({ error: 'Ya existe un usuario master. No se puede crear otro.' });
            }
        }

        // Hashear la contraseña antes de guardarla
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insertar el usuario en la base de datos
        await pool.query(
            'INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)', 
            [username, email, password_hash, role_id]
        );

          // Mensaje de éxito
        req.flash('successMessage', 'Usuario creado exitosamente');
        res.redirect('/users');
        
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para verificar si ya existe un usuario master
router.get('/check-master', async (req, res) => {
    try {
        const [masterCheck] = await pool.query('SELECT id FROM users WHERE role_id = 1');
        
        if (masterCheck.length > 0) {
            return res.json({ existsMaster: true });
        }
        return res.json({ existsMaster: false });
    } catch (error) {
        console.error('Error al verificar master:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// **Eliminar un usuario**
router.delete('/delete/:id', isAdminOrMaster, async (req, res) => {
  try {
      const { id } = req.params;

      // Verificar si el usuario a eliminar existe y obtener su role_id
      const [user] = await pool.query('SELECT id, role_id FROM users WHERE id = ?', [id]);
      if (user.length === 0) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const userToDelete = user[0];

      // Verificar permisos: Si es "admin" (role_id = 2), no puede eliminar a "master" (role_id = 1)
      if (req.session.role === 2 && userToDelete.role_id === 1) {
          return res.status(403).json({ error: 'No puedes eliminar a un usuario master' });
      }

      // Eliminar el usuario
      await pool.query('DELETE FROM users WHERE id = ?', [id]);

      res.json({ message: 'Usuario eliminado exitosamente' });

  } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// **Obtener la lista de usuarios**
router.get('/list-users', isAdminOrMaster, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.email, r.name AS role
            FROM users u
            INNER JOIN roles r ON u.role_id = r.id
        `);

        res.json(users);

    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

export default router;
