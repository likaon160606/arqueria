import { Router } from "express";
import pool from '../database.js';
import { isAdminOrMaster } from '../middlewares/auth.js'

const router = Router();


router.get('/add', isAdminOrMaster, (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/'); // Si no está logueado, redirigir al inicio
    }
    next(); // Si está logueado, pasar al siguiente middleware
}, async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories');
        const [subcategories] = await pool.query('SELECT * FROM subcategories');

        // Renderizar la vista con las variables del menú activadas
        res.render('participants/add', { 
            categories, 
            subcategories,
            userId: req.session.userId, // Pasar la información del usuario a la vista
            userName: req.session.userName,
            role: req.session.role,
            isActiveAdd: true, // Activar el menú "Agregar"
            isActiveSeries: false, // Desactivar el menú "Series"
            isActiveList: false, // Desactivar el menú "Lista"
            isActiveUsers: false // Desactivar el menú "Competición"
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar la página');
    }
});


router.post('/add',  isAdminOrMaster, async (req, res) => {
    const { name, lastname, category_id, subcategory_id } = req.body;

    try {
        const query = `
            INSERT INTO participants (name, lastname, category_id, subcategory_id)
            VALUES (?, ?, ?, ?)
        `;
        await pool.query(query, [name, lastname, category_id, subcategory_id]);
        req.flash('successMessage', 'Participante creado exitosamente');
        res.redirect('/add');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al crear el participante');
    }
});


router.get("/series", isAdminOrMaster, async (req, res) => {
    // console.log("RUTA SERIES - Usuario logueado:", req.session.userId, "Rol:", req.session.role);
  
    try {
      const [participants] = await pool.execute(
        `SELECT 
            id, 
            CONCAT(UCASE(LEFT(name, 1)), LCASE(SUBSTRING(name, 2))) AS name, 
            CONCAT(UCASE(LEFT(lastname, 1)), LCASE(SUBSTRING(lastname, 2))) AS lastname
        FROM participants 
        ORDER BY name ASC;
        `);
  
      // Renderizar la vista de series
      res.render("participants/series", { 
        participants,
        isActiveAdd: false, 
        isActiveSeries: true, 
        isActiveList: false, 
        isActiveUsers: false,
        userId: req.session.userId, // Asegurarse de pasar la variable
        userName: req.session.userName,
        role: req.session.role
      });
    } catch (error) {
      console.error("Error al obtener participantes:", error.message);
      res.status(500).send("Error al cargar la vista de series.");
    }
  });
  
  
router.post('/series/:participantId', isAdminOrMaster, async (req, res) => {
    const { participantId } = req.params;
    const { series } = req.body; // `series` debe ser un array con las series y flechas

    if (!Array.isArray(series) || series.length === 0) {
        return res.status(400).json({ error: 'Debes proporcionar al menos una serie con flechas.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Validar si el participante existe
        const [participant] = await connection.query(
            'SELECT id FROM participants WHERE id = ?',
            [participantId]
        );

        if (participant.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Participante no encontrado' });
        }

        for (const serie of series) {
            const { series_number, arrows } = serie;

            if (!series_number || !Array.isArray(arrows) || arrows.length === 0) {
                throw new Error(
                    'Cada serie debe tener un `series_number` y al menos una flecha.'
                );
            }

            // Verificar si la serie ya existe para el participante
            const [existingSeries] = await connection.query(
                'SELECT id FROM series WHERE participant_id = ? AND series_number = ?',
                [participantId, series_number]
            );

            let seriesId;
            if (existingSeries.length > 0) {
                seriesId = existingSeries[0].id;
            } else {
                // Insertar la serie si no existe
                const [result] = await connection.query(
                    'INSERT INTO series (participant_id, series_number) VALUES (?, ?)',
                    [participantId, series_number]
                );
                seriesId = result.insertId;
            }

            // Verificar si las flechas ya existen
            for (const arrow of arrows) {
                const { arrow_number, points } = arrow;

                const [existingArrow] = await connection.query(
                    'SELECT id FROM arrows WHERE series_id = ? AND arrow_number = ?',
                    [seriesId, arrow_number]
                );

                if (existingArrow.length > 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        error: 'Estás ingresando un dato duplicado, revisa la lista de participantes e intenta nuevamente'
                    });
                }

                // Insertar la flecha si no existe
                await connection.query(
                    'INSERT INTO arrows (series_id, arrow_number, points) VALUES (?, ?, ?)',
                    [seriesId, arrow_number, points]
                );
            }
        }

        await connection.commit();
        req.flash('successMessage', 'Series y flechas creadas con éxito.');
        res.redirect('/users');
        // res.status(201).json({ message: 'Series y flechas creadas con éxito.' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al crear series y flechas.' });
    } finally {
        connection.release();
    }
});


