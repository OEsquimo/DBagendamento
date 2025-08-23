import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, doc, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCFf5gckKE6rg7MFuBYAO84aV-sNrdY2JQ",
    authDomain: "agendamento-esquimo.firebaseapp.com",
    projectId: "agendamento-esquimo",
    storageBucket: "agendamento-esquimo.appspot.com",
    messagingSenderId: "348946727206",
    appId: "1:348946727206:web:f5989788f13c259be0c1e7"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado da aplicação
const appState = {
    servicosSelecionados: [],
    configSite: {},
    configSchedule: { slots: [] },
    servicos: [],
    orcamentoTotal: 0,
    passoAtual: 1
};

// Elementos DOM
const elementos = {
    // Elementos de progresso
    progressBar: document.getElementById('progressBar'),
    steps: {
        1: document.getElementById('step-1'),
        2: document.getElementById('step-2'),
        3: document.getElementById('step-3'),
        4: document.getElementById('step-4'),
        5: document.getElementById('step-5')
    },
    
    // Form steps
    formSteps: {
        servicos: document.getElementById('step-servicos'),
        equipamentos: document.getElementById('step-equipamentos'),
        orcamento: document.getElementById('step-orcamento'),
        dados: document.getElementById('step-dados'),
        agendamento: document.getElementById('step-agendamento')
    },
    
    // Navegação
    btnNextToEquipamentos: document.getElementById('btnNextToEquipamentos'),
    btnBackToServicos: document.getElementById('btnBackToServicos'),
    btnNextToOrcamento: document.getElementById('btnNextToOrcamento'),
    btnBackToEquipamentos: document.getElementById('btnBackToEquipamentos'),
    btnConfirmarOrcamento: document.getElementById('btnConfirmarOrcamento'),
    btnBackToOrcamento: document.getElementById('btnBackToOrcamento'),
    btnNextToAgendamento: document.getElementById('btnNextToAgendamento'),
    btnBackToDados: document.getElementById('btnBackToDados'),
    btnFinalizar: document.getElementById('btn_finalizar'),
    
    // Formulários
    servicosGrid: document.getElementById('servicosGrid'),
    equipamentosContainer: document.getElementById('equipamentos-container'),
    relatorioOrcamento: document.getElementById('relatorio-orcamento'),
    nomeInput: document.getElementById('nome'),
    enderecoInput: document.getElementById('endereco'),
    whatsappInput: document.getElementById('whatsapp'),
    dataAgendamentoInput: document.getElementById('data_agendamento'),
    horarioAgendamentoSelect: document.getElementById('horario_agendamento'),
    formaPagamentoSelect: document.getElementById('forma_pagamento'),
    formulario: document.getElementById('formulario'),
    
    // Configuração do site
    companyName: document.getElementById('companyName'),
    companyDescription: document.getElementById('companyDescription')
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([carregarConfigSite(), carregarServicos()]);
    configurarEventListeners();
    inicializarCalendario();
    
    // Configurar máscara de telefone
    elementos.whatsappInput.addEventListener('input', mascararTelefone);
});

// Configurar todos os event listeners
function configurarEventListeners() {
    // Navegação entre passos
    elementos.btnNextToEquipamentos.addEventListener('click', () => avancarParaPasso(2));
    elementos.btnBackToServicos.addEventListener('click', () => retrocederParaPasso(1));
    elementos.btnNextToOrcamento.addEventListener('click', () => avancarParaPasso(3));
    elementos.btnBackToEquipamentos.addEventListener('click', () => retrocederParaPasso(2));
    elementos.btnConfirmarOrcamento.addEventListener('click', () => avancarParaPasso(4));
    elementos.btnBackToOrcamento.addEventListener('click', () => retrocederParaPasso(3));
    elementos.btnNextToAgendamento.addEventListener('click', () => avancarParaPasso(5));
    elementos.btnBackToDados.addEventListener('click', () => retrocederParaPasso(4));
    
    // Submissão do formulário
    elementos.formulario.addEventListener('submit', enviarFormulario);
    
    // Validação em tempo real
    elementos.nomeInput.addEventListener('input', validarDadosCliente);
    elementos.enderecoInput.addEventListener('input', validarDadosCliente);
    elementos.whatsappInput.addEventListener('input', validarDadosCliente);
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
    
    // Esconder passo atual
    elementos.formSteps[Object.keys(elementos.formSteps)[appState.passoAtual - 1]].classList.remove('active');
    
    // Atualizar progresso
    appState.passoAtual = passo;
    atualizarIndicadorProgresso();
    
    // Mostrar próximo passo
    elementos.formSteps[Object.keys(elementos.formSteps)[passo - 1]].classList.add('active');
    
    // Rolar para o topo do formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function retrocederParaPasso(passo) {
    // Esconder passo atual
    elementos.formSteps[Object.keys(elementos.formSteps)[appState.passoAtual - 1]].classList.remove('active');
    
    // Atualizar progresso
    appState.passoAtual = passo;
    atualizarIndicadorProgresso();
    
    // Mostrar passo anterior
    elementos.formSteps[Object.keys(elementos.formSteps)[passo - 1]].classList.add('active');
    
    // Rolar para o topo do formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    elementos.btnNextToAgendamento.disabled = !(nomeValido && enderecoValido && whatsappValido);
    
    return nomeValido && enderecoValido && whatsappValido;
}

