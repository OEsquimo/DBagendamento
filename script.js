/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 11.0 (Correções de bugs e adição da funcionalidade de quantidade)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const servicosContainer = document.getElementById('servicosContainer');
const servicosFormContainer = document.getElementById('servicoDetailsContainer');
const orcamentoTotalDisplay = document.getElementById('orcamentoTotal');
const servicosCountDisplay = document.getElementById('servicosCount');
const agendamentoForm = document.getElementById('agendamentoForm');
const backButton = document.getElementById('voltarBtn');
const nextButton = document.getElementById('proximoBtn');
const agendarButton = document.getElementById('agendarBtn');
const progressSteps = document.querySelectorAll('.nav-step');
const dateSelect = document.getElementById('dataSelect');
const timeSelect = document.getElementById('horarioSelect');
const clienteInfoForm = document.getElementById('clienteInfoForm');
const whatsappLink = document.getElementById('whatsappLink');

// Dados do Agendamento
let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};
let currentStep = 1;
const totalSteps = 4;

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    updateView();
});

async function loadAllData() {
    await loadConfig();
    loadServices();
}

async function loadConfig() {
    try {
        const configRef = ref(database, 'configuracoes');
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
            configGlobais = snapshot.val();
        } else {
            console.error("Configurações não encontradas no banco de dados.");
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicosContainer.innerHTML = '';
        servicosGlobais = {}; // Limpa o objeto global
        if (snapshot.exists()) {
            servicosGlobais = snapshot.val(); // Armazena os dados globais
            for (const key in servicosGlobais) {
                const service = servicosGlobais[key];
                createServiceCard(service, key);
            }
        } else {
            servicosContainer.innerHTML = '<p class="text-center mt-5">Nenhum serviço disponível no momento.</p>';
        }
    });
}

function createServiceCard(service, key) {
    const card = document.createElement('div');
    card.className = 'col-sm-6 mb-4';
    card.innerHTML = `
        <div class="card servico-card h-100" data-key="${key}">
            <div class="card-body">
                <h5 class="card-title">${service.nome}</h5>
                <p class="card-text">${service.descricao}</p>
                <button class="btn btn-primary w-100 mt-auto">Adicionar</button>
            </div>
        </div>
    `;

    const btn = card.querySelector('button');
    const existingIndex = servicosSelecionados.findIndex(s => s.key === key);
    if (existingIndex !== -1) {
        card.querySelector('.servico-card').classList.add('selected');
        btn.textContent = 'Remover';
    }

    btn.addEventListener('click', () => {
        const selectedService = { ...servicosGlobais[key], key, precoCalculado: servicosGlobais[key].precoBase || 0 };
        const index = servicosSelecionados.findIndex(s => s.key === key);
        
        if (index === -1) {
            servicosSelecionados.push(selectedService);
            card.querySelector('.servico-card').classList.add('selected');
            btn.textContent = 'Remover';
        } else {
            servicosSelecionados.splice(index, 1);
            card.querySelector('.servico-card').classList.remove('selected');
            btn.textContent = 'Adicionar';
        }
        updateSelectedServicesCount();
        updateView();
    });

    servicosContainer.appendChild(card);
}

function updateSelectedServicesCount() {
    servicosCountDisplay.textContent = servicosSelecionados.length;
    updateView();
}

