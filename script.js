/*
 * Arquivo: script.js
 * Descrição: Lógica para o formulário de agendamento.
 * Versão: 8.6 (Correções de inicialização e cálculo de orçamento)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, get, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyCFf5gckKE6rg7MFuBYAO84aV-sNrdY2JQ",
    authDomain: "agendamento-esquimo.firebaseapp.com",
    databaseURL: "https://agendamento-esquimo-default-rtdb.firebaseio.com",
    projectId: "agendamento-esquimo",
    storageBucket: "agendamento-esquimo.firebasestorage.app",
    messagingSenderId: "348946727206",
    appId: "1:348946727206:web:f5989788f13c259be0c1e7",
    measurementId: "G-Z0EMQ3XQ1D"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Elementos do DOM
const servicosSelect = document.getElementById('servicos');
const servicoDetalhesContainer = document.getElementById('servico-detalhes-container');
const horarioSelect = document.getElementById('horario');
const formAgendamento = document.getElementById('form-agendamento');
const nomeInput = document.getElementById('nome');
const telefoneInput = document.getElementById('telefone');
const enderecoInput = document.getElementById('endereco');
const observacoesInput = document.getElementById('observacoes');
const orcamentoTotalSpan = document.getElementById('orcamento-total');
const formaPagamentoSelect = document.getElementById('forma-pagamento');
const camposAdicionaisContainer = document.getElementById('campos-adicionais-container');

// Botões de navegação
const servicosTab = document.getElementById('servicos-tab');
const detalhesTab = document.getElementById('detalhes-tab');
const clienteTab = document.getElementById('cliente-tab');
const agendarTab = document.getElementById('agendar-tab');
const formSteps = document.querySelectorAll('.form-step');
const nextButtons = document.querySelectorAll('.btn-next');
const prevButtons = document.querySelectorAll('.btn-prev');
const progressCircles = document.querySelectorAll('.progress-circle');

// Variáveis de estado
let servicos = {};
let config = {};
let selectedService = null;
let orcamentoTotal = 0;
let whatsappNumber = '';
let whatsappTemplate = '';

const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadServices();
    setupEventListeners();
    updateProgress(1);
});

function setupEventListeners() {
    if (servicosSelect) servicosSelect.addEventListener('change', handleServiceSelection);
    if (formAgendamento && formAgendamento.data) {
        formAgendamento.data.addEventListener('change', generateHorarios);
    }
    if (horarioSelect) horarioSelect.addEventListener('change', () => validateStep(2));
    if (nextButtons) nextButtons.forEach(button => button.addEventListener('click', handleNextStep));
    if (prevButtons) prevButtons.forEach(button => button.addEventListener('click', handlePrevStep));
    if (formAgendamento) formAgendamento.addEventListener('submit', handleFormSubmit);
    if (camposAdicionaisContainer) camposAdicionaisContainer.addEventListener('change', updateOrcamentoTotal);
}

// ==========================================================================
// 3. CARREGAMENTO DE DADOS DO FIREBASE
// ==========================================================================

function loadConfig() {
    const configRef = ref(database, 'configuracoes');
    onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            config = snapshot.val();
            whatsappNumber = config.whatsappNumber;
            whatsappTemplate = config.whatsappTemplate;
            generateHorarios();
            updateOrcamentoTotal();
        } else {
            console.warn('Configurações não encontradas.');
        }
    });
}

function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicos = snapshot.val() || {};
        renderServices();
    });
}

function renderServices() {
    if (!servicosSelect) return;
    servicosSelect.innerHTML = '<option value="">Selecione um serviço</option>';
    for (const key in servicos) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = servicos[key].nome;
        servicosSelect.appendChild(option);
    }
}

// ==========================================================================
// 4. NAVEGAÇÃO ENTRE ETAPAS
// ==========================================================================

function showStep(step) {
    if (!formSteps || !progressCircles) return;
    formSteps.forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    updateProgress(step);
}

function handleNextStep(e) {
    const currentStep = parseInt(e.target.dataset.step);
    if (validateStep(currentStep)) {
        showStep(currentStep + 1);
    }
}

function handlePrevStep(e) {
    const currentStep = parseInt(e.target.dataset.step);
    showStep(currentStep - 1);
}

function updateProgress(step) {
    if (!progressCircles) return;
    progressCircles.forEach((circle, index) => {
        if (index < step) {
            circle.classList.add('active');
        } else {
            circle.classList.remove('active');
        }
    });
}

// ==========================================================================
// 5. GERAÇÃO E VALIDAÇÃO DE CONTEÚDO
// ==========================================================================

function generateHorarios() {
    if (!formAgendamento || !formAgendamento.data || !horarioSelect) return;
    const dataSelecionada = new Date(formAgendamento.data.value + 'T00:00:00');
    const diaDaSemana = diasDaSemana[dataSelecionada.getDay()];
    const configDia = config.horariosPorDia[diaDaSemana];

    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
    horarioSelect.disabled = true;

    if (configDia && configDia.ativo) {
        const inicio = configDia.horarioInicio;
        const fim = configDia.horarioFim;
        const duracao = configDia.duracaoServico;

        getHorariosOcupados(formAgendamento.data.value).then(horariosOcupados => {
            const horariosDisponiveis = getHorariosDisponiveis(inicio, fim, duracao, horariosOcupados);
            horariosDisponiveis.forEach(horario => {
                const option = document.createElement('option');
                option.value = horario;
                option.textContent = horario;
                horarioSelect.appendChild(option);
            });
            horarioSelect.disabled = false;
        });
    }
}

function getHorariosOcupados(data) {
    const agendamentosRef = ref(database, 'agendamentos');
    return get(agendamentosRef).then(snapshot => {
        const horariosOcupados = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const agendamento = childSnapshot.val();
                if (agendamento.data === data && agendamento.status !== 'Cancelado') {
                    horariosOcupados.push(agendamento.hora);
                }
            });
        }
        return horariosOcupados;
    });
}

function getHorariosDisponiveis(inicio, fim, duracao, horariosOcupados) {
    const horarios = [];
    let [horaInicio, minutoInicio] = inicio.split(':').map(Number);
    let [horaFim, minutoFim] = fim.split(':').map(Number);

    let currentTime = new Date();
    currentTime.setHours(horaInicio, minutoInicio, 0, 0);

    const endTime = new Date();
    endTime.setHours(horaFim, minutoFim, 0, 0);

    while (currentTime < endTime) {
        const horarioString = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
        if (!horariosOcupados.includes(horarioString)) {
            horarios.push(horarioString);
        }
        currentTime.setMinutes(currentTime.getMinutes() + duracao);
    }

    return horarios;
}

function validateStep(step) {
    switch (step) {
        case 1:
            if (!servicosSelect || !servicosSelect.value) {
                alert('Por favor, selecione um serviço.');
                return false;
            }
            return true;
        case 2:
            if (!formAgendamento || !formAgendamento.data || !formAgendamento.horario || !formAgendamento.data.value || !formAgendamento.horario.value) {
                alert('Por favor, selecione uma data e um horário.');
                return false;
            }
            return true;
        case 3:
            if (!nomeInput || !telefoneInput || !enderecoInput || !nomeInput.value || !telefoneInput.value || !enderecoInput.value) {
                alert('Por favor, preencha todos os campos obrigatórios.');
                return false;
            }
            return true;
        default:
            return false;
    }
}

// ==========================================================================
// 6. MANIPULAÇÃO DE DADOS DO FORMULÁRIO
// ==========================================================================

function handleServiceSelection(e) {
    const key = e.target.value;
    selectedService = servicos[key];
    if (selectedService) {
        renderServiceForms(selectedService);
        if (detalhesTab) {
            detalhesTab.classList.remove('disabled');
        }
    } else {
        if (servicoDetalhesContainer) servicoDetalhesContainer.innerHTML = '';
        if (camposAdicionaisContainer) camposAdicionaisContainer.innerHTML = '';
        if (detalhesTab) detalhesTab.classList.add('disabled');
        selectedService = null;
        orcamentoTotal = 0;
        updateOrcamentoTotal();
    }
}

function renderServiceForms(servico) {
    if (!servicoDetalhesContainer) return;
    servicoDetalhesContainer.innerHTML = `
        <h5 class="mb-3">${servico.nome}</h5>
        <p><strong>Descrição:</strong> ${servico.descricao}</p>
        <p><strong>Preço Base:</strong> R$ ${servico.precoBase.toFixed(2)}</p>
    `;

    if (camposAdicionaisContainer) {
        camposAdicionaisContainer.innerHTML = '';
        if (servico.camposAdicionais && servico.camposAdicionais.length > 0) {
            servico.camposAdicionais.forEach((campo, index) => {
                let fieldHtml = '';
                const fieldId = `campo-${index}`;
                let dependsOn = null;
                if (index > 0) {
                    dependsOn = `campo-${index - 1}`;
                }

                switch (campo.tipo) {
                    case 'select':
                        fieldHtml = generateSelectField(campo, fieldId);
                        break;
                    case 'textarea':
                        fieldHtml = generateTextareaField(campo, fieldId);
                        break;
                    default:
                        fieldHtml = generateInputField(campo, fieldId, campo.tipo);
                        break;
                }

                const fieldContainer = document.createElement('div');
                fieldContainer.classList.add('additional-field-container');
                fieldContainer.innerHTML = fieldHtml;
                if (dependsOn) {
                    fieldContainer.dataset.dependsOn = dependsOn;
                }
                camposAdicionaisContainer.appendChild(fieldContainer);
            });
        }
        updateOrcamentoTotal();
        setupConditionalFields();
    }
}

function setupConditionalFields() {
    if (!camposAdicionaisContainer) return;

    document.querySelectorAll('.additional-field-container').forEach(container => {
        if (container.dataset.dependsOn) {
            container.classList.add('hidden');
        }
    });

    camposAdicionaisContainer.addEventListener('change', (e) => {
        const changedFieldId = e.target.id;
        const nextFieldContainer = camposAdicionaisContainer.querySelector(`[data-depends-on="${changedFieldId}"]`);
        if (nextFieldContainer) {
            if (e.target.value) {
                nextFieldContainer.classList.remove('hidden');
            } else {
                nextFieldContainer.classList.add('hidden');
            }
        }
    });
}

function generateSelectField(campo, fieldId) {
    if (!campo.opcoes || campo.opcoes.length === 0) {
        return '';
    }
    return `
        <div class="form-group">
            <label for="${fieldId}">${campo.nome}</label>
            <select class="form-control" id="${fieldId}">
                <option value="">Selecione...</option>
                ${campo.opcoes.map(option => {
                    const priceDisplay = (option.valor && option.valor > 0) ? ` (R$ ${option.valor.toFixed(2)})` : '';
                    return `<option value="${option.nome}" data-price="${option.valor}">${option.nome}${priceDisplay}</option>`;
                }).join('')}
            </select>
        </div>
    `;
}

function generateInputField(campo, fieldId, type) {
    return `
        <div class="form-group">
            <label for="${fieldId}">${campo.nome}</label>
            <input type="${type}" class="form-control" id="${fieldId}" placeholder="Digite aqui...">
        </div>
    `;
}

function generateTextareaField(campo, fieldId) {
    return `
        <div class="form-group">
            <label for="${fieldId}">${campo.nome}</label>
            <textarea class="form-control" id="${fieldId}" placeholder="Digite aqui..." rows="3"></textarea>
        </div>
    `;
}

function updateOrcamentoTotal() {
    orcamentoTotal = selectedService ? selectedService.precoBase : 0;
    if (camposAdicionaisContainer) {
        document.querySelectorAll('.additional-field-container select').forEach(select => {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption && selectedOption.dataset.price) {
                orcamentoTotal += parseFloat(selectedOption.dataset.price);
            }
        });
    }
    if (orcamentoTotalSpan) {
        orcamentoTotalSpan.textContent = orcamentoTotal.toFixed(2);
    }
}

function getServicosSelecionados() {
    const servicosSelecionados = [];
    if (selectedService) {
        const camposAdicionaisSelecionados = {};
        if (camposAdicionaisContainer) {
            document.querySelectorAll('.additional-field-container').forEach(container => {
                const input = container.querySelector('input, select, textarea');
                if (input) {
                    const campoNome = selectedService.camposAdicionais.find(campo => `campo-${selectedService.camposAdicionais.indexOf(campo)}` === input.id)?.nome;
                    if (campoNome) {
                        if (input.type === 'select-one') {
                            const selectedOption = input.options[input.selectedIndex];
                            if (selectedOption.value) {
                                const precoAdicional = parseFloat(selectedOption.dataset.price);
                                camposAdicionaisSelecionados[campoNome] = {
                                    nome: selectedOption.textContent.replace(` (R$ ${precoAdicional.toFixed(2)})`, '').trim(),
                                    valor: precoAdicional
                                };
                            }
                        } else {
                            if (input.value) {
                                camposAdicionaisSelecionados[campoNome] = input.value;
                            }
                        }
                    }
                }
            });
        }
        servicosSelecionados.push({
            nome: selectedService.nome,
            precoCalculado: orcamentoTotal,
            camposAdicionaisSelecionados
        });
    }
    return servicosSelecionados;
}

function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateStep(3)) return;

    const agendamento = {
        cliente: {
            nome: nomeInput.value,
            telefone: telefoneInput.value,
            endereco: enderecoInput.value,
        },
        data: formAgendamento.data.value,
        hora: formAgendamento.horario.value,
        servicos: getServicosSelecionados(),
        orcamentoTotal: orcamentoTotal,
        formaPagamento: formaPagamentoSelect.value,
        observacoes: observacoesInput.value,
        status: 'Pendente',
        dataCriacao: new Date().toISOString()
    };

    const agendamentosRef = ref(database, 'agendamentos');
    push(agendamentosRef, agendamento)
        .then(() => {
            const mensagem = generateWhatsAppMessage(agendamento);
            window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`, '_blank');
            formAgendamento.reset();
            if (servicoDetalhesContainer) servicoDetalhesContainer.innerHTML = '';
            if (camposAdicionaisContainer) camposAdicionaisContainer.innerHTML = '';
            if (orcamentoTotalSpan) orcamentoTotalSpan.textContent = '0.00';
            selectedService = null;
            showStep(1);
        })
        .catch(error => {
            console.error("Erro ao agendar o serviço:", error);
            alert("Ocorreu um erro ao agendar o serviço. Por favor, tente novamente.");
        });
}

// ==========================================================================
// 7. FUNÇÃO DE MENSAGEM DO WHATSAPP
// ==========================================================================

function generateWhatsAppMessage(agendamento) {
    let mensagem = whatsappTemplate;

    if (!mensagem) {
        mensagem = 'Olá, gostaria de confirmar meu agendamento. ';
    }

    const cliente = agendamento.cliente;
    const servicosStr = agendamento.servicos.map(servico => {
        let str = `- ${servico.nome}: R$ ${servico.precoCalculado.toFixed(2)}`;
        if (servico.camposAdicionaisSelecionados) {
            const campos = Object.entries(servico.camposAdicionaisSelecionados).map(([nomeCampo, valor]) => {
                const valorDisplay = typeof valor === 'object' ? `${valor.nome} (R$ ${valor.valor.toFixed(2)})` : valor;
                return `\n    ${nomeCampo}: ${valorDisplay}`;
            }).join('');
            str += campos;
        }
        return str;
    }).join('\n');

    mensagem = mensagem.replace('{cliente.nome}', cliente.nome);
    mensagem = mensagem.replace('{cliente.telefone}', cliente.telefone);
    mensagem = mensagem.replace('{cliente.endereco}', cliente.endereco);
    mensagem = mensagem.replace('{data}', agendamento.data);
    mensagem = mensagem.replace('{hora}', agendamento.hora);
    mensagem = mensagem.replace('{servicos}', servicosStr);
    mensagem = mensagem.replace('{total}', `R$ ${agendamento.orcamentoTotal.toFixed(2)}`);
    mensagem = mensagem.replace('{observacoes}', agendamento.observacoes || 'N/A');
    mensagem = mensagem.replace('{formaPagamento}', agendamento.formaPagamento || 'N/A');

    return mensagem;
}

