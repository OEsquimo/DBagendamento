/*
 * Arquivo: admin.js
 * Descrição: Lógica principal do painel de administração.
 * Versão: 3.1 (Com gestão de agendamento por dia da semana e melhorias de UI)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, remove, push, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ==========================================================================

// Configuração do Firebase - Substitua pelos seus dados
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

// Usuário e senha de exemplo para o painel
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

// Elementos HTML
const loginFormContainer = document.getElementById('loginForm');
const adminPanelContainer = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginFormInner');
const logoutButton = document.getElementById('logoutButton');

const tabs = document.querySelectorAll('.tab-item');
const tabContents = document.querySelectorAll('.tab-content');

const servicosListAdmin = document.getElementById('servicosListAdmin');
const agendamentosList = document.getElementById('agendamentosList');

const serviceForm = document.getElementById('addServiceForm');
const serviceNameInput = document.getElementById('serviceName');
const serviceDescriptionInput = document.getElementById('serviceDescription');
const servicePriceInput = document.getElementById('servicePrice');
const additionalFieldsContainer = document.getElementById('additionalFieldsContainer');
const addFieldButton = document.querySelector('.btn-add-field');

const configForm = document.getElementById('configForm');
const whatsappNumberInput = document.getElementById('whatsappNumber');
const duracaoServicoInput = document.getElementById('duracaoServico');
const dayCheckboxes = document.querySelectorAll('.day-checkbox');

const pendingAppointmentsNotification = document.getElementById('pendingAppointmentsNotification');
let currentEditingServiceKey = null;

// ==========================================================================
// 2. FUNÇÕES DE AUTENTICAÇÃO E INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    setupEventListeners();
});

function checkLogin() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    } else {
        showLoginForm();
    }
}

function showLoginForm() {
    loginFormContainer.classList.remove('hidden');
    adminPanelContainer.classList.add('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
    } else {
        alert('Usuário ou senha incorretos.');
    }
}

function showAdminPanel() {
    loginFormContainer.classList.add('hidden');
    adminPanelContainer.classList.remove('hidden');
    loadAllData();
}

function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    showLoginForm();
}

// ==========================================================================
// 3. GERENCIAMENTO DE TABS E EVENTOS
// ==========================================================================

function setupEventListeners() {
    if (!loginForm || !adminPanelContainer) {
        console.error("Elementos principais do painel de admin não encontrados.");
        return;
    }
    
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`tab${capitalize(targetTab)}`).classList.add('active');
        });
    });

    serviceForm.addEventListener('submit', handleServiceFormSubmit);
    addFieldButton.addEventListener('click', () => addAdditionalField());
    
    configForm.addEventListener('submit', handleConfigFormSubmit);

    pendingAppointmentsNotification.addEventListener('click', () => {
        document.querySelector('[data-tab="agendamentos"]').click();
    });

    dayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const day = e.target.dataset.day;
            const timeInputs = document.getElementById(`${day}TimeInputs`);
            if (e.target.checked) {
                timeInputs.classList.remove('hidden');
            } else {
                timeInputs.classList.add('hidden');
            }
        });
    });
}

function loadAllData() {
    loadServicesAdmin();
    loadAppointments();
    loadConfigAdmin();
}

// ==========================================================================
// 4. GESTÃO DE SERVIÇOS
// ==========================================================================

function addAdditionalField(fieldName = '', fieldType = 'text', fieldOptions = []) {
    const fieldEntry = document.createElement('div');
    fieldEntry.className = 'field-entry';
    fieldEntry.innerHTML = `
        <div class="form-group">
            <label>Nome do Campo</label>
            <input type="text" class="form-control field-name" placeholder="BTUs" value="${fieldName}"/>
        </div>
        <div class="form-group">
            <label>Tipo</label>
            <select class="form-control field-type">
                <option value="text" ${fieldType === 'text' ? 'selected' : ''}>Texto</option>
                <option value="select" ${fieldType === 'select' ? 'selected' : ''}>Lista de Opções</option>
            </select>
        </div>
        <div class="form-group field-options-group ${fieldType === 'text' ? 'hidden' : ''}">
            <label>Opções (ex: 9000 BTUs, R$ 50; 12000 BTUs, R$ 75)</label>
            <textarea class="form-control field-options" rows="2">${fieldOptions.join('; ')}</textarea>
        </div>
        <button type="button" class="btn btn-danger btn-sm btn-remove-field"><i class="fas fa-trash"></i> Remover</button>
    `;
    
    fieldEntry.querySelector('.btn-remove-field').addEventListener('click', () => {
        fieldEntry.remove();
    });
    
    fieldEntry.querySelector('.field-type').addEventListener('change', (e) => {
        const optionsGroup = e.target.closest('.field-entry').querySelector('.field-options-group');
        if (e.target.value === 'select') {
            optionsGroup.classList.remove('hidden');
        } else {
            optionsGroup.classList.add('hidden');
        }
    });

    additionalFieldsContainer.appendChild(fieldEntry);
}

async function handleServiceFormSubmit(e) {
    e.preventDefault();
    
    const serviceData = {
        nome: serviceNameInput.value,
        descricao: serviceDescriptionInput.value,
        precoBase: parseFloat(servicePriceInput.value),
        camposAdicionais: []
    };
    
    const fieldEntries = additionalFieldsContainer.querySelectorAll('.field-entry');
    fieldEntries.forEach(entry => {
        const fieldName = entry.querySelector('.field-name').value;
        const fieldType = entry.querySelector('.field-type').value;
        const fieldOptions = entry.querySelector('.field-options').value;
        
        if(fieldName.trim() !== '') {
            const field = {
                nome: fieldName,
                tipo: fieldType
            };
            if (fieldType === 'select') {
                field.opcoes = fieldOptions.split(';').map(o => o.trim()).filter(o => o !== '');
            }
            serviceData.camposAdicionais.push(field);
        }
    });
    
    const servicosRef = ref(database, 'servicos');

    try {
        if (currentEditingServiceKey) {
            const serviceRef = ref(database, `servicos/${currentEditingServiceKey}`);
            await set(serviceRef, serviceData);
            alert('Serviço atualizado com sucesso!');
        } else {
            await push(servicosRef, serviceData);
            alert('Serviço adicionado com sucesso!');
        }
        
        resetServiceForm();
    } catch (error) {
        console.error("Erro ao salvar serviço:", error);
        alert('Erro ao salvar serviço.');
    }
}

function resetServiceForm() {
    serviceForm.reset();
    additionalFieldsContainer.innerHTML = '';
    currentEditingServiceKey = null;
    addFieldButton.textContent = 'Adicionar Campo';
}

function loadServicesAdmin() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicosListAdmin.innerHTML = '';
        if (snapshot.exists()) {
            const servicos = snapshot.val();
            for (const key in servicos) {
                const service = servicos[key];
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.innerHTML = `
                    <span>
                        <strong>${service.nome}</strong> (R$ ${service.precoBase.toFixed(2)})
                    </span>
                    <div>
                        <button class="btn btn-secondary btn-sm edit-service" data-key="${key}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm delete-service" data-key="${key}">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                `;
                li.querySelector('.edit-service').addEventListener('click', () => editService(key, service));
                li.querySelector('.delete-service').addEventListener('click', () => deleteService(key));
                servicosListAdmin.appendChild(li);
            }
        } else {
            servicosListAdmin.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        }
    });
}

function editService(key, service) {
    currentEditingServiceKey = key;
    serviceNameInput.value = service.nome;
    serviceDescriptionInput.value = service.descricao;
    servicePriceInput.value = service.precoBase;

    additionalFieldsContainer.innerHTML = '';
    if (service.camposAdicionais) {
        service.camposAdicionais.forEach(field => {
            addAdditionalField(field.nome, field.tipo, field.opcoes || []);
        });
    }
    addFieldButton.textContent = 'Adicionar mais';
}

async function deleteService(key) {
    if (confirm("Tem certeza que deseja excluir este serviço?")) {
        try {
            const serviceRef = ref(database, `servicos/${key}`);
            await remove(serviceRef);
            alert("Serviço excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir serviço:", error);
            alert("Erro ao excluir serviço.");
        }
    }
}

// ==========================================================================
// 5. GESTÃO DE AGENDAMENTOS
// ==========================================================================

function loadAppointments() {
    const agendamentosRef = ref(database, 'agendamentos');
    onValue(agendamentosRef, (snapshot) => {
        agendamentosList.innerHTML = '';
        if (snapshot.exists()) {
            const agendamentos = snapshot.val();
            let pendingCount = 0;
            const table = document.createElement('table');
            table.className = 'agendamentos-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Serviços</th>
                        <th>Data/Hora</th>
                        <th>Endereço</th>
                        <th>Valor Total</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            
            const sortedAppointments = Object.entries(agendamentos).sort((a, b) => {
                const [keyA, apptA] = a;
                const [keyB, apptB] = b;
                const dateA = new Date(`${apptA.data.split('/').reverse().join('-')}T${apptA.hora}:00`);
                const dateB = new Date(`${apptB.data.split('/').reverse().join('-')}T${apptB.hora}:00`);
                return dateB - dateA;
            });

            sortedAppointments.forEach(([key, agendamento]) => {
                if (agendamento.status === 'Pendente') {
                    pendingCount++;
                }

                const tr = document.createElement('tr');
                
                let servicosHtml = '<ul>';
                agendamento.servicos.forEach(servico => {
                    let totalServico = parseFloat(servico.precoCalculado);
                    servicosHtml += `<li>- ${servico.nome} (R$ ${totalServico.toFixed(2)})</li>`;
                    if (servico.camposAdicionaisSelecionados) {
                         for (const campo in servico.camposAdicionaisSelecionados) {
                            const valorCampo = servico.camposAdicionaisSelecionados[campo];
                            const valorDisplay = typeof valorCampo === 'number' ? `R$ ${valorCampo.toFixed(2)}` : valorCampo;
                            servicosHtml += `<li>&nbsp;&nbsp;&nbsp;&nbsp; - ${campo}: ${valorDisplay}</li>`;
                        }
                    }
                });
                servicosHtml += '</ul>';

                const statusOptions = ['Pendente', 'Confirmado', 'Finalizado', 'Cancelado'];
                const statusSelect = document.createElement('select');
                statusSelect.className = 'status-select';
                statusOptions.forEach(status => {
                    const option = document.createElement('option');
                    option.value = status;
                    option.textContent = status;
                    if (status === agendamento.status) {
                        option.selected = true;
                    }
                    statusSelect.appendChild(option);
                });

                statusSelect.addEventListener('change', (e) => updateAppointmentStatus(key, e.target.value));
                
                tr.innerHTML = `
                    <td data-label="Cliente">${agendamento.cliente.nome}</td>
                    <td data-label="Serviços">${servicosHtml}</td>
                    <td data-label="Data/Hora">${agendamento.data} às ${agendamento.hora}</td>
                    <td data-label="Endereço">${agendamento.cliente.endereco}</td>
                    <td data-label="Valor Total">R$ ${agendamento.orcamentoTotal.toFixed(2)}</td>
                    <td data-label="Status"></td>
                    <td data-label="Ações">
                        <button class="btn btn-danger btn-sm delete-appointment" data-key="${key}"><i class="fas fa-trash"></i> Excluir</button>
                    </td>
                `;
                
                tr.querySelector('td:nth-child(6)').appendChild(statusSelect);
                tr.querySelector('.delete-appointment').addEventListener('click', () => deleteAppointment(key));
                tbody.appendChild(tr);
            });

            agendamentosList.appendChild(table);

            if (pendingCount > 0) {
                pendingAppointmentsNotification.classList.remove('hidden');
                pendingAppointmentsNotification.querySelector('p').textContent = `Você tem ${pendingCount} agendamento(s) pendente(s)!`;
            } else {
                pendingAppointmentsNotification.classList.add('hidden');
            }

        } else {
            agendamentosList.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            pendingAppointmentsNotification.classList.add('hidden');
        }
    });
}

async function updateAppointmentStatus(key, newStatus) {
    try {
        const appointmentRef = ref(database, `agendamentos/${key}`);
        await update(appointmentRef, { status: newStatus });
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
    }
}

async function deleteAppointment(key) {
    if (confirm("Tem certeza que deseja excluir este agendamento?")) {
        try {
            const appointmentRef = ref(database, `agendamentos/${key}`);
            await remove(appointmentRef);
            alert("Agendamento excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir agendamento:", error);
            alert("Erro ao excluir agendamento.");
        }
    }
}

// ==========================================================================
// 6. GESTÃO DE CONFIGURAÇÕES AVANÇADA
// ==========================================================================

async function loadConfigAdmin() {
    const configRef = ref(database, 'configuracoes');
    const snapshot = await get(configRef);
    if (snapshot.exists()) {
        const config = snapshot.val();
        whatsappNumberInput.value = config.whatsappNumber || '';
        duracaoServicoInput.value = config.duracaoServico || 60;
        
        if (config.horariosPorDia) {
            for (const dia in config.horariosPorDia) {
                const configDia = config.horariosPorDia[dia];
                const checkbox = document.getElementById(`${dia}Checkbox`);
                const timeInputs = document.getElementById(`${dia}TimeInputs`);
                
                if (checkbox) {
                    checkbox.checked = configDia.ativo;
                    if (configDia.ativo) {
                        timeInputs.classList.remove('hidden');
                        document.getElementById(`${dia}Inicio`).value = configDia.horarioInicio;
                        document.getElementById(`${dia}Fim`).value = configDia.horarioFim;
                    } else {
                        timeInputs.classList.add('hidden');
                    }
                }
            }
        }
    }
}

async function handleConfigFormSubmit(e) {
    e.preventDefault();
    
    const horariosPorDia = {};
    dayCheckboxes.forEach(checkbox => {
        const dia = checkbox.dataset.day;
        const timeInputs = document.getElementById(`${dia}TimeInputs`);
        horariosPorDia[dia] = {
            ativo: checkbox.checked,
            horarioInicio: timeInputs.querySelector('.time-input:first-child').value,
            horarioFim: timeInputs.querySelector('.time-input:last-child').value,
            duracaoServico: parseInt(duracaoServicoInput.value)
        };
    });

    const configData = {
        whatsappNumber: whatsappNumberInput.value,
        duracaoServico: parseInt(duracaoServicoInput.value),
        horariosPorDia: horariosPorDia
    };
    
    try {
        const configRef = ref(database, 'configuracoes');
        await set(configRef, configData);
        alert('Configurações salvas com sucesso!');
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        alert('Erro ao salvar configurações.');
    }
}

// ==========================================================================
// 7. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