function updateOrcamentoTotal() {
    const total = servicosSelecionados.reduce((sum, service) => sum + (service.precoCalculado || 0), 0);
    orcamentoTotalDisplay.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ==========================================================================
// 3. NAVEGAÇÃO ENTRE AS ETAPAS
// ==========================================================================

function updateView() {
    // Esconde todas as seções
    document.querySelectorAll('.tab-content').forEach(section => section.classList.add('hidden'));

    // Mostra a seção atual
    document.getElementById(`step${currentStep}`).classList.remove('hidden');

    // Atualiza a barra de progresso
    progressSteps.forEach(step => step.classList.remove('active', 'completed'));
    progressSteps.forEach((step, index) => {
        if (index + 1 === currentStep) {
            step.classList.add('active');
        } else if (index + 1 < currentStep) {
            step.classList.add('completed');
        }
    });

    // Mostra/Esconde botões
    backButton.classList.toggle('hidden', currentStep === 1 || currentStep === totalSteps);
    nextButton.classList.toggle('hidden', currentStep === 2 && servicosSelecionados.length === 0 || currentStep >= totalSteps);
    agendarButton.classList.toggle('hidden', currentStep !== totalSteps);
    
    // Lógica para os botões da Etapa 1
    if (currentStep === 1) {
        nextButton.classList.toggle('hidden', servicosSelecionados.length === 0);
    }
}

function nextStep() {
    // Validação da Etapa 1
    if (currentStep === 1 && servicosSelecionados.length === 0) {
        alert('Por favor, selecione pelo menos um serviço para continuar.');
        return;
    }

    // Validação da Etapa 2
    if (currentStep === 2) {
        if (!validateServiceForms()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
    }

    // Validação da Etapa 3
    if (currentStep === 3) {
        if (!validateClientForm()) {
            return;
        }
    }
    
    if (currentStep < totalSteps) {
        currentStep++;
        updateView();
        
        // Renderiza os formulários da Etapa 2
        if (currentStep === 2) {
            renderServiceForms();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateView();
    }
}

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS DE SERVIÇO
// ==========================================================================

function renderServiceForms() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach(service => {
        const formGroup = document.createElement('div');
        formGroup.className = 'card servico-detalhe mb-4';
        
        let fieldsHtml = '';
        if (service.camposAdicionais) {
            fieldsHtml = service.camposAdicionais.map(field => {
                 if (field.tipo === 'select-single' || field.tipo === 'select') {
                    return `
                        <div class="form-group">
                            <label>${field.nome}</label>
                            <select class="form-control additional-field-select" data-field-id="${field.id}" data-service-key="${service.key}" required>
                                <option value="">Selecione...</option>
                                ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                            </select>
                        </div>
                    `;
                } else if (field.tipo === 'select-preco' && field.opcoes) {
                    return `
                        <div class="form-group">
                            <label>${field.nome}</label>
                            <select class="form-control additional-field-select-price" data-field-id="${field.id}" data-service-key="${service.key}" required>
                                <option value="">Selecione...</option>
                                ${field.opcoes.map(option => `<option value="${option.nome},${option.preco}">${option.nome} - R$ ${option.preco.toFixed(2).replace('.', ',')}</option>`).join('')}
                            </select>
                        </div>
                    `;
                } else if (field.tipo === 'texto') {
                    return `
                        <div class="form-group">
                            <label>${field.nome}</label>
                            <input type="text" class="form-control additional-field-text" data-field-id="${field.id}" data-service-key="${service.key}" required>
                        </div>
                    `;
                } else if (field.tipo === 'numero') {
                    return `
                        <div class="form-group">
                            <label>${field.nome}</label>
                            <input type="number" class="form-control additional-field-number" data-field-id="${field.id}" data-service-key="${service.key}" step="0.01" required>
                        </div>
                    `;
                } else if (field.tipo === 'textarea') {
                    return `
                        <div class="form-group">
                            <label>${field.nome}</label>
                            <textarea class="form-control additional-field-textarea" data-field-id="${field.id}" data-service-key="${service.key}" placeholder="Digite aqui..."></textarea>
                        </div>
                    `;
                } else if (field.tipo === 'quantidade') {
                    return `
                        <div class="form-group">
                            <label>${field.nome}</label>
                            <input type="number" class="form-control additional-field-quantity" data-field-id="${field.id}" data-service-key="${service.key}" min="1" value="1" required>
                        </div>
                    `;
                }
            }).join('');
        }
        
        formGroup.innerHTML = `
            <h5>${service.nome}</h5>
            ${fieldsHtml}
            <div class="servico-valor mt-3">Valor do Serviço: R$ ${service.precoCalculado.toFixed(2).replace('.', ',')}</div>
        `;
        servicosFormContainer.appendChild(formGroup);
    });

    // Adiciona event listeners para os campos
    document.querySelectorAll('.additional-field-select-price, .additional-field-number, .additional-field-quantity').forEach(field => {
        field.addEventListener('change', updatePrice);
        field.addEventListener('input', updatePrice);
    });
    
    updateOrcamentoTotal();
}

function updatePrice(e) {
    const serviceKey = e.target.dataset.serviceKey;
    const service = servicosSelecionados.find(s => s.key === serviceKey);
    if (!service) return;

    let newPrice = service.precoBase || 0;
    let quantidade = 1;

    // Obtém o elemento pai (o card de serviço)
    const serviceCard = e.target.closest('.servico-detalhe');

    // Soma o preço das opções de seleção (select-preco)
    serviceCard.querySelectorAll('.additional-field-select-price').forEach(select => {
        const selectedValue = select.value;
        if (selectedValue) {
            const preco = parseFloat(selectedValue.split(',')[1]);
            newPrice += preco;
        }
    });
    
    // Soma o preço dos campos numéricos
    serviceCard.querySelectorAll('.additional-field-number').forEach(input => {
        const inputValue = parseFloat(input.value);
        if (!isNaN(inputValue)) {
            newPrice += inputValue;
        }
    });

    // Obtém a quantidade para o cálculo
    const quantityInput = serviceCard.querySelector('.additional-field-quantity');
    if (quantityInput) {
        quantidade = parseInt(quantityInput.value) || 1;
    }

    // Calcula o novo preço
    service.precoCalculado = newPrice * quantidade;
    serviceCard.querySelector('.servico-valor').textContent = `Valor do Serviço: R$ ${service.precoCalculado.toFixed(2).replace('.', ',')}`;

    updateOrcamentoTotal();
}

function validateServiceForms() {
    let allFieldsFilled = true;
    servicosSelecionados.forEach(service => {
        const formGroup = document.querySelector(`.servico-detalhe [data-service-key="${service.key}"]`)?.closest('.servico-detalhe');
        if (formGroup) {
            formGroup.querySelectorAll('.form-control[required]').forEach(field => {
                if (!field.value) {
                    allFieldsFilled = false;
                }
            });
        }
    });
    
    if (allFieldsFilled) {
        servicosSelecionados.forEach(service => {
            const formGroup = document.querySelector(`.servico-detalhe [data-service-key="${service.key}"]`)?.closest('.servico-detalhe');
            if (formGroup) {
                service.camposAdicionaisSelecionados = getSelectedOptions(formGroup);
                const precoCalculado = calculatePrice(service, formGroup);
                service.precoCalculado = precoCalculado;
            }
        });
    }
    return allFieldsFilled;
}

function getSelectedOptions(container) {
    const selectedOptions = {};
    const fields = container.querySelectorAll('[data-field-id]');
    
    fields.forEach(field => {
        const fieldName = servicosGlobais[field.dataset.serviceKey].camposAdicionais.find(f => f.id === field.dataset.field-id)?.nome || 'Campo';
        const value = field.value;
        if (value) {
             if (field.classList.contains('additional-field-select-price')) {
                const [nome, preco] = value.split(',');
                selectedOptions[fieldName] = nome;
                selectedOptions[`${fieldName}_preco`] = parseFloat(preco);
            } else if (field.type === 'number') {
                selectedOptions[fieldName] = parseFloat(value);
            } else {
                selectedOptions[fieldName] = value;
            }
        }
    });

    return selectedOptions;
}

function calculatePrice(serviceData, container) {
    let preco = serviceData.precoBase || 0;
    let quantidade = 1;

    // Obtém a quantidade primeiro
    const quantityInput = container.querySelector('.additional-field-quantity');
    if (quantityInput) {
        quantidade = parseInt(quantityInput.value) || 1;
    }

    // Soma o preço das opções
    container.querySelectorAll('.additional-field-select-price').forEach(select => {
        const selectedValue = select.value;
        if (selectedValue) {
            const precoOpcao = parseFloat(selectedValue.split(',')[1]);
            if (!isNaN(precoOpcao)) {
                 preco += precoOpcao;
            }
        }
    });

    // Soma o valor de campos numéricos
    container.querySelectorAll('.additional-field-number').forEach(input => {
        const inputValue = parseFloat(input.value);
        if (!isNaN(inputValue)) {
            preco += inputValue;
        }
    });

    return preco * quantidade;
}

// ==========================================================================
// 5. ETAPA 3: INFORMAÇÕES DO CLIENTE
// ==========================================================================

function validateClientForm() {
    const nome = document.getElementById('agendamentoNome').value;
    const telefone = document.getElementById('agendamentoTelefone').value;
    const endereco = document.getElementById('agendamentoEndereco').value;
    
    if (!nome || !telefone || !endereco) {
        alert("Por favor, preencha todos os campos para continuar.");
        return false;
    }

    return true;
}

// ==========================================================================
// 6. ETAPA 4: AGENDAMENTO E FINALIZAÇÃO
// ==========================================================================

async function handleDateSelection() {
    dateSelect.innerHTML = '';
    
    // Obter datas futuras e de hoje
    const today = new Date();
    const dates = [];
    for (let i = 0; i < 30; i++) {
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + i);
        dates.push(futureDate);
    }
    
    dates.forEach(date => {
        const dayOfWeek = getDayOfWeek(date);
        const diaConfig = configGlobais.horariosPorDia[dayOfWeek];
        
        if (diaConfig && diaConfig.ativo) {
            const option = document.createElement('option');
            option.value = date.toISOString().split('T')[0];
            option.textContent = `${capitalize(dayOfWeek)}, ${date.getDate()}/${date.getMonth() + 1}`;
            dateSelect.appendChild(option);
        }
    });
    
    if(dateSelect.options.length > 0) {
        handleTimeSelection();
    }
}

async function handleTimeSelection() {
    timeSelect.innerHTML = '';
    const selectedDate = dateSelect.value;
    if (!selectedDate) {
        return;
    }

    const dayOfWeek = getDayOfWeek(new Date(selectedDate + 'T00:00:00'));
    const diaConfig = configGlobais.horariosPorDia[dayOfWeek];
    
    const [year, month, day] = selectedDate.split('-');
    const agendamentosRef = ref(database, 'agendamentos');
    const snapshot = await get(agendamentosRef);
    const agendamentosDoDia = [];

    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const agendamento = childSnapshot.val();
            const firebaseDate = `${day}/${month}/${year}`;
            if (agendamento.data === firebaseDate && agendamento.status !== 'Cancelado') {
                agendamentosDoDia.push(agendamento.hora);
            }
        });
    }

    const today = new Date();
    const isToday = (new Date(selectedDate)).setHours(0,0,0,0) === today.setHours(0,0,0,0);
    const horariosDisponiveis = generateTimeSlots(diaConfig.horarioInicio, diaConfig.horarioFim, diaConfig.duracaoServico, agendamentosDoDia, isToday ? new Date() : null);

    horariosDisponiveis.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        timeSelect.appendChild(option);
    });

    if (horariosDisponiveis.length === 0) {
         timeSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
    }
}

