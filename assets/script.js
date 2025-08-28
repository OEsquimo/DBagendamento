// Estado da aplicação
const appState = {
    servicosSelecionados: [],
    passoAtual: 1,
    orcamentoTotal: 0
};

// Elementos DOM
const elementos = {
    progressBar: document.getElementById('progressBar'),
    steps: {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3'),
        4: document.getElementById('step-4'),
        5: document.getElementById('step-5')
    },
    formSteps: {
        servicos: document.getElementById('step-servicos'),
        equipamentos: document.getElementById('step-equipamentos'),
        orcamento: document.getElementById('step-orcamento'),
        dados: document.getElementById('step-dados'),
        agendamento: document.getElementById('step-agendamento')
    },
    servicosGrid: document.getElementById('servicosGrid'),
    equipamentosContainer: document.getElementById('equipamentos-container'),
    relatorioOrcamento: document.getElementById('relatorio-orcamento'),
    // Botões de navegação
    btnNextToEquipamentos: document.getElementById('btnNextToEquipamentos'),
    btnBackToServicos: document.getElementById('btnBackToServicos'),
    btnNextToOrcamento: document.getElementById('btnNextToOrcamento'),
    btnBackToEquipamentos: document.getElementById('btnBackToEquipamentos'),
    btnConfirmarOrcamento: document.getElementById('btnConfirmarOrcamento'),
    btnBackToOrcamento: document.getElementById('btnBackToOrcamento'),
    btnNextToAgendamento: document.getElementById('btnNextToAgendamento'),
    btnBackToDados: document.getElementById('btnBackToDados'),
    btnFinalizar: document.getElementById('btnFinalizar'),
    // Campos de formulário
    nomeInput: document.getElementById('nome'),
    enderecoInput: document.getElementById('endereco'),
    whatsappInput: document.getElementById('whatsapp'),
    dataAgendamentoInput: document.getElementById('data_agendamento'),
    horarioAgendamentoSelect: document.getElementById('horario_agendamento'),
    formaPagamentoSelect: document.getElementById('forma_pagamento')
};

// Dados de serviços
const servicosDisponiveis = [
    {
        id: "1",
        name: "Limpeza Técnica",
        description: "Limpeza completa do equipamento",
        basePrice: 120,
        permiteMultiplos: true,
        icon: "fas fa-soap"
    },
    {
        id: "2",
        name: "Instalação",
        description: "Instalação profissional",
        basePrice: 300,
        permiteMultiplos: true,
        icon: "fas fa-tools"
    },
    {
        id: "3",
        name: "Manutenção",
        description: "Manutenção preventiva",
        basePrice: 150,
        permiteMultiplos: true,
        icon: "fas fa-wrench"
    },
    {
        id: "4",
        name: "Higienização",
        description: "Higienização completa",
        basePrice: 100,
        permiteMultiplos: true,
        icon: "fas fa-spray-can"
    }
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    renderizarServicos();
    configurarEventListeners();
    elementos.btnNextToEquipamentos.disabled = true;

    // --- CÓDIGO PARA MOSTRAR A DATA DE ATUALIZAÇÃO ---
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        lastUpdateElement.textContent = formattedDate;
    }
    // ----------------------------------------------------
});

// Configurar event listeners
function configurarEventListeners() {
    // Navegação
    elementos.btnNextToEquipamentos.addEventListener('click', () => avancarParaPasso(2));
    elementos.btnBackToServicos.addEventListener('click', () => retrocederParaPasso(1));
    elementos.btnNextToOrcamento.addEventListener('click', () => avancarParaPasso(3));
    elementos.btnBackToEquipamentos.addEventListener('click', () => retrocederParaPasso(2));
    elementos.btnConfirmarOrcamento.addEventListener('click', () => avancarParaPasso(4));
    elementos.btnBackToOrcamento.addEventListener('click', () => retrocederParaPasso(3));
    elementos.btnNextToAgendamento.addEventListener('click', () => avancarParaPasso(5));
    elementos.btnBackToDados.addEventListener('click', () => retrocederParaPasso(4));
    elementos.btnFinalizar.addEventListener('click', finalizarAgendamento);

    // Máscara de telefone
    elementos.whatsappInput.addEventListener('input', mascararTelefone);
}

