/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 11.3 (Mensagem Inteligente para WhatsApp)
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
                if (field.tipo === 'select_com_preco' && field.opcoes) {
                    return `
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select" data-field-name="${field.nome}" data-key="${service.key}" required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'select_sem_preco' && field.opcoes) {
                    return `
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select-no-price" data-field-name="${field.nome}" data-key="${service.key}" required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'select_quantidade' && field.opcoes) {
                    return `
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-quantidade" data-field-name="${field.nome}" data-key="${service.key}" required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'text') {
                    return `
                        <label>${field.nome}</label>
                        <input type="text" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${service.key}" required>
                    `;
                } else if (field.tipo === 'number') {
                    return `
                        <label>${field.nome}</label>
                        <input type="number" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${service.key}" step="0.01" required>
                    `;
                } else if (field.tipo === 'textarea') {
                     return `
                        <label>${field.nome}</label>
                        <textarea class="form-control additional-field-textarea" data-field-name="${field.nome}" data-key="${service.key}" placeholder="Digite aqui..."></textarea>
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

    document.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-select-no-price, .additional-field-quantidade').forEach(field => {
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
    const quantidadeElement = container.querySelector('.additional-field-quantidade');

    selectElements.forEach(select => {
        const selectedValue = select.value;
        if (selectedValue) {
            const parts = selectedValue.split(', R$ ');
            if (parts.length === 2) {
                preco += parseFloat(parts[1]);
            }
        }
    });

    inputElements.forEach(input => {
        if (input.type === 'number') {
            const inputValue = parseFloat(input.value);
            if (!isNaN(inputValue)) {
                preco += inputValue;
            }
        }
    });

    // Se houver um campo de quantidade, multiplica o valor total (preço base + adicionais)
    if (quantidadeElement && quantidadeElement.value) {
        const quantidade = parseInt(quantidadeElement.value);
        return preco * quantidade;
    }

    // Se não houver campo de quantidade, ou se ele não foi selecionado, retorna o valor normal
    return preco;
}

