/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 13.0 (Com desconto percentual na promoção)
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
const progressSteps = document.querySelectorAll('.progress-step');
const datePicker = document.getElementById('datePicker');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');
const telefoneInput = document.getElementById('telefone');
const selectedServicesCount = document.getElementById('selectedServicesCount');
const paymentOptionsContainer = document.getElementById('paymentOptionsContainer');

// Dados do Agendamento
let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};
let formaPagamentoSelecionada = '';

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    updateProgressBar(1);
    setupPhoneMask();
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
        if (snapshot.exists()) {
            servicosGlobais = snapshot.val();
            const servicosArray = Object.entries(servicosGlobais);
            
            const promocao = servicosArray.find(([key, service]) => isPromocaoAtiva(service));
            const normais = servicosArray.filter(([key, service]) => !isPromocaoAtiva(service));

            if (promocao) {
                renderPromocaoBanner(promocao[1], promocao[0]);
            } else {
                document.getElementById('nextStep1').style.display = 'block';
            }

            normais.forEach(([key, service]) => createServiceCard(service, key));

        } else {
            servicosContainer.innerHTML = '<p>Nenhum serviço disponível no momento. Por favor, volte mais tarde.</p>';
            document.getElementById('nextStep1').style.display = 'none';
        }
    });
}

function isPromocaoAtiva(service) {
    if (!service.promocao || !service.promocao.ativa) return false;
    const hoje = new Date();
    const dataInicio = new Date(service.promocao.dataInicio + 'T00:00:00');
    const dataFim = new Date(service.promocao.dataFim + 'T23:59:59');
    return hoje >= dataInicio && hoje <= dataFim;
}

// ==========================================================================
// 3. LÓGICA DO BANNER DE PROMOÇÃO
// ==========================================================================

function renderPromocaoBanner(service, key) {
    const banner = document.createElement('div');
    banner.className = 'promocao-banner';
    banner.innerHTML = `
        <p><strong>🔥 Promoção:</strong> ${service.nome}</p>
        <p><strong>Desconto:</strong> ${service.promocao.descontoPorcentagem}% OFF</p>
        <small>Clique para agendar e personalizar seu serviço!</small>
    `;
    servicosContainer.appendChild(banner);

    banner.addEventListener('click', () => {
        const selectedService = { ...service, key };
        servicosSelecionados = [selectedService];
        
        servicosContainer.innerHTML = '';

        servicosSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        renderServiceForms();
        updateProgressBar(2);
    });
}

// ==========================================================================
// 4. ETAPA 1: SELEÇÃO DE SERVIÇOS (PARA SERVIÇOS NÃO PROMOCIONAIS)
// ==========================================================================

