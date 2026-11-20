const API_URL = "https://localhost:7063";

let paginaAtual = 1;

let campoOrdenacao = "DataCadastro";

let direcaoOrdenacao = "DESC";

let temporizadorToast = null;




// Formulário

const formulario = document.getElementById("formulario");

const formLembrete = document.getElementById("formLembrete");

const lembreteId = document.getElementById("lembreteId");

const descricao = document.getElementById("descricao");

const tituloFormulario = document.getElementById("tituloFormulario");


// Listagem

const listaLembretes = document.getElementById("listaLembretes");

const mensagemVazia = document.getElementById("mensagemVazia");

const totalRegistros = document.getElementById("totalRegistros");

const paginaAtualElemento = document.getElementById("paginaAtual");


// Filtros

const filtroDescricao = document.getElementById("filtroDescricao");

const filtroDataCadastroInicial =
    document.getElementById("filtroDataCadastroInicial");

const filtroDataCadastroFinal =
    document.getElementById("filtroDataCadastroFinal");

const filtroDataAtualizacaoInicial =
    document.getElementById("filtroDataAtualizacaoInicial");

const filtroDataAtualizacaoFinal =
    document.getElementById("filtroDataAtualizacaoFinal");

const tamanhoPagina = document.getElementById("tamanhoPagina");


// Botões

const btnImprimir = document.getElementById("btnImprimir");

const btnNovo = document.getElementById("btnNovo");

const btnCancelar = document.getElementById("btnCancelar");

const btnFiltrar = document.getElementById("btnFiltrar");

const btnAnterior = document.getElementById("btnAnterior");

const btnProximo = document.getElementById("btnProximo");




document.addEventListener("DOMContentLoaded", () => {

    atualizarIndicadoresOrdenacao();

    filtrarLembretes();

});




function validarIntervalosData() {

    const intervalos = [
        {
            inicial: filtroDataCadastroInicial.value,
            final: filtroDataCadastroFinal.value,
            nome: "cadastro"
        },
        {
            inicial: filtroDataAtualizacaoInicial.value,
            final: filtroDataAtualizacaoFinal.value,
            nome: "atualização"
        }
    ];

    for (const intervalo of intervalos) {

        if (
            intervalo.inicial &&
            intervalo.final &&
            intervalo.inicial > intervalo.final
        ) {

            mostrarToast(
                `A data inicial de ${intervalo.nome} não pode ser posterior à data final.`
            );

            return false;

        }

    }

    return true;

}




function montarParametrosConsulta() {

    const params = new URLSearchParams();

    params.set("NumeroPagina", paginaAtual);

    params.set("TamanhoPagina", tamanhoPagina.value);

    params.set("Ordem", campoOrdenacao);

    params.set("Direcao", direcaoOrdenacao);


    // Descrição: envia somente quando estiver preenchida

    if (filtroDescricao.value.trim()) {

        params.set("Descricao", filtroDescricao.value.trim());

    }


    // Datas: envia somente os campos preenchidos

    const filtrosData = [

        {
            nome: "DataCadastroInicial",
            valor: filtroDataCadastroInicial.value
        },

        {
            nome: "DataCadastroFinal",
            valor: filtroDataCadastroFinal.value
        },

        {
            nome: "DataAtualizacaoInicial",
            valor: filtroDataAtualizacaoInicial.value
        },

        {
            nome: "DataAtualizacaoFinal",
            valor: filtroDataAtualizacaoFinal.value
        }

    ];


    filtrosData.forEach(filtro => {

        if (filtro.valor) {

            params.set(filtro.nome, filtro.valor);

        }

    });


    return params;

}




async function obterMensagemErro(response) {

    try {

        const texto = await response.text();

        return texto || `Erro HTTP ${response.status}`;

    } catch {

        return `Erro HTTP ${response.status}`;

    }

}




async function filtrarLembretes() {

    if (!validarIntervalosData()) {

        return;

    }

    try {

        const params = montarParametrosConsulta();

        const response = await fetch(
            `${API_URL}/lembretes/filtro?${params.toString()}`
        );


        if (!response.ok) {

            throw new Error(
                await obterMensagemErro(response)
            );

        }


        const resultado = await response.json();

        const total = Number(resultado.total ?? 0);

        const quantidade = Number(
            resultado.tamanhoPagina || tamanhoPagina.value
        );


        // Calcula a quantidade de páginas

        const totalPaginas = Math.max(
            1,
            Math.ceil(total / quantidade)
        );


        // Corrige a página caso os registros tenham diminuído

        if (paginaAtual > totalPaginas) {

            paginaAtual = totalPaginas;

            return await filtrarLembretes();

        }


        // Renderiza a tabela

        renderizarLembretes(resultado.lembretes);


        // Atualiza quantidade de registros

        totalRegistros.textContent =
            `${total} ${total === 1 ? "registro" : "registros"}`;


        // Atualiza a paginação

        paginaAtualElemento.textContent =
            `Página ${paginaAtual} de ${totalPaginas}`;


        btnAnterior.disabled =
            paginaAtual <= 1;


        btnProximo.disabled =
            paginaAtual >= totalPaginas || total === 0;


    } catch (error) {

        console.error("Erro ao consultar lembretes:", error);

        if (error instanceof TypeError) {

            mostrarToast(
                "Não foi possível conectar à API."
            );

        } else {

            mostrarToast(
                "Não foi possível carregar os lembretes."
            );

        }

    }

}