router.get("/pointsperfect", isAdminOrMaster, async (req, res) => {
    try {
      const [participants] = await pool.execute("SELECT * FROM participants");
  
      res.render("participants/pointsperfect", { participants });
    } catch (error) {
      console.error("Error al obtener participantes:", error.message);
      res.status(500).send("Error al cargar la vista de pointsperfect.");
    }
  });


router.post('/pointsperfect/:participantId', isAdminOrMaster, async (req, res) => {
    const { participantId } = req.params;
    const { total_x } = req.body; // Este valor se ingresa en el front-end

    try {
        const query = `
            INSERT INTO pointsperfect (participant_id, total_x)
            VALUES (?, ?)`;
        await pool.query(query, [participantId, total_x]);
        res.status(201).json({ message: 'Total de X actualizado correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el total de X' });
    }
});


router.get('/list', isAdminOrMaster, async (req, res) => {
    try {
        const { category, subcategory } = req.query; // Obtener los filtros desde la URL

        let query = `
            SELECT 
                p.id AS participant_id, 
                CONCAT(UPPER(SUBSTRING(p.name, 1, 1)), LOWER(SUBSTRING(p.name, 2))) AS participant_name, 
                CONCAT(UPPER(SUBSTRING(p.lastname, 1, 1)), LOWER(SUBSTRING(p.lastname, 2))) AS participant_lastname,
                COALESCE(a.points, 0) AS arrow_points,  
                a.arrow_number,  
                s.series_number,  
                c.name AS category_name,
                sc.name AS subcategory_name,
                COALESCE(pp.total_x, 0) AS total_x
            FROM participants p
            INNER JOIN categories c ON p.category_id = c.id
            INNER JOIN subcategories sc ON p.subcategory_id = sc.id
            LEFT JOIN series s ON p.id = s.participant_id
            LEFT JOIN arrows a ON s.id = a.series_id
            LEFT JOIN pointsperfect pp ON p.id = pp.participant_id
            WHERE 1=1
        `;

        const params = [];

        // Si hay filtro de categoría
        if (category) {
            query += " AND c.name = ?";
            params.push(category);
        }

        // Si hay filtro de subcategoría
        if (subcategory) {
            query += " AND sc.name = ?";
            params.push(subcategory);
        }

        // Ordenar por apellido de A-Z
        query += " ORDER BY p.lastname ASC, p.id, s.series_number, a.arrow_number";

        const [result] = await pool.query(query, params);

        // Obtener todas las categorías y subcategorías para el filtro
        const [categories] = await pool.query("SELECT DISTINCT name FROM categories");
        const [subcategories] = await pool.query("SELECT DISTINCT name FROM subcategories");

        // Transformar los resultados en un objeto estructurado
        const participants = {};
        result.forEach(row => {
            const participantId = row.participant_id;

            if (!participants[participantId]) {
                participants[participantId] = {
                    id: participantId,
                    name: row.participant_name,
                    lastname: row.participant_lastname,
                    total_points: 0,  // Suma de puntos de las flechas
                    category: row.category_name,
                    subcategory: row.subcategory_name,
                    total_x: row.total_x, // Capturamos el total de "X"
                    series: [],
                };
            }

            // Sumar puntos de las flechas
            participants[participantId].total_points += row.arrow_points;

            // Agregar series y flechas
            const seriesIndex = row.series_number ? row.series_number - 1 : 0;
            if (!participants[participantId].series[seriesIndex]) {
                participants[participantId].series[seriesIndex] = {
                    series_number: row.series_number || 0,
                    arrows: [],
                };
            }
            if (row.arrow_number) {
                participants[participantId].series[seriesIndex].arrows.push({
                    arrow_number: row.arrow_number,
                    points: row.arrow_points,
                });
            }
        });

        // Convertir el objeto a un array y asegurarnos de que sigue ordenado por apellido
        const sortedParticipants = Object.values(participants).sort((a, b) => a.lastname.localeCompare(b.lastname));

        // Renderizar la vista con los filtros
        res.render('participants/list', { 
            participants: sortedParticipants,
            categories: categories.map(c => c.name),
            subcategories: subcategories.map(sc => sc.name),
            selectedCategory: category || "",
            selectedSubcategory: subcategory || "",
            isActiveAdd: false, 
            isActiveSeries: false, 
            isActiveList: true, 
            isActiveUsers: false, 
            userId: req.session.userId, 
            userName: req.session.userName,
            role: req.session.role
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar la lista de participantes');
    }
});


router.get('/edit/:id', isAdminOrMaster, async (req, res) => {
    const { id } = req.params;
    
    const [participant] = await pool.query('SELECT * FROM participants WHERE id = ?', [id]);
    const [categories] = await pool.query('SELECT * FROM categories');
    const [subcategories] = await pool.query('SELECT * FROM subcategories');

    const [totalXResult] = await pool.query(
        'SELECT total_x FROM pointsperfect WHERE participant_id = ?',
        [id]
    );

    // Si no hay registro en pointsperfect, asignamos 0 como valor por defecto
    const total_x = totalXResult.length > 0 ? totalXResult[0].total_x : 0;

    const [series] = await pool.query(`
        SELECT 
            s.id AS series_id, 
            s.series_number, 
            a.id AS arrow_id,
            a.arrow_number, 
            a.points
        FROM series s
        LEFT JOIN arrows a ON s.id = a.series_id
        WHERE s.participant_id = ?
        ORDER BY s.series_number ASC, a.arrow_number ASC
    `, [id]);

    // Agrupar series con sus flechas
    const seriesMap = new Map();
    
    series.forEach(row => {
        if (!seriesMap.has(row.series_id)) {
            seriesMap.set(row.series_id, {
                series_id: row.series_id, 
                series_number: row.series_number,
                arrows: []
            });
        }
        if (row.arrow_number !== null) {
            seriesMap.get(row.series_id).arrows.push({
                arrow_id: row.arrow_id, 
                arrow_number: row.arrow_number,
                points: row.points
            });
        }
    });

    // Convertir el Map a un array para Handlebars
    const formattedSeries = Array.from(seriesMap.values());

    res.render('participants/edit', { 
        persona: participant[0], 
        categories, 
        subcategories, 
        series: formattedSeries,
        total_x // ✅ Pasamos `total_x` a la vista
    });
});


router.post('/edit/:id', isAdminOrMaster, async (req, res) => {
    const { id } = req.params;
    const { name, lastname, category_id, subcategory_id, total_x, series } = req.body;

    console.log('Datos recibidos en el backend:', JSON.stringify(req.body, null, 2));

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // **Actualizar participante**
        await connection.query(
            'UPDATE participants SET name = ?, lastname = ?, category_id = ?, subcategory_id = ? WHERE id = ?',
            [name, lastname, category_id, subcategory_id, id]
        );

        // **Actualizar total_x en pointsperfect**
        const [existingPoints] = await connection.query(
            'SELECT id FROM pointsperfect WHERE participant_id = ?',
            [id]
        );

        if (existingPoints.length > 0) {
            // Si existe, actualizamos el registro
            await connection.query(
                'UPDATE pointsperfect SET total_x = ? WHERE participant_id = ?',
                [total_x, id]
            );
        } else {
            // Si no existe, creamos un nuevo registro
            await connection.query(
                'INSERT INTO pointsperfect (participant_id, total_x) VALUES (?, ?)',
                [id, total_x]
            );
        }

        // **Actualizar series y flechas**
        if (series && Array.isArray(series)) {
            for (let serie of series) {
                console.log('Procesando serie:', serie);

                const { series_id, series_number, arrows } = serie;
                if (!series_id || !series_number) {
                    console.warn('Datos inválidos en serie:', serie);
                    continue;
                }

                await connection.query(
                    'UPDATE series SET series_number = ? WHERE id = ?',
                    [series_number, series_id]
                );

                if (arrows && Array.isArray(arrows)) {
                    for (let arrow of arrows) {
                        const { arrow_id, points } = arrow;
                        if (!arrow_id || isNaN(points)) {
                            console.warn('Datos inválidos en flecha:', arrow);
                            continue;
                        }

                        await connection.query(
                            'UPDATE arrows SET points = ? WHERE id = ?',
                            [points, arrow_id]
                        );
                    }
                }
            }
        }

        await connection.commit();
        res.redirect('/list');
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.status(500).send('Error al actualizar los datos');
    } finally {
        connection.release();
    }
});


router.get('/delete/:id', isAdminOrMaster, async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Primero eliminamos las flechas
        await connection.query(
            'DELETE FROM arrows WHERE series_id IN (SELECT id FROM series WHERE participant_id = ?)',
            [id]
        );

        // Eliminamos las series
        await connection.query('DELETE FROM series WHERE participant_id = ?', [id]);

        // Eliminamos el registro en pointsperfect
        await connection.query('DELETE FROM pointsperfect WHERE participant_id = ?', [id]);

        // Finalmente eliminamos al participante
        await connection.query('DELETE FROM participants WHERE id = ?', [id]);

        await connection.commit();
        res.redirect('/list');
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).send('Error al eliminar el participante');
    } finally {
        connection.release();
    }
});


