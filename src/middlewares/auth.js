export function isAdminOrMaster(req, res, next) {
  console.log("User Role in session:", req.session.role); // Verificar el rol

  if (!req.session.userId) {
    return res.redirect('/'); // Si no hay sesión, redirigir al inicio
  }

  if (req.session.role === 1 || req.session.role === 2) { // Master y Admin pueden acceder
    return next();
  }

  return res.status(403).render('index', { error: 'Acceso denegado: solo administradores o master pueden ingresar.' });
}
