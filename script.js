/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 14.0 (Versão Final - Correções e Melhorias)
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
const promocoesContainer = document.getElementById('promocoesContainer');
const servicosSection = document.getElementById('servicos');
const servicosFormSection = document.getElementById('servicosForm');
const clienteFormSection = document.getElementById('clienteForm');
const pagamentoFormSection = document.getElementById('pagamentoForm');
const agendamentoSection = document.getElementById('agendamento');
const servicosFormContainer = document.getElementById('servicosFormContainer');
const pagamentoContainer = document.getElementById('pagamentoContainer');
const agendamentoForm = document.getElementById('agendamentoForm');
const orcamentoTotalDisplay = document.getElementById('orcamentoTotal');
const backButton1 = document.getElementById('backButton1');
const backButton2 = document.getElementById('backButton2');
const backButton3 = document.getElementById('backButton3');
const backButton4 = document.getElementById('backButton4');
const confirmationPopup = document.getElementById('confirmation');
const whatsappLink = document.getElementById('whatsappLink');
const progressSteps = document.querySelectorAll('.progress-step');
const datePicker = document.getElementById('datePicker');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');
const telefoneInput = document.getElementById('telefone');
const selectedServicesCount = document.getElementById('selectedServicesCount');
const nextStep1Btn = document.getElementById('nextStep1');

// Dados do Agendamento
let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};
let promocoesGlobais = {};
let formaPagamentoSelecionada = null;

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
    await loadPromotions();
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

async function loadPromotions() {
    try {
        const promocoesRef = ref(database, 'promocoes');
        const snapshot = await get(promocoesRef);
        if (snapshot.exists()) {
            promocoesGlobais = snapshot.val();
            renderPromotions();
        }
    } catch (error) {
        console.error("Erro ao carregar promoções:", error);
    }
}

function renderPromotions() {
    promocoesContainer.innerHTML = '';
    const hoje = new Date();
    let promoFound = false;

    for (const key in promocoesGlobais) {
        const promo = promocoesGlobais[key];
        const dataInicio = new Date(promo.dataInicio + 'T00:00:00');
        const dataFim = new Date(promo.dataFim + 'T23:59:59');

        if (hoje >= dataInicio && hoje <= dataFim) {
            const promoWrapper = document.createElement('div');
            promoWrapper.className = 'promotions-banner';
            // NOVO: Adiciona o ID do serviço para identificar o link
            promoWrapper.dataset.servicoId = promo.servicoId;
            promoWrapper.innerHTML = `🔥 **PROMOÇÃO!** ${promo.nome} - Válido até ${formatDate(promo.dataFim)} 🔥`;
            
            // NOVO: Adiciona o evento de clique ao banner de promoção
            promoWrapper.addEventListener('click', () => {
                const serviceKey = promoWrapper.dataset.servicoId;
                if (servicosGlobais[serviceKey]) {
                    const selectedService = { ...servicosGlobais[serviceKey], key: serviceKey };
                    servicosSelecionados = [selectedService]; // Seleciona apenas o serviço da promoção
                    updateSelectedServicesCount();
                    nextStep1Btn.click(); // Simula o clique no botão "Próximo"
                } else {
                    alert('O serviço desta promoção não está mais disponível.');
                }
            });

            promocoesContainer.appendChild(promoWrapper);
            promoFound = true;
        }
    }

    if (!promoFound) {
        promocoesContainer.style.display = 'none';
    } else {
         promocoesContainer.style.display = 'block';
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
        if (servicosSelecionados.length > 0) {
            nextStep1Btn.style.display = 'block';
        } else {
            nextStep1Btn.style.display = 'none';
        }
    });

    servicosContainer.appendChild(card);
}

function updateSelectedServicesCount() {
    selectedServicesCount.textContent = servicosSelecionados.length;
}

