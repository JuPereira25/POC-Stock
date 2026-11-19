using Microsoft.EntityFrameworkCore;
using Backend.Infrastructure.Database.Models;

namespace Backend.Infrastructure.Database;

public class StockDbContext : DbContext
{
    public StockDbContext(DbContextOptions<StockDbContext> options) : base(options)
    {
    }

    public DbSet<Produto> Produtos => Set<Produto>();
    public DbSet<Kit> Kits => Set<Kit>();
    public DbSet<PendenciaEstoque> PendenciasEstoque => Set<PendenciaEstoque>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Produto>(entity =>
        {
            entity.HasIndex(produto => produto.Qrcode).IsUnique();
            entity.Property(produto => produto.Qtd).HasDefaultValue(0);
            entity.Property(produto => produto.Status).HasDefaultValue(false);
            entity.Property(produto => produto.CriadoEm)
                .HasDefaultValueSql("NOW()")
                .ValueGeneratedOnAdd();
        });

        modelBuilder.Entity<Kit>(entity =>
        {
            entity.HasIndex(kit => new { kit.SerialKit, kit.ProdutoId }).IsUnique();
            entity.Property(kit => kit.Quantidade).HasDefaultValue(1);
            entity.Property(kit => kit.CriadoEm)
                .HasDefaultValueSql("NOW()")
                .ValueGeneratedOnAdd();
            entity.HasOne(kit => kit.Produto)
                .WithMany(produto => produto.Kits)
                .HasForeignKey(kit => kit.ProdutoId);
        });

        modelBuilder.Entity<PendenciaEstoque>(entity =>
        {
            entity.Property(pendencia => pendencia.Resolvida).HasDefaultValue(false);
            entity.Property(pendencia => pendencia.CriadoEm)
                .HasDefaultValueSql("NOW()")
                .ValueGeneratedOnAdd();
        });
    }
}