router.delete('/delete-series/:series_id', isAdminOrMaster, async (req, res) => {
    const { series_id } = req.params;

    try {
        // Eliminar primero las flechas asociadas
        await pool.query('DELETE FROM arrows WHERE series_id = ?', [series_id]);

        // Luego eliminar la serie
        const [result] = await pool.query('DELETE FROM series WHERE id = ?', [series_id]);

        if (result.affectedRows > 0) {
            res.sendStatus(200); // OK
        } else {
            res.sendStatus(404); // No encontrado
        }
    } catch (error) {
        console.error('Error al eliminar la serie:', error);
        res.status(500).send('Error al eliminar la serie');
    }
});


router.delete('/delete-arrow/:arrow_id', isAdminOrMaster, async (req, res) => {
    const { arrow_id } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM arrows WHERE id = ?', [arrow_id]);

        if (result.affectedRows > 0) {
            res.sendStatus(200); // OK
        } else {
            res.sendStatus(404); // No encontrado
        }
    } catch (error) {
        console.error('Error al eliminar la flecha:', error);
        res.status(500).send('Error al eliminar la flecha');
    }
});


router.get('/filter', isAdminOrMaster, async (req, res) => {
    try {
        const { category, subcategory } = req.query;

        const query = `
            SELECT p.id, p.name, p.lastname, c.name AS category, s.name AS subcategory
            FROM participants p
            INNER JOIN categories c ON p.category_id = c.id
            INNER JOIN subcategories s ON p.subcategory_id = s.id
            WHERE c.name = ? AND s.name = ?
        `;
        const [result] = await pool.query(query, [category, subcategory]);

        res.render('participants/filter', { participants: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/competition', async (req, res) => {
    try {
        const { category, subcategory } = req.query; // Obtener los filtros desde la URL

        let query = `
            SELECT 
                p.id AS participant_id, 
                CONCAT(UPPER(SUBSTRING(p.name, 1, 1)), LOWER(SUBSTRING(p.name, 2))) AS participant_name, 
                CONCAT(UPPER(SUBSTRING(p.lastname, 1, 1)), LOWER(SUBSTRING(p.lastname, 2))) AS participant_lastname, 
                COALESCE(a.points, 0) AS arrow_points,  
                a.arrow_number,  
                s.series_number,  
                c.name AS category_name,
                sc.name AS subcategory_name,
                COALESCE(pp.total_x, 0) AS total_x
            FROM participants p
            INNER JOIN categories c ON p.category_id = c.id
            INNER JOIN subcategories sc ON p.subcategory_id = sc.id
            LEFT JOIN series s ON p.id = s.participant_id
            LEFT JOIN arrows a ON s.id = a.series_id
            LEFT JOIN pointsperfect pp ON p.id = pp.participant_id
            WHERE 1=1
        `;

        const params = [];

        // Aplicar filtros
        if (category) {
            query += " AND c.name = ?";
            params.push(category);
        }
        if (subcategory) {
            query += " AND sc.name = ?";
            params.push(subcategory);
        }

        // Ordenar por apellido de A-Z (temporalmente, luego los ordenaremos manualmente)
        query += " ORDER BY p.lastname ASC, p.id, s.series_number, a.arrow_number";

        const [result] = await pool.query(query, params);

        // Obtener todas las categorías y subcategorías para el filtro
        const [categories] = await pool.query("SELECT DISTINCT name FROM categories");
        const [subcategories] = await pool.query("SELECT DISTINCT name FROM subcategories");

        // Transformar los resultados en un objeto estructurado
        const participants = {};
        result.forEach(row => {
            const participantId = row.participant_id;

            if (!participants[participantId]) {
                participants[participantId] = {
                    id: participantId,
                    name: row.participant_name,
                    lastname: row.participant_lastname,
                    total_points: 0,  // Suma de puntos de las flechas
                    category: row.category_name,
                    subcategory: row.subcategory_name,
                    total_x: row.total_x, // Capturamos el total de "X"
                    series: [],
                };
            }

            // Sumar puntos de las flechas
            participants[participantId].total_points += row.arrow_points;

            // Agregar series y flechas
            const seriesIndex = row.series_number ? row.series_number - 1 : 0;
            if (!participants[participantId].series[seriesIndex]) {
                participants[participantId].series[seriesIndex] = {
                    series_number: row.series_number || 0,
                    arrows: [],
                };
            }
            if (row.arrow_number) {
                participants[participantId].series[seriesIndex].arrows.push({
                    arrow_number: row.arrow_number,
                    points: row.arrow_points,
                });
            }
        });

        // Convertir el objeto a un array y ordenar por:
        // 1. total_points (de mayor a menor)
        // 2. total_x (de mayor a menor, en caso de empate)
        let sortedParticipants = Object.values(participants).sort((a, b) => {
            if (b.total_points !== a.total_points) {
                return b.total_points - a.total_points; // Mayor puntaje primero
            }
            return b.total_x - a.total_x; // En caso de empate, mayor "X" primero
        });

        // **Asignar el "Lugar" (posición) a cada participante**
        sortedParticipants.forEach((participant, index) => {
            participant.place = index + 1;
        });

        // Renderizar la vista con los datos procesados
        res.render('participants/competition', { 
            participants: sortedParticipants,
            category: category || 'Todas', 
            subcategory: subcategory || 'Todas',
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar la lista de participantes');
    }
});




export default router;