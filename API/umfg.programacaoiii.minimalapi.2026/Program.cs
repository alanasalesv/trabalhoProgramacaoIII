using Microsoft.EntityFrameworkCore;
using QuestPDF;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using umfg.programacaoiii.minimalapi._2026.Contexto;
using umfg.programacaoiii.minimalapi._2026.DTO;
using umfg.programacaoiii.minimalapi._2026.Entidades;

namespace umfg.programacaoiii.minimalapi._2026;

public class Program
{    
    //método de startup do projeto
    public static void Main(string[] args)
    {
        //variavel padrão do .net permite definir as caracteristicas que a api irá ter
        //ex: autenticação e autorização via JWT / qual banco de dados
        var builder = WebApplication.CreateBuilder(args);
        var connectionString = builder.Configuration["ConnectionString"] ?? string.Empty;

        //aqui configuramos a conexão da API com o banco de dados
        builder.Services
            .AddDbContext<MySqlContexto>(options => options.UseMySQL(connectionString));
            //.AddDbContext<MySqlContexto>(options => options.UseMySQL("Server=localhost;Port=3308;Database=umfg_lembrete_develop;Uid=root;Pwd=root;"));

        //implementacao do CORS para permitir que a aplicação frontend acesse a API (localhost)
        //no mundo real, restrinja o acesso apenas para o dominio do frontend conhecido. Ex.: .WithOrigins("https://app.empresa.com.br")
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy
                    .AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        //aqui a aplicação é construída
        var app = builder.Build();

        app.MapPost("/lembretes", async (Lembrete lembrete, MySqlContexto contexto) =>
        {
            await contexto.Lembrete.AddAsync(lembrete);
            await contexto.SaveChangesAsync();

            return Results.Created($"/lembretes/{lembrete.Id}", lembrete);
        });

        app.MapGet("/lembretes/{id}", async (string id, MySqlContexto contexto) =>
        {
            if (string.IsNullOrWhiteSpace(id))
                return Results.BadRequest("id invalido!");

            return await contexto.Lembrete.FirstOrDefaultAsync(x => x.Id == Guid.Parse(id) && x.IsAtivo) 
            is Lembrete lembrete ? Results.Ok(lembrete) : Results.NotFound();
        });

        app.MapGet("/lembretes", async (MySqlContexto contexto) =>
        {
            return await contexto.Lembrete.Where(x => x.IsAtivo).ToListAsync();            
        });

        app.MapGet("/lembretes/filtro", async ([AsParameters] LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto) =>
        {
            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("Página e tamanho da página são obrigatórios.");

            var (lembretes, total) = await FiltrarLembretes(dto, contexto);

            var resultado = new LembreteQueryDTO.LembreteQueryResponseDTO()
            {
                Total = total,
                NumeroPagina = dto.NumeroPagina,
                TamanhoPagina = dto.TamanhoPagina,
                Lembretes = lembretes,
            };

            return Results.Ok(resultado);
        });

        //Biblioteca -> QuestPDF
        Settings.License = LicenseType.Community;

        app.MapGet("/lembretes/imprimir", async ([AsParameters] LembreteQueryDTO.LembreteQueryRequestDTO dto, MySqlContexto contexto) =>
        {
            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("Página e tamanho da página são obrigatórios.");

            if (dto.NumeroPagina <= 0 || dto.TamanhoPagina <= 0)
                return Results.BadRequest("Página e tamanho da página são obrigatórios.");

            var (lembretes, total) = await FiltrarLembretes(dto, contexto);

            var documento = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Color.FromHex("#FFFFFF"));

                    page.Header()
                        .Text("Relatório de Lembretes")
                        .SemiBold()
                        .FontSize(20)
                        .FontColor(Colors.Blue.Medium);

                    page
                        .Content()
                        .PaddingVertical(10)
                        .Column(column =>
                        {
                            column.Spacing(10);
                            column.Item().Text($"Gerado em: {DateTime.Now.ToLocalTime()}");

                            column
                                .Item()
                                .Table(tabela =>
                                {
                                    tabela.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn();
                                        columns.ConstantColumn(110);
                                        columns.ConstantColumn(110);                                        
                                        columns.ConstantColumn(80);                                        
                                    });

                                    tabela.Header(header =>
                                    {
                                        header.Cell().Text("Descrição").SemiBold();
                                        header.Cell().Text("Cadastro").SemiBold();
                                        header.Cell().Text("Atualização").SemiBold();
                                        header.Cell().Text("Status").SemiBold();
                                    });

                                    foreach (var lembrete in lembretes)
                                    {
                                        tabela.Cell().Text(lembrete.Descricao).FontSize(10);
                                        tabela.Cell().Text(lembrete.DataCadastro.ToLocalTime()).FontSize(10);
                                        tabela.Cell().Text(lembrete.DataAtualizacao.ToLocalTime()).FontSize(10);
                                        tabela.Cell()
                                            .Text(lembrete.IsAtivo  ? "Ativo" : "Inativo")
                                            .FontSize(10)
                                            .FontColor(lembrete.IsAtivo ? Colors.Green.Medium : Colors.Red.Medium);
                                    }
                                });
                        });

