// Dados de exemplo (simulando banco de dados)
const servicosDisponiveis = [
    {
        id: 1,
        name: "Limpeza Básica",
        imageUrl: "https://placehold.co/200x200/3498db/ffffff?text=Limpeza",
        description: "Limpeza completa do equipamento",
        btuPrices: [
            { btu: "9.000 BTUs", price: 120 },
            { btu: "12.000 BTUs", price: 150 },
            { btu: "18.000 BTUs", price: 180 },
            { btu: "24.000 BTUs", price: 210 },
            { btu: "30.000 BTUs", price: 250 },
            { btu: "36.000 BTUs", price: 290 },
            { btu: "48.000 BTUs", price: 350 }
        ],
        showBudget: true,
        showSchedule: true
    },
    {
        id: 2,
        name: "Manutenção Preventiva",
        imageUrl: "https://placehold.co/200x200/2ecc71/ffffff?text=Manutenção",
        description: "Revisão completa do sistema",
        btuPrices: [
            { btu: "9.000 BTUs", price: 200 },
            { btu: "12.000 BTUs", price: 250 },
            { btu: "18.000 BTUs", price: 300 },
            { btu: "24.000 BTUs", price: 350 },
            { btu: "30.000 BTUs", price: 400 },
            { btu: "36.000 BTUs", price: 450 },
            { btu: "48.000 BTUs", price: 550 }
        ],
        showBudget: true,
        showSchedule: true
    },
    {
        id: 3,
        name: "Instalação",
        imageUrl: "https://placehold.co/200x200/e74c3c/ffffff?text=Instalação",
        description: "Instalação profissional de equipamentos",
        btuPrices: [
            { btu: "9.000 BTUs", price: 300 },
            { btu: "12.000 BTUs", price: 400 },
            { btu: "18.000 BTUs", price: 500 },
            { btu: "24.000 BTUs", price: 600 },
            { btu: "30.000 BTUs", price: 700 },
            { btu: "36.000 BTUs", price: 800 },
            { btu: "48.000 BTUs", price: 1000 }
        ],
        showBudget: true,
        showSchedule: true
    },
    {
        id: 4,
        name: "Recarga de Gás",
        imageUrl: "https://placehold.co/200x200/9b59b6/ffffff?text=Recarga",
        description: "Recarga completa de gás refrigerante",
        btuPrices: [
            { btu: "9.000 BTUs", price: 250 },
            { btu: "12.000 BTUs", price: 300 },
            { btu: "18.000 BTUs", price: 350 },
            { btu: "24.000 BTUs", price: 400 },
            { btu: "30.000 BTUs", price: 450 },
            { btu: "36.000 BTUs", price: 500 },
            { btu: "48.000 BTUs", price: 600 }
        ],
        showBudget: true,
        showSchedule: true
    }
];

// Estado da aplicação
const appState = {
    servicosSelecionados: [],
    configSite: {
        companyName: "O Esquimó - Refrigeração",
        description: "Serviços especializados em ar condicionado e refrigeração",
        whatsappNumber: "5581999999999",
        heroUrl: "assets/imagens/tecnico-trabalhando.jpg"
    },
    configSchedule: {
        slots: [
            { time: "08:00", vacancies: 2 },
            { time: "10:00", vacancies: 2 },
            { time: "14:00", vacancies: 2 },
            { time: "16:00", vacancies: 2 }
        ]
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    inicializarSite();
    renderServicos();
    initCalendar();
    setupEventListeners();
    
    // Atualizar data de modificação
    atualizarDataModificacao();
});

function inicializarSite() {
    document.getElementById("siteTitle").textContent = appState.configSite.companyName + " - Agendamento";
    document.getElementById("companyName").textContent = appState.configSite.companyName;
    document.getElementById("companyDescription").textContent = appState.configSite.description;
    document.getElementById("heroImage").src = appState.configSite.heroUrl;
}

function renderServicos() {
    const servicosGrid = document.getElementById("servicosGrid");
    servicosGrid.innerHTML = "";
    
    servicosDisponiveis.forEach(servico => {
        const div = document.createElement("div");
        div.className = "servico";
        div.innerHTML = `
            <div class="checkmark">✓</div>
            <img src="${servico.imageUrl}" alt="${servico.name}"/>
            <p>${servico.name}</p>
        `;
        div.addEventListener("click", () => toggleServicoSelecionado(servico, div));
        servicosGrid.appendChild(div);
    });
}

