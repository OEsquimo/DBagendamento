/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 7.0 (Totalmente refeito com fluxo de 4 etapas, cálculo dinâmico e navegação corrigida)
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
const servicosSection = document.getElementById('servicos');
const servicosFormSection = document.getElementById('servicosForm');
const clienteFormSection = document.getElementById('clienteForm');
const agendamentoSection = document.getElementById('agendamento');
const servicosFormContainer = document.getElementById('servicosFormContainer');
const agendamentoForm = document.getElementById('agendamentoForm');
const orcamentoTotalDisplay = document.getElementById('orcamentoTotal');
const backButton1 = document.getElementById('backButton1');
const backButton2 = document.getElementById('backButton2');
const backButton3 = document.getElementById('backButton3');
const confirmationPopup = document.getElementById('confirmation');
const whatsappLink = document.getElementById('whatsappLink');
const whatsappNumberDisplay = document.getElementById('whatsappNumberDisplay');
const progressSteps = document.querySelectorAll('.progress-step');
const datePicker = document.getElementById('datePicker');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');

// Dados do Agendamento
let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    updateProgressBar(1);
});

async function loadAllData() {
    await loadConfig();
    loadServices();
}

async function loadConfig() {
    const configRef = ref(database, 'configuracoes');
    const snapshot = await get(configRef);
    if (snapshot.exists()) {
        configGlobais = snapshot.val();
        whatsappNumberDisplay.textContent = formatPhoneNumber(configGlobais.whatsappNumber || 'N/A');
    }
}

function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicosContainer.innerHTML = '';
        if (snapshot.exists()) {
            servicosGlobais = snapshot.val();
            for (const key in servicosGlobais) {
                const service = servicosGlobais[key];
                createServiceCard(service, key);
            }
        } else {
            servicosContainer.innerHTML = '<p>Nenhum serviço disponível no momento. Por favor, volte mais tarde.</p>';
        }
    });
}

// ==========================================================================
// 3. ETAPA 1: SELEÇÃO DE SERVIÇOS
// ==========================================================================

function createServiceCard(service, key) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.key = key;

    card.innerHTML = `
        <h3>${service.nome}</h3>
        <p>${service.descricao}</p>
        <button class="btn btn-primary btn-select-service">Adicionar</button>
    `;

    card.querySelector('.btn-select-service').addEventListener('click', () => {
        const selectedService = { ...servicosGlobais[key], key };
        const existingIndex = servicosSelecionados.findIndex(s => s.key === key);
        
        if (existingIndex === -1) {
            servicosSelecionados.push(selectedService);
            card.classList.add('selected');
            card.querySelector('.btn-select-service').textContent = 'Remover';
        } else {
            servicosSelecionados.splice(existingIndex, 1);
            card.classList.remove('selected');
            card.querySelector('.btn-select-service').textContent = 'Adicionar';
        }
        
        const nextButton = document.getElementById('nextStep1');
        if (servicosSelecionados.length > 0) {
            nextButton.style.display = 'block';
        } else {
            nextButton.style.display = 'none';
        }
    });

    servicosContainer.appendChild(card);
}

document.getElementById('nextStep1').addEventListener('click', () => {
    if (servicosSelecionados.length > 0) {
        servicosSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        renderServiceForms();
        updateProgressBar(2);
    } else {
        alert('Por favor, selecione pelo menos um serviço para continuar.');
    }
});

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS
// ==========================================================================

