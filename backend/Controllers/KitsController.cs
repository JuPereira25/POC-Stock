using Backend.Infrastructure.Database;
using Backend.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Backend.Controllers;

[ApiController]
[Route("api/kits")]
public class KitsController : ControllerBase
{
    private readonly StockDbContext _dbContext;

    public KitsController(StockDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("{serialKit}")]
    public async Task<IActionResult> BuscarPorSerial(string serialKit)
    {
        var serial = serialKit.Trim().ToLower();

        var itens = await _dbContext.Kits
            .AsNoTracking()
            .Where(kit => kit.SerialKit.ToLower() == serial)
            .OrderBy(kit => kit.Produto.Nome)
            .Select(kit => new
            {
                kit.Id,
                kit.SerialKit,
                kit.ProdutoId,
                Produto = kit.Produto.Nome,
                kit.Quantidade,
                Status = kit.Produto.Qtd > 0,
                Qrcode = kit.Produto.Qrcode
            })
            .ToListAsync();

        if (itens.Count == 0)
            return NotFound(new { mensagem = "Kit não encontrado." });

        return Ok(itens);
    }

    [HttpPost]
    public async Task<IActionResult> Cadastrar(CriarKitRequest request)
    {
        var serialKit = request.SerialKit?.Trim();
        var itensSolicitados = request.Itens ?? [];
        var produtoIds = itensSolicitados.Select(item => item.ProdutoId).Distinct().ToArray();

        if (string.IsNullOrWhiteSpace(serialKit))
            return BadRequest(new { mensagem = "O serial do kit é obrigatório." });

        if (itensSolicitados.Length == 0)
            return BadRequest(new { mensagem = "Selecione pelo menos um produto." });

        if (produtoIds.Length != itensSolicitados.Length)
            return BadRequest(new { mensagem = "Um produto não pode ser repetido no mesmo kit." });

        if (itensSolicitados.Any(item => item.Quantidade < 1))
            return BadRequest(new { mensagem = "A quantidade de cada produto deve ser pelo menos 1." });

        var quantidadeProdutos = await _dbContext.Produtos
            .CountAsync(produto => produtoIds.Contains(produto.Id));

        if (quantidadeProdutos != produtoIds.Length)
            return BadRequest(new { mensagem = "Um ou mais produtos selecionados não existem." });

        var itens = itensSolicitados.Select(item => new Kit
        {
            SerialKit = serialKit,
            ProdutoId = item.ProdutoId,
            Quantidade = item.Quantidade
        });

        _dbContext.Kits.AddRange(itens);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new { mensagem = "Esse produto já foi adicionado ao kit informado." });
        }

        return StatusCode(StatusCodes.Status201Created, new { serialKit, itens = itensSolicitados });
    }
}

public class CriarKitRequest
{
    public string SerialKit { get; set; } = string.Empty;
    public CriarKitItemRequest[] Itens { get; set; } = [];
}

public class CriarKitItemRequest
{
    public int ProdutoId { get; set; }
    public int Quantidade { get; set; }
}
