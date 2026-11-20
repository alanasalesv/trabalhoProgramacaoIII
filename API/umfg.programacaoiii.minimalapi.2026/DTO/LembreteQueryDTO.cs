
using umfg.programacaoiii.minimalapi._2026.Entidades;

namespace umfg.programacaoiii.minimalapi._2026.DTO;

public sealed class LembreteQueryDTO
{
    public sealed class LembreteQueryRequestDTO
    {
        public int NumeroPagina { get; set; } = 1;

        public int TamanhoPagina { get; set; } = 10;

        public string Ordem { get; set; } = "DataCadastro";

        public string Direcao { get; set; } = "DESC";

        // Descricao agora e opcional
        public string? Descricao { get; set; } = string.Empty;

        // Datas opcionais
        public DateTime? DataCadastroInicial { get; set; }

        public DateTime? DataCadastroFinal { get; set; }

        public DateTime? DataAtualizacaoInicial { get; set; }

        public DateTime? DataAtualizacaoFinal { get; set; }
    }

    public sealed class LembreteQueryResponseDTO
    {
        public ICollection<Lembrete> Lembretes { get; set; } = [];

        public long Total { get; set; } = 0;

        public int NumeroPagina { get; set; } = 0;

        public int TamanhoPagina { get; set; } = 0;
    }
}
