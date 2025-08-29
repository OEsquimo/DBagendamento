/*
 * Arquivo: admin.js
 * Descrição: Lógica principal do painel de administração.
 * Versão: 3.0 (Com gestão de agendamento por dia da semana)
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
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
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

const configForm = document.getElementById('configForm');
const whatsappNumberInput = document.getElementById('whatsappNumber');
const duracaoServicoInput = document.getElementById('duracaoServico');
const dayCheckboxes = document.querySelectorAll('.day-checkbox');

const pendingAppointmentsNotification = document.getElementById('pendingAppointmentsNotification');
let currentEditingServiceKey = null; // Usado para saber se estamos editando um serviço

// ==========================================================================
// 2. FUNÇÕES DE AUTENTICAÇÃO E INICIALIZAÇÃO
// ==========================================================================

/**
 * Função principal para inicializar o painel.
 * Verifica a autenticação e carrega os dados.
 */
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    setupEventListeners();
});

/**
 * Verifica se o usuário já está logado.
 */
function checkLogin() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    } else {
        showLoginForm();
    }
}

/**
 * Mostra o formulário de login.
 */
function showLoginForm() {
    const loginHtml = `
        <div class="login-container">
            <h2>Login do Administrador</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Usuário</label>
                    <input type="text" id="username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="password">Senha</label>
                    <input type="password" id="password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary">Entrar</button>
            </form>
        </div>
    `;
    document.body.innerHTML = loginHtml;
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

/**
 * Gerencia o envio do formulário de login.
 */
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        location.reload(); // Recarrega a página para mostrar o painel
    } else {
        alert('Usuário ou senha incorretos.');
    }
}

/**
 * Mostra o painel de administração e carrega todos os dados.
 */
function showAdminPanel() {
    document.body.innerHTML = document.querySelector('.admin-container').outerHTML;
    setupEventListeners();
    loadAllData();
}

/**
 * Gerencia o logout do administrador.
 */
function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    location.reload();
}

// ==========================================================================
// 3. GERENCIAMENTO DE TABS E EVENTOS
// ==========================================================================

/**
 * Configura todos os ouvintes de evento para o painel de admin.
 */
function setupEventListeners() {
    if (!document.getElementById('logoutButton')) return;
    
    document.getElementById('logoutButton').addEventListener('click', handleLogout);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove a classe 'active' de todas as abas e conteúdos
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Adiciona a classe 'active' à aba e ao conteúdo selecionados
            tab.classList.add('active');
            document.getElementById(`tab${capitalize(targetTab)}`).classList.add('active');
        });
    });

    // Lida com o formulário de adicionar/editar serviço
    serviceForm.addEventListener('submit', handleServiceFormSubmit);
    document.querySelector('.btn-add-field').addEventListener('click', addAdditionalField);
    
    // Lida com o formulário de configurações
    configForm.addEventListener('submit', handleConfigFormSubmit);

    // Lida com o clique na notificação de agendamentos pendentes
    pendingAppointmentsNotification.addEventListener('click', () => {
        document.querySelector('[data-tab="agendamentos"]').click();
    });

    // Lida com os checkboxes de dias da semana
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

/**
 * Carrega todos os dados do Firebase (serviços, agendamentos, configurações).
 */
function loadAllData() {
    loadServicesAdmin();
    loadAppointments();
    loadConfigAdmin();
}

// ==========================================================================
// 4. GESTÃO DE SERVIÇOS
// ==========================================================================

/**
 * Adiciona um novo campo adicional ao formulário de serviço.
 */