// Máscara de telefone
function mascararTelefone(e) {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
    e.target.value = v;
}

// Navegação entre passos
function avancarParaPasso(passo) {
    if (passo === 2 && !validarServicosSelecionados()) return;
    if (passo === 3 && !validarEquipamentos()) return;
    if (passo === 4 && !validarOrcamento()) return;
    if (passo === 5 && !validarDadosCliente()) return;

    // Se avançando para o orçamento, calcular e exibir
    if (passo === 3) {
        calcularOrcamento();
    }

    // Esconder passo atual
    elementos.formSteps[Object.keys(elementos.formSteps)[appState.passoAtual - 1]].classList.remove('active');

    // Atualizar progresso
    appState.passoAtual = passo;
    atualizarIndicadorProgresso();

    // Se avançando para o passo de equipamentos, renderizar os campos
    if (passo === 2) {
        renderizarEquipamentos();
    }

    // Mostrar próximo passo
    const proximoPassoElemento = elementos.formSteps[Object.keys(elementos.formSteps)[passo - 1]];
    proximoPassoElemento.classList.add('active');

    // Rolar para o topo do formulário
    proximoPassoElemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function retrocederParaPasso(passo) {
    // Esconder passo atual
    elementos.formSteps[Object.keys(elementos.formSteps)[appState.passoAtual - 1]].classList.remove('active');

    // Atualizar progresso
    appState.passoAtual = passo;
    atualizarIndicadorProgresso();

    // Mostrar passo anterior
    const passoAnteriorElemento = elementos.formSteps[Object.keys(elementos.formSteps)[passo - 1]];
    passoAnteriorElemento.classList.add('active');

    // Rolar para o topo do formulário
    passoAnteriorElemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function atualizarIndicadorProgresso() {
    // Atualizar barra de progresso
    const progresso = ((appState.passoAtual - 1) / 4) * 100;
    elementos.progressBar.style.width = `${progresso}%`;

    // Atualizar steps
    Object.keys(elementos.steps).forEach(passo => {
        elementos.steps[passo].classList.remove('active', 'completed');
        if (parseInt(passo) < appState.passoAtual) {
            elementos.steps[passo].classList.add('completed');
        } else if (parseInt(passo) === appState.passoAtual) {
            elementos.steps[passo].classList.add('active');
        }
    });
}

// Validações
function validarServicosSelecionados() {
    if (appState.servicosSelecionados.length === 0) {
        alert('Por favor, selecione pelo menos um serviço para continuar.');
        return false;
    }
    return true;
}

function validarEquipamentos() {
    // Verificar se todos os equipamentos têm dados válidos
    for (const servico of appState.servicosSelecionados) {
        for (const equipamento of servico.equipamentos) {
            if (!equipamento.tipoEquipamento || !equipamento.capacidadeBtus) {
                alert('Por favor, preencha todos os dados dos equipamentos para continuar.');
                return false;
            }
        }
    }
    return true;
}

function validarOrcamento() {
    // Sempre válido após preenchimento dos equipamentos
    return true;
}

function validarDadosCliente() {
    const nomeValido = elementos.nomeInput.value.trim().length > 2;
    const enderecoValido = elementos.enderecoInput.value.trim().length > 5;
    const whatsappValido = elementos.whatsappInput.value.replace(/\D/g, "").length === 11;

    if (!nomeValido || !enderecoValido || !whatsappValido) {
        alert('Por favor, preencha todos os dados corretamente.');
        return false;
    }

    return true;
}

// Renderizar serviços
function renderizarServicos() {
    elementos.servicosGrid.innerHTML = '';

    servicosDisponiveis.forEach(servico => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.setAttribute('data-servico-id', servico.id);
        card.innerHTML = `
            <i class="${servico.icon}"></i>
            <h3>${servico.name}</h3>
            <p>${servico.description}</p>
        `;

        card.addEventListener('click', () => {
            selecionarServico(servico.id, card);
        });

        elementos.servicosGrid.appendChild(card);
    });
}

// Selecionar serviço
function selecionarServico(servicoId, elemento) {
    const servico = servicosDisponiveis.find(s => s.id === servicoId);
    const index = appState.servicosSelecionados.findIndex(s => s.id === servicoId);

    if (index === -1) {
        // Adicionar serviço
        appState.servicosSelecionados.push({
            ...servico,
            quantidade: 1,
            equipamentos: [{
                tipoEquipamento: "",
                capacidadeBtus: "",
                parteEletricaPronta: "Não",
                observacoes: ""
            }]
        });

        elemento.classList.add('selected');
    } else {
        // Remover serviço
        appState.servicosSelecionados.splice(index, 1);
        elemento.classList.remove('selected');
    }

    // Se há serviços selecionados, habilitar próximo passo
    elementos.btnNextToEquipamentos.disabled = appState.servicosSelecionados.length === 0;

    // Se voltando da tela de equipamentos, renderizar novamente
    if (appState.passoAtual === 2) {
        renderizarEquipamentos();
    }
}

// Renderizar equipamentos
function renderizarEquipamentos() {
    elementos.equipamentosContainer.innerHTML = '';

    if (appState.servicosSelecionados.length === 0) {
        elementos.equipamentosContainer.innerHTML = `
            <div class="service-section">
                <h2>Nenhum serviço selecionado</h2>
                <p>Volte à tela anterior para selecionar os serviços desejados.</p>
            </div>
        `;
        return;
    }

    appState.servicosSelecionados.forEach((servico, servicoIndex) => {
        const servicoSection = document.createElement('div');
        servicoSection.className = 'service-section';
        servicoSection.innerHTML = `
            <div class="service-header">
                <h2>${servico.name}</h2>
            </div>
            <div class="service-quantity">
                <label for="quantidade-${servicoIndex}"><strong>Quantidade:</strong></label>
                <input type="number" id="quantidade-${servicoIndex}" min="1"
                       value="${servico.quantidade}" data-servico-index="${servicoIndex}">
            </div>
        `;

        // Adicionar equipamentos
        servico.equipamentos.forEach((equipamento, equipamentoIndex) => {
            const equipmentItem = criarEquipmentItem(servico, servicoIndex, equipamento, equipamentoIndex);
            servicoSection.appendChild(equipmentItem);
        });

        elementos.equipamentosContainer.appendChild(servicoSection);
    });

    // Adicionar event listeners após renderizar
    adicionarEventListenersEquipamentos();
}

// Criar elemento de equipamento
function criarEquipmentItem(servico, servicoIndex, equipamento, equipamentoIndex) {
    const equipmentItem = document.createElement('div');
    equipmentItem.className = 'equipment-item';
    equipmentItem.setAttribute('data-servico-index', servicoIndex);
    equipmentItem.setAttribute('data-equipamento-index', equipamentoIndex);

    let equipmentHTML = `
        <div class="equipment-header">
            <h3>${servico.name} #${equipamentoIndex + 1}</h3>
            ${equipamentoIndex > 0 ?
                `<button type="button" class="remove-equipment"
                         data-servico-index="${servicoIndex}"
                         data-equipamento-index="${equipamentoIndex}">
                    <i class="fas fa-trash"></i> Remover
                 </button>` :
                ''}
        </div>
        <div class="form-grid">
            <div class="form-group">
                <label>Tipo de equipamento</label>
                <select class="form-control tipo-equipamento" required>
                    <option value="">Selecione...</option>
                    <option value="Janela" ${equipamento.tipoEquipamento === "Janela" ? "selected" : ""}>Janela</option>
                    <option value="Split" ${equipamento.tipoEquipamento === "Split" ? "selected" : ""}>Split (Hi-Wall)</option>
                    <option value="Multi-Split" ${equipamento.tipoEquipamento === "Multi-Split" ? "selected" : ""}>Multi-Split</option>
                    <option value="Cassete" ${equipamento.tipoEquipamento === "Cassete" ? "selected" : ""}>Cassete</option>
                    <option value="Piso-Teto" ${equipamento.tipoEquipamento === "Piso-Teto" ? "selected" : ""}>Piso-Teto</option>
                    <option value="Outro" ${equipamento.tipoEquipamento === "Outro" ? "selected" : ""}>Outro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Capacidade (BTUs)</label>
                <select class="form-control capacidade-btus" required>
                    <option value="">Selecione...</option>
                    <option value="9000" ${equipamento.capacidadeBtus === "9000" ? "selected" : ""}>9.000 BTUs</option>
                    <option value="12000" ${equipamento.capacidadeBtus === "12000" ? "selected" : ""}>12.000 BTUs</option>
                    <option value="18000" ${equipamento.capacidadeBtus === "18000" ? "selected" : ""}>18.000 BTUs</option>
                    <option value="24000" ${equipamento.capacidadeBtus === "24000" ? "selected" : ""}>24.000 BTUs</option>
                    <option value="30000" ${equipamento.capacidadeBtus === "30000" ? "selected" : ""}>30.000 BTUs</option>
                    <option value="36000" ${equipamento.capacidadeBtus === "36000" ? "selected" : ""}>36.000 BTUs</option>
                    <option value="48000" ${equipamento.capacidadeBtus === "48000" ? "selected" : ""}>48.000 BTUs</option>
                </select>
            </div>
    `;

    // Adicionar campo de parte elétrica apenas para serviços de instalação
    if (servico.name.toLowerCase().includes('instalação') || servico.name.toLowerCase().includes('instalacao')) {
        equipmentHTML += `
            <div class="form-group">
                <label>Parte elétrica pronta?</label>
                <select class="form-control parte-eletrica">
                    <option value="Sim" ${equipamento.parteEletricaPronta === "Sim" ? "selected" : ""}>Sim</option>
                    <option value="Não" ${equipamento.parteEletricaPronta === "Não" ? "selected" : ""}>Não</option>
                </select>
            </div>
        `;
    }

    equipmentHTML += `
            <div class="form-group full-width">
                <label>Observações (Opcional)</label>
                <textarea class="form-control observacoes" placeholder="Detalhes adicionais, problemas ou instruções especiais">${equipamento.observacoes || ""}</textarea>
            </div>
        </div>
    `;

    equipmentItem.innerHTML = equipmentHTML;
    return equipmentItem;
}

// Adicionar event listeners aos equipamentos
function adicionarEventListenersEquipamentos() {
    // Listeners para quantidade de serviços
    document.querySelectorAll('.service-quantity input').forEach(input => {
        input.addEventListener('change', alterarQuantidadeServico);
    });

    // Listeners para remover equipamentos
    document.querySelectorAll('.remove-equipment').forEach(button => {
        button.addEventListener('click', removerEquipamento);
    });

    // Listeners para atualizar dados dos equipamentos
    document.querySelectorAll('.tipo-equipamento, .capacidade-btus, .parte-eletrica, .observacoes').forEach(input => {
        input.addEventListener('change', atualizarDadosEquipamento);
    });
}

// Alterar quantidade de um serviço
function alterarQuantidadeServico(e) {
    const servicoIndex = parseInt(e.target.dataset.servicoIndex);
    const novaQuantidade = parseInt(e.target.value);

    if (novaQuantidade < 1) {
        e.target.value = 1;
        return;
    }

    const servico = appState.servicosSelecionados[servicoIndex];
    const quantidadeAtual = servico.equipamentos.length;

    if (novaQuantidade > quantidadeAtual) {
        // Adicionar equipamentos
        for (let i = quantidadeAtual; i < novaQuantidade; i++) {
            servico.equipamentos.push({
                tipoEquipamento: "",
                capacidadeBtus: "",
                parteEletricaPronta: "Não",
                observacoes: ""
            });
        }
    } else if (novaQuantidade < quantidadeAtual) {
        // Remover equipamentos
        servico.equipamentos.splice(novaQuantidade);
    }

    servico.quantidade = novaQuantidade;
    renderizarEquipamentos();
}

// Remover equipamento
function removerEquipamento(e) {
    const servicoIndex = parseInt(e.target.dataset.servicoIndex);
    const equipamentoIndex = parseInt(e.target.dataset.equipamentoIndex);

    appState.servicosSelecionados[servicoIndex].equipamentos.splice(equipamentoIndex, 1);
    appState.servicosSelecionados[servicoIndex].quantidade--;

    // Atualizar o campo de quantidade
    const quantidadeInput = document.querySelector(`#quantidade-${servicoIndex}`);
    if (quantidadeInput) {
        quantidadeInput.value = appState.servicosSelecionados[servicoIndex].quantidade;
    }

    renderizarEquipamentos();
}

// Atualizar dados do equipamento
function atualizarDadosEquipamento(e) {
    const equipmentItem = e.target.closest('.equipment-item');
    if (!equipmentItem) return;

    const servicoIndex = parseInt(equipmentItem.dataset.servicoIndex);
    const equipamentoIndex = parseInt(equipmentItem.dataset.equipamentoIndex);

    const equipamento = appState.servicosSelecionados[servicoIndex].equipamentos[equipamentoIndex];
    const inputs = equipmentItem.querySelectorAll('select, textarea');

    inputs.forEach(input => {
        if (input.classList.contains('tipo-equipamento')) {
            equipamento.tipoEquipamento = input.value;
        } else if (input.classList.contains('capacidade-btus')) {
            equipamento.capacidadeBtus = input.value;
        } else if (input.classList.contains('parte-eletrica')) {
            equipamento.parteEletricaPronta = input.value;
        } else if (input.classList.contains('observacoes')) {
            equipamento.observacoes = input.value;
        }
    });
}

// Cálculo de orçamento
function calcularOrcamento() {
    appState.orcamentoTotal = 0;
    let html = "<h3>Resumo do Orçamento</h3>";

    appState.servicosSelecionados.forEach(servico => {
        html += `<div class="budget-item"><strong>${servico.name} (${servico.quantidade} unidade(s))</strong></div>`;

        servico.equipamentos.forEach((equipamento, index) => {
            const preco = calcularPrecoEquipamento(servico, equipamento);
            appState.orcamentoTotal += preco;

            html += `
                <div class="budget-item">
                    <div>${servico.name} #${index + 1} - ${equipamento.tipoEquipamento} ${equipamento.capacidadeBtus} BTUs</div>
                    <div>R$ ${preco.toFixed(2)}</div>
                </div>
            `;

            if (equipamento.parteEletricaPronta === "Não" && servico.name.toLowerCase().includes('instalação')) {
                const custoEletrica = 150;
                appState.orcamentoTotal += custoEletrica;

                html += `
                    <div class="budget-item">
                        <div>Preparação da parte elétrica</div>
                        <div>R$ ${custoEletrica.toFixed(2)}</div>
                    </div>
                `;
            }
        });
    });

    html += `
        <div class="budget-total">
            <strong>Total:</strong>
            <span>R$ ${appState.orcamentoTotal.toFixed(2)}</span>
        </div>
    `;

    elementos.relatorioOrcamento.innerHTML = html;
}

function calcularPrecoEquipamento(servico, equipamento) {
    let preco = servico.basePrice;

    // Ajustar preço com base na capacidade BTUs
    const fatorBTU = {
        "9000": 1.0,
        "12000": 1.2,
        "18000": 1.5,
        "24000": 1.8,
        "30000": 2.0,
        "36000": 2.3,
        "48000": 2.8
    };

    if (fatorBTU[equipamento.capacidadeBtus]) {
        preco *= fatorBTU[equipamento.capacidadeBtus];
    }

    return preco;
}

// Finalizar agendamento
function finalizarAgendamento(e) {
    e.preventDefault();

    if (!validarDadosCliente()) return;

    // Desabilitar botão para evitar múltiplos cliques
    elementos.btnFinalizar.disabled = true;
    elementos.btnFinalizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    // Simular envio
    setTimeout(() => {
        alert('Solicitação enviada com sucesso! Entraremos em contato em breve.');
        elementos.btnFinalizar.disabled = false;
        elementos.btnFinalizar.innerHTML = '<i class="fab fa-whatsapp"></i> Finalizar Agendamento';

        // Recarregar a página após um tempo
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }, 2000);
}
