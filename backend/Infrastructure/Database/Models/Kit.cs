using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Infrastructure.Database.Models;

[Table("kit")]
public class Kit
{
    [Column("id")]
    public int Id { get; set; }

    [Column("serial_kit")]
    [MaxLength(100)]
    public required string SerialKit { get; set; }

    [Column("produto_id")]
    public int ProdutoId { get; set; }

    [Column("quantidade")]
    [Range(1, int.MaxValue)]
    public int Quantidade { get; set; } = 1;

    [Column("criado_em")]
    public DateTime CriadoEm { get; set; }

    [ForeignKey(nameof(ProdutoId))]
    public Produto Produto { get; set; } = null!;
}
