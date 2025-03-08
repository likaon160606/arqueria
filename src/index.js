import express from 'express';
import { engine } from 'express-handlebars';
import morgan from 'morgan';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import personasRoutes from './routes/personas.routes.js';
import usersRoutes from './routes/users.routes.js';
import authRoutes from './routes/auth.routes.js';
import methodOverride from 'method-override';
import session from 'express-session';
import flash from 'connect-flash';  // Importa connect-flash
import dotenv from 'dotenv';

dotenv.config();

// Inicialización de la aplicación
const app = express();

// Configuración de la app
const __dirname = dirname(fileURLToPath(import.meta.url));
app.set('port', process.env.PORT || 3000);
app.set('views', join(__dirname, 'views'));

// Handlebars
app.engine('.hbs', engine({
    defaultLayout: 'main',
    layoutsDir: join(app.get('views'), 'layouts'),
    partialsDir: join(app.get('views'), 'partials'),
    extname: '.hbs',
    helpers: {
        eq: (a, b) => a === b,
        neq: (a, b) => a !== b,
        isOdd: (number) => number % 2 !== 0 
    }
}));
app.set('view engine', '.hbs');

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de sesiones
app.use(session({
  secret: process.env.SECRET_KEY, // Se obtiene desde tu archivo .env
  resave: false,
  saveUninitialized: false
}));

// Configuración de flash
app.use(flash());  // Añadir flash después de la sesión

// 📌 Middleware para hacer disponible el usuario en todas las vistas
// Middleware para pasar la información del usuario a todas las vistas
app.use((req, res, next) => {
  // Solo pasa la información del usuario si está logueado
  res.locals.user = req.session.userId || null;

  // Pasar los mensajes flash a todas las vistas
  res.locals.successMessage = req.flash('successMessage');
  res.locals.errorMessage = req.flash('errorMessage');
  
  next();
});

// Uso de method-override después de inicializar la app
app.use(methodOverride('_method'));

// Rutas principales
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user }); // Pasamos `user` a la vista
});

app.use(personasRoutes);
app.use('/auth', authRoutes);
app.use(usersRoutes);

// Archivos estáticos
app.use(express.static(join(__dirname, 'public')));

// Ejecutar el servidor
app.listen(app.get('port'), () => {
    console.log('Server listening on port', app.get('port'));
});
