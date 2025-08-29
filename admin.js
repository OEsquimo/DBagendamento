/*
 * Arquivo: admin.js
 * Descrição: Lógica para o painel de administração.
 * Versão: 2.0 (Com suporte a campos adicionais e valores)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const servicoForm = document.getElementById('servicoForm');
const servicoNomeInput = document.getElementById('servicoNome');
const servicoDescricaoInput = document.getElementById('servicoDescricao');
const servicoPrecoInput = document.getElementById('servicoPreco');
const servicosList = document.getElementById('servicosList');
const agendamentosList = document.getElementById('agendamentosList');
const configForm = document.getElementById('configForm');
const whatsappNumberInput = document.getElementById('whatsappNumber');
const horariosContainer = document.getElementById('horariosContainer');
const addFieldBtn = document.getElementById('addFieldBtn');
const additionalFieldsContainer = document.getElementById('additionalFieldsContainer');

const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadBookings();
    loadConfig();
    setupConfigForm();
    setupServicoForm();
});

function setupServicoForm() {
    servicoForm.addEventListener('submit', handleServicoFormSubmit);
    addFieldBtn.addEventListener('click', addAdditionalFieldForm);
}

function setupConfigForm() {
    diasDaSemana.forEach(dia => {
        const div = document.createElement('div');
        div.className = 'horario-dia';
        div.innerHTML = `
            <h5>${capitalize(dia)}</h5>
            <div class="form-check">
                <input type="checkbox" class="form-check-input dia-ativo" id="${dia}Ativo">
                <label class="form-check-label" for="${dia}Ativo">Ativo</label>
            </div>
            <div class="form-group mt-2">
                <label for="${dia}Inicio">Início:</label>
                <input type="time" class="form-control horario-inicio" id="${dia}Inicio" value="08:00">
            </div>
            <div class="form-group">
                <label for="${dia}Fim">Fim:</label>
                <input type="time" class="form-control horario-fim" id="${dia}Fim" value="18:00">
            </div>
            <div class="form-group">
                <label for="${dia}Duracao">Duração (minutos):</label>
                <input type="number" class="form-control horario-duracao" id="${dia}Duracao" value="60" min="15" step="15">
            </div>
        `;
        horariosContainer.appendChild(div);
    });

    configForm.addEventListener('submit', handleConfigFormSubmit);
}

// ==========================================================================
// 3. GERENCIAMENTO DE SERVIÇOS
// ==========================================================================

function addAdditionalFieldForm() {
    const fieldIndex = additionalFieldsContainer.children.length;
    const fieldHtml = `
        <div class="additional-field" data-index="${fieldIndex}">
            <div class="form-group">
                <label>Nome do Campo</label>
                <input type="text" class="form-control field-name" placeholder="Ex: Capacidade de BTUs" required>
            </div>
            <div class="form-group">
                <label>Tipo do Campo</label>
                <select class="form-control field-type">
                    <option value="select">Lista de Opções</option>
                </select>
            </div>
            <div class="options-container">
                <p>Opções:</p>
                <div class="option-list">
                    <div class="option-item">
                        <input type="text" class="form-control option-value" placeholder="Nome da opção (Ex: 9.000 BTUs)" required>
                        <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="0.00">
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-light add-option-btn">Adicionar Opção</button>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-field-btn">Remover Campo</button>
        </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fieldHtml;
    const fieldElement = tempDiv.firstElementChild;
    additionalFieldsContainer.appendChild(fieldElement);

    fieldElement.querySelector('.add-option-btn').addEventListener('click', addOptionForm);
    fieldElement.querySelector('.remove-field-btn').addEventListener('click', removeAdditionalFieldForm);
}

function addOptionForm(e) {
    const optionList = e.target.closest('.options-container').querySelector('.option-list');
    const optionHtml = `
        <div class="option-item mt-2">
            <input type="text" class="form-control option-value" placeholder="Nome da opção" required>
            <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="0.00">
        </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = optionHtml;
    optionList.appendChild(tempDiv.firstElementChild);
}

function removeAdditionalFieldForm(e) {
    e.target.closest('.additional-field').remove();
}

function handleServicoFormSubmit(e) {
    e.preventDefault();

    const nome = servicoNomeInput.value;
    const descricao = servicoDescricaoInput.value;
    const precoBase = parseFloat(servicoPrecoInput.value) || 0;
    
    const camposAdicionais = [];
    document.querySelectorAll('.additional-field').forEach(fieldElement => {
        const fieldName = fieldElement.querySelector('.field-name').value;
        const fieldType = fieldElement.querySelector('.field-type').value;
        const opcoes = [];
        
        fieldElement.querySelectorAll('.option-item').forEach(optionItem => {
            const optionValue = optionItem.querySelector('.option-value').value;
            const optionPrice = parseFloat(optionItem.querySelector('.option-price').value) || 0;
            opcoes.push(`${optionValue}, R$ ${optionPrice.toFixed(2)}`);
        });

        camposAdicionais.push({
            nome: fieldName,
            tipo: fieldType,
            opcoes: opcoes
        });
    });

    const servico = {
        nome,
        descricao,
        precoBase,
        camposAdicionais
    };

    const servicosRef = ref(database, 'servicos');
    push(servicosRef, servico)
        .then(() => {
            alert('Serviço cadastrado com sucesso!');
            servicoForm.reset();
            additionalFieldsContainer.innerHTML = '';
        })
        .catch(error => {
            console.error("Erro ao cadastrar serviço:", error);
            alert("Ocorreu um erro. Verifique o console.");
        });
}

function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicosList.innerHTML = '';
        if (snapshot.exists()) {
            const servicos = snapshot.val();
            for (const key in servicos) {
                const servico = servicos[key];
                createServicoCard(servico, key);
            }
        } else {
            servicosList.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        }
    });
}

function createServicoCard(servico, key) {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${servico.nome}</h5>
            <p class="card-text"><strong>Descrição:</strong> ${servico.descricao}</p>
            <p class="card-text"><strong>Preço Base:</strong> R$ ${servico.precoBase ? servico.precoBase.toFixed(2) : '0.00'}</p>
            <h6>Campos Adicionais:</h6>
            <ul>
                ${servico.camposAdicionais ? servico.camposAdicionais.map(campo => `
                    <li><strong>${campo.nome}</strong>:
                        <ul>
                            ${campo.opcoes.map(opcao => `<li>${opcao}</li>`).join('')}
                        </ul>
                    </li>
                `).join('') : '<p>Nenhum campo adicional.</p>'}
            </ul>
            <button class="btn btn-danger btn-sm float-right delete-service-btn" data-key="${key}">Excluir</button>
        </div>
    `;
    servicosList.appendChild(card);
    card.querySelector('.delete-service-btn').addEventListener('click', deleteService);
}

function deleteService(e) {
    const key = e.target.dataset.key;
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        const servicoRef = ref(database, `servicos/${key}`);
        remove(servicoRef)
            .then(() => alert('Serviço excluído com sucesso!'))
            .catch(error => {
                console.error("Erro ao excluir serviço:", error);
                alert("Ocorreu um erro. Verifique o console.");
            });
    }
}

// ==========================================================================
// 4. GERENCIAMENTO DE AGENDAMENTOS
// ==========================================================================

function loadBookings() {
    const agendamentosRef = ref(database, 'agendamentos');
    onValue(agendamentosRef, (snapshot) => {
        agendamentosList.innerHTML = '';
        if (snapshot.exists()) {
            const agendamentos = snapshot.val();
            for (const key in agendamentos) {
                const agendamento = agendamentos[key];
                createAgendamentoCard(agendamento, key);
            }
        } else {
            agendamentosList.innerHTML = '<p>Nenhum agendamento pendente.</p>';
        }
    });
}

function createAgendamentoCard(agendamento, key) {
    const card = document.createElement('div');
    card.className = `card mb-3 booking-card booking-${agendamento.status.toLowerCase()}`;
    
    let servicosHtml = '<ul>';
    agendamento.servicos.forEach(servico => {
        servicosHtml += `<li><strong>${servico.nome}</strong>: R$ ${servico.precoCalculado.toFixed(2)}
            <ul>
                ${servico.camposAdicionaisSelecionados ? Object.entries(servico.camposAdicionaisSelecionados).map(([campo, valor]) => `
                    <li>${campo}: ${typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : valor}</li>
                `).join('') : ''}
            </ul>
        </li>`;
    });
    servicosHtml += '</ul>';

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">Agendamento de ${agendamento.cliente.nome}</h5>
            <p><strong>Data:</strong> ${agendamento.data} às ${agendamento.hora}</p>
            <p><strong>Status:</strong> <span class="badge badge-${agendamento.status.toLowerCase()}">${agendamento.status}</span></p>
            <hr>
            <h6>Detalhes do Cliente:</h6>
            <p><strong>Telefone:</strong> ${agendamento.cliente.telefone}</p>
            <p><strong>Endereço:</strong> ${agendamento.cliente.endereco}</p>
            <hr>
            <h6>Serviços:</h6>
            ${servicosHtml}
            <p><strong>Total:</strong> R$ ${agendamento.orcamentoTotal.toFixed(2)}</p>
            ${agendamento.observacoes ? `<p><strong>Obs:</strong> ${agendamento.observacoes}</p>` : ''}
            <div class="mt-3">
                <button class="btn btn-success btn-sm mark-completed" data-key="${key}" ${agendamento.status === 'Concluído' ? 'disabled' : ''}>Marcar como Concluído</button>
                <button class="btn btn-danger btn-sm cancel-booking" data-key="${key}" ${agendamento.status === 'Cancelado' ? 'disabled' : ''}>Cancelar</button>
            </div>
        </div>
    `;
    agendamentosList.appendChild(card);
    card.querySelector('.mark-completed').addEventListener('click', () => updateBookingStatus(key, 'Concluído'));
    card.querySelector('.cancel-booking').addEventListener('click', () => updateBookingStatus(key, 'Cancelado'));
}

function updateBookingStatus(key, newStatus) {
    const agendamentoRef = ref(database, `agendamentos/${key}`);
    set(agendamentoRef, { ...agendamento, status: newStatus })
        .then(() => alert(`Agendamento ${newStatus.toLowerCase()} com sucesso!`))
        .catch(error => {
            console.error("Erro ao atualizar status:", error);
            alert("Ocorreu um erro. Verifique o console.");
        });
}

// ==========================================================================
// 5. GERENCIAMENTO DE CONFIGURAÇÕES
// ==========================================================================

function handleConfigFormSubmit(e) {
    e.preventDefault();
    const whatsappNumber = whatsappNumberInput.value;
    const horariosPorDia = {};

    diasDaSemana.forEach(dia => {
        const ativo = document.getElementById(`${dia}Ativo`).checked;
        const horarioInicio = document.getElementById(`${dia}Inicio`).value;
        const horarioFim = document.getElementById(`${dia}Fim`).value;
        const duracaoServico = parseInt(document.getElementById(`${dia}Duracao`).value);

        horariosPorDia[dia] = { ativo, horarioInicio, horarioFim, duracaoServico };
    });

    const configRef = ref(database, 'configuracoes');
    set(configRef, { whatsappNumber, horariosPorDia })
        .then(() => alert('Configurações salvas com sucesso!'))
        .catch(error => {
            console.error("Erro ao salvar configurações:", error);
            alert("Ocorreu um erro. Verifique o console.");
        });
}

function loadConfig() {
    const configRef = ref(database, 'configuracoes');
    onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            const config = snapshot.val();
            whatsappNumberInput.value = config.whatsappNumber;
            diasDaSemana.forEach(dia => {
                const diaConfig = config.horariosPorDia[dia];
                if (diaConfig) {
                    document.getElementById(`${dia}Ativo`).checked = diaConfig.ativo;
                    document.getElementById(`${dia}Inicio`).value = diaConfig.horarioInicio;
                    document.getElementById(`${dia}Fim`).value = diaConfig.horarioFim;
                    document.getElementById(`${dia}Duracao`).value = diaConfig.duracaoServico;
                }
            });
        }
    });
}

// ==========================================================================
// 6. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