nextStep1Btn.addEventListener('click', () => {
    if (servicosSelecionados.length > 0) {
        servicosSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        renderServiceBlocks();
        updateProgressBar(2);
    } else {
        alert('Por favor, selecione pelo menos um serviço para continuar.');
    }
});

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS (SISTEMA DE BLOCOS)
// ==========================================================================

function renderServiceBlocks() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach(service => {
        const serviceBlockContainer = document.createElement('div');
        serviceBlockContainer.className = 'service-block-container';
        
        serviceBlockContainer.innerHTML = `
            <h3>${service.nome}</h3>
            <p>Valor Base: R$ ${service.precoBase.toFixed(2)}</p>
        `;

        if (service.conteudoDinamico && service.conteudoDinamico.length > 0) {
            service.conteudoDinamico.forEach(block => {
                const blockElement = document.createElement('div');
                blockElement.className = 'content-block';
                
                if (block.tipo === 'titulo') {
                    const h4 = document.createElement('h4');
                    h4.textContent = block.conteudo;
                    blockElement.appendChild(h4);
                } else if (block.tipo === 'paragrafo') {
                    const p = document.createElement('p');
                    p.textContent = block.conteudo;
                    blockElement.appendChild(p);
                } else if (block.tipo === 'imagem') {
                    const img = document.createElement('img');
                    img.src = `imagens/${block.conteudo}`;
                    img.alt = block.conteudo;
                    blockElement.appendChild(img);
                } else if (block.tipo === 'campo') {
                    const field = block.conteudo;
                    let inputHtml = '';
                    if (field.tipo === 'select' && field.opcoes) {
                        // CORRIGIDO: Agora acessa corretamente o nome da opção
                        inputHtml = `
                            <label>${field.nome}</label>
                            <select class="form-control dynamic-field-select" data-field-name="${field.nome}" data-key="${service.key}" required>
                                <option value="">Selecione...</option>
                                ${field.opcoes.map(option => `<option value="${option.nome}">${option.nome} (R$ ${option.precoAdicional.toFixed(2)})</option>`).join('')}
                            </select>
                        `;
                    } else if (field.tipo === 'text') {
                        inputHtml = `
                            <label>${field.nome}</label>
                            <input type="text" class="form-control dynamic-field-input" data-field-name="${field.nome}" data-key="${service.key}" required>
                        `;
                    } else if (field.tipo === 'number') {
                        inputHtml = `
                            <label>${field.nome}</label>
                            <input type="number" class="form-control dynamic-field-input" data-field-name="${field.nome}" data-key="${service.key}" step="0.01" required>
                        `;
                    } else if (field.tipo === 'textarea') {
                        inputHtml = `
                            <label>${field.nome}</label>
                            <textarea class="form-control dynamic-field-textarea" data-field-name="${field.nome}" data-key="${service.key}" placeholder="Digite aqui..."></textarea>
                        `;
                    }
                    blockElement.innerHTML = inputHtml;
                }
                serviceBlockContainer.appendChild(blockElement);
            });
        }
        servicosFormContainer.appendChild(serviceBlockContainer);
    });

    document.querySelectorAll('.dynamic-field-select, .dynamic-field-input, .dynamic-field-textarea').forEach(field => {
        field.addEventListener('change', updatePrice);
        field.addEventListener('input', updatePrice);
    });

    updateOrcamentoTotal();
}

function updatePrice(e) {
    const key = e.target.dataset.key;
    const service = servicosSelecionados.find(s => s.key === key);
    if (!service) return;

    const serviceBlockContainer = e.target.closest('.service-block-container');
    const newPrice = calculatePrice(service, serviceBlockContainer);
    service.precoCalculado = newPrice;
    updateOrcamentoTotal();
}

