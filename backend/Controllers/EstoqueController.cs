using Backend.Infrastructure.Database;
using Backend.Infrastructure.Database.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/estoque")]
public class EstoqueController : ControllerBase
{
    private readonly StockDbContext _dbContext;

    public EstoqueController(StockDbContext dbContext) => _dbContext = dbContext;

    [HttpGet("kits")]
    public async Task<IActionResult> ListarKits()
    {
        var kits = await _dbContext.Kits
            .AsNoTracking()
            .GroupBy(item => item.SerialKit)
            .Select(grupo => new
            {
                SerialKit = grupo.Key,
                Itens = grupo.OrderBy(item => item.Produto.Nome).Select(item => new
                {
                    item.ProdutoId,
                    Produto = item.Produto.Nome,
                    item.Quantidade
                })
            })
            .OrderBy(kit => kit.SerialKit)
            .ToListAsync();

        return Ok(kits);
    }

    [HttpPost("saidas-kit")]
    public async Task<IActionResult> RegistrarSaidaKit(RegistrarSaidaKitRequest request)
    {
        var serial = request.SerialKit?.Trim();
        var posto = request.Posto?.Trim();
        if (string.IsNullOrWhiteSpace(serial) || string.IsNullOrWhiteSpace(posto))
            return BadRequest(new { mensagem = "O posto e o kit são obrigatórios." });

        var itens = await _dbContext.Kits
            .Include(item => item.Produto)
            .Where(item => item.SerialKit.ToLower() == serial.ToLower())
            .ToListAsync();

        if (itens.Count == 0)
            return NotFound(new { mensagem = "Nenhum kit encontrado." });

        var produtosSemEstoque = itens
            .Where(item => item.Produto.Qtd < item.Quantidade)
            .Select(item => new
            {
                item.ProdutoId,
                Produto = item.Produto.Nome,
                QuantidadeNecessaria = item.Quantidade,
                QuantidadeDisponivel = item.Produto.Qtd
            })
            .OrderBy(item => item.Produto)
            .ToList();

        if (produtosSemEstoque.Count > 0)
        {
            return Conflict(new
            {
                mensagem = "Estoque insuficiente para liberar o kit.",
                produtosSemEstoque
            });
        }

        PendenciaEstoque? solicitacaoPendente = null;
        if (request.PendenciaId is not null)
        {
            solicitacaoPendente = await _dbContext.PendenciasEstoque
                .FirstOrDefaultAsync(pendencia =>
                    pendencia.Id == request.PendenciaId &&
                    !pendencia.Resolvida &&
                    pendencia.Tipo == "solicitacao");
            if (solicitacaoPendente is null)
                return BadRequest(new { mensagem = "A solicitação pendente não foi encontrada." });
        }

        var novasPendencias = new List<PendenciaEstoque>();
        foreach (var item in itens)
        {
            item.Produto.Qtd -= item.Quantidade;
            item.Produto.Status = item.Produto.Qtd > 0;

            if (!item.Produto.Status)
            {
                var descricao = $"{item.Produto.Nome} está sem no estoque. Quantidade atual: {item.Produto.Qtd}.";
                var pendencia = new PendenciaEstoque
                {
                    Posto = posto,
                    Descricao = descricao
                };
                _dbContext.PendenciasEstoque.Add(pendencia);
                novasPendencias.Add(pendencia);
            }
        }

        if (solicitacaoPendente is not null)
        {
            solicitacaoPendente.Resolvida = true;
            solicitacaoPendente.ResolvidoEm = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            serialKit = serial,
            posto,
            produtosAbaixo = novasPendencias.Select(pendencia => new
            {
                pendencia.Id,
                Station = pendencia.Posto,
                Description = pendencia.Descricao,
                pendencia.Tipo
            })
        });
    }

    [HttpGet("pendencias")]
    public async Task<IActionResult> ListarPendencias()
    {
        var pendencias = await _dbContext.PendenciasEstoque.AsNoTracking()
            .Where(pendencia => !pendencia.Resolvida)
            .OrderBy(pendencia => pendencia.CriadoEm)
            .Select(pendencia => new
            {
                pendencia.Id,
                Station = pendencia.Posto,
                Description = pendencia.Descricao,
                pendencia.Tipo
            })
            .ToListAsync();
        return Ok(pendencias);
    }

    [HttpPost("pendencias")]
    public async Task<IActionResult> CriarPendencia(CriarPendenciaRequest request)
    {
        var posto = request.Posto?.Trim();
        var descricao = request.Descricao?.Trim();
        if (string.IsNullOrWhiteSpace(posto) || string.IsNullOrWhiteSpace(descricao))
            return BadRequest(new { mensagem = "O posto e a descrição são obrigatórios." });

        var pendencia = new PendenciaEstoque
        {
            Posto = posto,
            Descricao = descricao,
            Tipo = "solicitacao"
        };
        _dbContext.PendenciasEstoque.Add(pendencia);
        await _dbContext.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new
        {
            pendencia.Id,
            Station = pendencia.Posto,
            Description = pendencia.Descricao,
            pendencia.Tipo
        });
    }

    [HttpPatch("pendencias/{id:int}/resolver")]
    public async Task<IActionResult> ResolverPendencia(int id)
    {
        var pendencia = await _dbContext.PendenciasEstoque.FindAsync(id);
        if (pendencia is null || pendencia.Resolvida) return NotFound();
        pendencia.Resolvida = true;
        pendencia.ResolvidoEm = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }
}

public class RegistrarSaidaKitRequest
{
    public string Posto { get; set; } = string.Empty;
    public string SerialKit { get; set; } = string.Empty;
    public int? PendenciaId { get; set; }
}

public class CriarPendenciaRequest
{
    public string Posto { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
}
