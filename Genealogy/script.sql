DELETE FROM [dbo].[Genealogy] WHERE [RecordID] BETWEEN 1 AND 25;

INSERT INTO [dbo].[Genealogy] ([RecordID], [ParentID], [Name], [BirthYear], [GenerationTitle])
VALUES
    ( 1,  0, 'John',     1701, 'Great-Great-Great-Great-Great-Grandfather'),
    ( 2,  1, 'Samuel',   1733, 'Great-Great-Great-Great-Grandfather'),
    ( 3,  2, 'William',  1762, 'Great-Great-Great-Grandfather'),
    ( 4,  3, 'Thomas',   1794, 'Great-Great-Grandfather'),
    ( 5,  4, 'Henry',    1824, 'Great-Grandfather'),
    ( 6,  5, 'Edward',   1856, 'Grandfather'),
    ( 7,  6, 'Robert',   1885, 'Father'),
    ( 8,  7, 'Michael',  1914, 'Self'),
    ( 9,  8, 'David',    1946, 'Son'),
    (10,  9, 'James',    1975, 'Grandson'),
    (11, 10, 'Noah',     2003, 'Great-Grandson'),

    (12,  8, 'Sarah',    1949, 'Daughter'),
    (13, 12, 'Emma',     1978, 'Granddaughter'),
    (14,  8, 'Peter',    1952, 'Son'),
    (15, 14, 'Lucas',    1981, 'Grandson'),
    (16, 15, 'Olivia',   2006, 'Great-Granddaughter'),

    (17,  7, 'Margaret', 1910, 'Sister'),
    (18, 17, 'Charles',  1938, 'Nephew'),
    (19, 18, 'Sophia',   1965, 'Great-Niece'),

    (20,  6, 'George',   1888, 'Uncle'),
    (21, 20, 'Arthur',   1919, 'Cousin'),
    (22, 21, 'Helen',    1948, 'Cousin'),

    (23,  5, 'Walter',   1859, 'Great-Uncle'),
    (24, 23, 'Frank',    1890, 'Cousin'),
    (25, 24, 'Irene',    1920, 'Cousin');
