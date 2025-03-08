
CREATE DATABASE archery;

USE archery;

CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(25) NOT NULL
);

-- DROP TABLE categories;

INSERT INTO categories(name) 
VALUES 
('Infantil'), -- 1
('Novato'), -- 2
('Sub14'), -- 3
('Sub16'), -- 4
('Sub18'), -- 5
('Amateur'), -- 6
('Abierto'); -- 7

SELECT * FROM categories;

CREATE TABLE IF NOT EXISTS subcategories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(25) NOT NULL
);

INSERT INTO subcategories (name)
VALUES
    ('Compuesto'), -- 1  
    ('Recurvo'); -- 2
    
-- DROP TABLE subcategories;
SELECT * FROM subcategories;
    

SELECT * FROM subcategories;

CREATE TABLE IF NOT EXISTS participants(
	id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(25) NOT NULL,
    lastname VARCHAR(25) NOT NULL,
    category_id INT NOT NULL,
    subcategory_id INT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);
select * from participants;
-- INSERTAR PARTICIPANTES
INSERT INTO participants (name, lastname, category_id, subcategory_id)
	VALUES
		('PRUEBA1', 'PRUEBA1', 6, 2),
        ('PRUEBA2', 'PRUEBA2', 2, 1),
        ('PRUEBA3', 'PRUEBA3', 5, 2);

-- DROP TABLE participants;
SELECT * FROM participants;


CREATE TABLE series (
	id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    participant_id INT NOT NULL,
    series_number INT NOT NULL,
    FOREIGN KEY (participant_id) REFERENCES participants(id)
);

-- DROP TABLE series;

SELECT * FROM series;

-- INSERTAR PARTICIPANTES CON SUS SERIES
INSERT INTO series(participant_id, series_number)
	VALUES
		(3,1),
		(3,2);

CREATE TABLE arrows (
	id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    series_id INT NOT NULL,
    arrow_number INT NOT NULL,
    points INT NOT NULL DEFAULT 0,
    FOREIGN KEY (series_id) REFERENCES series(id)
);

-- DROP TABLE arrows;

SELECT * FROM arrows;

-- INSERTAR PARTICIPANTES CON SUS VALORES DE FLECHAS
INSERT INTO arrows(series_id, arrow_number, points)
	VALUES
		(10,1,2),(10,2,3),(10,3,5),(10,4,8),(10,5,2),(10,6,4),        
        (11,1,4),(11,2,5),(11,3,6),(11,4,7),(11,5,8),(11,6,9);
        
        
CREATE TABLE pointsperfect(
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    participant_id INT NOT NULL,
    total_x INT DEFAULT 0,
    FOREIGN KEY (participant_id) REFERENCES participants(id)
);

-- INSERTAR NUMERO DE "X"
INSERT INTO pointsperfect(participant_id,total_x)
	VALUES(12, 1);

-- DROP TABLE pointsperfect;
SELECT * FROM pointsperfect;

-- *************** TABLA ROLES PARA LOGIN

CREATE TABLE IF NOT EXISTS roles (
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    name ENUM('master', 'admin') NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES('master'), ('admin');

SELECT * FROM roles;


-- ***************** TABLA USERS PARA LOGIN

CREATE TABLE IF NOT EXISTS users (
	id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    FOREIGN KEY(role_id) REFERENCES roles(id)
);


SELECT * FROM users;




-- Sacar los 3 primeros lugares
SELECT id, name, lastname, points
FROM participants
ORDER BY points DESC;


-- ********** REVISAMOS PUNTAJE POR CADA FLECHA Y SERIE ASIGNADA AL "PARTICIPANTE"


SELECT 
    p.id, 
    p.name, 
    p.lastname, 
    c.name AS category_name, 
    sc.name AS subcategory_name,
    COALESCE(SUM(a.points), 0) AS total_points,
    COALESCE(pp.total_x, 0) AS total_x
FROM participants p
JOIN categories c ON p.category_id = c.id
JOIN subcategories sc ON p.subcategory_id = sc.id
LEFT JOIN series s ON p.id = s.participant_id
LEFT JOIN arrows a ON s.id = a.series_id
LEFT JOIN pointsperfect pp ON p.id = pp.participant_id
GROUP BY p.id, c.name, sc.name, pp.total_x
ORDER BY total_points DESC, total_x DESC;









    
