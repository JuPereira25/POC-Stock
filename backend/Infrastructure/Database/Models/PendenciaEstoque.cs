using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Infrastructure.Database.Models;

[Table("pendencia_estoque")]
public class PendenciaEstoque
{
    [Column("id")]
    public int Id { get; set; }

    [Column("posto")]
    [MaxLength(100)]
    public required string Posto { get; set; }

    [Column("descricao")]
    [MaxLength(500)]
    public required string Descricao { get; set; }

    [Column("tipo")]
    [MaxLength(30)]
    public string Tipo { get; set; } = "estoque";

    [Column("resolvida")]
    public bool Resolvida { get; set; }

    [Column("criado_em")]
    public DateTime CriadoEm { get; set; }

    [Column("resolvido_em")]
    public DateTime? ResolvidoEm { get; set; }
}