                    page.Footer().AlignCenter().Text(x => x.CurrentPageNumber());
                });
            });

            return Results.File(documento.GeneratePdf(), "application/pdf", "relatorio-lembretes.pdf");
        });


        app.MapDelete("/lembretes/{id}", async (string id, MySqlContexto contexto) =>
        {
            var lembrete = await contexto.Lembrete.FindAsync(Guid.Parse(id));

            //conceito de fail first
            if (lembrete is null)
                return Results.NotFound();

            lembrete.SetAtivo(false);
            lembrete.Update();

            contexto.Lembrete.Update(lembrete);
            await contexto.SaveChangesAsync();

            return Results.NoContent();
        });

        app.MapPut("/lembretes/{id}", async (string id, LembreteDTO dto, MySqlContexto contexto) =>
        {
            var lembreteExistente = await contexto.Lembrete.FindAsync(Guid.Parse(id));

            if (lembreteExistente is null)
                return Results.NotFound();

            lembreteExistente.SetDescricao(dto.Descricao);
            lembreteExistente.Update();

            contexto.Lembrete.Update(lembreteExistente);
            await contexto.SaveChangesAsync();

            return Results.Ok(lembreteExistente);
        });

        //aqui habilitamos as funcionalidades da api
        app.UseHttpsRedirection();

        //habilitar o uso da regra de CORS
        app.UseCors("Frontend");

        //a api é iniciada de fato
        app.Run();
        //tudo que for colocado após o run será executado somente quando a api for parada
    }


    private static async Task<(List<Lembrete>, long)> FiltrarLembretes(
        LembreteQueryDTO.LembreteQueryRequestDTO dto,
        MySqlContexto contexto)
    {
        var query = contexto.Lembrete
            .AsNoTracking()
            .Where(x => x.IsAtivo);


        // FILTRO POR DESCRIÇÃO

        if (!string.IsNullOrWhiteSpace(dto.Descricao))
        {
            var termo = dto.Descricao
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");

            query = query.Where(x =>
                EF.Functions.Like(x.Descricao, $"%{termo}%"));
        }


        // FILTRO POR DATA DE CADASTRO INICIAL

        if (dto.DataCadastroInicial.HasValue)
        {
            var dataInicial = dto.DataCadastroInicial.Value.Date;

            query = query.Where(x =>
                x.DataCadastro >= dataInicial);
        }


        // FILTRO POR DATA DE CADASTRO FINAL

        if (dto.DataCadastroFinal.HasValue)
        {
            var dataFinal = dto.DataCadastroFinal.Value.Date.AddDays(1);

            query = query.Where(x =>
                x.DataCadastro < dataFinal);
        }


        // FILTRO POR DATA DE ATUALIZAÇÃO INICIAL

        if (dto.DataAtualizacaoInicial.HasValue)
        {
            var dataInicial = dto.DataAtualizacaoInicial.Value.Date;

            query = query.Where(x =>
                x.DataAtualizacao >= dataInicial);
        }


        // FILTRO POR DATA DE ATUALIZAÇÃO FINAL

        if (dto.DataAtualizacaoFinal.HasValue)
        {
            var dataFinal = dto.DataAtualizacaoFinal.Value.Date.AddDays(1);

            query = query.Where(x =>
                x.DataAtualizacao < dataFinal);
        }


        // VALIDAR DIREÇÃO DA ORDENAÇÃO

        var direcao = (dto.Direcao ?? "DESC")
            .Trim()
            .ToUpperInvariant();

        if (direcao != "ASC" && direcao != "DESC")
        {
            direcao = "DESC";
        }


        // IDENTIFICAR O CAMPO DE ORDENAÇÃO

        var ordem = (dto.Ordem ?? "DataCadastro")
            .Trim()
            .ToUpperInvariant();


        // ORDENAR PELO CAMPO ESCOLHIDO

        query = (ordem, direcao) switch
        {
            ("DESCRICAO", "ASC") =>
                query.OrderBy(x => x.Descricao),

            ("DESCRICAO", "DESC") =>
                query.OrderByDescending(x => x.Descricao),

            ("DATACADASTRO", "ASC") =>
                query.OrderBy(x => x.DataCadastro),

            ("DATACADASTRO", "DESC") =>
                query.OrderByDescending(x => x.DataCadastro),

            ("DATAATUALIZACAO", "ASC") =>
                query.OrderBy(x => x.DataAtualizacao),

            ("DATAATUALIZACAO", "DESC") =>
                query.OrderByDescending(x => x.DataAtualizacao),

            _ =>
                query.OrderByDescending(x => x.DataCadastro)
        };


        // CONTAR REGISTROS

        var total = await query.LongCountAsync();


        // PAGINAÇÃO

        var pular = (dto.NumeroPagina - 1) * dto.TamanhoPagina;

        var lembretes = await query
            .Skip(pular)
            .Take(dto.TamanhoPagina)
            .ToListAsync();


        return (lembretes, total);
    }

}