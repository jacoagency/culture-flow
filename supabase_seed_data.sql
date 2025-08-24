-- Seed Data for CulturaFlow App
-- Execute this after running supabase_setup.sql

-- Insert cultural content
INSERT INTO public.cultural_content (title, description, content_type, category, subcategory, difficulty, duration_minutes, points_reward, image_url, facts, tags, language, region, is_trending) VALUES

-- Arte y Arquitectura
('La Sagrada Familia: Obra Maestra de Gaudí', 'Descubre los secretos arquitectónicos de la basílica más famosa de Barcelona, diseñada por Antoni Gaudí con un estilo único que combina arte gótico y Art Nouveau.', 'article', 'arte', 'arquitectura', 'beginner', 8, 15, 'https://images.unsplash.com/photo-1539650116574-75c0c6d0b727?w=500', ARRAY['La construcción comenzó en 1882 y continúa hasta hoy', 'Gaudí trabajó en el proyecto durante más de 40 años', 'Es Patrimonio de la Humanidad desde 1984', 'Recibe más de 4 millones de visitantes al año'], ARRAY['gaudi', 'arquitectura', 'barcelona', 'modernismo'], 'es', 'Cataluña', true),

('Frida Kahlo: El Dolor Como Arte', 'La vida y obra de Frida Kahlo, explorando cómo transformó su sufrimiento físico y emocional en arte revolucionario que inspiró generaciones.', 'article', 'arte', 'pintura', 'intermediate', 12, 20, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500', ARRAY['Pintó 143 obras, 55 de ellas autorretratos', 'Sufrió polio a los 6 años y un grave accidente a los 18', 'Se casó dos veces con Diego Rivera', 'Su casa es ahora el Museo Frida Kahlo'], ARRAY['frida-kahlo', 'mexico', 'surrealismo', 'autorretrato'], 'es', 'México', true),

('El Arte Mudéjar: Fusión de Culturas', 'Explora el arte mudéjar, un estilo arquitectónico único que representa la fusión entre las culturas cristiana e islámica en la España medieval.', 'article', 'arte', 'arquitectura', 'advanced', 15, 25, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500', ARRAY['Desarrollado entre los siglos XII y XVII', 'Combina elementos góticos, románicos e islámicos', 'Característico del uso de ladrillo, cerámica y yeso', 'Patrimonio de la Humanidad en varias ciudades españolas'], ARRAY['mudejar', 'espana', 'arquitectura-islamica', 'fusion-cultural'], 'es', 'España', false),

-- Historia
('La Conquista de Tenochtitlan', 'El encuentro de dos mundos: la caída del Imperio Azteca y las consecuencias que cambiarían para siempre la historia de América.', 'article', 'historia', 'prehispanica', 'intermediate', 10, 18, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500', ARRAY['Tenochtitlan tenía más de 200,000 habitantes', 'La conquista duró casi 2 años (1519-1521)', 'Hernán Cortés llegó con solo 600 hombres', 'Las enfermedades europeas mataron al 90% de la población indígena'], ARRAY['aztecas', 'conquista', 'tenochtitlan', 'hernan-cortes'], 'es', 'México', true),

('La Generación del 27: Poetas de una Época Dorada', 'Conoce a los poetas españoles que revolucionaron la literatura: García Lorca, Alberti, Cernuda y otros genios de las letras.', 'article', 'historia', 'literatura', 'intermediate', 13, 22, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500', ARRAY['Incluye a García Lorca, Alberti, Cernuda, Aleixandre', 'Se reunían en la Residencia de Estudiantes', 'Combinaron tradición y vanguardia', 'Muchos murieron en la Guerra Civil o se exiliaron'], ARRAY['generacion-27', 'poesia', 'garcia-lorca', 'literatura-espanola'], 'es', 'España', false),

-- Música
('El Flamenco: Pasión Andaluza', 'Descubre los orígenes del flamenco, su evolución y los grandes maestros que han llevado este arte por todo el mundo.', 'audio', 'musica', 'folclore', 'beginner', 7, 12, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500', ARRAY['Reconocido por la UNESCO como Patrimonio Cultural Inmaterial', 'Nació en Andalucía en el siglo XVIII', 'Combina cante, baile y guitarra', 'Paco de Lucía lo llevó al reconocimiento mundial'], ARRAY['flamenco', 'andalucia', 'guitarra', 'cante'], 'es', 'Andalucía', true),

('Tango: El Alma de Buenos Aires', 'La historia del tango desde los barrios de Buenos Aires hasta los salones de París, con sus grandes compositores y bailarines.', 'audio', 'musica', 'folclore', 'intermediate', 9, 16, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500', ARRAY['Nació en los arrabales de Buenos Aires a finales del siglo XIX', 'Carlos Gardel es considerado el rey del tango', 'Se baila en abrazo cerrado', 'Patrimonio Cultural Inmaterial de la Humanidad'], ARRAY['tango', 'argentina', 'carlos-gardel', 'baile'], 'es', 'Argentina', false),

-- Literatura
('Gabriel García Márquez y el Realismo Mágico', 'Explora el universo literario de García Márquez, donde la realidad se mezcla con la fantasía en historias que cautivaron al mundo.', 'article', 'literatura', 'novela', 'intermediate', 11, 19, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500', ARRAY['Ganó el Premio Nobel de Literatura en 1982', 'Cien años de soledad se tradujo a más de 40 idiomas', 'Creó el pueblo ficticio de Macondo', 'Periodista antes que novelista'], ARRAY['garcia-marquez', 'realismo-magico', 'macondo', 'colombia'], 'es', 'Colombia', true),

('Cervantes y Don Quijote: La Primera Novela Moderna', 'La obra cumbre de la literatura española y su impacto en la literatura universal, creando arquetipos que siguen vigentes.', 'article', 'literatura', 'novela', 'advanced', 14, 24, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500', ARRAY['Considerada la primera novela moderna', 'Segunda obra más traducida después de la Biblia', 'Cervantes perdió el uso de la mano izquierda en la batalla de Lepanto', 'Influyó en autores como Flaubert, Dickens y Kafka'], ARRAY['cervantes', 'don-quijote', 'siglo-de-oro', 'novela-moderna'], 'es', 'España', false),

-- Gastronomía
('La Paella: Orgullo de Valencia', 'Descubre el plato más internacional de España, sus variantes regionales y los secretos para preparar una auténtica paella valenciana.', 'article', 'gastronomia', 'platos-tipicos', 'beginner', 6, 10, 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=500', ARRAY['Originaria de Valencia en el siglo XVIII', 'Se cocina tradicionalmente en fuego de leña', 'El arroz bomba es fundamental', 'Existen más de 200 variantes documentadas'], ARRAY['paella', 'valencia', 'arroz', 'tradicion'], 'es', 'Valencia', true),

('Mole: El Platillo de los Dioses', 'La complejidad del mole mexicano, con sus múltiples ingredientes y el proceso artesanal que lo convierte en una obra maestra culinaria.', 'article', 'gastronomia', 'platos-tipicos', 'intermediate', 8, 14, 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=500', ARRAY['Puede contener más de 20 ingredientes', 'Su preparación puede tomar días', 'Patrimonio Cultural Inmaterial de la Humanidad', 'Cada región tiene su propia receta'], ARRAY['mole', 'mexico', 'chocolate', 'prehispanico'], 'es', 'México', false),

-- Tradiciones
('Día de los Muertos: Celebrando la Vida', 'Una tradición milenaria mexicana que celebra a los difuntos con color, música y comida, mostrando una perspectiva única sobre la muerte.', 'article', 'tradiciones', 'festivales', 'beginner', 9, 15, 'https://images.unsplash.com/photo-1509715513011-e394f0cb20c4?w=500', ARRAY['Se celebra los días 1 y 2 de noviembre', 'Patrimonio Oral e Inmaterial de la Humanidad', 'Combina tradiciones prehispánicas y católicas', 'Las catrinas son el símbolo más reconocido'], ARRAY['dia-muertos', 'mexico', 'catrinas', 'altares'], 'es', 'México', true),

('Las Fallas de Valencia: Arte Efímero', 'La fiesta más espectacular de Valencia, donde el arte y la tradición se unen para crear monumentos que duran solo unos días.', 'article', 'tradiciones', 'festivales', 'intermediate', 7, 12, 'https://images.unsplash.com/photo-1509715513011-e394f0cb20c4?w=500', ARRAY['Se celebran del 15 al 19 de marzo', 'Las fallas pueden costar cientos de miles de euros', 'Solo se salva una falla cada año', 'Patrimonio Cultural Inmaterial de la Humanidad'], ARRAY['fallas', 'valencia', 'ninots', 'cremá'], 'es', 'Valencia', false),

-- Ciencia y Tecnología (con contexto cultural)
('Los Mayas: Astrónomos Extraordinarios', 'Descubre cómo la civilización maya desarrolló uno de los sistemas astronómicos más precisos de la antigüedad.', 'interactive', 'ciencia', 'astronomia', 'intermediate', 10, 18, 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=500', ARRAY['Predijeron eclipses con precisión asombrosa', 'Su calendario era más exacto que el gregoriano', 'Conocían el concepto del cero antes que los europeos', 'Chichen Itzá es un observatorio astronómico'], ARRAY['mayas', 'astronomia', 'calendario', 'chichen-itza'], 'es', 'Mesoamérica', true),

-- Geografía Cultural
('Machu Picchu: La Ciudad Perdida de los Incas', 'Explora la maravilla arquitectónica inca, sus misterios y la sofisticada ingeniería que desafía el tiempo.', 'article', 'geografia', 'sitios-historicos', 'beginner', 8, 16, 'https://images.unsplash.com/photo-1526392060635-9d6019884377?w=500', ARRAY['Construida en el siglo XV a 2430 metros de altura', 'Redescubierta por Hiram Bingham en 1911', 'Patrimonio de la Humanidad desde 1983', 'Recibe límite de 2500 visitantes diarios'], ARRAY['machu-picchu', 'incas', 'peru', 'arquitectura-inca'], 'es', 'Perú', true);

-- Insert quiz content
INSERT INTO public.cultural_content (title, description, content_type, category, difficulty, duration_minutes, points_reward, quiz_questions, tags, language) VALUES
('Quiz: ¿Cuánto sabes de Arte Español?', 'Pon a prueba tus conocimientos sobre los grandes artistas españoles y sus obras maestras.', 'quiz', 'arte', 'intermediate', 5, 25, 
'[
  {
    "question": "¿Quién pintó Las Meninas?",
    "options": ["Diego Velázquez", "Francisco Goya", "Pablo Picasso", "Salvador Dalí"],
    "correct_answer": 0,
    "explanation": "Las Meninas fue pintada por Diego Velázquez en 1656 y es considerada una de las obras maestras de la pintura universal."
  },
  {
    "question": "¿En qué museo se encuentra el Guernica de Picasso?",
    "options": ["Museo del Prado", "Museo Reina Sofía", "Museo Thyssen", "Guggenheim Bilbao"],
    "correct_answer": 1,
    "explanation": "El Guernica se encuentra en el Museo Reina Sofía de Madrid desde 1992."
  },
  {
    "question": "¿Cuál es el estilo artístico característico de Salvador Dalí?",
    "options": ["Impresionismo", "Cubismo", "Surrealismo", "Expresionismo"],
    "correct_answer": 2,
    "explanation": "Salvador Dalí fue uno de los máximos representantes del surrealismo."
  }
]'::jsonb, ARRAY['quiz', 'arte-espanol', 'pintura'], 'es'),

('Quiz: Tradiciones Latinoamericanas', 'Descubre cuánto conoces sobre las tradiciones más coloridas de América Latina.', 'quiz', 'tradiciones', 'beginner', 4, 20,
'[
  {
    "question": "¿En qué país se celebra el Día de los Muertos?",
    "options": ["Colombia", "México", "Argentina", "Perú"],
    "correct_answer": 1,
    "explanation": "El Día de los Muertos es una tradición mexicana que celebra a los difuntos el 1 y 2 de noviembre."
  },
  {
    "question": "¿Cuál es el baile tradicional de Argentina?",
    "options": ["Salsa", "Merengue", "Tango", "Cumbia"],
    "correct_answer": 2,
    "explanation": "El tango es el baile tradicional más emblemático de Argentina, especialmente de Buenos Aires."
  },
  {
    "question": "¿Qué es una piñata?",
    "options": ["Un plato típico", "Un instrumento musical", "Una decoración para romper llena de dulces", "Un tipo de danza"],
    "correct_answer": 2,
    "explanation": "La piñata es una figura decorativa llena de dulces que se rompe en celebraciones, especialmente populares en México."
  }
]'::jsonb, ARRAY['quiz', 'tradiciones', 'latinoamerica'], 'es');

-- Update some content to be trending
UPDATE public.cultural_content SET is_trending = true 
WHERE title IN (
    'La Sagrada Familia: Obra Maestra de Gaudí',
    'Frida Kahlo: El Dolor Como Arte',
    'La Conquista de Tenochtitlan',
    'El Flamenco: Pasión Andaluza',
    'Gabriel García Márquez y el Realismo Mágico',
    'La Paella: Orgullo de Valencia',
    'Día de los Muertos: Celebrando la Vida',
    'Los Mayas: Astrónomos Extraordinarios',
    'Machu Picchu: La Ciudad Perdida de los Incas'
);

-- Add some initial view counts and likes to make content feel active
UPDATE public.cultural_content SET 
    view_count = floor(random() * 1000) + 100,
    like_count = floor(random() * 200) + 10,
    share_count = floor(random() * 50) + 1
WHERE is_trending = true;

UPDATE public.cultural_content SET 
    view_count = floor(random() * 500) + 50,
    like_count = floor(random() * 100) + 5,
    share_count = floor(random() * 20) + 1
WHERE is_trending = false;