function toggleServicoSelecionado(servico, elemento) {
    const index = appState.servicosSelecionados.findIndex(s => s.id === servico.id);
    
    if (index === -1) {
        // Adicionar serviço
        appState.servicosSelecionados.push(servico);
        elemento.classList.add("selecionado");
    } else {
        // Remover serviço
        appState.servicosSelecionados.splice(index, 1);
        elemento.classList.remove("selecionado");
    }
    
    atualizarServicosSelecionadosUI();
    validarFormulario();
}

function atualizarServicosSelecionadosUI() {
    const container = document.getElementById("servicosSelecionadosContainer");
    const lista = document.getElementById("servicosSelecionadosLista");
    const valorTotal = document.getElementById("valorTotal");
    
    if (appState.servicosSelecionados.length > 0) {
        container.style.display = "block";
        lista.innerHTML = "";
        
        let total = 0;
        
        appState.servicosSelecionados.forEach(servico => {
            const precoMedio = calcularPrecoMedio(servico);
            total += precoMedio;
            
            const div = document.createElement("div");
            div.className = "servico-item";
            div.innerHTML = `
                <span>${servico.name}</span>
                <span>R$ ${precoMedio.toFixed(2)}</span>
                <button type="button" class="remover-servico" data-id="${servico.id}">Remover</button>
            `;
            lista.appendChild(div);
        });
        
        valorTotal.textContent = `R$ ${total.toFixed(2)}`;
        
        // Adicionar eventos aos botões de remover
        document.querySelectorAll('.remover-servico').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const servico = servicosDisponiveis.find(s => s.id === id);
                const elemento = Array.from(document.querySelectorAll('.servico')).find(el => 
                    el.querySelector('p').textContent === servico.name
                );
                
                if (elemento) {
                    elemento.classList.remove("selecionado");
                }
                
                appState.servicosSelecionados = appState.servicosSelecionados.filter(s => s.id !== id);
                atualizarServicosSelecionadosUI();
                validarFormulario();
            });
        });
        
        document.getElementById("btn_finalizar_texto").textContent = 
            `Solicitar ${appState.servicosSelecionados.length} serviço(s) selecionado(s)`;
    } else {
        container.style.display = "none";
        document.getElementById("btn_finalizar_texto").textContent = "Escolha um serviço para começar";
    }
}

function calcularPrecoMedio(servico) {
    // Calcula a média de preço para exibição na lista
    if (!servico.btuPrices || servico.btuPrices.length === 0) return 0;
    const total = servico.btuPrices.reduce((sum, item) => sum + item.price, 0);
    return total / servico.btuPrices.length;
}

function setupEventListeners() {
    const form = document.getElementById("formulario");
    form.addEventListener("input", validarFormulario);
    form.addEventListener("submit", handleFormSubmit);
    
    // Máscara para telefone
    const whatsappInput = document.getElementById("whatsapp");
    whatsappInput.addEventListener('input', maskPhone);
}

function maskPhone(e) {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
    e.target.value = v;
}

function validarFormulario() {
    const nomeValido = document.getElementById("nome").value.trim().length > 2;
    const whatsappValido = document.getElementById("whatsapp").value.replace(/\D/g, "").length === 11;
    const tipoEquipamentoValido = document.getElementById("tipo_equipamento").value !== "";
    const capacidadeValida = document.getElementById("capacidade_btus").value !== "";
    
    const dadosBasicosValidos = nomeValido && whatsappValido && tipoEquipamentoValido && capacidadeValida;
    const servicosSelecionadosValidos = appState.servicosSelecionados.length > 0;

    // Mostrar/ocultar seções conforme validação
    document.getElementById("detalhes-cliente-wrapper").style.display = servicosSelecionadosValidos ? "block" : "none";
    document.getElementById("orcamento-wrapper").style.display = (servicosSelecionadosValidos && dadosBasicosValidos) ? "block" : "none";
    document.getElementById("agendamento-wrapper").style.display = (servicosSelecionadosValidos && dadosBasicosValidos) ? "block" : "none";

    if (document.getElementById("orcamento-wrapper").style.display === "block") {
        gerarHtmlOrcamento();
    }

    // Validar agendamento se necessário
    let agendamentoValido = true;
    if (document.getElementById("agendamento-wrapper").style.display === "block") {
        const dataValida = document.getElementById("data_agendamento").value !== "";
        const horarioValido = document.getElementById("horario_agendamento").value !== "" && 
                             !document.getElementById("horario_agendamento").disabled;
        const pagamentoValido = document.getElementById("forma_pagamento").value !== "";
        agendamentoValido = dataValida && horarioValido && pagamentoValido;
    }

    // Habilitar/desabilitar botão final
    document.getElementById("btn_finalizar").disabled = !(servicosSelecionadosValidos && dadosBasicosValidos && 
        (!appState.servicosSelecionados.some(s => s.showSchedule) || agendamentoValido));
}