document.getElementById('nextStep2').addEventListener('click', () => {
    let allFieldsFilled = true;
    servicosSelecionados.forEach(service => {
        const formGroup = document.querySelector(`.service-form-group [data-key="${service.key}"]`)?.closest('.service-form-group');
        if (formGroup) {
            formGroup.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-select-no-price, .additional-field-quantidade').forEach(field => {
                if (field.required && field.value === "") {
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
    const selectElementsWithPrice = container.querySelectorAll('.additional-field-select');
    const selectElementsNoPrice = container.querySelectorAll('.additional-field-select-no-price');
    const selectElementsQuantidade = container.querySelectorAll('.additional-field-quantidade');
    const inputElements = container.querySelectorAll('.additional-field-input');
    const textareaElements = container.querySelectorAll('.additional-field-textarea');

    selectElementsWithPrice.forEach(select => {
        const selectedValue = select.value;
        const fieldName = select.dataset.fieldName;
        if (selectedValue) {
            selectedOptions[fieldName] = selectedValue;
        }
    });

    selectElementsNoPrice.forEach(select => {
        const selectedValue = select.value;
        const fieldName = select.dataset.fieldName;
        if (selectedValue) {
            selectedOptions[fieldName] = selectedValue;
        }
    });

    selectElementsQuantidade.forEach(select => {
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

// --- MODIFICAÇÃO INICIADA AQUI ---
function createWhatsAppMessage() {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;
    const data = formatDate(datePicker.value);
    const hora = document.querySelector('.time-slot.selected')?.textContent || ''; // Adicionado optional chaining
    const observacoes = document.getElementById('observacoes').value;
    const total = orcamentoTotalDisplay.textContent; // Já está formatado como R$ X.XX

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
    mensagemFinal += '\n'; // Linha em branco após detalhes do agendamento

    // --- Lógica Inteligente para Serviços ---
    if (servicosSelecionados.length === 1) {
        // Cenário: Apenas um serviço agendado
        const servico = servicosSelecionados[0];
        mensagemFinal += `*Serviço Agendado:*\n\n`; // Título mais direto
        mensagemFinal += `*${servico.nome}.*\n`; // Nome do serviço em negrito

        // Detalhes do ÚNICO serviço
        const campoQuantidade = servico.camposAdicionais?.find(field => field.tipo === 'select_quantidade');
        const quantidade = campoQuantidade ? parseInt(servico.camposAdicionaisSelecionados[campoQuantidade.nome]) || 1 : 1;

        if (quantidade > 1) {
            mensagemFinal += `Quantidade: ${quantidade}.\n`;
        }

        // Listar os campos adicionais para este único serviço
        Object.entries(servico.camposAdicionaisSelecionados).forEach(([campoNome, valor]) => {
            // Ignora campo de quantidade, valores vazios ou "Não" para listagem detalhada
            if (campoNome !== campoQuantidade?.nome && valor !== "" && valor !== "Não") {
                const fieldConfig = servico.camposAdicionais?.find(f => f.nome === campoNome);
                let valorFormatado = valor;
                let precoCampo = 0;

                if (fieldConfig?.tipo === 'select_com_preco' && typeof valor === 'string' && valor.includes(', R$ ')) {
                    const parts = valor.split(', R$ ');
                    valorFormatado = parts[0]; // Apenas o nome da opção
                    precoCampo = parseFloat(parts[1]);
                    mensagemFinal += `${campoNome}:\n  ${valorFormatado}.\n`;
                    mensagemFinal += `  Valor: R$ ${formatPrice(precoCampo)}.\n`;
                } else if (typeof valor === 'number') {
                     // Se for um número (e não campo de quantidade que já foi listado)
                     mensagemFinal += `${campoNome}:\n  R$ ${formatPrice(valor)}.\n`;
                } else {
                    mensagemFinal += `${campoNome}:\n  ${valor}.\n`;
                }
            }
        });

        // Valor total do único serviço
        const valorTotalServico = servico.precoCalculado || 0;
        mensagemFinal += `\n*Valor Total do Serviço:* R$ ${formatPrice(valorTotalServico)}.\n\n`;

    } else {
        // Cenário: Múltiplos serviços agendados
        mensagemFinal += '🛠️ Serviços:\n\n'; // Título padrão para múltiplos serviços

        servicosSelecionados.forEach((servico, index) => {
            mensagemFinal += `  - *${servico.nome}.*\n\n`; // Nome do serviço principal em negrito

            const campoQuantidade = servico.camposAdicionais?.find(field => field.tipo === 'select_quantidade');
            const quantidade = campoQuantidade ? parseInt(servico.camposAdicionaisSelecionados[campoQuantidade.nome]) || 1 : 1;

            if (quantidade > 1) {
                mensagemFinal += `  Quantidade: ${quantidade}.\n`;
            }

            // Listar os campos adicionais para este serviço
            Object.entries(servico.camposAdicionaisSelecionados).forEach(([campoNome, valor]) => {
                // Ignora campo de quantidade e valores vazios ou "Não"
                if (campoNome !== campoQuantidade?.nome && valor !== "" && valor !== "Não") {
                    const fieldConfig = servico.camposAdicionais?.find(f => f.nome === campoNome);
                    let valorFormatado = valor;
                    let precoCampo = 0;

                    if (fieldConfig?.tipo === 'select_com_preco' && typeof valor === 'string' && valor.includes(', R$ ')) {
                        const parts = valor.split(', R$ ');
                        valorFormatado = parts[0];
                        precoCampo = parseFloat(parts[1]);
                        mensagemFinal += `  ${campoNome}:\n    ${valorFormatado}.\n`; // Identado
                        mensagemFinal += `    Valor: R$ ${formatPrice(precoCampo)}.\n`; // Identado
                    } else if (typeof valor === 'number') {
                        mensagemFinal += `  ${campoNome}:\n    R$ ${formatPrice(valor)}.\n`; // Identado
                    } else {
                        mensagemFinal += `  ${campoNome}:\n    ${valor}.\n`; // Identado
                    }
                }
            });

            // Valor total do serviço
            const valorTotalServico = servico.precoCalculado || 0;
            mensagemFinal += `\n  *Valor Total do Serviço:* R$ ${formatPrice(valorTotalServico)}.\n\n`; // Adiciona linha em branco para separar os serviços
        });
    }
    // --- FIM da Lógica Inteligente ---

    mensagemFinal += `\n*💰 Orçamento Total:* ${total}\n`; // O total já vem formatado de orcamentoTotalDisplay
    mensagemFinal += `*💳 Forma de Pagamento:* ${formaPagamentoSelecionada}\n\n`;
    mensagemFinal += `Obrigado! 😊`;

    return mensagemFinal;
}

// Função auxiliar para formatar preços com vírgula nos centavos
function formatPrice(price) {
    if (typeof price !== 'number') return '0,00';
    return price.toFixed(2).replace('.', ',');
}
// --- MODIFICAÇÃO TERMINADA AQUI ---

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