function renderServiceForms() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach(service => {
        const formGroup = document.createElement('div');
        formGroup.className = 'service-form-group';
        
        let fieldsHtml = '';
        if (service.camposAdicionais) {
            fieldsHtml = service.camposAdicionais.map(field => {
                if (field.tipo === 'select' && field.opcoes) {
                    return `
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select" data-field-name="${field.nome}" data-key="${service.key}">
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'text') {
                    return `
                        <label>${field.nome}</label>
                        <input type="text" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${service.key}">
                    `;
                } else if (field.tipo === 'number') {
                    return `
                        <label>${field.nome}</label>
                        <input type="number" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${service.key}" step="0.01">
                    `;
                }
            }).join('');
        }
        
        formGroup.innerHTML = `
            <h3>${service.nome}</h3>
            ${fieldsHtml}
            <div class="service-price">Valor: R$ 0.00</div>
        `;
        servicosFormContainer.appendChild(formGroup);
    });

    document.querySelectorAll('.additional-field-select, .additional-field-input').forEach(field => {
        field.addEventListener('change', updatePrice);
        field.addEventListener('input', updatePrice);
    });

    updateOrcamentoTotal();
}

function updatePrice(e) {
    const key = e.target.dataset.key;
    const service = servicosSelecionados.find(s => s.key === key);
    if (!service) return;

    const formGroup = e.target.closest('.service-form-group');
    const newPrice = calculatePrice(service, formGroup);
    service.precoCalculado = newPrice;
    formGroup.querySelector('.service-price').textContent = `Valor: R$ ${newPrice.toFixed(2)}`;
    updateOrcamentoTotal();
}

function calculatePrice(serviceData, container) {
    let preco = serviceData.precoBase || 0;
    const selectElements = container.querySelectorAll('.additional-field-select');
    const inputElements = container.querySelectorAll('.additional-field-input');
    
    // Calcula o preço a partir de selects
    selectElements.forEach(select => {
        const selectedValue = select.value;
        if (selectedValue) {
            const parts = selectedValue.split(', R$ ');
            if (parts.length === 2) {
                preco += parseFloat(parts[1]);
            }
        }
    });

    // Adiciona o valor de campos de número
    inputElements.forEach(input => {
        if (input.type === 'number') {
            const inputValue = parseFloat(input.value);
            if (!isNaN(inputValue)) {
                preco += inputValue;
            }
        }
    });

    return preco;
}

document.getElementById('nextStep2').addEventListener('click', () => {
    let allFieldsFilled = true;
    servicosSelecionados.forEach(service => {
        const formGroup = document.querySelector(`.service-form-group [data-key="${service.key}"]`)?.closest('.service-form-group');
        if (formGroup) {
            formGroup.querySelectorAll('.additional-field-select, .additional-field-input').forEach(field => {
                if (field.value === "") {
                    allFieldsFilled = false;
                }
            });
        }
    });

    if (!allFieldsFilled) {
        alert("Por favor, preencha todos os campos para continuar.");
        return;
    }

    servicosSelecionados.forEach(service => {
        const formGroup = document.querySelector(`.service-form-group [data-key="${service.key}"]`)?.closest('.service-form-group');
        if (formGroup) {
            const selectedOptions = getSelectedOptions(formGroup, service);
            service.camposAdicionaisSelecionados = selectedOptions;
            service.precoCalculado = calculatePrice(service, formGroup);
        }
    });
    
    servicosFormSection.classList.add('hidden');
    clienteFormSection.classList.remove('hidden');
    updateProgressBar(3);
});

function getSelectedOptions(container, serviceData) {
    const selectedOptions = {};
    const selectElements = container.querySelectorAll('.additional-field-select');
    const inputElements = container.querySelectorAll('.additional-field-input');
    
    selectElements.forEach(select => {
        const selectedValue = select.value;
        const fieldName = select.dataset.fieldName;
        if (selectedValue) {
            const parts = selectedValue.split(', R$ ');
            if (parts.length === 2) {
                selectedOptions[fieldName] = parseFloat(parts[1]);
            } else {
                selectedOptions[fieldName] = selectedValue;
            }
        }
    });

    inputElements.forEach(input => {
        const inputValue = input.value;
        const fieldName = input.dataset.fieldName;
        if (inputValue) {
            selectedOptions[fieldName] = input.type === 'number' ? parseFloat(inputValue) : inputValue;
        }
    });
    
    return selectedOptions;
}

// ==========================================================================
// 5. ETAPA 3: INFORMAÇÕES DO CLIENTE
// ==========================================================================

document.getElementById('nextStep3').addEventListener('click', () => {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    if (!nome || !telefone) {
        alert("Por favor, preencha nome e telefone para continuar.");
        return;
    }

    clienteFormSection.classList.add('hidden');
    agendamentoSection.classList.remove('hidden');
    updateProgressBar(4);
});

// ==========================================================================
// 6. ETAPA 4: AGENDAMENTO E FINALIZAÇÃO
// ==========================================================================

async function handleDateSelection() {
    const selectedDate = datePicker.value;
    if (!selectedDate) return;

    timeSlotsContainer.innerHTML = '<p>Carregando horários...</p>';
    
    const [year, month, day] = selectedDate.split('-');
    const dayOfWeek = getDayOfWeek(selectedDate);
    
    const diaConfig = configGlobais.horariosPorDia[dayOfWeek];
    if (!diaConfig || !diaConfig.ativo) {
        timeSlotsContainer.innerHTML = `<p>Não há agendamentos disponíveis para ${capitalize(dayOfWeek)}.</p>`;
        return;
    }
    
    const { horarioInicio, horarioFim, duracaoServico } = diaConfig;
    const agendamentosRef = ref(database, 'agendamentos');
    const snapshot = await get(agendamentosRef);
    const agendamentosDoDia = [];

    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const agendamento = childSnapshot.val();
            if (agendamento.data === `${day}/${month}/${year}` && agendamento.status !== 'Cancelado') {
                agendamentosDoDia.push(agendamento.hora);
            }
        });
    }

    const horariosDisponiveis = generateTimeSlots(horarioInicio, horarioFim, duracaoServico, agendamentosDoDia);
    displayTimeSlots(horariosDisponiveis);
}

function generateTimeSlots(startTime, endTime, interval, existingAppointments) {
    const slots = [];
    let currentTime = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    while (currentTime < end) {
        const timeString = currentTime.toTimeString().slice(0, 5);
        if (!existingAppointments.includes(timeString)) {
            slots.push(timeString);
        }
        currentTime.setMinutes(currentTime.getMinutes() + interval);
    }

    return slots;
}

function displayTimeSlots(horariosDisponiveis) {
    if (horariosDisponiveis.length === 0) {
        timeSlotsContainer.innerHTML = '<p>Não há horários disponíveis para a data selecionada. Por favor, escolha outro dia.</p>';
        return;
    }

    timeSlotsContainer.innerHTML = '';
    horariosDisponiveis.forEach(time => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = time;
        slot.addEventListener('click', () => selectTimeSlot(slot));
        timeSlotsContainer.appendChild(slot);
    });
}

function selectTimeSlot(selectedSlot) {
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    selectedSlot.classList.add('selected');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const selectedTimeSlot = document.querySelector('.time-slot.selected');
    if (!selectedTimeSlot) {
        alert("Por favor, selecione um horário para o agendamento.");
        return;
    }

    const clienteData = {
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
    };
    
    const agendamentoData = {
        cliente: clienteData,
        servicos: servicosSelecionados.map(({ key, nome, precoCalculado, camposAdicionaisSelecionados }) => ({
            key,
            nome,
            precoCalculado,
            camposAdicionaisSelecionados
        })),
        data: formatDate(datePicker.value),
        hora: selectedTimeSlot.textContent,
        observacoes: document.getElementById('observacoes').value,
        orcamentoTotal: servicosSelecionados.reduce((sum, s) => sum + s.precoCalculado, 0),
        status: 'Pendente'
    };

    try {
        const agendamentosRef = ref(database, 'agendamentos');
        await push(agendamentosRef, agendamentoData);
        showConfirmation();
        sendWhatsAppMessage(agendamentoData);
    } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        alert("Ocorreu um erro ao salvar o agendamento. Por favor, tente novamente.");
    }
}

function showConfirmation() {
    agendamentoSection.classList.add('hidden');
    confirmationPopup.classList.remove('hidden');
    updateProgressBar(5);
    
    const whatsappMsg = createWhatsAppMessage();
    whatsappLink.href = `https://wa.me/${configGlobais.whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;
}

function createWhatsAppMessage() {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;
    const data = formatDate(datePicker.value);
    const hora = document.querySelector('.time-slot.selected').textContent;
    const observacoes = document.getElementById('observacoes').value;
    const total = orcamentoTotalDisplay.textContent;

    let servicosTexto = 'Serviços:\n';
    servicosSelecionados.forEach(servico => {
        servicosTexto += `  - ${servico.nome} (R$ ${servico.precoCalculado.toFixed(2)})\n`;
        if (servico.camposAdicionaisSelecionados) {
            for (const campo in servico.camposAdicionaisSelecionados) {
                const valor = servico.camposAdicionaisSelecionados[campo];
                servicosTexto += `    * ${campo}: ${typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : valor}\n`;
            }
        }
    });

    return `Olá, gostaria de confirmar um agendamento.
    
    *Dados do Cliente:*
    Nome: ${nome}
    Telefone: ${telefone}
    Endereço: ${endereco}
    
    *Detalhes do Agendamento:*
    Data: ${data}
    Hora: ${hora}
    ${servicosTexto}
    
    Orçamento Total: ${total}
    
    ${observacoes ? `Observações: ${observacoes}` : ''}
    
    Obrigado!`;
}

function sendWhatsAppMessage(data) {
    const message = createWhatsAppMessage(data);
    const whatsappUrl = `https://wa.me/${configGlobais.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// ==========================================================================
// 7. NAVEGAÇÃO E FUNÇÕES AUXILIARES
// ==========================================================================

function setupEventListeners() {
    datePicker.addEventListener('change', handleDateSelection);
    agendamentoForm.addEventListener('submit', handleFormSubmit);

    backButton1.addEventListener('click', () => {
        servicosFormSection.classList.add('hidden');
        servicosSection.classList.remove('hidden');
        updateProgressBar(1);
    });

    backButton2.addEventListener('click', () => {
        clienteFormSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        updateProgressBar(2);
    });
    
    backButton3.addEventListener('click', () => {
        agendamentoSection.classList.add('hidden');
        clienteFormSection.classList.remove('hidden');
        updateProgressBar(3);
    });
}

function updateProgressBar(step) {
    progressSteps.forEach((s, index) => {
        if (index + 1 === step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

function updateOrcamentoTotal() {
    const total = servicosSelecionados.reduce((sum, service) => sum + (service.precoCalculado || 0), 0);
    orcamentoTotalDisplay.textContent = `R$ ${total.toFixed(2)}`;
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function getDayOfWeek(dateString) {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const date = new Date(dateString + 'T00:00:00'); 
    return days[date.getDay()];
}

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPhoneNumber(number) {
    const cleaned = ('' + number).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{2})(\d{5})(\d{4})$/);
    if (match) {
        return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
    }
    return number;
}