function createServiceCard(service, key) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.key = key;

    const servicoSelecionado = servicosSelecionados.find(s => s.key === key);
    if (servicoSelecionado) {
        card.classList.add('selected');
    }

    let precoDisplay = service.precoBase ? `R$ ${service.precoBase.toFixed(2)}` : 'Preço a consultar';
    card.innerHTML = `
        <h3>${service.nome}</h3>
        <p>${service.descricao}</p>
        <p><strong>Preço base:</strong> ${precoDisplay}</p>
        <button class="btn btn-primary btn-select-service">${servicoSelecionado ? 'Remover' : 'Adicionar'}</button>
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
        
        updateSelectedServicesCount();
        const nextButton = document.getElementById('nextStep1');
        if (servicosSelecionados.length > 0) {
            nextButton.style.display = 'block';
        } else {
            nextButton.style.display = 'none';
        }
    });

    servicosContainer.appendChild(card);
}

function updateSelectedServicesCount() {
    selectedServicesCount.textContent = servicosSelecionados.length;
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
// 5. ETAPA 2: PREENCHIMENTO DOS CAMPOS
// ==========================================================================

function renderServiceForms() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach(service => {
        const formGroup = document.createElement('div');
        formGroup.className = 'service-form-group';
        
        let fieldsHtml = '';
        if (service.camposAdicionais) {
            fieldsHtml = service.camposAdicionais.map(field => {
                switch (field.tipo) {
                    case 'select':
                        return `
                            <label>${field.nome}</label>
                            <select class="form-control additional-field-select" data-field-name="${field.nome}" data-key="${service.key}" required>
                                <option value="">Selecione...</option>
                                ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                            </select>
                        `;
                    case 'text':
                        return `
                            <label>${field.nome}</label>
                            <input type="text" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${service.key}" required>
                        `;
                    case 'number':
                        return `
                            <label>${field.nome}</label>
                            <input type="number" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${service.key}" step="0.01" required>
                        `;
                    case 'textarea':
                        return `
                             <label>${field.nome}</label>
                             <textarea class="form-control additional-field-textarea" data-field-name="${field.nome}" data-key="${service.key}" placeholder="Digite aqui..."></textarea>
                         `;
                    case 'title':
                        return `<h4>${field.nome}</h4>`;
                    case 'description':
                        return `<p>${field.nome}</p>`;
                    case 'date':
                        return `<label>${field.nome}</label>
                                <input type="date" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${service.key}" required>`;
                    case 'image':
                        return `
                            <div class="service-image-container">
                                <p><strong>${field.nome}</strong></p>
                                <img src="${field.caminho || ''}" alt="Imagem do Serviço" class="service-image">
                            </div>
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

    document.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-textarea').forEach(field => {
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
    let subtotal = serviceData.precoBase || 0;

    const selectElements = container.querySelectorAll('.additional-field-select');
    const inputElements = container.querySelectorAll('.additional-field-input');
    
    selectElements.forEach(select => {
        const selectedValue = select.value;
        if (selectedValue) {
            const parts = selectedValue.split(', R$ ');
            if (parts.length === 2) {
                subtotal += parseFloat(parts[1]);
            }
        }
    });

    inputElements.forEach(input => {
        if (input.type === 'number') {
            const inputValue = parseFloat(input.value);
            if (!isNaN(inputValue)) {
                subtotal += inputValue;
            }
        }
    });

    let precoFinal = subtotal;

    if (serviceData.promocao && serviceData.promocao.ativa && isPromocaoAtiva(serviceData)) {
        const desconto = serviceData.promocao.descontoPorcentagem / 100;
        precoFinal = subtotal * (1 - desconto);
    }
    
    return precoFinal;
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
        alert("Por favor, preencha todos os campos obrigatórios para continuar.");
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
    const textareaElements = container.querySelectorAll('.additional-field-textarea');
    
    selectElements.forEach(select => {
        const selectedValue = select.value;
        const fieldName = select.dataset.fieldName;
        if (selectedValue) {
            selectedOptions[fieldName] = selectedValue;
        }
    });

    inputElements.forEach(input => {
        const inputValue = input.value;
        const fieldName = input.dataset.fieldName;
        if (inputValue) {
            selectedOptions[fieldName] = input.type === 'number' ? parseFloat(inputValue) : inputValue;
        }
    });
    
    textareaElements.forEach(textarea => {
        const textareaValue = textarea.value;
        const fieldName = textarea.dataset.fieldName;
        if (textareaValue) {
            selectedOptions[fieldName] = textareaValue;
        }
    });

    return selectedOptions;
}

// ==========================================================================
// 6. ETAPA 3: INFORMAÇÕES DO CLIENTE
// ==========================================================================

function setupPhoneMask() {
    telefoneInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/\D/g, '');
        let maskedValue = '';

        if (value.length > 0) {
            maskedValue += `(${value.substring(0, 2)}`;
        }
        if (value.length > 2) {
            maskedValue += `) ${value.substring(2, 7)}`;
        }
        if (value.length > 7) {
            maskedValue += `-${value.substring(7, 11)}`;
        }
        
        e.target.value = maskedValue;
    });
}

document.getElementById('nextStep3').addEventListener('click', () => {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const telefoneRegex = /^\(\d{2}\)\s\d{5}-\d{4}$/;

    if (!nome || !telefone) {
        alert("Por favor, preencha nome e telefone para continuar.");
        return;
    }

    if (!telefoneRegex.test(telefone)) {
        alert("Por favor, preencha um telefone válido no formato (xx) xxxxx-xxxx.");
        return;
    }

    clienteFormSection.classList.add('hidden');
    agendamentoSection.classList.remove('hidden');
    updateProgressBar(4);
});

// ==========================================================================
// 7. ETAPA 4: AGENDAMENTO E FINALIZAÇÃO
// ==========================================================================

function setupPaymentOptions() {
    paymentOptionsContainer.querySelectorAll('.btn-payment-option').forEach(btn => {
        btn.addEventListener('click', () => {
            paymentOptionsContainer.querySelectorAll('.btn-payment-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            formaPagamentoSelecionada = btn.dataset.payment;
        });
    });
}

async function handleDateSelection() {
    const selectedDate = datePicker.value;
    if (!selectedDate) {
        timeSlotsContainer.innerHTML = '<p>Selecione uma data para ver os horários.</p>';
        return;
    }

    timeSlotsContainer.innerHTML = '<p>Carregando horários...</p>';
    
    const hoje = new Date();
    const dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataAgendamento = new Date(selectedDate + 'T00:00:00');

    if (dataAgendamento < dataAtual) {
        timeSlotsContainer.innerHTML = '<p>Não é possível agendar para uma data que já passou.</p>';
        return;
    }

    if (dataAgendamento.getTime() === dataAtual.getTime()) {
        if (hoje.getHours() >= 14) {
            timeSlotsContainer.innerHTML = '<p>Agendamentos para o dia de hoje só são permitidos até as 14:00. Por favor, selecione uma data futura.</p>';
            return;
        }
    }
    
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
            const firebaseDate = `${day}/${month}/${year}`;
            if (agendamento.data === firebaseDate && agendamento.status !== 'Cancelado') {
                agendamentosDoDia.push(agendamento.hora);
            }
        });
    }

    const horariosDisponiveis = generateTimeSlots(horarioInicio, horarioFim, duracaoServico, agendamentosDoDia, dataAgendamento.getTime() === dataAtual.getTime() ? hoje : null);
    displayTimeSlots(horariosDisponiveis);
}

function generateTimeSlots(startTime, endTime, interval, existingAppointments, referenceTime) {
    const slots = [];
    let currentTime = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    while (currentTime < end) {
        const timeString = currentTime.toTimeString().slice(0, 5);
        
        if (referenceTime) {
             const [slotHour, slotMinute] = timeString.split(':').map(Number);
             if (slotHour < referenceTime.getHours() || (slotHour === referenceTime.getHours() && slotMinute < referenceTime.getMinutes())) {
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

    if (!navigator.onLine) {
        alert("Parece que você está sem conexão com a internet. Verifique sua conexão e tente novamente.");
        return;
    }

    const selectedTimeSlot = document.querySelector('.time-slot.selected');
    const selectedPaymentOption = document.querySelector('.btn-payment-option.selected');
    
    if (!selectedTimeSlot || !selectedPaymentOption) {
        alert("Por favor, selecione um horário e uma forma de pagamento para o agendamento.");
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
        orcamentoTotal: servicosSelecionados.reduce((sum, s) => sum + (s.precoCalculado || 0), 0),
        formaPagamento: formaPagamentoSelecionada,
        status: 'Pendente'
    };

    try {
        const agendamentosRef = ref(database, 'agendamentos');
        await push(agendamentosRef, agendamentoData);
        showConfirmation();
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
    
    whatsappLink.addEventListener('click', () => {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    });
}

function createWhatsAppMessage() {
    const template = configGlobais.whatsappTemplate || "Olá, gostaria de confirmar um agendamento.\n\n*👤 Dados do Cliente:*\nNome: {{nome_cliente}}\nTelefone: {{telefone_cliente}}\nEndereço: {{endereco_cliente}}\n\n*📅 Detalhes do Agendamento:*\nData: {{data_agendamento}}\nHora: {{hora_agendamento}}\n\n*🛠️ Serviços:*\n{{lista_servicos}}\n\n*💰 Orçamento Total: {{orcamento_total}}*\n\n*💳 Forma de Pagamento:* {{forma_pagamento}}\n\n{{observacoes}}";

    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;
    const data = formatDate(datePicker.value);
    const hora = document.querySelector('.time-slot.selected').textContent;
    const observacoes = document.getElementById('observacoes').value;
    const total = orcamentoTotalDisplay.textContent;
    const formaPagamento = document.querySelector('.btn-payment-option.selected')?.textContent || 'Não informado';

    let servicosTexto = servicosSelecionados.map(servico => {
        const campos = servico.camposAdicionaisSelecionados ? Object.entries(servico.camposAdicionaisSelecionados).map(([campo, valor]) => {
            return `  - ${campo}: ${typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : valor}</li>`;
        }).join('\n') : '';

        return `${servico.nome}: R$ ${servico.precoCalculado.toFixed(2)}\n${campos}`;
    }).join('\n\n');

    let finalMessage = template
        .replace('{{nome_cliente}}', nome)
        .replace('{{telefone_cliente}}', telefone)
        .replace('{{endereco_cliente}}', endereco)
        .replace('{{data_agendamento}}', data)
        .replace('{{hora_agendamento}}', hora)
        .replace('{{lista_servicos}}', servicosTexto)
        .replace('{{orcamento_total}}', total)
        .replace('{{forma_pagamento}}', formaPagamento)
        .replace('{{observacoes}}', observacoes ? `\n*📝 Observações:* ${observacoes}` : '');

    return finalMessage;
}

// ==========================================================================
// 8. NAVEGAÇÃO E FUNÇÕES AUXILIARES
// ==========================================================================

function setupEventListeners() {
    datePicker.addEventListener('change', handleDateSelection);
    agendamentoForm.addEventListener('submit', handleFormSubmit);
    setupPaymentOptions();

    backButton1.addEventListener('click', () => {
        servicosFormSection.classList.add('hidden');
        servicosSection.classList.remove('hidden');
        updateProgressBar(1);
        updateSelectedServicesCount();
        loadServices();
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