function addAdditionalField() {
    const fieldEntry = document.createElement('div');
    fieldEntry.className = 'field-entry';
    fieldEntry.innerHTML = `
        <div class="form-group">
            <label for="fieldName">Nome do Campo</label>
            <input type="text" class="form-control field-name" placeholder="BTUs"/>
        </div>
        <div class="form-group">
            <label for="fieldType">Tipo</label>
            <select class="form-control field-type">
                <option value="text">Texto</option>
                <option value="select">Lista de Opções</option>
            </select>
        </div>
        <div class="form-group field-options-group hidden">
            <label for="fieldOptions">Opções (ex: 9000 BTUs, R$ 50; 12000 BTUs, R$ 75)</label>
            <textarea class="form-control field-options" rows="2"></textarea>
        </div>
        <button type="button" class="btn btn-danger btn-remove-field"><i class="fas fa-trash"></i> Remover</button>
    `;
    
    // Adiciona o listener para o botão de remover
    fieldEntry.querySelector('.btn-remove-field').addEventListener('click', () => {
        fieldEntry.remove();
    });
    
    // Adiciona o listener para o tipo de campo para mostrar/ocultar opções
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

/**
 * Envia o formulário de serviço para o Firebase.
 */
async function handleServiceFormSubmit(e) {
    e.preventDefault();
    
    const serviceData = {
        nome: serviceNameInput.value,
        descricao: serviceDescriptionInput.value,
        precoBase: parseFloat(servicePriceInput.value),
        camposAdicionais: []
    };
    
    // Coleta os campos adicionais
    const fieldEntries = additionalFieldsContainer.querySelectorAll('.field-entry');
    fieldEntries.forEach(entry => {
        const fieldName = entry.querySelector('.field-name').value;
        const fieldType = entry.querySelector('.field-type').value;
        const fieldOptions = entry.querySelector('.field-options').value;
        
        const field = {
            nome: fieldName,
            tipo: fieldType,
            opcoes: fieldOptions.split(';').map(o => o.trim())
        };
        serviceData.camposAdicionais.push(field);
    });
    
    const servicosRef = ref(database, 'servicos');

    try {
        if (currentEditingServiceKey) {
            // Se estiver editando, atualiza o serviço existente
            const serviceRef = ref(database, `servicos/${currentEditingServiceKey}`);
            await set(serviceRef, serviceData);
            alert('Serviço atualizado com sucesso!');
            currentEditingServiceKey = null; // Reseta a chave de edição
        } else {
            // Se for um novo serviço, adiciona ao Firebase
            await push(servicosRef, serviceData);
            alert('Serviço adicionado com sucesso!');
        }
        
        serviceForm.reset();
        additionalFieldsContainer.innerHTML = '';
        addAdditionalField(); // Adiciona um campo vazio para o próximo
        loadServicesAdmin();
    } catch (error) {
        console.error("Erro ao salvar serviço:", error);
        alert('Erro ao salvar serviço.');
    }
}

/**
 * Carrega a lista de serviços para o painel de administração.
 */
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

/**
 * Preenche o formulário para editar um serviço.
 */
function editService(key, service) {
    currentEditingServiceKey = key;
    serviceNameInput.value = service.nome;
    serviceDescriptionInput.value = service.descricao;
    servicePriceInput.value = service.precoBase;

    additionalFieldsContainer.innerHTML = '';
    if (service.camposAdicionais) {
        service.camposAdicionais.forEach(field => {
            const fieldEntry = document.createElement('div');
            fieldEntry.className = 'field-entry';
            fieldEntry.innerHTML = `
                <div class="form-group">
                    <label for="fieldName">Nome do Campo</label>
                    <input type="text" class="form-control field-name" value="${field.nome}"/>
                </div>
                <div class="form-group">
                    <label for="fieldType">Tipo</label>
                    <select class="form-control field-type">
                        <option value="text" ${field.tipo === 'text' ? 'selected' : ''}>Texto</option>
                        <option value="select" ${field.tipo === 'select' ? 'selected' : ''}>Lista de Opções</option>
                    </select>
                </div>
                <div class="form-group field-options-group ${field.tipo === 'text' ? 'hidden' : ''}">
                    <label for="fieldOptions">Opções (ex: 9000 BTUs, R$ 50; 12000 BTUs, R$ 75)</label>
                    <textarea class="form-control field-options" rows="2">${field.opcoes.join('; ')}</textarea>
                </div>
                <button type="button" class="btn btn-danger btn-remove-field"><i class="fas fa-trash"></i> Remover</button>
            `;
            fieldEntry.querySelector('.btn-remove-field').addEventListener('click', () => fieldEntry.remove());
            fieldEntry.querySelector('.field-type').addEventListener('change', (e) => {
                const optionsGroup = e.target.closest('.field-entry').querySelector('.field-options-group');
                if (e.target.value === 'select') {
                    optionsGroup.classList.remove('hidden');
                } else {
                    optionsGroup.classList.add('hidden');
                }
            });
            additionalFieldsContainer.appendChild(fieldEntry);
        });
    }
    // Adiciona um campo vazio para permitir a adição de mais
    addAdditionalField(); 
}

/**
 * Exclui um serviço do Firebase.
 */
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

/**
 * Carrega a lista de agendamentos para o painel de administração.
 */
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
            
            for (const key in agendamentos) {
                const agendamento = agendamentos[key];
                if (agendamento.status === 'Pendente') {
                    pendingCount++;
                }

                const tr = document.createElement('tr');
                
                // Formata a lista de serviços para exibição
                let servicosHtml = '<ul>';
                agendamento.servicos.forEach(servico => {
                    let totalServico = parseFloat(servico.precoBase);
                    servicosHtml += `<li>- ${servico.nome} (R$ ${totalServico.toFixed(2)})</li>`;
                    if (servico.camposAdicionaisSelecionados) {
                         for (const campo in servico.camposAdicionaisSelecionados) {
                            const valorCampo = parseFloat(servico.camposAdicionaisSelecionados[campo]);
                            servicosHtml += `<li>&nbsp;&nbsp;&nbsp;&nbsp; - ${campo}: R$ ${valorCampo.toFixed(2)}</li>`;
                        }
                    }
                });
                servicosHtml += '</ul>';

                // Cria o menu de seleção de status
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
                    <td>${agendamento.cliente.nome}</td>
                    <td>${servicosHtml}</td>
                    <td>${agendamento.data} às ${agendamento.hora}</td>
                    <td>${agendamento.cliente.endereco}</td>
                    <td>R$ ${agendamento.orcamentoTotal.toFixed(2)}</td>
                    <td></td>
                    <td>
                        <button class="btn btn-danger btn-sm delete-appointment" data-key="${key}"><i class="fas fa-trash"></i> Excluir</button>
                    </td>
                `;
                
                // Adiciona o select de status à célula
                tr.querySelector('td:nth-child(6)').appendChild(statusSelect);
                tr.querySelector('.delete-appointment').addEventListener('click', () => deleteAppointment(key));
                tbody.appendChild(tr);
            }
            agendamentosList.appendChild(table);

            // Exibe ou oculta a notificação de agendamentos pendentes
            if (pendingCount > 0) {
                pendingAppointmentsNotification.classList.remove('hidden');
                pendingAppointmentsNotification.querySelector('p').textContent = `Você tem ${pendingCount} agendamento(s) pendente(s)! Clique aqui para ver.`;
            } else {
                pendingAppointmentsNotification.classList.add('hidden');
            }

        } else {
            agendamentosList.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            pendingAppointmentsNotification.classList.add('hidden');
        }
    });
}

/**
 * Atualiza o status de um agendamento no Firebase.
 */
async function updateAppointmentStatus(key, newStatus) {
    try {
        const appointmentRef = ref(database, `agendamentos/${key}`);
        await update(appointmentRef, { status: newStatus });
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
    }
}

/**
 * Exclui um agendamento do Firebase.
 */
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

/**
 * Carrega as configurações do sistema para o painel de admin.
 */
async function loadConfigAdmin() {
    const configRef = ref(database, 'configuracoes');
    const snapshot = await get(configRef);
    if (snapshot.exists()) {
        const config = snapshot.val();
        whatsappNumberInput.value = config.whatsappNumber || '';
        duracaoServicoInput.value = config.duracaoServico || 60;
        
        // Carrega as configurações de horários por dia da semana
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

/**
 * Envia o formulário de configurações para o Firebase.
 */
async function handleConfigFormSubmit(e) {
    e.preventDefault();
    
    // Objeto para armazenar os horários por dia
    const horariosPorDia = {};
    dayCheckboxes.forEach(checkbox => {
        const dia = checkbox.dataset.day;
        const timeInputs = document.getElementById(`${dia}TimeInputs`);
        horariosPorDia[dia] = {
            ativo: checkbox.checked,
            horarioInicio: timeInputs.querySelector('.time-input:first-child').value,
            horarioFim: timeInputs.querySelector('.time-input:last-child').value,
            duracaoServico: parseInt(duracaoServicoInput.value) // Usar a duração padrão
        };
    });

    const configData = {
        whatsappNumber: whatsappNumberInput.value,
        duracaoServico: parseInt(duracaoServicoInput.value),
        horariosPorDia: horariosPorDia // Salva a nova estrutura de dados
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

/**
 * Converte a primeira letra de uma string para maiúscula.
 */
function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