function generateTimeSlots(startTime, endTime, interval, existingAppointments, referenceTime) {
    const slots = [];
    let currentTime = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    while (currentTime < end) {
        const timeString = currentTime.toTimeString().slice(0, 5);
        
        if (referenceTime) {
            const [slotHour, slotMinute] = timeString.split(':').map(Number);
            const refHour = referenceTime.getHours();
            const refMinute = referenceTime.getMinutes();
            if (slotHour < refHour || (slotHour === refHour && slotMinute < refMinute + interval)) {
                currentTime.setMinutes(currentTime.getMinutes() + interval);
                continue;
            }
        }

        if (!existingAppointments.includes(timeString)) {
            slots.push(timeString);
        }
        
        currentTime.setMinutes(currentTime.getMinutes() + interval);
    }
    return slots;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!navigator.onLine) {
        alert("Parece que você está sem conexão com a internet. Verifique sua conexão e tente novamente.");
        return;
    }

    if (!dateSelect.value || !timeSelect.value) {
        alert("Por favor, selecione uma data e um horário para o agendamento.");
        return;
    }

    const clienteData = {
        nome: document.getElementById('agendamentoNome').value,
        telefone: document.getElementById('agendamentoTelefone').value,
        endereco: document.getElementById('agendamentoEndereco').value,
    };
    
    const agendamentoData = {
        cliente: clienteData,
        servicos: servicosSelecionados.map(({ key, nome, precoCalculado, camposAdicionaisSelecionados }) => ({
            key,
            nome,
            precoCalculado,
            camposAdicionaisSelecionados
        })),
        data: formatDate(dateSelect.value),
        hora: timeSelect.value,
        observacoes: document.getElementById('observacoesInput').value,
        orcamentoTotal: servicosSelecionados.reduce((sum, s) => sum + s.precoCalculado, 0),
        status: 'Pendente'
    };

    try {
        const agendamentosRef = ref(database, 'agendamentos');
        await push(agendamentosRef, agendamentoData);
        alert("Agendamento salvo com sucesso!");
        showConfirmation(agendamentoData);
    } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        alert("Ocorreu um erro ao salvar o agendamento. Por favor, tente novamente.");
    }
}

