// Simulação do Firebase para demonstração
const simulacaoDB = {
    configSite: {
        companyName: "O Esquimó - Refrigeração",
        description: "Serviços especializados em ar condicionado e refrigeração",
        whatsappNumber: "5581999999999",
        heroUrl: "assets/imagens/tecnico-trabalhando.jpg",
        reminderMonths: 12
    },
    configSchedule: {
        slots: [
            { time: "08:00", vacancies: 2 },
            { time: "10:00", vacancies: 2 },
            { time: "14:00", vacancies: 2 },
            { time: "16:00", vacancies: 2 }
        ]
    },
    services: [
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
        }
    ],
    agendamentos: []
};

// Elementos DOM
const loginSection = document.getElementById("loginSection");
const adminContent = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const btnLogin = document.getElementById("btnLogin");
const loginMsg = document.getElementById("loginMsg");
const cfgCompanyName = document.getElementById("cfgCompanyName");
const cfgCompanyDesc = document.getElementById("cfgCompanyDesc");
const cfgHeroUrl = document.getElementById("cfgHeroUrl");
const heroImagePreview = document.getElementById("heroImagePreview");
const cfgWhats = document.getElementById("cfgWhats");
const siteMsg = document.getElementById("siteMsg");
const btnSaveSite = document.getElementById("btnSaveSite");
const scheduleGridContainer = document.getElementById("schedule-grid-container");
const btnAddScheduleSlot = document.getElementById("btnAddScheduleSlot");
const btnSaveSchedule = document.getElementById("btnSaveSchedule");
const scheduleMsg = document.getElementById("scheduleMsg");
const serviceFormContainer = document.getElementById("service-form-container");
const btnShowAddServiceForm = document.getElementById("btnShowAddServiceForm");
const srvList = document.getElementById("srvList");
const srvMsg = document.getElementById("srvMsg");
const searchClientPhone = document.getElementById("searchClientPhone");
const btnSearchClient = document.getElementById("btnSearchClient");
const searchMsg = document.getElementById("searchMsg");
const manualServiceForm = document.getElementById("manualServiceForm");
const mServiceId = document.getElementById("mServiceId");
const mNome = document.getElementById("mNome");
const mFone = document.getElementById("mFone");
const mEndereco = document.getElementById("mEndereco");
const mTipoEquipamento = document.getElementById("mTipoEquipamento");
const mCapacidade = document.getElementById("mCapacidade");
const mObs = document.getElementById("mObs");
const mData = document.getElementById("mData");
const mHora = document.getElementById("mHora");
const btnSaveManual = document.getElementById("btnSaveManual");
const btnUpdateManual = document.getElementById("btnUpdateManual");
const btnDeleteManual = document.getElementById("btnDeleteManual");
const cfgReminderMonths = document.getElementById("cfgReminderMonths");
const btnRodarLembretes = document.getElementById("btnRodarLembretes");
const reminderLog = document.getElementById("reminderLog");

// Estado da aplicação
let currentState = JSON.parse(JSON.stringify(simulacaoDB));

// Funções de utilidade
function showMessage(el, text, success = true, duration = 3000) {
    if (!el) return;
    el.textContent = text;
    el.className = `form-message ${success ? 'success' : 'error'}`;
    if (duration > 0) {
        setTimeout(() => el.textContent = "", duration);
    }
}

