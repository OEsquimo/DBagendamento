/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 16.0 (Refinamento na lógica do carrossel, price update e envio de formulário)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, get, remove, set, query, orderByChild, equalTo, limitToFirst } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuração do Firebase (mantida a mesma)
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

// Seletores de elementos DOM
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
const nextStep1Button = document.getElementById('nextStep1');
const clienteInfoForm = document.getElementById('clienteInfoForm');
const agendamentoForm = document.getElementById('agendamentoForm');

let servicosSelecionados = []; // Array para armazenar os serviços e seus detalhes selecionados
let servicosGlobais = {};    // Cache de todos os serviços disponíveis
let configGlobais = {};      // Cache das configurações do sistema
let formaPagamentoSelecionada = '';

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
        } else {
            console.warn("Configurações não encontradas no banco de dados. Usando padrões.");
            configGlobais = {
                whatsappNumber: '',
                horariosPorDia: {}
            };
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        configGlobais = {
            whatsappNumber: '',
            horariosPorDia: {}
        };
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

        updateSelectedServicesCount();
        nextStep1Button.style.display = servicosSelecionados.length > 0 ? 'block' : 'none';
    });

    servicosContainer.appendChild(card);
}

function updateSelectedServicesCount() {
    selectedServicesCount.textContent = servicosSelecionados.length;
}

nextStep1Button.addEventListener('click', () => {
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
    servicosFormContainer.innerHTML = ''; // Limpa o contêiner
    servicosSelecionados.forEach(service => {
        const serviceWrapper = document.createElement('div');
        serviceWrapper.className = 'service-wrapper';
        serviceWrapper.dataset.key = service.key;

        let fieldsHtml = '';
        if (service.camposAdicionais && service.camposAdicionais.length > 0) {
            // Renderiza o primeiro conjunto de campos como padrão
            fieldsHtml += generateEquipmentFields(service, service.camposAdicionais, 0);
        }

        serviceWrapper.innerHTML = `
            <h3>${service.nome}</h3>
            <div class="equipment-forms-container">
                ${fieldsHtml}
            </div>
            ${(service.camposAdicionais && service.camposAdicionais.length > 0) ? `
                <button type="button" class="btn btn-secondary add-equipment-btn">
                    + Adicionar Outro Equipamento
                </button>
            ` : ''}
            <div class="service-price">Valor: R$ ${service.precoCalculado ? formatPrice(service.precoCalculado) : formatPrice(service.precoBase || 0)}</div>
        `;

        const addEquipmentBtn = serviceWrapper.querySelector('.add-equipment-btn');
        if (addEquipmentBtn) {
            addEquipmentBtn.addEventListener('click', () => addEquipmentForm(service, serviceWrapper));
        }

        servicosFormContainer.appendChild(serviceWrapper);
    });

    document.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-textarea, .additional-field-quantidade').forEach(field => {
        field.addEventListener('change', updatePrice);
        field.addEventListener('input', updatePrice);
    });

    updateOrcamentoTotal();
}