// Carregar configuração do site
async function carregarConfigSite() {
    try {
        const docSnap = await getDoc(doc(db, "config", "site"));
        if (docSnap.exists()) {
            appState.configSite = docSnap.data();
            elementos.companyName.textContent = appState.configSite.companyName || "O Esquimó";
            elementos.companyDescription.textContent = appState.configSite.description || "Serviços especializados em ar condicionado";
        }
    } catch (error) {
        console.error("Erro ao carregar configurações do site:", error);
    }
}

// Carregar serviços
async function carregarServicos() {
    try {
        const q = query(collection(db, "services"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        appState.servicos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarServicos();
    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
    }
}

// Renderizar serviços
function renderizarServicos() {
    elementos.servicosGrid.innerHTML = "";
    
    if (appState.servicos.length === 0) {
        elementos.servicosGrid.innerHTML = "<p>Nenhum serviço disponível no momento.</p>";
        return;
    }
    
    appState.servicos.forEach(servico => {
        const card = document.createElement("div");
        card.className = "service-card";
        card.innerHTML = `
            <i class="${obterIconeServico(servico.name)}"></i>
            <h3>${servico.name}</h3>
            <p>${servico.description || 'Serviço profissional'}</p>
        `;
        
        card.addEventListener("click", () => selecionarServico(servico, card));
        elementos.servicosGrid.appendChild(card);
    });
}

function obterIconeServico(nomeServico) {
    const icones = {
        'Limpeza': 'fas fa-soap',
        'Instalação': 'fas fa-tools',
        'Manutenção': 'fas fa-wrench',
        'Higienização': 'fas fa-spray-can',
        'Conserto': 'fas fa-toolbox',
        'Desinstalação': 'fas fa-minus-circle'
    };
    
    for (const [key, value] of Object.entries(icones)) {
        if (nomeServico.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }
    
    return 'fas fa-cog'; // Ícone padrão
}

// Selecionar serviço
function selecionarServico(servico, elemento) {
    const index = appState.servicosSelecionados.findIndex(s => s.id === servico.id);
    
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
    
    // Atualizar interface
    if (appState.servicosSelecionados.length > 0) {
        elementos.btnNextToEquipamentos.disabled = false;
        renderizarFormulariosEquipamentos();
    } else {
        elementos.btnNextToEquipamentos.disabled = true;
    }
}

// Renderizar formulários de equipamentos
function renderizarFormulariosEquipamentos() {
    elementos.equipamentosContainer.innerHTML = "";
    
    appState.servicosSelecionados.forEach((servico, servicoIndex) => {
        const servicoSection = document.createElement("div");
        servicoSection.className = "equipment-section";
        servicoSection.innerHTML = `
            <h3>${servico.name}</h3>
            <div class="service-quantity">
                <label>Quantidade:</label>
                <input type="number" min="1" value="${servico.quantidade}" 
                       data-servico-index="${servicoIndex}" 
                       class="quantidade-servico">
            </div>
        `;
        
        // Adicionar formulários para cada equipamento
        servico.equipamentos.forEach((equipamento, equipamentoIndex) => {
            const equipamentoHtml = `
                <div class="equipment-item" data-servico-index="${servicoIndex}" data-equipamento-index="${equipamentoIndex}">
                    <div class="equipment-header">
                        <h4>${servico.name} #${equipamentoIndex + 1}</h4>
                        ${equipamentoIndex > 0 ? '<button type="button" class="remove-equipamento">Remover</button>' : ''}
                    </div>
                    <div class="grid-form">
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
                equipamentoHtml += `
                        <div class="form-group">
                            <label>Parte elétrica pronta?</label>
                            <select class="form-control parte-eletrica">
                                <option value="Sim" ${equipamento.parteEletricaPronta === "Sim" ? "selected" : ""}>Sim</option>
                                <option value="Não" ${equipamento.parteEletricaPronta === "Não" ? "selected" : ""}>Não</option>
                            </select>
                        </div>
                `;
            }
            
            equipamentoHtml += `
                        <div class="form-group full-width">
                            <label>Observações (Opcional)</label>
                            <textarea class="form-control observacoes" placeholder="Detalhes adicionais">${equipamento.observacoes || ""}</textarea>
                        </div>
                    </div>
                </div>
            `;
            
            servicoSection.innerHTML += equipamentoHtml;
        });
        
        elementos.equipamentosContainer.appendChild(servicoSection);
    });
    
    // Adicionar event listeners
    document.querySelectorAll('.quantidade-servico').forEach(input => {
        input.addEventListener('change', alterarQuantidadeServico);
    });
    
    document.querySelectorAll('.remove-equipamento').forEach(button => {
        button.addEventListener('click', removerEquipamento);
    });
    
    document.querySelectorAll('.tipo-equipamento, .capacidade-btus, .parte-eletrica, .observacoes').forEach(input => {
        input.addEventListener('change', atualizarDadosEquipamento);
    });
}

// Funções para manipulação de equipamentos (alterarQuantidadeServico, removerEquipamento, atualizarDadosEquipamento)
// ... (código similar ao anterior, mas adaptado para a nova interface)

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

// Inicializar calendário
function inicializarCalendario() {
    if (typeof flatpickr !== "undefined") {
        flatpickr(elementos.dataAgendamentoInput, {
            locale: "pt",
            minDate: "today",
            dateFormat: "d/m/Y",
            disable: [(date) => date.getDay() === 0],
            onChange: function(selectedDates) {
                if (selectedDates.length > 0) {
                    atualizarHorariosDisponiveis(selectedDates[0]);
                }
            }
        });
    }
}

// Enviar formulário
async function enviarFormulario(e) {
    e.preventDefault();
    
    // Desabilitar botão para evitar múltiplos cliques
    elementos.btnFinalizar.disabled = true;
    elementos.btnFinalizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    
    try {
        // Preparar dados do agendamento
        const phoneWithDDI = "55" + elementos.whatsappInput.value.replace(/\D/g, "");
        
        const dadosAgendamento = {
            servicos: appState.servicosSelecionados,
            valorTotal: appState.orcamentoTotal,
            nomeCliente: elementos.nomeInput.value.trim(),
            enderecoCliente: elementos.enderecoInput.value.trim(),
            telefoneCliente: phoneWithDDI,
            status: "Solicitado",
            origem: "Site",
            timestamp: new Date().getTime()
        };
        
        // Adicionar dados de agendamento
        dadosAgendamento.dataAgendamento = elementos.dataAgendamentoInput.value;
        dadosAgendamento.horaAgendamento = elementos.horarioAgendamentoSelect.value;
        dadosAgendamento.formaPagamento = elementos.formaPagamentoSelect.value;
        
        // Salvar no Firebase
        await addDoc(collection(db, "agendamentos"), dadosAgendamento);
        
        // Preparar mensagem para WhatsApp
        const mensagem = criarMensagemWhatsApp(dadosAgendamento);
        const adminWhatsAppNumber = appState.configSite.whatsappNumber.replace(/\D/g, "");
        const url = `https://wa.me/55${adminWhatsAppNumber}?text=${encodeURIComponent(mensagem)}`;
        
        // Redirecionar para WhatsApp
        window.open(url, "_blank");
        
        // Mostrar mensagem de sucesso
        alert("Solicitação enviada com sucesso! Entraremos em contato em breve.");
        
        // Recarregar a página após um tempo
        setTimeout(() => {
            window.location.reload();
        }, 3000);
        
    } catch (err) {
        console.error("Falha ao salvar agendamento:", err);
        alert("Houve uma falha ao enviar sua solicitação. Por favor, tente novamente.");
        elementos.btnFinalizar.disabled = false;
        elementos.btnFinalizar.innerHTML = '<i class="fab fa-whatsapp"></i> Finalizar Agendamento';
    }
}

// Função para criar mensagem do WhatsApp
function criarMensagemWhatsApp(dados) {
    // ... (implementação similar à anterior)
}
