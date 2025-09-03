/*
 * Arquivo: admin.js
 * Descrição: Lógica para o painel de administração.
 * Versão: 8.5 (Correções de inicialização e tratamento de erros)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, get, push, remove, set, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

// Elementos do DOM (Verificações de existência adicionadas)
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const formServico = document.getElementById('form-servico');
const listaServicos = document.getElementById('lista-servicos');
const listaAgendamentos = document.getElementById('lista-agendamentos');
const formConfig = document.getElementById('form-config');
const camposAdicionaisContainer = document.getElementById('campos-adicionais-container');

// Variáveis de estado
let editingServicoKey = null;

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadServicos();
    loadAgendamentos();
    loadConfig();
    setupEventListeners();
    const defaultTab = document.querySelector('.tab-button[data-tab="servicos"]');
    if (defaultTab) {
        defaultTab.click();
    }
});

function setupEventListeners() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            showTab(tab);
        });
    });

    if (formServico) formServico.addEventListener('submit', handleServicoFormSubmit);
    if (formConfig) formConfig.addEventListener('submit', handleConfigFormSubmit);

    // Adiciona evento para os botões de adicionar campo e opção
    const adicionarCampoBtn = document.getElementById('adicionar-campo-btn');
    if (adicionarCampoBtn) {
        adicionarCampoBtn.addEventListener('click', addCampoAdicional);
    }
    if (camposAdicionaisContainer) {
        camposAdicionaisContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-option-btn')) {
                addOption(e.target);
            } else if (e.target.classList.contains('remove-campo-btn')) {
                removeCampoAdicional(e.target);
            } else if (e.target.classList.contains('remove-option-btn')) {
                removeOption(e.target);
            }
        });
    }
}

function showTab(tab) {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[data-tab="${tab}"]`).classList.add('active');

    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
}

// ==========================================================================
// 3. CARREGAMENTO DE DADOS DO FIREBASE
// ==========================================================================

function loadServicos() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        if (!listaServicos) return;
        listaServicos.innerHTML = '';
        if (snapshot.exists()) {
            const servicos = snapshot.val();
            for (const key in servicos) {
                createServicoCard(servicos[key], key);
            }
        } else {
            listaServicos.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        }
    });
}

function loadAgendamentos() {
    const agendamentosRef = ref(database, 'agendamentos');
    onValue(agendamentosRef, (snapshot) => {
        if (!listaAgendamentos) return;
        listaAgendamentos.innerHTML = '';
        if (snapshot.exists()) {
            const agendamentos = snapshot.val();
            for (const key in agendamentos) {
                createAgendamentoCard(agendamentos[key], key);
            }
        } else {
            listaAgendamentos.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
        }
    });
}

function loadConfig() {
    const configRef = ref(database, 'configuracoes');
    get(configRef).then((snapshot) => {
        if (snapshot.exists()) {
            const config = snapshot.val();
            for (const key in config) {
                const element = formConfig ? formConfig.querySelector(`[name="${key}"]`) : null;
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = config[key];
                    } else {
                        element.value = config[key];
                    }
                }
            }
            // Preenche os horários por dia
            if (config.horariosPorDia) {
                for (const dia in config.horariosPorDia) {
                    const diaConfig = config.horariosPorDia[dia];
                    if (document.getElementById(`${dia}-ativo`)) {
                        document.getElementById(`${dia}-ativo`).checked = diaConfig.ativo;
                        document.getElementById(`${dia}-inicio`).value = diaConfig.horarioInicio;
                        document.getElementById(`${dia}-fim`).value = diaConfig.horarioFim;
                        document.getElementById(`${dia}-duracao`).value = diaConfig.duracaoServico;
                    }
                }
            }
        }
    });
}

// ==========================================================================
// 4. CRIAÇÃO DE ELEMENTOS DA INTERFACE
// ==========================================================================

function createServicoCard(servico, key) {
    const card = document.createElement('div');
    card.classList.add('card', 'mb-3');
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${servico.nome}</h5>
            <p class="card-text"><strong>Preço Base:</strong> R$ ${servico.precoBase.toFixed(2)}</p>
            ${servico.camposAdicionais ? `
                <p class="card-text"><strong>Campos Adicionais:</strong></p>
                <ul>
                    ${servico.camposAdicionais.map(campo => `
                        <li>
                            ${campo.nome} (${campo.tipo})
                            ${campo.opcoes ? `
                                <ul>
                                    ${campo.opcoes.map(opcao => `
                                        <li>${opcao.nome} (R$ ${opcao.valor.toFixed(2)})</li>
                                    `).join('')}
                                </ul>
                            ` : ''}
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
            <button class="btn btn-warning btn-sm mt-2 edit-servico-btn" data-key="${key}">Editar</button>
            <button class="btn btn-danger btn-sm mt-2 delete-servico-btn" data-key="${key}">Excluir</button>
        </div>
    `;

    listaServicos.appendChild(card);
    card.querySelector('.edit-servico-btn').addEventListener('click', handleEditServico);
    card.querySelector('.delete-servico-btn').addEventListener('click', handleDeleteServico);
}

function createAgendamentoCard(agendamento, key) {
    const card = document.createElement('div');
    card.classList.add('card', 'mb-3');
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${agendamento.servicos[0].nome}</h5>
            <p><strong>Cliente:</strong> ${agendamento.cliente.nome}</p>
            <p><strong>Data:</strong> ${agendamento.data}</p>
            <p><strong>Hora:</strong> ${agendamento.hora}</p>
            <p><strong>Status:</strong> ${agendamento.status}</p>
            <button class="btn btn-danger btn-sm mt-2 delete-agendamento-btn" data-key="${key}">Excluir</button>
            <button class="btn btn-success btn-sm mt-2 complete-agendamento-btn" data-key="${key}">Concluir</button>
            <button class="btn btn-warning btn-sm mt-2 cancel-agendamento-btn" data-key="${key}">Cancelar</button>
        </div>
    `;
    listaAgendamentos.appendChild(card);
    card.querySelector('.delete-agendamento-btn').addEventListener('click', handleDeleteAgendamento);
    card.querySelector('.complete-agendamento-btn').addEventListener('click', handleUpdateAgendamentoStatus);
    card.querySelector('.cancel-agendamento-btn').addEventListener('click', handleUpdateAgendamentoStatus);
}

// ==========================================================================
// 5. MANIPULAÇÃO DE DADOS DO FORMULÁRIO E BANCO DE DADOS
// ==========================================================================

function handleServicoFormSubmit(e) {
    e.preventDefault();

    const servico = {
        nome: formServico.nome.value,
        descricao: formServico.descricao.value,
        precoBase: parseFloat(formServico.precoBase.value),
        camposAdicionais: getCamposAdicionaisFromForm()
    };

    if (editingServicoKey) {
        // Atualiza serviço
        const servicoRef = ref(database, `servicos/${editingServicoKey}`);
        set(servicoRef, servico).then(() => {
            alert('Serviço atualizado com sucesso!');
            resetForm();
        }).catch(error => {
            console.error("Erro ao atualizar o serviço:", error);
        });
    } else {
        // Adiciona novo serviço
        const servicosRef = ref(database, 'servicos');
        push(servicosRef, servico).then(() => {
            alert('Serviço cadastrado com sucesso!');
            resetForm();
        }).catch(error => {
            console.error("Erro ao cadastrar o serviço:", error);
        });
    }
}

function handleConfigFormSubmit(e) {
    e.preventDefault();

    const config = {
        whatsappNumber: formConfig.whatsappNumber.value,
        whatsappTemplate: formConfig.whatsappTemplate.value,
        horariosPorDia: {
            domingo: {
                ativo: document.getElementById('domingo-ativo').checked,
                horarioInicio: document.getElementById('domingo-inicio').value,
                horarioFim: document.getElementById('domingo-fim').value,
                duracaoServico: parseInt(document.getElementById('domingo-duracao').value)
            },
            segunda: {
                ativo: document.getElementById('segunda-ativo').checked,
                horarioInicio: document.getElementById('segunda-inicio').value,
                horarioFim: document.getElementById('segunda-fim').value,
                duracaoServico: parseInt(document.getElementById('segunda-duracao').value)
            },
            terca: {
                ativo: document.getElementById('terca-ativo').checked,
                horarioInicio: document.getElementById('terca-inicio').value,
                horarioFim: document.getElementById('terca-fim').value,
                duracaoServico: parseInt(document.getElementById('terca-duracao').value)
            },
            quarta: {
                ativo: document.getElementById('quarta-ativo').checked,
                horarioInicio: document.getElementById('quarta-inicio').value,
                horarioFim: document.getElementById('quarta-fim').value,
                duracaoServico: parseInt(document.getElementById('quarta-duracao').value)
            },
            quinta: {
                ativo: document.getElementById('quinta-ativo').checked,
                horarioInicio: document.getElementById('quinta-inicio').value,
                horarioFim: document.getElementById('quinta-fim').value,
                duracaoServico: parseInt(document.getElementById('quinta-duracao').value)
            },
            sexta: {
                ativo: document.getElementById('sexta-ativo').checked,
                horarioInicio: document.getElementById('sexta-inicio').value,
                horarioFim: document.getElementById('sexta-fim').value,
                duracaoServico: parseInt(document.getElementById('sexta-duracao').value)
            },
            sabado: {
                ativo: document.getElementById('sabado-ativo').checked,
                horarioInicio: document.getElementById('sabado-inicio').value,
                horarioFim: document.getElementById('sabado-fim').value,
                duracaoServico: parseInt(document.getElementById('sabado-duracao').value)
            }
        }
    };

    const configRef = ref(database, 'configuracoes');
    set(configRef, config).then(() => {
        alert('Configurações salvas com sucesso!');
    }).catch(error => {
        console.error("Erro ao salvar configurações:", error);
    });
}

function handleEditServico(e) {
    const key = e.target.dataset.key;
    const servicoRef = ref(database, `servicos/${key}`);

    get(servicoRef).then((snapshot) => {
        if (snapshot.exists()) {
            const servico = snapshot.val();
            if (formServico) {
                formServico.nome.value = servico.nome;
                formServico.descricao.value = servico.descricao;
                formServico.precoBase.value = servico.precoBase;
            }

            if (camposAdicionaisContainer) {
                camposAdicionaisContainer.innerHTML = '';
                if (servico.camposAdicionais) {
                    servico.camposAdicionais.forEach(campo => {
                        addCampoAdicional(null, campo);
                    });
                }
            }

            editingServicoKey = key;
            const saveBtn = document.getElementById('adicionar-servico-btn');
            if (saveBtn) {
                saveBtn.textContent = "Atualizar Serviço";
            }
            showTab('servico');
        }
    });
}

function handleDeleteServico(e) {
    const key = e.target.dataset.key;
    if (confirm("Tem certeza que deseja excluir este serviço?")) {
        const servicoRef = ref(database, `servicos/${key}`);
        remove(servicoRef);
    }
}

function handleDeleteAgendamento(e) {
    const key = e.target.dataset.key;
    if (confirm("Tem certeza que deseja excluir este agendamento?")) {
        const agendamentoRef = ref(database, `agendamentos/${key}`);
        remove(agendamentoRef);
    }
}

function handleUpdateAgendamentoStatus(e) {
    const key = e.target.dataset.key;
    const newStatus = e.target.textContent;
    const agendamentoRef = ref(database, `agendamentos/${key}`);
    update(agendamentoRef, { status: newStatus }).then(() => {
        alert(`Status do agendamento atualizado para ${newStatus}.`);
    });
}

// ==========================================================================
// 6. MANIPULAÇÃO DE CAMPOS DINÂMICOS
// ==========================================================================

function addCampoAdicional(e, campoData = { nome: '', tipo: 'select', opcoes: [] }) {
    if (e) e.preventDefault();
    if (!camposAdicionaisContainer) return;
    const campoContainer = document.createElement('div');
    campoContainer.classList.add('campo-adicional-container', 'mb-3', 'p-3', 'border', 'rounded');

    const tipoCampo = campoData.tipo;
    let htmlContent = '';

    switch (tipoCampo) {
        case 'select':
            htmlContent = generateSelectField(campoData);
            break;
        case 'textarea':
            htmlContent = generateTextareaField(campoData);
            break;
        default:
            htmlContent = generateInputField(campoData, tipoCampo);
            break;
    }

    campoContainer.innerHTML = `
        <div class="row g-2 mb-2">
            <div class="col-sm-6">
                <input type="text" class="form-control campo-nome" placeholder="Nome do Campo" value="${campoData.nome}" required>
            </div>
            <div class="col-sm-6">
                <select class="form-select campo-tipo">
                    <option value="select" ${tipoCampo === 'select' ? 'selected' : ''}>Lista de opções (select)</option>
                    <option value="textarea" ${tipoCampo === 'textarea' ? 'selected' : ''}>Área de texto (textarea)</option>
                    <option value="text" ${tipoCampo === 'text' ? 'selected' : ''}>Texto (input)</option>
                </select>
            </div>
        </div>
        ${htmlContent}
        <button type="button" class="btn btn-danger btn-sm mt-2 remove-campo-btn">Remover Campo</button>
    `;

    camposAdicionaisContainer.appendChild(campoContainer);

    // Adiciona listener para mudança de tipo de campo
    const campoTipoSelect = campoContainer.querySelector('.campo-tipo');
    if (campoTipoSelect) {
        campoTipoSelect.addEventListener('change', (e) => {
            const novoTipo = e.target.value;
            const novoConteudo = getNewFieldContent(novoTipo, campoData);
            const fieldContentDiv = campoContainer.querySelector('.field-content');
            if (fieldContentDiv) {
                fieldContentDiv.innerHTML = novoConteudo;
            }
        });
    }
}

function getNewFieldContent(novoTipo, campoData) {
    switch (novoTipo) {
        case 'select':
            return generateSelectField(campoData);
        case 'textarea':
            return generateTextareaField(campoData);
        default:
            return generateInputField(campoData, novoTipo);
    }
}

function generateSelectField(campoData) {
    return `
        <div class="field-content">
            <p>Opções:</p>
            <div class="option-list">
                ${generateOptionsHTML(campoData.opcoes)}
            </div>
            <button type="button" class="btn btn-sm btn-light add-option-btn">Adicionar Opção</button>
        </div>
    `;
}

function generateTextareaField(campoData) {
    return `
        <div class="field-content">
            <textarea class="form-control" placeholder="Texto de exemplo..." rows="3"></textarea>
        </div>
    `;
}

function generateInputField(campoData, tipo) {
    return `
        <div class="field-content">
            <input type="${tipo}" class="form-control" placeholder="Exemplo de texto..." required>
        </div>
    `;
}

function addOption(button, optionData = { nome: '', valor: 0.00 }) {
    const optionList = button.closest('.field-content').querySelector('.option-list');
    if (!optionList) return;
    const optionItem = document.createElement('div');
    optionItem.classList.add('option-item');
    optionItem.innerHTML = `
        <input type="text" class="form-control option-value" placeholder="Nome da opção (Ex: 9.000 BTUs)" value="${optionData.nome}" required>
        <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="${parseFloat(optionData.valor).toFixed(2)}">
        <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
    `;
    optionList.appendChild(optionItem);
}

function removeCampoAdicional(button) {
    button.closest('.campo-adicional-container').remove();
}

function removeOption(button) {
    button.closest('.option-item').remove();
}

function getCamposAdicionaisFromForm() {
    const camposAdicionais = [];
    document.querySelectorAll('.campo-adicional-container').forEach(container => {
        const campoNome = container.querySelector('.campo-nome').value;
        const campoTipo = container.querySelector('.campo-tipo').value;
        const campo = { nome: campoNome, tipo: campoTipo };

        if (campoTipo === 'select') {
            campo.opcoes = [];
            container.querySelectorAll('.option-item').forEach(optionItem => {
                const nome = optionItem.querySelector('.option-value').value;
                const valor = parseFloat(optionItem.querySelector('.option-price').value);
                if (nome && !isNaN(valor)) {
                    campo.opcoes.push({ nome, valor });
                }
            });
        }
        camposAdicionais.push(campo);
    });
    return camposAdicionais;
}

function resetForm() {
    if (formServico) formServico.reset();
    if (camposAdicionaisContainer) camposAdicionaisContainer.innerHTML = '';
    editingServicoKey = null;
    const saveBtn = document.getElementById('adicionar-servico-btn');
    if (saveBtn) {
        saveBtn.textContent = "Salvar Serviço";
    }
}

function generateOptionsHTML(opcoes = []) {
    if (opcoes.length === 0) {
        opcoes = [{ nome: '', valor: 0.00 }];
    }
    return `
        ${opcoes.map(option => {
            const optionValue = option.nome || '';
            const optionPrice = option.valor || 0.00;
            return `
                <div class="option-item">
                    <input type="text" class="form-control option-value" placeholder="Nome da opção (Ex: 9.000 BTUs)" value="${optionValue}" required>
                    <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="${parseFloat(optionPrice).toFixed(2)}">
                    <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
                </div>
            `;
        }).join('')}
    `;
}