function generateEquipmentFields(service, camposAdicionais, equipmentIndex = 0) {
    let fieldsHtml = `
        <div class="equipment-fields" data-equipment-index="${equipmentIndex}">
            ${camposAdicionais.map(field => {
                const fieldName = field.nome.replace(/\s+/g, '_').toLowerCase();
                const fieldId = `${service.key}-${fieldName}-equip-${equipmentIndex}`;
                const isSelectField = field.tipo.startsWith('select');
                const hasPrice = field.tipo === 'select_com_preco';
                const isQuantityField = field.tipo === 'select_quantidade';

                let inputHtml = '';
                if (isSelectField && field.opcoes) {
                    inputHtml = `
                        <label>${field.nome}</label>
                        <select class="form-control ${isQuantityField ? 'additional-field-quantidade' : (hasPrice ? 'additional-field-select-com-preco' : 'additional-field-select-sem-preco')}"
                                id="${fieldId}"
                                data-field-name="${field.nome}"
                                data-service-key="${service.key}"
                                data-equipment-index="${equipmentIndex}"
                                required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => {
                                const optionValue = option.split(', R$ ')[0];
                                return `<option value="${option}">${optionValue}</option>`;
                            }).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'text') {
                    inputHtml = `
                        <label>${field.nome}</label>
                        <input type="text" class="form-control additional-field-input"
                               id="${fieldId}"
                               data-field-name="${field.nome}"
                               data-service-key="${service.key}"
                               data-equipment-index="${equipmentIndex}"
                               required>
                    `;
                } else if (field.tipo === 'number') {
                    inputHtml = `
                        <label>${field.nome}</label>
                        <input type="number" class="form-control additional-field-input"
                               id="${fieldId}"
                               data-field-name="${field.nome}"
                               data-service-key="${service.key}"
                               data-equipment-index="${equipmentIndex}"
                               step="0.01" required>
                    `;
                } else if (field.tipo === 'textarea') {
                     inputHtml = `
                        <label>${field.nome}</label>
                        <textarea class="form-control additional-field-textarea"
                                  id="${fieldId}"
                                  data-field-name="${field.nome}"
                                  data-service-key="${service.key}"
                                  data-equipment-index="${equipmentIndex}"
                                  placeholder="Digite aqui..."></textarea>
                    `;
                }
                return inputHtml;
            }).join('')}
            ${equipmentIndex > 0 ? `<button type="button" class="btn btn-danger btn-sm remove-equipment-btn">Remover Equipamento</button>` : ''}
        </div>
    `;
    return fieldsHtml;
}

function addEquipmentForm(service, serviceWrapper) {
    const equipmentFormsContainer = serviceWrapper.querySelector('.equipment-forms-container');
    const currentEquipmentCount = equipmentFormsContainer.querySelectorAll('.equipment-fields').length;
    const newEquipmentHtml = generateEquipmentFields(service, service.camposAdicionais, currentEquipmentCount);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newEquipmentHtml;
    const newEquipmentElement = tempDiv.firstElementChild;
    equipmentFormsContainer.appendChild(newEquipmentElement);

    // Adiciona event listeners para os novos campos
    newEquipmentElement.querySelectorAll('select, input, textarea').forEach(field => {
        field.addEventListener('change', updatePrice);
        field.addEventListener('input', updatePrice);
    });

    // Adiciona event listener para o botão de remover equipamento recém-criado
    newEquipmentElement.querySelector('.remove-equipment-btn').addEventListener('click', (e) => {
        e.target.closest('.equipment-fields').remove();
        updatePrice();
        scrollToServiceForm(serviceWrapper);
    });

    scrollToServiceForm(serviceWrapper);
}

function updatePrice() {
    servicosSelecionados.forEach(service => {
        const serviceWrapper = document.querySelector(`.service-wrapper[data-key="${service.key}"]`);
        if (!serviceWrapper) return;

        let totalServiceCalculatedPrice = 0;
        const equipmentFieldsElements = serviceWrapper.querySelectorAll('.equipment-fields');

        equipmentFieldsElements.forEach(equipmentElement => {
            let priceForThisEquipment = 0;
            let quantityForThisEquipment = 1;
            const serviceConfig = servicosGlobais[service.key];

            equipmentElement.querySelectorAll('select, input, textarea').forEach(field => {
                const fieldName = field.dataset.fieldName;
                const fieldConfig = serviceConfig?.camposAdicionais?.find(f => f.nome === fieldName);

                if (field.value === "" || field.value === "Selecione..." || field.value === "Não") return;

                if (fieldConfig?.tipo === 'select_quantidade') {
                    quantityForThisEquipment = parseInt(field.value) || 1;
                } else if (fieldConfig?.tipo === 'select_com_preco' && typeof field.value === 'string' && field.value.includes(', R$ ')) {
                    const price = parseFloat(field.value.split(', R$ ')[1]);
                    if (!isNaN(price)) priceForThisEquipment += price;
                } else if (field.type === 'number') {
                    const value = parseFloat(field.value);
                    if (!isNaN(value)) priceForThisEquipment += value;
                }
            });
            totalServiceCalculatedPrice += (service.precoBase + priceForThisEquipment) * quantityForThisEquipment;
        });

        service.precoCalculado = totalServiceCalculatedPrice;

        const servicePriceDisplay = serviceWrapper.querySelector('.service-price');
        if (servicePriceDisplay) {
            servicePriceDisplay.textContent = `Valor: R$ ${formatPrice(service.precoCalculado)}`;
        }
    });

    updateOrcamentoTotal();
}

function getSelectedOptions(serviceWrapperElement, serviceData) {
    const selectedOptions = {};
    const equipmentFieldsElements = serviceWrapperElement.querySelectorAll('.equipment-fields');

    equipmentFieldsElements.forEach(equipmentElement => {
        equipmentElement.querySelectorAll('select, input, textarea').forEach(field => {
            const fieldName = field.dataset.fieldName;
            const serviceConfig = servicosGlobais[serviceData.key];
            const fieldConfig = serviceConfig?.camposAdicionais?.find(f => f.nome === fieldName);

            if (field.value !== "" && field.value !== "Selecione..." && field.value !== "Não") {
                if (fieldConfig?.tipo === 'select_quantidade') {
                    selectedOptions[fieldName] = parseInt(field.value);
                } else if (field.type === 'number') {
                    selectedOptions[fieldName] = parseFloat(field.value);
                } else {
                    selectedOptions[fieldName] = field.value;
                }
            }
        });
    });
    return selectedOptions;
}

document.getElementById('nextStep2').addEventListener('click', () => {
    let allFieldsFilled = true;
    let priceCalculatedForAnyService = false;

    servicosSelecionados.forEach(service => {
        const serviceWrapper = document.querySelector(`.service-wrapper[data-key="${service.key}"]`);
        if (!serviceWrapper) return;

        const equipmentFieldsElements = serviceWrapper.querySelectorAll('.equipment-fields');
        equipmentFieldsElements.forEach(equipmentElement => {
            equipmentElement.querySelectorAll('select, input, textarea').forEach(field => {
                if (field.required && (field.value === "" || field.value === "Selecione...")) {
                    allFieldsFilled = false;
                }
            });
        });

        if (service.precoCalculado !== undefined && service.precoCalculado !== null) {
            priceCalculatedForAnyService = true;
        }
    });

    if (!allFieldsFilled || !priceCalculatedForAnyService) {
        alert("Por favor, preencha todos os campos obrigatórios para cada equipamento e/ou certifique-se de que um preço foi calculado.");
        return;
    }

    servicosSelecionados.forEach(service => {
        const serviceWrapper = document.querySelector(`.service-wrapper[data-key="${service.key}"]`);
        if (serviceWrapper) {
            service.camposAdicionaisSelecionados = getSelectedOptions(serviceWrapper, service);
            // Garante que o preço calculado seja usado, ou o base se não houver cálculo específico
            service.precoCalculado = service.precoCalculado !== undefined && service.precoCalculado !== null ? service.precoCalculado : (service.precoBase || 0);
        }
    });

    servicosFormSection.classList.add('hidden');
    clienteFormSection.classList.remove('hidden');
    updateProgressBar(3);
});

// ==========================================================================
// 5. ETAPA 3: INFORMAÇÕES DO CLIENTE
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
    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value.trim();
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
    const selectedDate = datePicker.value;
    if (!selectedDate) {
        timeSlotsContainer.innerHTML = '<p>Selecione uma data para ver os horários.</p>';
        return;
    }

    if (!configGlobais || !configGlobais.horariosPorDia) {
        timeSlotsContainer.innerHTML = '<p>Carregando configurações. Por favor, selecione a data novamente.</p>';
        await loadConfig();
        if (!configGlobais || !configGlobais.horariosPorDia) {
            timeSlotsContainer.innerHTML = '<p>Configurações de horário não encontradas. Entre em contato com o administrador.</p>';
            return;
        }
    }

    const hoje = new Date();
    const dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataAgendamento = new Date(selectedDate + 'T00:00:00');

    if (dataAgendamento < dataAtual) {
        timeSlotsContainer.innerHTML = '<p>Não é possível agendar para uma data que já passou.</p>';
        return;
    }

    const limiteHorarioHoje = 14; // Hora limite para agendamentos no mesmo dia
    if (dataAgendamento.getTime() === dataAtual.getTime() && hoje.getHours() >= limiteHorarioHoje) {
        timeSlotsContainer.innerHTML = `<p>Agendamentos para o dia de hoje só são permitidos até as ${limiteHorarioHoje}:00. Por favor, selecione uma data futura.</p>`;
        return;
    }

    const dayOfWeek = getDayOfWeek(selectedDate);
    const diaConfig = configGlobais.horariosPorDia[dayOfWeek];

    if (!diaConfig || !diaConfig.ativo) {
        timeSlotsContainer.innerHTML = `<p>Não há agendamentos disponíveis para ${capitalize(dayOfWeek)}.</p>`;
        return;
    }

    const { horarioInicio, horarioFim, duracaoServico, limiteServico } = diaConfig;
    const limiteDiario = parseInt(limiteServico) || 0;

    timeSlotsContainer.innerHTML = '<p>Calculando horários disponíveis...</p>';

    const snapshot = await get(ref(database, 'agendamentos'));
    let agendamentosDoDiaCount = 0;
    let existingAppointmentTimes = [];

    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const agendamento = childSnapshot.val();
            const firebaseDate = formatDate(selectedDate);
            if (agendamento.data === firebaseDate && agendamento.status !== 'Cancelado') {
                agendamentosDoDiaCount++;
                existingAppointmentTimes.push(agendamento.hora);
            }
        });
    }

    if (limiteDiario > 0 && agendamentosDoDiaCount >= limiteDiario) {
        timeSlotsContainer.innerHTML = '<p>Desculpe, o limite de agendamentos para esta data já foi atingido.</p>';
        return;
    }

    const horariosDisponiveis = generateTimeSlots(horarioInicio, horarioFim, duracaoServico, existingAppointmentTimes, dataAgendamento.getTime() === dataAtual.getTime() ? hoje : null);
    displayTimeSlots(horariosDisponiveis);
}

function generateTimeSlots(startTime, endTime, intervalMinutes, existingAppointments, referenceTime) {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date();
    endDateTime.setHours(endHour, endMinute, 0, 0);

    const intervalMs = intervalMinutes * 60 * 1000;

    while (currentTime < endDateTime) {
        const timeString = currentTime.toTimeString().slice(0, 5);

        if (referenceTime) {
             const [slotHour, slotMinute] = timeString.split(':').map(Number);
             const refHour = referenceTime.getHours();
             const refMinute = referenceTime.getMinutes();

             if (slotHour < refHour || (slotHour === refHour && slotMinute < refMinute)) {
                currentTime.setTime(currentTime.getTime() + intervalMs);
                continue;
            }
        }

        if (!existingAppointments.includes(timeString)) {
            slots.push(timeString);
        }

        currentTime.setTime(currentTime.getTime() + intervalMs);
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
    };

    const formattedServicos = servicosSelecionados.map(service => ({
        key: service.key,
        nome: service.nome,
        precoCalculado: service.precoCalculado !== undefined ? service.precoCalculado : (service.precoBase || 0),
        camposAdicionaisSelecionados: service.camposAdicionaisSelecionados || {}
    }));

    const agendamentoData = {
        cliente: clienteData,
        servicos: formattedServicos,
        data: formatDate(datePicker.value),
        hora: selectedTimeSlot.textContent,
        observacoes: document.getElementById('observacoes').value.trim(),
        orcamentoTotal: servicosSelecionados.reduce((sum, s) => sum + (s.precoCalculado !== undefined ? s.precoCalculado : 0), 0),
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
    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value.trim();
    const data = formatDate(datePicker.value);
    const hora = document.querySelector('.time-slot.selected')?.textContent || 'N/A';
    const observacoes = document.getElementById('observacoes').value.trim();
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

    if (servicosSelecionados.length === 1) {
        const servico = servicosSelecionados[0];
        mensagemFinal += `*Serviço Agendado:*\n\n`;
        mensagemFinal += `*${servico.nome}.*\n`;

        const campoQuantidade = servico.camposAdicionais?.find(field => field.tipo === 'select_quantidade');
        const quantidadeSelecionada = servico.camposAdicionaisSelecionados ? servico.camposAdicionaisSelecionados[campoQuantidade?.nome] : undefined;
        const quantidade = campoQuantidade && quantidadeSelecionada !== undefined ? parseInt(quantidadeSelecionada) : 1;

        if (quantidade > 1) {
            mensagemFinal += `Quantidade: ${quantidade}.\n`;
        }

        Object.entries(servico.camposAdicionaisSelecionados || {}).forEach(([campoNome, valor]) => {
            if (campoNome !== campoQuantidade?.nome && valor !== "" && valor !== "Não" && valor !== null && valor !== undefined) {
                const fieldConfig = servico.camposAdicionais?.find(f => f.nome === campoNome);
                let valorFormatado = valor;
                if (fieldConfig?.tipo === 'select_com_preco' && typeof valor === 'string' && valor.includes(', R$ ')) {
                    const parts = valor.split(', R$ ');
                    valorFormatado = parts[0];
                    const precoCampo = parseFloat(parts[1]);
                    mensagemFinal += `${campoNome}:\n  ${valorFormatado}.\n`;
                    mensagemFinal += `  Valor: R$ ${formatPrice(precoCampo)}.\n`;
                } else if (typeof valor === 'number') {
                     mensagemFinal += `${campoNome}:\n  R$ ${formatPrice(valor)}.\n`;
                } else {
                    mensagemFinal += `${campoNome}:\n  ${valor}.\n`;
                }
            }
        });

        const valorTotalServico = servico.precoCalculado || 0;
        mensagemFinal += `\n*Valor Total do Serviço:* R$ ${formatPrice(valorTotalServico)}.\n\n`;

    } else {
        mensagemFinal += '🛠️ Serviços:\n\n';

        servicosSelecionados.forEach((servico, index) => {
            mensagemFinal += `  - *${servico.nome}.*\n\n`;

            const campoQuantidade = servico.camposAdicionais?.find(field => field.tipo === 'select_quantidade');
            const quantidadeSelecionada = servico.camposAdicionaisSelecionados ? servico.camposAdicionaisSelecionados[campoQuantidade?.nome] : undefined;
            const quantidade = campoQuantidade && quantidadeSelecionada !== undefined ? parseInt(quantidadeSelecionada) : 1;

            if (quantidade > 1) {
                mensagemFinal += `  Quantidade: ${quantidade}.\n`;
            }

            Object.entries(servico.camposAdicionaisSelecionados || {}).forEach(([campoNome, valor]) => {
                if (campoNome !== campoQuantidade?.nome && valor !== "" && valor !== "Não" && valor !== null && valor !== undefined) {
                    const fieldConfig = servico.camposAdicionais?.find(f => f.nome === campoNome);
                    let valorFormatado = valor;
                    if (fieldConfig?.tipo === 'select_com_preco' && typeof valor === 'string' && valor.includes(', R$ ')) {
                        const parts = valor.split(', R$ ');
                        valorFormatado = parts[0];
                        const precoCampo = parseFloat(parts[1]);
                        mensagemFinal += `  ${campoNome}:\n    ${valorFormatado}.\n`;
                        mensagemFinal += `    Valor: R$ ${formatPrice(precoCampo)}.\n`;
                    } else if (typeof valor === 'number') {
                        mensagemFinal += `  ${campoNome}:\n    R$ ${formatPrice(valor)}.\n`;
                    } else {
                        mensagemFinal += `  ${campoNome}:\n    ${valor}.\n`;
                    }
                }
            });

            const valorTotalServico = servico.precoCalculado || 0;
            mensagemFinal += `\n  *Valor Total do Serviço:* R$ ${formatPrice(valorTotalServico)}.\n\n`;
        });
    }

    mensagemFinal += `\n*💰 Orçamento Total:* ${total}\n`;
    mensagemFinal += `*💳 Forma de Pagamento:* ${formaPagamentoSelecionada}\n\n`;
    mensagemFinal += `Obrigado! 😊`;

    return mensagemFinal;
}

// ==========================================================================
// 7. NAVEGAÇÃO E FUNÇÕES AUXILIARES
// ==========================================================================

function setupEventListeners() {
    datePicker.addEventListener('change', handleDateSelection);

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

    agendamentoForm.addEventListener('submit', handleFormSubmit);
    clienteInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('nextStep3').click();
    });
    document.getElementById('nextStep3').addEventListener('click', () => {
        const nome = document.getElementById('nome').value.trim();
        const telefone = document.getElementById('telefone').value;
        const endereco = document.getElementById('endereco').value.trim();
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
    const total = servicosSelecionados.reduce((sum, service) => sum + (service.precoCalculado !== undefined ? service.precoCalculado : 0), 0);
    orcamentoTotalDisplay.textContent = `R$ ${formatPrice(total)}`;
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

function formatPrice(price) {
    if (typeof price !== 'number') return '0,00';
    return price.toFixed(2).replace('.', ',');
}

function scrollToServiceForm(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
