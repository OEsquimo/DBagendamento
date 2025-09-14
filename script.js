/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 11.11 (Foco em múltiplos carrosséis corretos, elementos fixos e adicionar slide correto)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, get, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ==========================================================================

// Substitua com suas credenciais do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCFf5gckKE6rg7MFcBYAO84aV-sNrdY2JQ",
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

const servicosContainer = document.getElementById('servicosContainer');
const servicosSection = document.getElementById('servicos');
const servicosFormSection = document.getElementById('servicosForm');
const clienteFormSection = document.getElementById('clienteForm');
const agendamentoSection = document.getElementById('agendamento');
const servicosFormContainer = document.getElementById('servicosFormContainer');
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

let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};
let formaPagamentoSelecionada = '';
let currentServiceInstanceId = 0;
let splideInstances = {}; // Objeto para armazenar instâncias do Splide por ID

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    updateProgressBar(1);
    setupPhoneMask();
    setupPaymentOptions();
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
            if (configGlobais.whatsappNumber) {
                // O campo telefone no HTML já tem um pattern, então não sobrescrevemos aqui.
                // Apenas se quiséssemos definir um valor inicial.
                // document.getElementById('telefone').value = configGlobais.whatsappNumber.replace(/\D/g, '');
            }
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
            for (const key in servicosGlobais) {
                createServiceCard(servicosGlobais[key], key);
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

    const isServiceAlreadySelected = servicosSelecionados.some(s => s.serviceKey === key && s.isBaseInstance);

    card.innerHTML = `
        <h3>${service.nome}</h3>
        <p>${service.descricao}</p>
        <button class="btn btn-primary btn-select-service">${isServiceAlreadySelected ? 'Remover' : 'Adicionar'}</button>
    `;

    if(isServiceAlreadySelected) {
        card.classList.add('selected');
    }

    card.querySelector('.btn-select-service').addEventListener('click', () => {
        const serviceData = servicosGlobais[key];

        if (!isServiceAlreadySelected) {
            currentServiceInstanceId++;
            const newInstance = {
                id: currentServiceInstanceId,
                serviceKey: key,
                nome: serviceData.nome,
                precoBase: serviceData.precoBase || 0, // Garantir que precoBase exista
                camposAdicionais: serviceData.camposAdicionais || [],
                camposSelecionados: {},
                quantidade: 1,
                precoCalculado: serviceData.precoBase || 0, // Inicializa com precoBase
                isBaseInstance: true
            };
            // Inicializa campos obrigatórios para a instância base
            newInstance.camposAdicionais.forEach(field => {
                if (field.tipo === 'select_quantidade' && field.opcoes && field.opcoes.length > 0) {
                    newInstance.camposSelecionados[field.nome] = '1'; // Quantidade padrão 1
                } else if (field.tipo === 'select_com_preco' || field.tipo === 'select_sem_preco') {
                    newInstance.camposSelecionados[field.nome] = ''; // Campo vazio
                } else if (field.tipo === 'text' || field.tipo === 'number' || field.tipo === 'textarea') {
                    newInstance.camposSelecionados[field.nome] = ''; // Campo vazio
                }
            });

            servicosSelecionados.push(newInstance);
            card.classList.add('selected');
            card.querySelector('.btn-select-service').textContent = 'Remover';
        } else {
            // Remove a instância base e todas as instâncias adicionais relacionadas a ela
            servicosSelecionados = servicosSelecionados.filter(s => s.serviceKey !== key);
            card.classList.remove('selected');
            card.querySelector('.btn-select-service').textContent = 'Adicionar';
        }

        updateSelectedServicesCount();
        const nextButton = document.getElementById('nextStep1');
        if (servicosSelecionados.filter(s => s.isBaseInstance).length > 0) {
            nextButton.style.display = 'block';
        } else {
            nextButton.style.display = 'none';
        }
    });

    servicosContainer.appendChild(card);
}

function updateSelectedServicesCount() {
    selectedServicesCount.textContent = servicosSelecionados.filter(s => s.isBaseInstance).length;
}

document.getElementById('nextStep1').addEventListener('click', () => {
    if (servicosSelecionados.filter(s => s.isBaseInstance).length > 0) {
        servicosSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        renderServiceForms();
        updateProgressBar(2);
    } else {
        alert('Por favor, selecione pelo menos um serviço para continuar.');
    }
});

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS (COM MÚLTIPLOS CARROSÉIS E NOVAS FUNCIONALIDADES)
// ==========================================================================