async function imprimirLembretes() {

    if (!validarIntervalosData()) {

        return;

    }

    try {

        const params = montarParametrosConsulta();

        const response = await fetch(
            `${API_URL}/lembretes/imprimir?${params.toString()}`
        );


        if (!response.ok) {

            throw new Error(
                await obterMensagemErro(response)
            );

        }


        const blob = await response.blob();

        const url = URL.createObjectURL(blob);


        const link = document.createElement("a");

        link.href = url;

        link.download = "relatorio-lembretes.pdf";


        document.body.appendChild(link);

        link.click();

        link.remove();


        setTimeout(() => {

            URL.revokeObjectURL(url);

        }, 10000);


        mostrarToast(
            "Relatório gerado com sucesso!"
        );


    } catch (error) {

        console.error("Erro ao gerar relatório:", error);

        mostrarToast(
            "Não foi possível gerar o relatório."
        );

    }

}




async function criarLembrete() {

    try {

        const dados = {

            descricao: descricao.value.trim()

        };


        const response = await fetch(
            `${API_URL}/lembretes`,
            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(dados)

            }
        );


        if (!response.ok) {

            throw new Error(
                await obterMensagemErro(response)
            );

        }


        mostrarToast(
            "Lembrete cadastrado com sucesso!"
        );


        fecharFormulario();

        paginaAtual = 1;

        await filtrarLembretes();


    } catch (error) {

        console.error("Erro ao cadastrar:", error);

        mostrarToast(
            error instanceof TypeError
                ? "Não foi possível conectar à API."
                : "Não foi possível cadastrar o lembrete."
        );

    }

}