function calculatePrice(serviceData, container) {
    let preco = serviceData.precoBase || 0;
    
    // Procura por uma promoção ativa para o serviço
    let desconto = 0;
    const hoje = new Date();
    for (const key in promocoesGlobais) {
        const promo = promocoesGlobais[key];
        const dataInicio = new Date(promo.dataInicio + 'T00:00:00');
        const dataFim = new Date(promo.dataFim + 'T23:59:59');
        if (promo.servicoId === serviceData.key && hoje >= dataInicio && hoje <= dataFim) {
            if (promo.tipoDesconto === 'percentual') {
                desconto = preco * (promo.valorDesconto / 100);
            } else if (promo.tipoDesconto === 'fixo') {
                desconto = promo.valorDesconto;
            }
            break;
        }
    }

    const selectElements = container.querySelectorAll('.dynamic-field-select');
    const inputElements = container.querySelectorAll('.dynamic-field-input');
    
    // CORRIGIDO: Agora calcula o preço a partir do nome da opção e não do objeto inteiro
    selectElements.forEach(select => {
        const selectedValue = select.value;
        const fieldData = serviceData.conteudoDinamico.find(b => b.tipo === 'campo' && b.conteudo.nome === select.dataset.fieldName);
        
        // Procura a opção pelo nome
        const selectedOption = fieldData.conteudo.opcoes.find(o => o.nome === selectedValue);
        if (selectedOption) {
            preco += selectedOption.precoAdicional;
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
    
    return preco - desconto;
}

document.getElementById('nextStep2').addEventListener('click', () => {
    let allFieldsFilled = true;
    servicosSelecionados.forEach(service => {
        const formGroup = document.querySelector(`.service-block-container [data-key="${service.key}"]`)?.closest('.service-block-container');
        if (formGroup) {
            formGroup.querySelectorAll('.dynamic-field-select, .dynamic-field-input').forEach(field => {
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
        const formGroup = document.querySelector(`.service-block-container [data-key="${service.key}"]`)?.closest('.service-block-container');
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
    const selectElements = container.querySelectorAll('.dynamic-field-select');
    const inputElements = container.querySelectorAll('.dynamic-field-input');
    const textareaElements = container.querySelectorAll('.dynamic-field-textarea');
    
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
// 5. ETAPA 3: INFORMAÇÕES DO CLIENTE
// ==========================================================================

function setupPhoneMask() {
    telefoneInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/\D/g, '');
        let maskedValue = '';

        if (value.length > 0) maskedValue += `(${value.substring(0, 2)}`;
        if (value.length > 2) maskedValue += `) ${value.substring(2, 7)}`;
        if (value.length > 7) maskedValue += `-${value.substring(7, 11)}`;
        
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

    renderPaymentOptions();
    clienteFormSection.classList.add('hidden');
    pagamentoFormSection.classList.remove('hidden');
    updateProgressBar(4);
});

// ==========================================================================
// 6. ETAPA 4: SELEÇÃO DE PAGAMENTO
// ==========================================================================

function renderPaymentOptions() {
    pagamentoContainer.innerHTML = '';
    const formas = configGlobais.formasPagamento || [];
    if (formas.length === 0) {
        pagamentoContainer.innerHTML = '<p>Nenhuma forma de pagamento disponível. Por favor, entre em contato.</p>';
    }

    formas.forEach(forma => {
        const option = document.createElement('div');
        option.className = 'pagamento-option';
        option.textContent = forma;
        option.addEventListener('click', () => {
            selectPaymentOption(option);
            formaPagamentoSelecionada = forma;
        });
        pagamentoContainer.appendChild(option);
    });
}

function selectPaymentOption(selectedOption) {
    document.querySelectorAll('.pagamento-option').forEach(option => {
        option.classList.remove('selected');
    });
    selectedOption.classList.add('selected');
}

document.getElementById('nextStep4').addEventListener('click', () => {
    if (!formaPagamentoSelecionada) {
        alert("Por favor, selecione uma forma de pagamento.");
        return;
    }
    pagamentoFormSection.classList.add('hidden');
    agendamentoSection.classList.remove('hidden');
    updateProgressBar(5);
});

// ==========================================================================
// 7. ETAPA 5: AGENDAMENTO E FINALIZAÇÃO
// ==========================================================================

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
        formaPagamento: formaPagamentoSelecionada,
        data: formatDate(datePicker.value),
        hora: selectedTimeSlot.textContent,
        observacoes: document.getElementById('observacoes').value,
        orcamentoTotal: servicosSelecionados.reduce((sum, s) => sum + (s.precoCalculado || 0), 0),
        status: 'Pendente'
    };

    try {
        const agendamentosRef = ref(database, 'agendamentos');
        await push(agendamentosRef, agendamentoData);
        showConfirmation(agendamentoData);
    } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
        alert("Ocorreu um erro ao salvar o agendamento. Por favor, tente novamente.");
    }
}

function showConfirmation(agendamentoData) {
    agendamentoSection.classList.add('hidden');
    confirmationPopup.classList.remove('hidden');
    updateProgressBar(6); // Novo passo final
    
    const whatsappMsg = createWhatsAppMessage(agendamentoData);
    whatsappLink.href = `https://wa.me/${configGlobais.whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;
    
    whatsappLink.addEventListener('click', () => {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    });
}

function createWhatsAppMessage(agendamento) {
    let msg = configGlobais.whatsappTemplate || `Olá, gostaria de confirmar um agendamento.
    
    *👤 Dados do Cliente:*
    Nome: {{nome_cliente}}
    Telefone: {{telefone_cliente}}
    Endereço: {{endereco_cliente}}
    
    *📅 Detalhes do Agendamento:*
    Data: {{data_agendamento}}
    Hora: {{hora_agendamento}}
    
    *🛠️ Serviços:*
    {{servicos_selecionados}}
    
    *💰 Orçamento Total:* {{orcamento_total}}
    Forma de Pagamento: {{forma_pagamento}}
    
    {{observacoes_cliente}}
    `;

    msg = msg.replace(/{{nome_cliente}}/g, agendamento.cliente.nome);
    msg = msg.replace(/{{telefone_cliente}}/g, agendamento.cliente.telefone);
    // NOVO: Condição para não exibir o campo Endereço se estiver vazio
    msg = msg.replace(/{{endereco_cliente}}/g, agendamento.cliente.endereco ? agendamento.cliente.endereco : 'Não informado');
    msg = msg.replace(/{{data_agendamento}}/g, agendamento.data);
    msg = msg.replace(/{{hora_agendamento}}/g, agendamento.hora);
    msg = msg.replace(/{{orcamento_total}}/g, `R$ ${agendamento.orcamentoTotal.toFixed(2)}`);
    msg = msg.replace(/{{forma_pagamento}}/g, agendamento.formaPagamento);
    
    let servicosTexto = '';
    agendamento.servicos.forEach(servico => {
        servicosTexto += `- ${servico.nome}: R$ ${servico.precoCalculado.toFixed(2)}\n`;
        // NOVO: Adiciona os campos adicionais apenas se existirem
        if (servico.camposAdicionaisSelecionados) {
            for (const campo in servico.camposAdicionaisSelecionados) {
                const valor = servico.camposAdicionaisSelecionados[campo];
                if (valor) { // NÃO MOSTRA SE O VALOR FOR VAZIO
                    servicosTexto += `  - ${campo}: ${typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : valor}\n`;
                }
            }
        }
    });
    msg = msg.replace(/{{servicos_selecionados}}/g, servicosTexto);

    // NOVO: Condição para não exibir o campo de Observações se estiver vazio
    const obsText = agendamento.observacoes ? `\n*📝 Observações:* ${agendamento.observacoes}` : '';
    msg = msg.replace(/{{observacoes_cliente}}/g, obsText);

    return msg;
}

// ==========================================================================
// 8. NAVEGAÇÃO E FUNÇÕES AUXILIARES
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
        pagamentoFormSection.classList.add('hidden');
        clienteFormSection.classList.remove('hidden');
        updateProgressBar(3);
    });

    backButton4.addEventListener('click', () => {
        agendamentoSection.classList.add('hidden');
        pagamentoFormSection.classList.remove('hidden');
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