// Função para inicializar todos os carrosséis individuais
function initializeIndividualSplideCarousels() {
    const splideElements = document.querySelectorAll('.service-carousel-individual');
    splideElements.forEach((element) => {
        // Verifica se já foi inicializado para evitar múltiplos inicializadores
        if (!element.classList.contains('is-initialized')) {
            const splide = new Splide(element, {
                type: 'slide',
                perPage: 1,
                gap: '1rem',
                pagination: false,
                arrows: true,
                autoWidth: true,
                padding: '1rem',
                snap: true,
            });
            splide.mount();
            element.classList.add('is-initialized'); // Marca como inicializado
        }
    });
}


function renderServiceForms() {
    servicosFormContainer.innerHTML = ''; // Limpa o contêiner onde os blocos de serviço serão adicionados

    if (servicosSelecionados.length === 0) {
        servicosFormContainer.innerHTML = '<p>Nenhum serviço selecionado para detalhar.</p>';
        return;
    }

    servicosSelecionados.forEach((instance) => {
        const serviceBlock = document.createElement('div');
        serviceBlock.className = 'service-edit-block'; // Classe para o bloco do serviço
        serviceBlock.dataset.instanceId = instance.id;

        let fieldsHtml = '';
        if (instance.camposAdicionais && instance.camposAdicionais.length > 0) {
            fieldsHtml = instance.camposAdicionais.map(field => {
                const fieldName = field.nome;
                const fieldType = field.tipo;
                const fieldOptions = field.opcoes;
                const currentFieldValue = instance.camposSelecionados[fieldName] || '';

                if (fieldType === 'select_quantidade' && fieldOptions) {
                    const quantityOptions = Array.from({ length: 10 }, (_, i) => i + 1).map(q =>
                        `<option value="${q}" ${currentFieldValue === q.toString() ? 'selected' : ''}>${q}</option>`
                    ).join('');
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <select class="form-control additional-field-quantidade" data-instance-id="${instance.id}" data-field-name="${fieldName}" required>
                                <option value="">Selecione...</option>
                                ${quantityOptions}
                            </select>
                        </div>
                    `;
                } else if (fieldType === 'select_com_preco' && fieldOptions) {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <select class="form-control additional-field-select-price" data-instance-id="${instance.id}" data-field-name="${fieldName}" required>
                                <option value="">Selecione...</option>
                                ${fieldOptions.map(option => {
                                    const optionValue = option.includes(', R$ ') ? option : `${option}, R$ 0.00`;
                                    return `<option value="${optionValue}" ${currentFieldValue === option ? 'selected' : ''}>${option}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    `;
                } else if (fieldType === 'select_sem_preco' && fieldOptions) {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <select class="form-control additional-field-select-no-price" data-instance-id="${instance.id}" data-field-name="${fieldName}" required>
                                <option value="">Selecione...</option>
                                ${fieldOptions.map(option => `<option value="${option}" ${currentFieldValue === option ? 'selected' : ''}>${option}</option>`).join('')}
                            </select>
                        </div>
                    `;
                } else if (fieldType === 'text') {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <input type="text" class="form-control additional-field-input" data-instance-id="${instance.id}" data-field-name="${fieldName}" value="${currentFieldValue}" placeholder="Digite aqui...">
                        </div>
                    `;
                } else if (fieldType === 'number') {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <input type="number" class="form-control additional-field-input" data-instance-id="${instance.id}" data-field-name="${fieldName}" step="0.01" value="${currentFieldValue}" placeholder="Ex: 50.00">
                        </div>
                    `;
                } else if (fieldType === 'textarea') {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <textarea class="form-control additional-field-textarea" data-instance-id="${instance.id}" data-field-name="${fieldName}" placeholder="Digite aqui...">${currentFieldValue}</textarea>
                        </div>
                    `;
                }
                return '';
            }).join('');
        }

        // Crie a estrutura do carrossel INDIVIDUAL para este serviço
        const carouselHtml = `
            <div class="service-block-header">
                <h2>${instance.nome}</h2>
                <div class="total-service-price">Total deste serviço: R$ <span id="serviceTotal_${instance.id}">${instance.precoCalculado.toFixed(2).replace('.', ',')}</span></div>
            </div>
            <div class="splide service-carousel-individual" id="serviceCarousel_${instance.id}">
                <div class="splide__track">
                    <ul class="splide__list">
                        <li class="splide__slide service-form-group" data-instance-id="${instance.id}">
                            <div class="slide-header">
                                <h3>Configuração Principal</h3>
                                ${instance.isBaseInstance ?
                                    `<button class="btn btn-danger btn-remove-service" data-instance-id="${instance.id}" title="Remover este serviço completamente">Remover Serviço</button>`
                                    : `<button class="btn btn-danger btn-remove-instance" data-instance-id="${instance.id}" title="Remover este item/equipamento">Remover</button>`
                                }
                            </div>
                            ${fieldsHtml} <div class="service-item-price">Valor deste item: R$ <span class="item-price-value">${instance.precoCalculado.toFixed(2).replace('.', ',')}</span></div>
                        </li>
                        </ul>
                </div>
                <div class="splide__arrows">
                    <button class="splide__arrow splide__arrow--prev">❮</button>
                    <button class="splide__arrow splide__arrow--next">❯</button>
                </div>
            </div>
            ${instance.isBaseInstance ?
                `<button class="btn btn-primary btn-add-equipment" data-service-key="${instance.serviceKey}" data-base-instance-id="${instance.id}" title="Adicionar outro item deste serviço">
                    + Adicionar Equipamento/Detalhe
                </button>` : ''}
        `;

        serviceBlock.innerHTML = carouselHtml;
        servicosFormContainer.appendChild(serviceBlock);
    });

    attachEventListenersToForms(); // Reanexar listeners após renderizar
    updateOrcamentoTotal(); // Atualiza o total geral
    initializeIndividualSplideCarousels(); // Inicializa todos os carrosséis individuais
}

function attachEventListenersToForms() {
    document.querySelectorAll('.additional-field-select-price, .additional-field-select-no-price, .additional-field-input, .additional-field-quantidade, .additional-field-textarea').forEach(field => {
        field.removeEventListener('change', handleFieldChange);
        field.removeEventListener('input', handleFieldChange);
        field.addEventListener('change', handleFieldChange);
        field.addEventListener('input', handleFieldChange);
    });

    document.querySelectorAll('.btn-add-equipment').forEach(btn => {
        btn.removeEventListener('click', addEquipmentInstance);
        btn.addEventListener('click', addEquipmentInstance);
    });

    document.querySelectorAll('.btn-remove-service').forEach(btn => {
        btn.removeEventListener('click', deleteService);
        btn.addEventListener('click', deleteService);
    });

    document.querySelectorAll('.btn-remove-instance').forEach(btn => {
        btn.removeEventListener('click', removeInstance);
        btn.addEventListener('click', removeInstance);
    });
}

function handleFieldChange(e) {
    const instanceId = parseInt(e.target.dataset.instanceId);
    const fieldName = e.target.dataset.fieldName;
    let value = e.target.value;

    const instance = servicosSelecionados.find(inst => inst.id === instanceId);
    if (!instance) return;

    if (e.target.type === 'number' || (e.target.tagName.toLowerCase() === 'input' && e.target.type !== 'text')) {
        value = parseFloat(value);
        if (isNaN(value)) value = 0;
    } else {
        value = String(value);
    }

    instance.camposSelecionados[fieldName] = value;

    // Atualiza o preço da instância e o total do serviço específico
    updateInstancePrice(instanceId);
    updateServiceBlockTotal(instanceId); // Atualiza o total visível no bloco do serviço
    updateOrcamentoTotal(); // Atualiza o orçamento geral
}

// CORREÇÃO: Função para recalcular o preço de uma instância específica, considerando quantidade e campos
function updateInstancePrice(instanceId) {
    const instance = servicosSelecionados.find(inst => inst.id === instanceId);
    if (!instance) return;

    const slideElement = document.querySelector(`.service-form-group[data-instance-id="${instanceId}"]`);
    if (!slideElement) return;

    const precoBase = instance.precoBase || 0;
    let precoAdicionais = 0;

    // Calcula o preço dos selects com preço associado
    slideElement.querySelectorAll('.additional-field-select-price').forEach(select => {
        const selectedOptionText = select.options[select.selectedIndex]?.text;
        if (selectedOptionText && selectedOptionText.includes(', R$ ')) {
            const parts = selectedOptionText.split(', R$ ');
            const optionPrice = parseFloat(parts[1].replace(',', '.'));
            if (!isNaN(optionPrice)) {
                precoAdicionais += optionPrice;
            }
        }
    });

    // Adiciona preços de campos numéricos extras
    slideElement.querySelectorAll('.additional-field-input[type="number"]').forEach(input => {
        const inputValue = parseFloat(input.value);
        if (!isNaN(inputValue)) {
            precoAdicionais += inputValue;
        }
    });

    let precoUnitarioInstancia = precoBase + precoAdicionais;

    // Obtém a quantidade selecionada
    const quantityField = slideElement.querySelector('.additional-field-quantidade');
    let quantidade = 1;

    if (quantityField && quantityField.value) {
        const parsedQuantity = parseInt(quantityField.value);
        if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
            quantidade = parsedQuantity;
        } else if (parsedQuantity === 0) {
            quantidade = 0; // Zero quantidade = zero custo
        }
    }

    instance.quantidade = quantidade;
    instance.precoCalculado = precoUnitarioInstancia * quantidade;

    // Atualiza o display do preço no slide
    const priceDisplay = slideElement.querySelector('.service-item-price .item-price-value');
    if (priceDisplay) {
        priceDisplay.textContent = formatPrice(instance.precoCalculado);
    }
}

function updateServiceBlockTotal(instanceId) {
    const instance = servicosSelecionados.find(inst => inst.id === instanceId);
    if (!instance) return;

    const serviceBlockTotalSpan = document.querySelector(`#serviceTotal_${instanceId}`);
    if (serviceBlockTotalSpan) {
        serviceBlockTotalSpan.textContent = formatPrice(instance.precoCalculado);
    }
}

// **CORREÇÃO AQUI**: Esta função agora adiciona um NOVO SLIDE ao carrossel existente
function addEquipmentInstance(e) {
    const serviceKey = e.target.dataset.serviceKey;
    const baseInstanceId = parseInt(e.target.dataset.baseInstanceId);
    const serviceData = servicosGlobais[serviceKey];

    if (!serviceData) return;

    // Encontra o carrossel associado a esta instância base
    const baseServiceBlock = document.querySelector(`.service-edit-block[data-instance-id="${baseInstanceId}"]`);
    if (!baseServiceBlock) return;

    const splideContainer = baseServiceBlock.querySelector('.service-carousel-individual .splide__list');
    if (!splideContainer) return;

    currentServiceInstanceId++;
    const newInstance = {
        id: currentServiceInstanceId,
        serviceKey: serviceKey,
        nome: serviceData.nome,
        precoBase: serviceData.precoBase || 0,
        camposAdicionais: serviceData.camposAdicionais || [],
        camposSelecionados: {},
        quantidade: 1,
        precoCalculado: serviceData.precoBase || 0,
        isBaseInstance: false // Indica que é uma instância adicional
    };

    // Inicializa campos para a nova instância
    newInstance.camposAdicionais.forEach(field => {
        if (field.tipo === 'select_quantidade' && field.opcoes && field.opcoes.length > 0) {
            newInstance.camposSelecionados[field.nome] = '1';
        } else if (field.tipo === 'select_com_preco' || field.tipo === 'select_sem_preco') {
            newInstance.camposSelecionados[field.nome] = '';
        } else if (field.tipo === 'text' || field.tipo === 'number' || field.tipo === 'textarea') {
            newInstance.camposSelecionados[field.nome] = '';
        }
    });

    servicosSelecionados.push(newInstance);
    renderServiceForms(); // Re-renderiza tudo para adicionar o novo slide corretamente

    // Opcional: Tentar focar no slide recém-adicionado (pode precisar de ajustes dependendo do Splide)
    // A lógica de renderizar tudo novamente já garante que o novo slide esteja presente.
}


function deleteService(e) {
    const instanceIdToDelete = parseInt(e.target.dataset.instanceId);
    const instanceToDelete = servicosSelecionados.find(inst => inst.id === instanceIdToDelete);

    if (!instanceToDelete) return;

    const serviceKeyToDelete = instanceToDelete.serviceKey;

    // Remove todas as instâncias (base e adicionais) relacionadas a este serviço base
    servicosSelecionados = servicosSelecionados.filter(inst => inst.serviceKey !== serviceKeyToDelete);

    renderServiceForms(); // Re-renderiza a lista de blocos de serviço
    updateOrcamentoTotal();
    updateSelectedServicesCount();

    const nextButton = document.getElementById('nextStep1');
    if (servicosSelecionados.filter(s => s.isBaseInstance).length === 0) {
        nextButton.style.display = 'none';
    }
}

function removeInstance(e) {
    const instanceIdToRemove = parseInt(e.target.dataset.instanceId);
    servicosSelecionados = servicosSelecionados.filter(inst => inst.id !== instanceIdToRemove);
    renderServiceForms();
    updateOrcamentoTotal();
}

function updateOrcamentoTotal() {
    let total = 0;
    servicosSelecionados.forEach(instance => {
        total += instance.precoCalculado || 0;
    });
    orcamentoTotalDisplay.textContent = formatPrice(total);
}

// ==========================================================================
// 5. ETAPA 3: INFORMAÇÕES DO CLIENTE
// ==========================================================================

function setupPhoneMask() {
    const phoneInput = document.getElementById('telefone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
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
    const nomeInput = document.getElementById('nome');
    const telefoneInput = document.getElementById('telefone');
    const nome = nomeInput.value.trim();
    const telefone = telefoneInput.value;
    const telefoneRegex = /^\(\d{2}\)\s\d{5}-\d{4}$/;

    if (!nome) {
        alert("Por favor, preencha seu nome.");
        nomeInput.classList.add('invalid');
        return;
    } else {
        nomeInput.classList.remove('invalid');
    }

    if (!telefone || !telefoneRegex.test(telefone)) {
        alert("Por favor, preencha um telefone válido no formato (xx) xxxxx-xxxx.");
        telefoneInput.classList.add('invalid');
        return;
    } else {
        telefoneInput.classList.remove('invalid');
    }

    clienteFormSection.classList.add('hidden');
    agendamentoSection.classList.remove('hidden');
    updateProgressBar(4);
});

// ==========================================================================
// 6. ETAPA 4: AGENDAMENTO E FINALIZAÇÃO
// ==========================================================================

function setupPaymentOptions() {
    paymentOptionsContainer.querySelectorAll('.payment-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            formaPagamentoSelecionada = btn.dataset.method;
            document.querySelectorAll('.payment-option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
}

async function handleDateSelection() {
    if (!configGlobais.horariosPorDia) {
        timeSlotsContainer.innerHTML = '<p>Carregando configurações. Por favor, selecione a data novamente.</p>';
        return;
    }

    const selectedDate = datePicker.value;
    if (!selectedDate) {
        timeSlotsContainer.innerHTML = '<p>Selecione uma data para ver os horários.</p>';
        return;
    }

    const hoje = new Date();
    const dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataAgendamento = new Date(selectedDate + 'T00:00:00');

    if (dataAgendamento < dataAtual) {
        timeSlotsContainer.innerHTML = '<p>Não é possível agendar para uma data que já passou.</p>';
        return;
    }

    const maxHourForToday = configGlobais.limiteAgendamentoHoje || 14;
    if (dataAgendamento.getTime() === dataAtual.getTime() && hoje.getHours() >= maxHourForToday) {
        timeSlotsContainer.innerHTML = `<p>Agendamentos para o dia de hoje só são permitidos até as ${maxHourForToday}:00. Por favor, selecione uma data futura.</p>`;
        return;
    }

    const [year, month, day] = selectedDate.split('-');
    const dayOfWeek = getDayOfWeek(selectedDate);

    const diaConfig = configGlobais.horariosPorDia ? configGlobais.horariosPorDia[dayOfWeek] : null;
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

    const intervalMinutes = parseInt(interval) || 30;

    while (currentTime < end) {
        const timeString = currentTime.toTimeString().slice(0, 5);

        if (referenceTime) {
             const [slotHour, slotMinute] = timeString.split(':').map(Number);
             const [refHour, refMinute] = [referenceTime.getHours(), referenceTime.getMinutes()];
             if (slotHour < refHour || (slotHour === refHour && slotMinute < refMinute)) {
                currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
                continue;
            }
        }

        if (!existingAppointments.includes(timeString)) {
            slots.push(timeString);
        }

        currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
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
    if (!selectedTimeSlot) {
        alert("Por favor, selecione um horário para o agendamento.");
        return;
    }

    if (!formaPagamentoSelecionada) {
        alert("Por favor, selecione uma forma de pagamento.");
        return;
    }

    const clienteData = {
        nome: document.getElementById('nome').value.trim(),
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value.trim(),
        observacoes: document.getElementById('observacoes').value.trim(),
    };

    const agendamentoData = {
        cliente: clienteData,
        servicos: servicosSelecionados.map(instance => ({
            id: instance.id, // ID único da instância
            serviceKey: instance.serviceKey, // Chave do serviço base
            nome: instance.nome, // Nome do serviço base
            camposSelecionados: instance.camposSelecionados, // Valores dos campos editados
            quantidade: instance.quantidade, // Quantidade final multiplicada
            precoCalculado: instance.precoCalculado // Preço final calculado para essa instância
        })),
        data: formatDate(datePicker.value),
        hora: selectedTimeSlot.textContent,
        orcamentoTotal: parseFloat(orcamentoTotalDisplay.textContent.replace('R$ ', '').replace(',', '.')),
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
    updateProgressBar(5); // Assumindo 5 passos para fins de UI (1-4 + Confirmação)

    const whatsappMsg = createWhatsAppMessage();
    const whatsappNumber = configGlobais.whatsappNumber || '5511999999999';
    whatsappLink.href = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;
}

function createWhatsAppMessage() {
    const clienteNome = document.getElementById('nome').value.trim();
    const clienteTelefone = document.getElementById('telefone').value;
    const clienteEndereco = document.getElementById('endereco').value.trim();
    const clienteObservacoes = document.getElementById('observacoes').value.trim();
    const dataAgendamento = formatDate(datePicker.value);
    const horaAgendamento = document.querySelector('.time-slot.selected')?.textContent || '';
    const totalOrcamento = orcamentoTotalDisplay.textContent;
    const formaPagamento = formaPagamentoSelecionada;

    let mensagemFinal = `Olá, *${clienteNome}*! 👋\n\n`;
    mensagemFinal += `Seu agendamento foi recebido com sucesso!\n\n`;

    mensagemFinal += `*👤 Dados do Cliente:*\n`;
    mensagemFinal += `Nome: ${clienteNome}\n`;
    mensagemFinal += `Telefone: ${clienteTelefone}\n`;
    if (clienteEndereco) {
        mensagemFinal += `Endereço: ${clienteEndereco}\n`;
    }
    if (clienteObservacoes) {
        mensagemFinal += `*📝 Observações:* ${clienteObservacoes}\n`;
    }
    mensagemFinal += '\n';

    mensagemFinal += `*📅 Detalhes do Agendamento:*\n`;
    mensagemFinal += `Data: ${dataAgendamento}\n`;
    mensagemFinal += `Hora: ${horaAgendamento}\n\n`;

    mensagemFinal += '🛠️ *Serviços Agendados:*\n\n';

    servicosSelecionados.forEach((instance, index) => {
        mensagemFinal += `${index + 1}. *${instance.nome}*\n`;

        instance.camposAdicionais.forEach(field => {
            const fieldName = field.nome;
            const selectedValue = instance.camposSelecionados[fieldName];

            if (selectedValue !== undefined && selectedValue !== "" && selectedValue !== "Não" && (field.tipo !== 'select_quantidade' || selectedValue !== '0')) {
                let displayValue = selectedValue;

                if (field.tipo === 'select_com_preco' && typeof selectedValue === 'string' && selectedValue.includes(', R$ ')) {
                    displayValue = selectedValue.split(', R$ ')[0];
                } else if (field.tipo === 'number') {
                    displayValue = `R$ ${formatPrice(parseFloat(selectedValue))}`;
                }
                mensagemFinal += `  *${fieldName}*: ${displayValue}\n`;
            }
        });

        if (instance.quantidade !== 1 && instance.camposAdicionais?.some(f => f.tipo === 'select_quantidade')) {
             mensagemFinal += `  *Quantidade*: ${instance.quantidade}\n`;
        }

        mensagemFinal += `  *Valor deste Item:* R$ ${formatPrice(instance.precoCalculado)}.\n\n`;
    });

    mensagemFinal += `\n*💰 Orçamento Total:* ${totalOrcamento}\n`;
    mensagemFinal += `*💳 Forma de Pagamento:* ${formaPagamento}\n\n`;
    mensagemFinal += `Obrigado! 😊`;

    return mensagemFinal;
}

function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return '0,00';
    return price.toFixed(2).replace('.', ',');
}

// ==========================================================================
// 7. NAVEGAÇÃO E FUNÇÕES AUXILIARES
// ==========================================================================

function setupEventListeners() {
    datePicker.addEventListener('change', handleDateSelection);
    document.getElementById('agendamentoForm').addEventListener('submit', handleFormSubmit);

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
        const stepNumber = index + 1;
        if (stepNumber <= step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
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
