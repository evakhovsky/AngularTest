using Genealogy.Models;
using Microsoft.EntityFrameworkCore;

namespace Genealogy.Data;

public class GenealogyContext : DbContext
{
    public GenealogyContext(DbContextOptions<GenealogyContext> options) : base(options)
    {
    }

    public DbSet<GenealogyRecord> Genealogy => Set<GenealogyRecord>();
    public DbSet<GenealogyBaselineRecord> GenealogyBaseline => Set<GenealogyBaselineRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GenealogyRecord>(entity =>
        {
            entity.ToTable("Genealogy", "dbo");
            entity.HasKey(e => e.RecordID);
            entity.Property(e => e.RecordID).ValueGeneratedNever();
            entity.Property(e => e.ParentID).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.GenerationTitle).HasMaxLength(255);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
        });

        modelBuilder.Entity<GenealogyBaselineRecord>(entity =>
        {
            entity.ToTable("GenealogyBaseline", "dbo");
            entity.HasKey(e => e.RecordID);
            entity.Property(e => e.RecordID).ValueGeneratedNever();
            entity.Property(e => e.ParentID).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.GenerationTitle).HasMaxLength(255);
        });
    }
}
