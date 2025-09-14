/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 11.9 (Foco em estabilidade, topo/botões fixos, carrossel de serviços editáveis e correção na multiplicação de quantidade)
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
const addEquipmentBtnContainer = document.querySelector('.add-equipment-container'); // Não usado diretamente, mas mantido

let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};
let formaPagamentoSelecionada = '';
let currentServiceInstanceId = 0;
let splideCarouselInstance = null;

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
                document.getElementById('telefone').value = configGlobais.whatsappNumber.replace(/\D/g, '');
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
            // Inicializa campos obrigatórios
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
            servicosSelecionados = servicosSelecionados.filter(s => s.id !== getBaseInstanceIdForService(key));
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

function getBaseInstanceIdForService(serviceKey) {
    const instance = servicosSelecionados.find(s => s.serviceKey === serviceKey && s.isBaseInstance);
    return instance ? instance.id : null;
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
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS (COM CARROSSEL E NOVAS FUNCIONALIDADES)
// ==========================================================================

function renderServiceForms() {
    servicosFormContainer.innerHTML = '';

    servicosSelecionados.forEach((instance, index) => {
        const slideElement = document.createElement('li');
        slideElement.className = 'splide__slide service-form-group';
        slideElement.dataset.instanceId = instance.id;

        let fieldsHtml = '';
        const quantityFieldConfig = instance.camposAdicionais?.find(f => f.tipo === 'select_quantidade');

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
                }
                else if (fieldType === 'select_com_preco' && fieldOptions) {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <select class="form-control additional-field-select-price" data-instance-id="${instance.id}" data-field-name="${fieldName}" required>
                                <option value="">Selecione...</option>
                                ${fieldOptions.map(option => {
                                    // Preserva o valor completo (nome, preço) para o JS processar
                                    const optionValue = option.includes(', R$ ') ? option : `${option}, R$ 0.00`;
                                    return `<option value="${optionValue}" ${currentFieldValue === option ? 'selected' : ''}>${option}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    `;
                }
                else if (fieldType === 'select_sem_preco' && fieldOptions) {
                     return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <select class="form-control additional-field-select-no-price" data-instance-id="${instance.id}" data-field-name="${fieldName}" required>
                                <option value="">Selecione...</option>
                                ${fieldOptions.map(option => `<option value="${option}" ${currentFieldValue === option ? 'selected' : ''}>${option}</option>`).join('')}
                            </select>
                        </div>
                    `;
                }
                else if (fieldType === 'text') {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <input type="text" class="form-control additional-field-input" data-instance-id="${instance.id}" data-field-name="${fieldName}" value="${currentFieldValue}" placeholder="Digite aqui...">
                        </div>
                    `;
                }
                else if (fieldType === 'number') {
                    return `
                        <div class="form-group">
                            <label>${fieldName}</label>
                            <input type="number" class="form-control additional-field-input" data-instance-id="${instance.id}" data-field-name="${fieldName}" step="0.01" value="${currentFieldValue}" placeholder="Ex: 50.00">
                        </div>
                    `;
                }
                else if (fieldType === 'textarea') {
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

        const showAddEquipmentButton = instance.isBaseInstance && instance.camposAdicionais && instance.camposAdicionais.length > 0;

        slideElement.innerHTML = `
            <div class="slide-header">
                <h3>${instance.nome}</h3>
                ${instance.isBaseInstance ?
                    `<button class="btn btn-danger btn-remove-service" data-instance-id="${instance.id}" title="Remover este serviço completamente">Remover Serviço</button>`
                    : `<button class="btn btn-danger btn-remove-instance" data-instance-id="${instance.id}" title="Remover este item/equipamento">Remover</button>`
                }
            </div>
            ${fieldsHtml}
            <div class="service-price">Valor deste item: R$ ${instance.precoCalculado.toFixed(2).replace('.', ',')}</div>
            ${showAddEquipmentButton ?
                `<button class="btn btn-primary btn-add-equipment" data-service-key="${instance.serviceKey}" data-base-instance-id="${instance.id}" title="Adicionar outro item deste serviço">
                    + Adicionar Equipamento/Detalhe
                </button>` : ''}
        `;
        servicosFormContainer.appendChild(slideElement);
    });

    attachEventListenersToForms();
    updateOrcamentoTotal();
    initializeSplideCarousel();
}

function attachEventListenersToForms() {
    document.querySelectorAll('.additional-field-select-price, .additional-field-select-no-price, .additional-field-input, .additional-field-quantidade, .additional-field-textarea').forEach(field => {
        field.addEventListener('change', handleFieldChange);
        field.addEventListener('input', handleFieldChange);
    });

    document.querySelectorAll('.btn-add-equipment').forEach(btn => {
        btn.addEventListener('click', addEquipmentInstance);
    });

    document.querySelectorAll('.btn-remove-service').forEach(btn => {
        btn.addEventListener('click', deleteService);
    });

    document.querySelectorAll('.btn-remove-instance').forEach(btn => {
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

    updateInstancePrice(instanceId);
    updateOrcamentoTotal();
}

// CORREÇÃO: Função para recalcular o preço de uma instância específica, considerando quantidade e campos
function updateInstancePrice(instanceId) {
    const instance = servicosSelecionados.find(inst => inst.id === instanceId);
    if (!instance) return;

    const slideElement = document.querySelector(`.splide__slide[data-instance-id="${instanceId}"]`);
    if (!slideElement) return;

    const precoBase = instance.precoBase || 0;
    let precoAdicionais = 0;

    // Calcula o preço dos selects com preço associado
    slideElement.querySelectorAll('.additional-field-select-price').forEach(select => {
        const selectedOptionText = select.options[select.selectedIndex].text; // Pega o texto da opção
        if (selectedOptionText && selectedOptionText.includes(', R$ ')) {
            const parts = selectedOptionText.split(', R$ ');
            const optionPrice = parseFloat(parts[1]);
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

    // *** CORREÇÃO: Calcula o PREÇO UNITÁRIO da instância ANTES de multiplicar pela quantidade ***
    let precoUnitarioInstancia = precoBase + precoAdicionais;

    // Obtém a quantidade selecionada
    const quantityField = slideElement.querySelector('.additional-field-quantidade');
    let quantidade = 1;

    if (quantityField && quantityField.value) {
        const parsedQuantity = parseInt(quantityField.value);
        if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
            quantidade = parsedQuantity;
        }
    }

    // Atualiza o preço calculado na instância, multiplicando o PREÇO UNITÁRIO pela QUANTIDADE
    instance.quantidade = quantidade; // Salva a quantidade na instância
    instance.precoCalculado = precoUnitarioInstancia * quantidade; // AQUI ESTÁ A CORREÇÃO: preço unitário * quantidade

    // Atualiza o display do preço no slide
    const priceDisplay = slideElement.querySelector('.service-price');
    if (priceDisplay) {
        priceDisplay.textContent = `Valor deste item: R$ ${instance.precoCalculado.toFixed(2).replace('.', ',')}`;
    }
}

function addEquipmentInstance(e) {
    const serviceKey = e.target.dataset.serviceKey;
    const baseInstanceId = parseInt(e.target.dataset.baseInstanceId);
    const serviceData = servicosGlobais[serviceKey];

    if (!serviceData) return;

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
        isBaseInstance: false // Indica que não é a instância base do serviço
    };

    // Inicializa campos obrigatórios para a nova instância
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
    renderServiceForms();

    if (splideCarouselInstance) {
        const newlyAddedInstance = servicosSelecionados.find(inst => inst.id === currentServiceInstanceId);
        if (newlyAddedInstance) {
            const newSlideIndex = servicosSelecionados.indexOf(newlyAddedInstance);
            splideCarouselInstance.go(newSlideIndex);
        }
    }
}

function removeInstance(e) {
    const instanceIdToRemove = parseInt(e.target.dataset.instanceId);
    servicosSelecionados = servicosSelecionados.filter(inst => inst.id !== instanceIdToRemove);
    renderServiceForms();
    updateOrcamentoTotal();
}

function deleteService(e) {
    const instanceIdToDelete = parseInt(e.target.dataset.instanceId);
    const instanceToDelete = servicosSelecionados.find(inst => inst.id === instanceIdToDelete);

    if (!instanceToDelete) return;

    const serviceKeyToDelete = instanceToDelete.serviceKey;

    // Remove todas as instâncias relacionadas a este serviço base
    servicosSelecionados = servicosSelecionados.filter(inst => inst.serviceKey !== serviceKeyToDelete);

    renderServiceForms();
    updateOrcamentoTotal();
    updateSelectedServicesCount();

    const nextButton = document.getElementById('nextStep1');
    if (servicosSelecionados.filter(s => s.isBaseInstance).length === 0) {
        nextButton.style.display = 'none';
    }
}

function updateOrcamentoTotal() {
    let total = 0;
    servicosSelecionados.forEach(instance => {
        total += instance.precoCalculado || 0;
    });
    orcamentoTotalDisplay.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function initializeSplideCarousel() {
    const splideElement = document.getElementById('servicosCarousel');
    if (!splideElement) return;

    if (splideCarouselInstance) {
        splideCarouselInstance.destroy();
    }

    splideCarouselInstance = new Splide(splideElement, {
        type: 'slide',
        perPage: 1,
        gap: '1rem',
        pagination: false,
        arrows: true,
        autoWidth: true,
        padding: '1rem',
        snap: true
    });

    splideCarouselInstance.mount();
}

function getSelectedOptionsForInstance(instanceId) {
    const instance = servicosSelecionados.find(inst => inst.id === instanceId);
    if (!instance) return {};

    const selectedFields = {};
    const slideElement = document.querySelector(`.splide__slide[data-instance-id="${instanceId}"]`);
    if (!slideElement) return {};

    slideElement.querySelectorAll('.additional-field-select-price, .additional-field-select-no-price').forEach(select => {
        const fieldName = select.dataset.fieldName;
        if (fieldName) {
            selectedFields[fieldName] = select.value; // Salva o valor selecionado
        }
    });

    const quantityField = slideElement.querySelector('.additional-field-quantidade');
    if (quantityField && quantityField.dataset.fieldName) {
        selectedFields[quantityField.dataset.fieldName] = quantityField.value;
    }

    slideElement.querySelectorAll('.additional-field-input').forEach(input => {
        const fieldName = input.dataset.fieldName;
        if (fieldName) {
            selectedFields[fieldName] = input.type === 'number' ? parseFloat(input.value) : input.value;
        }
    });

    slideElement.querySelectorAll('.additional-field-textarea').forEach(textarea => {
        const fieldName = textarea.dataset.fieldName;
        if (fieldName) {
            selectedFields[fieldName] = textarea.value;
        }
    });

    return selectedFields;
}

document.getElementById('nextStep2').addEventListener('click', () => {
    let allFieldsFilled = true;

    // Atualiza campos selecionados e recalcula preços antes de avançar
    servicosSelecionados.forEach(instance => {
        instance.camposSelecionados = getSelectedOptionsForInstance(instance.id);
        updateInstancePrice(instance.id); // Garante que os preços estejam atualizados com os campos preenchidos
    });
    updateOrcamentoTotal(); // Atualiza o total com os preços recalculados

    servicosSelecionados.forEach(instance => {
        const slideElement = document.querySelector(`.splide__slide[data-instance-id="${instance.id}"]`);
        if (!slideElement) return;

        slideElement.querySelectorAll('.form-group select[required], .form-group input[required], .form-group textarea[required]').forEach(field => {
            if (!field.value) {
                allFieldsFilled = false;
                field.classList.add('invalid');
            } else {
                field.classList.remove('invalid');
            }
        });
    });

    if (!allFieldsFilled) {
        alert("Por favor, preencha todos os campos obrigatórios para continuar.");
        return;
    }

    servicosFormSection.classList.add('hidden');
    clienteFormSection.classList.remove('hidden');
    updateProgressBar(3);
});


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
    const nome = nomeInput.value;
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
             if (slotHour < referenceTime.getHours() || (slotHour === referenceTime.getHours() && slotMinute < referenceTime.getMinutes())) {
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
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
    };

    const agendamentoData = {
        cliente: clienteData,
        servicos: servicosSelecionados.map(instance => ({
            id: instance.id,
            serviceKey: instance.serviceKey,
            nome: instance.nome,
            camposSelecionados: instance.camposSelecionados,
            quantidade: instance.quantidade,
            precoCalculado: instance.precoCalculado
        })),
        data: formatDate(datePicker.value),
        hora: selectedTimeSlot.textContent,
        observacoes: document.getElementById('observacoes').value,
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
    updateProgressBar(5); // Assume 5 passos para fins de UI

    const whatsappMsg = createWhatsAppMessage();
    const whatsappNumber = configGlobais.whatsappNumber || '5511999999999';
    whatsappLink.href = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`;

    whatsappLink.addEventListener('click', () => {
        setTimeout(() => {
            window.location.href = 'index.html'; // Redireciona para a página inicial após confirmar
        }, 500);
    });
}

function createWhatsAppMessage() {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;
    const data = formatDate(datePicker.value);
    const hora = document.querySelector('.time-slot.selected')?.textContent || '';
    const observacoes = document.getElementById('observacoes').value;
    const total = orcamentoTotalDisplay.textContent;

    let mensagemFinal = `Olá, gostaria de confirmar seu agendamento. 👋\n\n`;

    mensagemFinal += `*👤 Dados do Cliente:*\n`;
    mensagemFinal += `Nome: ${nome}\n`;
    mensagemFinal += `Telefone: ${telefone}\n`;
    mensagemFinal += `Endereço: ${endereco}\n\n`;

    mensagemFinal += `*📅 Detalhes do Agendamento:*\n`;
    mensagemFinal += `Data: ${data}\n`;
    mensagemFinal += `Hora: ${hora}\n`;
    if (observacoes) {
        mensagemFinal += `*📝 Observações:* ${observacoes}\n`;
    }
    mensagemFinal += '\n';

    mensagemFinal += '🛠️ Serviços Agendados:\n\n';

    servicosSelecionados.forEach((instance, index) => {
        mensagemFinal += `${index + 1}. *${instance.nome}*\n`;

        if (instance.quantidade > 1) {
            mensagemFinal += `   Quantidade: ${instance.quantidade}\n`;
        }

        instance.camposAdicionais.forEach(field => {
            const fieldName = field.nome;
            const selectedValue = instance.camposSelecionados[fieldName];

            if (selectedValue !== undefined && selectedValue !== "" && selectedValue !== "Não" && field.tipo !== 'select_quantidade' && field.tipo !== 'number') {
                let displayValue = selectedValue;

                if (field.tipo === 'select_com_preco' && typeof selectedValue === 'string' && selectedValue.includes(', R$ ')) {
                    displayValue = selectedValue.split(', R$ ')[0];
                }
                else if (field.tipo === 'number') {
                    displayValue = `R$ ${formatPrice(parseFloat(selectedValue))}`;
                }

                mensagemFinal += `  *${fieldName}*: ${displayValue}\n`;
            }
        });

        mensagemFinal += `\n  *Valor deste Item:* R$ ${formatPrice(instance.precoCalculado)}.\n\n`;
    });

    mensagemFinal += `\n*💰 Orçamento Total:* ${total}\n`;
    mensagemFinal += `*💳 Forma de Pagamento:* ${formaPagamentoSelecionada}\n\n`;
    mensagemFinal += `Obrigado! 😊`;

    return mensagemFinal;
}

function formatPrice(price) {
    if (typeof price !== 'number') return '0,00';
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
        if (index + 1 === step) {
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