async function buscarLembrete(id) {

    try {

        const response = await fetch(
            `${API_URL}/lembretes/${id}`
        );


        if (!response.ok) {

            throw new Error(
                await obterMensagemErro(response)
            );

        }


        const lembrete = await response.json();


        lembreteId.value = lembrete.id;

        descricao.value = lembrete.descricao;


        tituloFormulario.textContent =
            "Editar lembrete";


        formulario.classList.remove("hidden");

        descricao.focus();

        formulario.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {

        console.error("Erro ao buscar lembrete:", error);

        mostrarToast(
            "Não foi possível buscar o lembrete."
        );

    }

}




async function atualizarLembrete() {

    try {

        const dados = {

            descricao: descricao.value.trim()

        };


        const response = await fetch(
            `${API_URL}/lembretes/${lembreteId.value}`,
            {

                method: "PUT",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(dados)

            }
        );


        if (!response.ok) {

            throw new Error(
                await obterMensagemErro(response)
            );

        }


        mostrarToast(
            "Lembrete atualizado com sucesso!"
        );


        fecharFormulario();

        await filtrarLembretes();


    } catch (error) {

        console.error("Erro ao atualizar:", error);

        mostrarToast(
            error instanceof TypeError
                ? "Não foi possível conectar à API."
                : "Não foi possível atualizar o lembrete."
        );

    }

}



async function excluirLembrete(id) {

    const confirmou = confirm(
        "Deseja realmente excluir este lembrete?"
    );


    if (!confirmou) {

        return;

    }


    try {

        const response = await fetch(
            `${API_URL}/lembretes/${id}`,
            {

                method: "DELETE"

            }
        );


        if (!response.ok) {

            throw new Error(
                await obterMensagemErro(response)
            );

        }


        mostrarToast(
            "Lembrete excluído com sucesso!"
        );


        await filtrarLembretes();


    } catch (error) {

        console.error("Erro ao excluir:", error);

        mostrarToast(
            error instanceof TypeError
                ? "Não foi possível conectar à API."
                : "Não foi possível excluir o lembrete."
        );

    }

}




function renderizarLembretes(lembretes) {

    listaLembretes.innerHTML = "";


    if (!lembretes || lembretes.length === 0) {

        mensagemVazia.classList.remove("hidden");

        return;

    }


    mensagemVazia.classList.add("hidden");


    lembretes.forEach(lembrete => {

        const tr = document.createElement("tr");


        // Descrição

        const tdDescricao = document.createElement("td");

        tdDescricao.textContent = lembrete.descricao ?? "";


        // Data de cadastro

        const tdCadastro = document.createElement("td");

        tdCadastro.textContent =
            formatarData(lembrete.dataCadastro);


        // Data de atualização

        const tdAtualizacao = document.createElement("td");

        tdAtualizacao.textContent =
            formatarData(lembrete.dataAtualizacao);


        // Status

        const tdStatus = document.createElement("td");

        const status = document.createElement("span");

        status.classList.add("status");

        if (lembrete.isAtivo) {

            status.classList.add("status-ativo");

            status.textContent = "Ativo";

        } else {

            status.classList.add("status-inativo");

            status.textContent = "Inativo";

        }

        tdStatus.appendChild(status);


        // Ações

        const tdAcoes = document.createElement("td");

        const divAcoes = document.createElement("div");

        divAcoes.classList.add("actions");


        const btnEditar = document.createElement("button");

        btnEditar.type = "button";

        btnEditar.className = "btn btn-edit";

        btnEditar.textContent = "Editar";

        btnEditar.addEventListener("click", () => {

            buscarLembrete(lembrete.id);

        });


        const btnExcluir = document.createElement("button");

        btnExcluir.type = "button";

        btnExcluir.className = "btn btn-danger";

        btnExcluir.textContent = "Excluir";

        btnExcluir.addEventListener("click", () => {

            excluirLembrete(lembrete.id);

        });


        divAcoes.appendChild(btnEditar);

        divAcoes.appendChild(btnExcluir);

        tdAcoes.appendChild(divAcoes);


        // Monta a linha

        tr.appendChild(tdDescricao);

        tr.appendChild(tdCadastro);

        tr.appendChild(tdAtualizacao);

        tr.appendChild(tdStatus);

        tr.appendChild(tdAcoes);


        listaLembretes.appendChild(tr);

    });

}




btnNovo.addEventListener("click", () => {

    abrirFormularioNovo();

});


btnCancelar.addEventListener("click", () => {

    fecharFormulario();

});


formLembrete.addEventListener("submit", async event => {

    event.preventDefault();


    if (!descricao.value.trim()) {

        mostrarToast(
            "Informe uma descrição."
        );

        descricao.focus();

        return;

    }


    if (descricao.value.trim().length > 500) {

        mostrarToast(
            "A descrição deve ter no máximo 500 caracteres."
        );

        return;

    }


    if (lembreteId.value) {

        await atualizarLembrete();

    } else {

        await criarLembrete();

    }

});


function abrirFormularioNovo() {

    lembreteId.value = "";

    descricao.value = "";


    tituloFormulario.textContent =
        "Novo lembrete";


    formulario.classList.remove("hidden");

    descricao.focus();


    formulario.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


function fecharFormulario() {

    formulario.classList.add("hidden");

    formLembrete.reset();

    lembreteId.value = "";

}




btnFiltrar.addEventListener("click", () => {

    paginaAtual = 1;

    filtrarLembretes();

});




filtroDescricao.addEventListener("keydown", event => {

    if (event.key === "Enter") {

        event.preventDefault();

        paginaAtual = 1;

        filtrarLembretes();

    }

});




tamanhoPagina.addEventListener("change", () => {

    paginaAtual = 1;

    filtrarLembretes();

});




document.querySelectorAll("[data-sort]").forEach(botao => {

    botao.addEventListener("click", () => {

        const novaOrdem = botao.dataset.sort;


        if (campoOrdenacao === novaOrdem) {



            direcaoOrdenacao =
                direcaoOrdenacao === "ASC"
                    ? "DESC"
                    : "ASC";

        } else {

            campoOrdenacao = novaOrdem;


          

            direcaoOrdenacao =
                novaOrdem === "Descricao"
                    ? "ASC"
                    : "DESC";

        }


        paginaAtual = 1;

        atualizarIndicadoresOrdenacao();

        filtrarLembretes();

    });

});


function atualizarIndicadoresOrdenacao() {

    document.querySelectorAll("[data-sort]").forEach(botao => {

        const coluna = botao.dataset.sort;

        const selecionado =
            coluna === campoOrdenacao;


        const indicador =
            botao.querySelector(".sort-indicator");


        botao.setAttribute(
            "aria-pressed",
            String(selecionado)
        );


        const th = botao.closest("th");


        if (selecionado) {

            indicador.textContent =
                direcaoOrdenacao === "ASC" ? "↑" : "↓";

            th.setAttribute(
                "aria-sort",
                direcaoOrdenacao === "ASC"
                    ? "ascending"
                    : "descending"
            );

        } else {

            indicador.textContent = "↕";

            th.setAttribute(
                "aria-sort",
                "none"
            );

        }

    });

}




btnAnterior.addEventListener("click", () => {

    if (paginaAtual > 1) {

        paginaAtual--;

        filtrarLembretes();

    }

});


btnProximo.addEventListener("click", () => {

    if (!btnProximo.disabled) {

        paginaAtual++;

        filtrarLembretes();

    }

});




btnImprimir.addEventListener("click", () => {

    imprimirLembretes();

});




function formatarData(data) {

    if (!data) {

        return "-";

    }


    const dataConvertida = new Date(data);


    if (Number.isNaN(dataConvertida.getTime())) {

        return "-";

    }


    return dataConvertida.toLocaleString(
        "pt-BR"
    );

}




function mostrarToast(mensagem) {

    const toast = document.getElementById("toast");


    toast.textContent = mensagem;

    toast.classList.remove("hidden");


 

    if (temporizadorToast) {

        clearTimeout(temporizadorToast);

    }


    temporizadorToast = setTimeout(() => {

        toast.classList.add("hidden");

    }, 3500);

}