function showConfirmation(agendamento) {
    document.getElementById(`step${totalSteps}`).classList.add('hidden');
    document.getElementById('confirmation').classList.remove('hidden');
    
    const whatsappMsg = createWhatsAppMessage(agendamento);
    whatsappLink.href = `https://wa.me/${configGlobais.whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;
    
    whatsappLink.addEventListener('click', () => {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    });
}

function createWhatsAppMessage(agendamento) {
    const { cliente, servicos, data, hora, observacoes, orcamentoTotal } = agendamento;

    let servicosTexto = '🛠️ Serviços:\n';
    servicos.forEach(servico => {
        servicosTexto += `  - ${servico.nome} (R$ ${servico.precoCalculado.toFixed(2).replace('.', ',')})\n`;
        if (servico.camposAdicionaisSelecionados) {
            for (const campo in servico.camposAdicionaisSelecionados) {
                // Ignora o campo de preço extra
                if (!campo.endsWith('_preco')) {
                     servicosTexto += `     - ${campo}: ${servico.camposAdicionaisSelecionados[campo]}\n`;
                }
            }
        }
    });

    return `Olá, gostaria de confirmar um agendamento.
    
*👤 Dados do Cliente:*
Nome: ${cliente.nome}
Telefone: ${cliente.telefone}
Endereço: ${cliente.endereco}

*📅 Detalhes do Agendamento:*
Data: ${data}
Hora: ${hora}
${servicosTexto}

*💰 Orçamento Total: R$ ${orcamentoTotal.toFixed(2).replace('.', ',')}*
    
${observacoes ? `*📝 Observações:* ${observacoes}` : ''}
    
Obrigado!`;
}

// ==========================================================================
// 7. EVENT LISTENERS E FUNÇÕES AUXILIARES
// ==========================================================================

function setupEventListeners() {
    nextButton.addEventListener('click', nextStep);
    backButton.addEventListener('click', prevStep);
    agendarButton.addEventListener('click', handleFormSubmit);
    dateSelect.addEventListener('change', handleTimeSelection);
    
    // Inicia a máscara de telefone
    const telefoneInput = document.getElementById('agendamentoTelefone');
    telefoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        let maskedValue = '';
        if (value.length > 0) maskedValue += `(${value.substring(0, 2)}`;
        if (value.length > 2) maskedValue += `) ${value.substring(2, 7)}`;
        if (value.length > 7) maskedValue += `-${value.substring(7, 11)}`;
        e.target.value = maskedValue;
    });

    // Chama a função para preencher as datas disponíveis no campo de seleção
    handleDateSelection();
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function getDayOfWeek(date) {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return days[date.getDay()];
}

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