function maskPhone(input) {
    if (!input) return;
    input.addEventListener('input', function(e) {
        let v = e.target.value.replace(/\D/g, "").slice(0, 11);
        if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
        e.target.value = v;
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Configurar máscaras de telefone
    maskPhone(cfgWhats);
    maskPhone(searchClientPhone);
    maskPhone(mFone);
    
    // Carregar dados iniciais
    loadSiteConfig();
    loadSchedule();
    loadServices();
    
    // Configurar eventos
    setupEventListeners();
});

// Configurações do site
function loadSiteConfig() {
    cfgCompanyName.value = currentState.configSite.companyName || "";
    cfgCompanyDesc.value = currentState.configSite.description || "";
    cfgWhats.value = currentState.configSite.whatsappNumber || "";
    cfgReminderMonths.value = currentState.configSite.reminderMonths || 12;
    
    // Configurar opções de imagem
    cfgHeroUrl.innerHTML = `
        <option value="assets/imagens/tecnico-trabalhando.jpg">Imagem Padrão - Técnico</option>
        <option value="assets/imagens/limpeza-split.jpg">Limpeza de Split</option>
        <option value="assets/imagens/instalacao-ar.jpg">Instalação</option>
    `;
    
    if (currentState.configSite.heroUrl) {
        cfgHeroUrl.value = currentState.configSite.heroUrl;
        heroImagePreview.src = currentState.configSite.heroUrl;
        heroImagePreview.style.display = 'block';
    }
    
    cfgHeroUrl.addEventListener('change', function() {
        heroImagePreview.src = cfgHeroUrl.value;
        heroImagePreview.style.display = 'block';
    });
}

// Grade de horários
function loadSchedule() {
    scheduleGridContainer.innerHTML = '';
    
    if (currentState.configSchedule.slots && currentState.configSchedule.slots.length > 0) {
        currentState.configSchedule.slots.forEach(slot => {
            addScheduleSlot(slot.time, slot.vacancies);
        });
    } else {
        // Valores padrão
        addScheduleSlot("08:00", 1);
        addScheduleSlot("10:00", 1);
        addScheduleSlot("14:00", 1);
    }
}

function addScheduleSlot(time = '', vacancies = 1) {
    const slotId = `slot-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'dynamic-field';
    div.id = slotId;
    div.innerHTML = `
        <input type="time" class="time-input" value="${time}" required>
        <input type="number" class="vacancies-input" min="1" value="${vacancies}" required>
        <label>vaga(s)</label>
        <button type="button" class="remove-field-btn" onclick="document.getElementById('${slotId}').remove()">×</button>
    `;
    scheduleGridContainer.appendChild(div);
}

// Serviços
function loadServices() {
    srvList.innerHTML = "";
    
    if (currentState.services.length === 0) {
        srvList.innerHTML = "<p>Nenhum serviço cadastrado.</p>";
        return;
    }
    
    currentState.services.forEach(service => {
        const div = document.createElement('div');
        div.className = 'service-item-admin';
        div.innerHTML = `
            <img src="${service.imageUrl}" alt="${service.name}">
            <div class="service-info">
                <strong>${service.name}</strong>
                <span>${service.description || 'Sem descrição'}</span>
            </div>
            <div class="service-actions">
                <button class="edit-btn" data-id="${service.id}">Editar</button>
                <button class="delete-btn" data-id="${service.id}">Excluir</button>
            </div>
        `;
        srvList.appendChild(div);
    });
    
    // Adicionar eventos aos botões
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const serviceId = this.getAttribute('data-id');
            editService(parseInt(serviceId));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const serviceId = this.getAttribute('data-id');
            deleteService(parseInt(serviceId));
        });
    });
}

function editService(serviceId) {
    const service = currentState.services.find(s => s.id === serviceId);
    if (!service) return;
    
    serviceFormContainer.innerHTML = `
        <div class="service-form">
            <h4>Editar Serviço</h4>
            <input type="hidden" id="srvId" value="${service.id}">
            <div class="form-group">
                <label for="srvName">Nome do Serviço</label>
                <input type="text" id="srvName" value="${service.name}" required>
            </div>
            <div class="form-group">
                <label for="srvDescription">Descrição</label>
                <input type="text" id="srvDescription" value="${service.description || ''}">
            </div>
            <div class="form-group">
                <label for="srvImage">Imagem</label>
                <select id="srvImage">
                    <option value="https://placehold.co/200x200/3498db/ffffff?text=Limpeza" ${service.imageUrl.includes('3498db') ? 'selected' : ''}>Azul</option>
                    <option value="https://placehold.co/200x200/2ecc71/ffffff?text=Manutenção" ${service.imageUrl.includes('2ecc71') ? 'selected' : ''}>Verde</option>
                    <option value="https://placehold.co/200x200/e74c3c/ffffff?text=Instalação" ${service.imageUrl.includes('e74c3c') ? 'selected' : ''}>Vermelho</option>
                </select>
            </div>
            <div class="form-actions">
                <button id="btnUpdateService" class="final-button">Atualizar</button>
                <button id="btnCancelEdit" class="secondary-button">Cancelar</button>
            </div>
        </div>
    `;
    
    document.getElementById('btnUpdateService').addEventListener('click', function() {
        const name = document.getElementById('srvName').value;
        const description = document.getElementById('srvDescription').value;
        const imageUrl = document.getElementById('srvImage').value;
        
        if (name) {
            service.name = name;
            service.description = description;
            service.imageUrl = imageUrl;
            
            loadServices();
            serviceFormContainer.innerHTML = '';
            showMessage(srvMsg, "Serviço atualizado com sucesso!");
        }
    });
    
    document.getElementById('btnCancelEdit').addEventListener('click', function() {
        serviceFormContainer.innerHTML = '';
    });
}

function deleteService(serviceId) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        currentState.services = currentState.services.filter(s => s.id !== serviceId);
        loadServices();
        showMessage(srvMsg, "Serviço excluído com sucesso!");
    }
}

// Configuração de eventos
function setupEventListeners() {
    // Login
    btnLogin.addEventListener('click', function() {
        if (adminEmail.value === 'admin@oesquimo.com' && adminPassword.value === 'admin123') {
            loginSection.style.display = 'none';
            adminContent.style.display = 'block';
        } else {
            showMessage(loginMsg, "Credenciais inválidas. Use admin@oesquimo.com / admin123", false);
        }
    });
    
    // Salvar configurações do site
    btnSaveSite.addEventListener('click', function() {
        currentState.configSite.companyName = cfgCompanyName.value;
        currentState.configSite.description = cfgCompanyDesc.value;
        currentState.configSite.heroUrl = cfgHeroUrl.value;
        currentState.configSite.whatsappNumber = cfgWhats.value.replace(/\D/g, '');
        currentState.configSite.reminderMonths = parseInt(cfgReminderMonths.value);
        
        showMessage(siteMsg, "Configurações salvas com sucesso!");
    });
    
    // Adicionar horário
    btnAddScheduleSlot.addEventListener('click', function() {
        addScheduleSlot();
    });
    
    // Salvar grade de horários
    btnSaveSchedule.addEventListener('click', function() {
        const slots = [];
        let isValid = true;
        
        document.querySelectorAll('#schedule-grid-container .dynamic-field').forEach(field => {
            const time = field.querySelector('.time-input').value;
            const vacancies = parseInt(field.querySelector('.vacancies-input').value);
            
            if (!time || isNaN(vacancies) || vacancies < 1) {
                isValid = false;
            } else {
                slots.push({ time, vacancies });
            }
        });
        
        if (!isValid) {
            showMessage(scheduleMsg, "Preencha todos os horários corretamente.", false);
            return;
        }
        
        currentState.configSchedule.slots = slots;
        showMessage(scheduleMsg, "Grade de horários salva com sucesso!");
    });
    
    // Adicionar novo serviço
    btnShowAddServiceForm.addEventListener('click', function() {
        serviceFormContainer.innerHTML = `
            <div class="service-form">
                <h4>Adicionar Novo Serviço</h4>
                <div class="form-group">
                    <label for="newSrvName">Nome do Serviço</label>
                    <input type="text" id="newSrvName" required>
                </div>
                <div class="form-group">
                    <label for="newSrvDescription">Descrição</label>
                    <input type="text" id="newSrvDescription">
                </div>
                <div class="form-group">
                    <label for="newSrvImage">Imagem</label>
                    <select id="newSrvImage">
                        <option value="https://placehold.co/200x200/3498db/ffffff?text=Limpeza">Azul</option>
                        <option value="https://placehold.co/200x200/2ecc71/ffffff?text=Manutenção">Verde</option>
                        <option value="https://placehold.co/200x200/e74c3c/ffffff?text=Instalação">Vermelho</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button id="btnAddService" class="final-button">Adicionar</button>
                    <button id="btnCancelAdd" class="secondary-button">Cancelar</button>
                </div>
            </div>
        `;
        
        document.getElementById('btnAddService').addEventListener('click', function() {
            const name = document.getElementById('newSrvName').value;
            const description = document.getElementById('newSrvDescription').value;
            const imageUrl = document.getElementById('newSrvImage').value;
            
            if (name) {
                const newId = Math.max(...currentState.services.map(s => s.id), 0) + 1;
                
                currentState.services.push({
                    id: newId,
                    name,
                    description,
                    imageUrl,
                    btuPrices: [
                        { btu: "9.000 BTUs", price: 100 },
                        { btu: "12.000 BTUs", price: 120 },
                        { btu: "18.000 BTUs", price: 150 }
                    ],
                    showBudget: true,
                    showSchedule: true
                });
                
                loadServices();
                serviceFormContainer.innerHTML = '';
                showMessage(srvMsg, "Serviço adicionado com sucesso!");
            }
        });
        
        document.getElementById('btnCancelAdd').addEventListener('click', function() {
            serviceFormContainer.innerHTML = '';
        });
    });
    
    // Buscar cliente
    btnSearchClient.addEventListener('click', function() {
        const phone = searchClientPhone.value.replace(/\D/g, '');
        
        if (phone.length < 10) {
            showMessage(searchMsg, "Digite um número de telefone válido.", false);
            return;
        }
        
        // Simular busca
        const agendamento = currentState.agendamentos.find(a => a.telefoneCliente.includes(phone));
        
        if (agendamento) {
            showMessage(searchMsg, "Cliente encontrado!", true);
            preencherFormularioManual(agendamento);
            manualServiceForm.style.display = 'block';
            btnUpdateManual.style.display = 'inline-block';
            btnDeleteManual.style.display = 'inline-block';
            btnSaveManual.style.display = 'none';
        } else {
            showMessage(searchMsg, "Nenhum agendamento encontrado. Preencha para criar um novo.", false);
            limparFormularioManual();
            mFone.value = searchClientPhone.value;
            manualServiceForm.style.display = 'block';
            btnUpdateManual.style.display = 'none';
            btnDeleteManual.style.display = 'none';
            btnSaveManual.style.display = 'inline-block';
        }
    });
    
    // Salvar agendamento manual
    btnSaveManual.addEventListener('click', function() {
        if (validarFormularioManual()) {
            const novoAgendamento = {
                id: Date.now(),
                nomeCliente: mNome.value,
                telefoneCliente: "55" + mFone.value.replace(/\D/g, ''),
                enderecoCliente: mEndereco.value,
                tipoEquipamento: mTipoEquipamento.value,
                capacidadeBtus: mCapacidade.options[mCapacidade.selectedIndex].text,
                observacoes: mObs.value,
                dataAgendamento: mData.value,
                horaAgendamento: mHora.value,
                timestamp: new Date(mData.value + 'T' + mHora.value).getTime(),
                status: "Agendado",
                origem: "Manual"
            };
            
            currentState.agendamentos.push(novoAgendamento);
            showMessage(searchMsg, "Agendamento salvo com sucesso!", true);
            manualServiceForm.style.display = 'none';
        }
    });
    
    // Gerar lembretes
    btnRodarLembretes.addEventListener('click', function() {
        const meses = parseInt(cfgReminderMonths.value) || 12;
        reminderLog.innerHTML = "<li>Simulando envio de lembretes para clientes com agendamentos há " + meses + " meses...</li>";
        
        setTimeout(() => {
            reminderLog.innerHTML += `
                <li>Lembrete enviado para João Silva (81) 99999-9999</li>
                <li>Lembrete enviado para Maria Santos (81) 98888-8888</li>
                <li>Lembrete enviado para Carlos Oliveira (81) 97777-7777</li>
            `;
        }, 1000);
    });
}

function preencherFormularioManual(agendamento) {
    mServiceId.value = agendamento.id;
    mNome.value = agendamento.nomeCliente;
    mFone.value = agendamento.telefoneCliente.replace('55', '');
    mEndereco.value = agendamento.enderecoCliente || '';
    mTipoEquipamento.value = agendamento.tipoEquipamento;
    
    // Encontrar opção correta da capacidade
    for (let i = 0; i < mCapacidade.options.length; i++) {
        if (mCapacidade.options[i].text === agendamento.capacidadeBtus) {
            mCapacidade.selectedIndex = i;
            break;
        }
    }
    
    mObs.value = agendamento.observacoes || '';
    
    if (agendamento.dataAgendamento) {
        mData.value = new Date(agendamento.timestamp).toISOString().split('T')[0];
    }
    
    if (agendamento.horaAgendamento) {
        mHora.value = agendamento.horaAgendamento;
    }
}

function limparFormularioManual() {
    mServiceId.value = '';
    mNome.value = '';
    mFone.value = '';
    mEndereco.value = '';
    mTipoEquipamento.selectedIndex = 0;
    mCapacidade.selectedIndex = 0;
    mObs.value = '';
    mData.value = '';
    mHora.value = '';
}

function validarFormularioManual() {
    if (!mNome.value.trim()) {
        showMessage(searchMsg, "Digite o nome do cliente.", false);
        return false;
    }
    
    if (mFone.value.replace(/\D/g, '').length < 10) {
        showMessage(searchMsg, "Digite um telefone válido.", false);
        return false;
    }
    
    if (!mTipoEquipamento.value) {
        showMessage(searchMsg, "Selecione o tipo de equipamento.", false);
        return false;
    }
    
    if (!mCapacidade.value) {
        showMessage(searchMsg, "Selecione a capacidade.", false);
        return false;
    }
    
    if (!mData.value) {
        showMessage(searchMsg, "Selecione a data.", false);
        return false;
    }
    
    if (!mHora.value) {
        showMessage(searchMsg, "Selecione o horário.", false);
        return false;
    }
    
    return true;
}
