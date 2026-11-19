using Backend.Infrastructure.Database;
using Backend.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Backend.Controllers;

[ApiController]
[Route("api/produtos")]
public class ProdutosController : ControllerBase
{
    private readonly StockDbContext _dbContext;

    public ProdutosController(StockDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<Produto>>> Listar()
    {
        var produtos = await _dbContext.Produtos
            .AsNoTracking()
            .OrderBy(produto => produto.Nome)
            .ToListAsync();

        return Ok(produtos);
    }

    [HttpGet("abaixo")]
    public async Task<IActionResult> ListarAbaixoDoEstoque()
    {
        var produtos = await _dbContext.Produtos
            .AsNoTracking()
            .Where(produto => produto.Qtd <= 0)
            .OrderBy(produto => produto.Nome)
            .Select(produto => new
            {
                produto.Id,
                produto.Nome,
                produto.Qtd
            })
            .ToListAsync();

        return Ok(produtos);
    }

    [HttpPost]
    public async Task<ActionResult<Produto>> Cadastrar(Produto produto)
    {
        if (string.IsNullOrWhiteSpace(produto.Nome))
            return BadRequest(new { mensagem = "O nome do produto é obrigatório." });

        if (produto.Qtd < 0)
            return BadRequest(new { mensagem = "A quantidade não pode ser negativa." });

        produto.Id = 0;
        produto.Nome = produto.Nome.Trim();
        produto.Status = produto.Qtd > 0;
        produto.Qrcode = string.IsNullOrWhiteSpace(produto.Qrcode) ? null : produto.Qrcode.Trim();
        produto.Kits = [];

        _dbContext.Produtos.Add(produto);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new { mensagem = "Já existe um produto com esse QR Code." });
        }

        return CreatedAtAction(nameof(Listar), new { id = produto.Id }, produto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id)
    {
        var produto = await _dbContext.Produtos.FindAsync(id);

        if (produto is null)
            return NotFound();

        _dbContext.Produtos.Remove(produto);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation })
        {
            return Conflict(new { mensagem = "O produto pertence a um kit e não pode ser excluído." });
        }

        return NoContent();
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Editar(int id, ProdutoEdicaoRequest request)
    {
        var produto = await _dbContext.Produtos.FindAsync(id);
        if (produto is null) return NotFound(new { mensagem = "Produto não encontrado." });
        if (string.IsNullOrWhiteSpace(request.Nome))
            return BadRequest(new { mensagem = "O nome do produto é obrigatório." });
        if (request.Qtd < 0)
            return BadRequest(new { mensagem = "A quantidade não pode ser negativa." });

        produto.Nome = request.Nome.Trim();
        produto.Qtd = request.Qtd;
        produto.Status = produto.Qtd > 0;
        produto.Qrcode = string.IsNullOrWhiteSpace(request.Qrcode) ? null : request.Qrcode.Trim();

        try { await _dbContext.SaveChangesAsync(); }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { return Conflict(new { mensagem = "Já existe um produto com esse QR Code." }); }

        return Ok(produto);
    }
}

public class ProdutoEdicaoRequest
{
    public string Nome { get; set; } = string.Empty;
    public int Qtd { get; set; }
    public bool Status { get; set; }
    public string? Qrcode { get; set; }
}
