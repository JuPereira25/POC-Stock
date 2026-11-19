using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Infrastructure.Database.Models;

[Table("produto")]
public class Produto
{
    [Column("id")]
    public int Id { get; set; }

    [Column("nome")]
    [MaxLength(255)]
    public required string Nome { get; set; }

    [Column("qtd")]
    public int Qtd { get; set; }

    [Column("status")]
    public bool Status { get; set; }

    [Column("qrcode")]
    [MaxLength(255)]
    public string? Qrcode { get; set; }

    [Column("criado_em")]
    public DateTime CriadoEm { get; set; }

    public ICollection<Kit> Kits { get; set; } = [];
}
