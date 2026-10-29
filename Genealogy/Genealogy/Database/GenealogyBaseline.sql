-- Run once against the pristine source database before applying staged changes.
-- The baseline table is intentionally not refreshed after it has been created.
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.Genealogy', 'IsDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.Genealogy
        ADD IsDeleted bit NOT NULL
            CONSTRAINT DF_Genealogy_IsDeleted DEFAULT (0) WITH VALUES;
END;

IF OBJECT_ID('dbo.GenealogyBaseline', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.GenealogyBaseline
    (
        RecordID int NOT NULL,
        ParentID nvarchar(255) NOT NULL,
        Name nvarchar(255) NOT NULL,
        BirthYear int NOT NULL,
        GenerationTitle nvarchar(255) NOT NULL,
        IsDeleted bit NOT NULL,
        CONSTRAINT PK_GenealogyBaseline PRIMARY KEY (RecordID)
    );

    INSERT INTO dbo.GenealogyBaseline
        (RecordID, ParentID, Name, BirthYear, GenerationTitle, IsDeleted)
    SELECT
        RecordID, ParentID, Name, BirthYear, GenerationTitle, IsDeleted
    FROM dbo.Genealogy;
END;

COMMIT TRANSACTION;