function gerarHtmlOrcamento() {
    const capacidadeSelect = document.getElementById("capacidade_btus");
    const capacidadeTexto = capacidadeSelect.options[capacidadeSelect.selectedIndex].text;
    const observacoesTexto = document.getElementById("observacoes").value.trim();

    let html = `<div class="orcamento-item"><strong>Serviços selecionados:</strong></div>`;
    let valorTotal = 0;
    
    appState.servicosSelecionados.forEach(servico => {
        const priceInfo = servico.btuPrices.find(p => p.btu === capacidadeTexto);
        const valorServico = priceInfo ? priceInfo.price : 0;
        valorTotal += valorServico;
        
        html += `
            <div class="orcamento-item">
                <span>${servico.name}</span>
                <span>R$ ${valorServico.toFixed(2)}</span>
            </div>`;
    });
    
    html += `
        <div class="orcamento-total">
            <strong>Valor Total:</strong>
            <span>R$ ${valorTotal.toFixed(2)}</span>
        </div>`;
    
    if (observacoesTexto) {
        html += `<div class="orcamento-item"><strong>Observações:</strong><span>${observacoesTexto}</span></div>`;
    }
    
    document.getElementById("relatorio-orcamento").innerHTML = html;
}

function initCalendar() {
    // Implementação simplificada do calendário
    const dataAgendamentoInput = document.getElementById("data_agendamento");
    const horarioAgendamentoSelect = document.getElementById("horario_agendamento");
    
    dataAgendamentoInput.addEventListener('focus', () => {
        // Simulação de abertura do calendário
        dataAgendamentoInput.type = 'date';
    });
    
    dataAgendamentoInput.addEventListener('change', () => {
        // Simulação de seleção de data
        if (dataAgendamentoInput.value) {
            const date = new Date(dataAgendamentoInput.value);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            dataAgendamentoInput.type = 'text';
            dataAgendamentoInput.value = formattedDate;
            
            // Simular carregamento de horários
            horarioAgendamentoSelect.disabled = false;
            horarioAgendamentoSelect.innerHTML = `
                <option value="">Selecione um horário</option>
                <option value="08:00">08:00</option>
                <option value="10:00">10:00</option>
                <option value="14:00">14:00</option>
                <option value="16:00">16:00</option>
            `;
        }
        validarFormulario();
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    const btnFinalizar = document.getElementById("btn_finalizar");
    if (btnFinalizar.disabled) return;

    btnFinalizar.disabled = true;
    btnFinalizar.querySelector("span").textContent = "Enviando...";

    // Simulação de envio
    setTimeout(() => {
        alert("Agendamento solicitado com sucesso! Em breve entraremos em contato para confirmar.");
        document.getElementById("formulario").reset();
        appState.servicosSelecionados = [];
        document.querySelectorAll('.servico').forEach(s => s.classList.remove('selecionado'));
        document.getElementById("servicosSelecionadosContainer").style.display = "none";
        btnFinalizar.disabled = false;
        btnFinalizar.querySelector("span").textContent = "Escolha um serviço para começar";
    }, 1500);
}

function atualizarDataModificacao() {
    const dataModificacao = new Date();
    document.getElementById("ultima-atualizacao").textContent =
        "Última atualização: " + dataModificacao.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
}
