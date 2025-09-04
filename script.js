/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento/venda.
 * Versão: 12.0 (Integração de Produtos e Mensagens Dinâmicas)
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
let itensDisponiveis = {}; // NOVO: Objeto unificado para serviços e produtos
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
    loadServicesAndProducts(); // NOVO: Função unificada para carregar ambos
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

// NOVO: Função unificada para carregar serviços e produtos
function loadServicesAndProducts() {
    const servicosRef = ref(database, 'servicos');
    const produtosRef = ref(database, 'produtos');

    // Escuta mudanças em serviços
    onValue(servicosRef, (servicosSnapshot) => {
        let servicos = {};
        if (servicosSnapshot.exists()) {
            servicos = servicosSnapshot.val();
        }
        
        // Escuta mudanças em produtos e combina com serviços
        onValue(produtosRef, (produtosSnapshot) => {
            let produtos = {};
            if (produtosSnapshot.exists()) {
                produtos = produtosSnapshot.val();
            }

            // Combina ambos em um único objeto
            itensDisponiveis = {
                ...servicos,
                ...produtos
            };

            servicosContainer.innerHTML = '';
            const allItems = Object.entries(itensDisponiveis);
            if (allItems.length > 0) {
                allItems.forEach(([key, item]) => {
                    createItemCard(item, key);
                });
            } else {
                servicosContainer.innerHTML = '<p>Nenhum item disponível no momento. Por favor, volte mais tarde.</p>';
            }
            
            // Re-renderiza a seleção atual para evitar duplicidade
            servicosSelecionados.forEach(selectedItem => {
                const card = document.querySelector(`.service-card[data-key="${selectedItem.key}"]`);
                if (card) {
                    card.classList.add('selected');
                    card.querySelector('.btn-select-service').textContent = 'Remover';
                }
            });

            updateSelectedServicesCount();
        });
    });
}


// ==========================================================================
// 3. ETAPA 1: SELEÇÃO DE ITENS
// ==========================================================================

// NOVO: Função genérica para criar o cartão de um item (serviço ou produto)
function createItemCard(item, key) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.key = key;

    // Verifica se o item é um produto. Assume que produtos têm 'precoBase' ou 'precoUnitario'
    // Se ambos os tipos usarem 'precoBase', a distinção será pelo nome da coleta (servicos vs produtos)
    // O type será adicionado explicitamente ao item quando selecionado.
    const isProductLikely = item.hasOwnProperty('precoUnitario') || item.hasOwnProperty('preco'); 
    card.dataset.itemType = isProductLikely ? 'produto' : 'servico'; // Default: serviço

    card.innerHTML = `
        <h3>${item.nome}</h3>
        <p>${item.descricao}</p>
        <button class="btn btn-primary btn-select-service">Adicionar</button>
    `;
    
    card.querySelector('.btn-select-service').addEventListener('click', () => {
        // Adiciona o tipo de item explicitamente quando selecionado
        const selectedItem = { ...itensDisponiveis[key], key, type: card.dataset.itemType };
        const existingIndex = servicosSelecionados.findIndex(s => s.key === key);

        if (existingIndex === -1) {
            servicosSelecionados.push(selectedItem);
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
        renderItemForms(); // NOVO: Renderiza formulários para serviços e produtos
        updateProgressBar(2);
    } else {
        alert('Por favor, selecione pelo menos um item para continuar.');
    }
});

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS
// ==========================================================================

// NOVO: Função para renderizar formulários de serviços E produtos
function renderItemForms() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach(item => {
        const formGroup = document.createElement('div');
        formGroup.className = 'service-form-group';
        formGroup.dataset.key = item.key;
        // O tipo já está em item.type

        let fieldsHtml = '';
        if (item.camposAdicionais) {
            fieldsHtml = item.camposAdicionais.map(field => {
                if (field.tipo === 'select_com_preco' && field.opcoes) {
                    return `
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select" data-field-name="${field.nome}" data-key="${item.key}" required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'select_sem_preco' && field.opcoes) {
                    return `
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select-no-price" data-field-name="${field.nome}" data-key="${item.key}" required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'select_quantidade' && field.opcoes) {
                    return `
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-quantidade" data-field-name="${field.nome}" data-key="${item.key}" required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    `;
                } else if (field.tipo === 'text') {
                    return `
                        <label>${field.nome}</label>
                        <input type="text" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${item.key}" required>
                    `;
                } else if (field.tipo === 'number') {
                    return `
                        <label>${field.nome}</label>
                        <input type="number" class="form-control additional-field-input" data-field-name="${field.nome}" data-key="${item.key}" step="0.01" required>
                    `;
                } else if (field.tipo === 'textarea') {
                     return `
                        <label>${field.nome}</label>
                        <textarea class="form-control additional-field-textarea" data-field-name="${field.nome}" data-key="${item.key}" placeholder="Digite aqui..."></textarea>
                    `;
                }
            }).join('');
        }

        formGroup.innerHTML = `
            <h3>${item.nome}</h3>
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
    const item = servicosSelecionados.find(s => s.key === key);
    if (!item) return;

    const formGroup = e.target.closest('.service-form-group');
    const newPrice = calculatePrice(item, formGroup);
    item.precoCalculado = newPrice;
    formGroup.querySelector('.service-price').textContent = `Valor: R$ ${newPrice.toFixed(2)}`;
    updateOrcamentoTotal();
}

// LÓGICA DE PREÇO: Agora genérica para serviços e produtos
function calculatePrice(itemData, container) {
    let preco = itemData.precoBase || 0; // Utiliza precoBase como padrão
    
    // Processa campos de seleção com preço
    container.querySelectorAll('.additional-field-select').forEach(select => {
        const selectedValue = select.value;
        if (selectedValue) {
            const parts = selectedValue.split(', R$ ');
            if (parts.length === 2) {
                preco += parseFloat(parts[1]);
            }
        }
    });

    // Processa campos de número
    container.querySelectorAll('.additional-field-input[type="number"]').forEach(input => {
        const inputValue = parseFloat(input.value);
        if (!isNaN(inputValue)) {
            preco += inputValue;
        }
    });

    // Se houver um campo de quantidade, multiplica o valor total (preço base + adicionais)
    const quantidadeElement = container.querySelector('.additional-field-quantidade');
    if (quantidadeElement && quantidadeElement.value) {
        const quantidade = parseInt(quantidadeElement.value);
        // Valida se a quantidade é um número válido e maior que zero
        if (!isNaN(quantidade) && quantidade > 0) {
            return preco * quantidade;
        } else {
            // Se a quantidade for inválida, retorna o preço sem multiplicar
            return preco; 
        }
    }

    // Se não for um campo de quantidade, ou o valor for inválido, retorna o preço calculado
    return preco;
}


document.getElementById('nextStep2').addEventListener('click', () => {
    let allFieldsFilled = true;
    servicosSelecionados.forEach(item => {
        const formGroup = document.querySelector(`.service-form-group[data-key="${item.key}"]`);
        if (formGroup) {
            // Verifica apenas campos que são requeridos (required)
            formGroup.querySelectorAll('select[required], input[required], textarea[required]').forEach(field => {
                if (!field.value) {
                    allFieldsFilled = false;
                }
            });
        }
    });

    if (!allFieldsFilled) {
        alert("Por favor, preencha todos os campos obrigatórios para continuar.");
        return;
    }

    servicosSelecionados.forEach(item => {
        const formGroup = document.querySelector(`.service-form-group[data-key="${item.key}"]`);
        if (formGroup) {
            const selectedOptions = getSelectedOptions(formGroup);
            item.camposAdicionaisSelecionados = selectedOptions;
            item.precoCalculado = calculatePrice(item, formGroup); // Recalcula para garantir
        }
    });

    servicosFormSection.classList.add('hidden');
    clienteFormSection.classList.remove('hidden');
    updateProgressBar(3);
});

// A função getSelectedOptions agora é genérica para qualquer formulário
function getSelectedOptions(container) {
    const selectedOptions = {};
    // Pega todos os campos relevantes dentro do container do item específico
    const fields = container.querySelectorAll('.additional-field-select, .additional-field-select-no-price, .additional-field-quantidade, .additional-field-input, .additional-field-textarea');

    fields.forEach(field => {
        const fieldName = field.dataset.fieldName;
        const fieldValue = field.value;
        if (fieldValue) { // Armazena apenas se houver valor
            selectedOptions[fieldName] = fieldValue;
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
    
    // NOVO: Verifica se há algum serviço selecionado antes de ir para a tela de agendamento
    const hasService = servicosSelecionados.some(item => item.type === 'servico');
    const isOnlyProducts = servicosSelecionados.every(item => item.type === 'produto'); // Verifica se SÃO APENAS produtos

    if (hasService) { // Se houver pelo menos um serviço, prossegue para agendamento
        clienteFormSection.classList.add('hidden');
        agendamentoSection.classList.remove('hidden');
        updateProgressBar(4);
    } else if (isOnlyProducts) { // Se forem APENAS produtos, pula o agendamento e vai direto para a confirmação/venda
         handleFormSubmit({preventDefault: () => {}}); // Chama o submit direto para processar a venda
    } else {
         // Cenário inesperado, caso haja uma mistura não tratada explicitamente
         alert('Ocorreu um erro no fluxo. Por favor, recarregue a página ou tente novamente.');
    }
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
    // Validação inicial para garantir que temos as configurações de horário
    if (!configGlobais.horariosPorDia) {
        timeSlotsContainer.innerHTML = '<p>Carregando configurações. Por favor, aguarde e selecione a data novamente.</p>';
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
    const dataAgendamento = new Date(selectedDate + 'T00:00:00'); // Garante que a comparação seja feita a partir da meia-noite

    // --- Validações de Data ---
    if (dataAgendamento < dataAtual) {
        timeSlotsContainer.innerHTML = '<p>Não é possível agendar para uma data que já passou.</p>';
        return;
    }

    // Verifica se é o dia atual e se o horário limite para agendamento já passou
    if (dataAgendamento.getTime() === dataAtual.getTime()) {
        if (hoje.getHours() >= 14) { // Exemplo: Limite às 14:00
            timeSlotsContainer.innerHTML = '<p>Agendamentos para o dia de hoje só são permitidos até as 14:00. Por favor, selecione uma data futura.</p>';
            return;
        }
    }
    // --- Fim das Validações de Data ---

    const [year, month, day] = selectedDate.split('-');
    const dayOfWeek = getDayOfWeek(selectedDate);

    const diaConfig = configGlobais.horariosPorDia[dayOfWeek];
    // Verifica se o dia da semana está configurado e ativo
    if (!diaConfig || !diaConfig.ativo) {
        timeSlotsContainer.innerHTML = `<p>Não há agendamentos disponíveis para ${capitalize(dayOfWeek)}.</p>`;
        return;
    }

    const { horarioInicio, horarioFim, duracaoServico } = diaConfig;
    const agendamentosRef = ref(database, 'agendamentos');
    const snapshot = await get(agendamentosRef);
    const agendamentosDoDia = [];

    // Busca agendamentos existentes para o dia selecionado
    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const agendamento = childSnapshot.val();
            const firebaseDate = `${day}/${month}/${year}`; // Formato esperado no DB
            // Considera apenas agendamentos que não foram cancelados
            if (agendamento.data === firebaseDate && agendamento.status !== 'Cancelado') {
                agendamentosDoDia.push(agendamento.hora);
            }
        });
    }

    // Gera os horários disponíveis, considerando os agendamentos já feitos e o horário atual (se for o mesmo dia)
    const horariosDisponiveis = generateTimeSlots(horarioInicio, horarioFim, duracaoServico, agendamentosDoDia, dataAgendamento.getTime() === dataAtual.getTime() ? hoje : null);
    displayTimeSlots(horariosDisponiveis);
}

function generateTimeSlots(startTime, endTime, interval, existingAppointments, referenceTime) {
    const slots = [];
    // Inicializa o horário atual com base no horário de início configurado
    let currentTime = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`); // Horário de fim para a geração de slots

    while (currentTime < end) {
        const timeString = currentTime.toTimeString().slice(0, 5); // Formato HH:MM

        // Se for o mesmo dia do agendamento, verifica se o horário do slot é anterior ao horário atual
        if (referenceTime) {
             const [slotHour, slotMinute] = timeString.split(':').map(Number);
             if (slotHour < referenceTime.getHours() || (slotHour === referenceTime.getHours() && slotMinute < referenceTime.getMinutes())) {
                currentTime.setMinutes(currentTime.getMinutes() + interval); // Avança para o próximo slot
                continue; // Pula este slot
            }
        }

        // Adiciona o slot apenas se ele não estiver na lista de agendamentos existentes
        if (!existingAppointments.includes(timeString)) {
            slots.push(timeString);
        }

        currentTime.setMinutes(currentTime.getMinutes() + interval); // Avança para o próximo intervalo
    }
    return slots;
}

function displayTimeSlots(horariosDisponiveis) {
    if (horariosDisponiveis.length === 0) {
        timeSlotsContainer.innerHTML = '<p>Não há horários disponíveis para a data selecionada. Por favor, escolha outro dia.</p>';
        return;
    }

    timeSlotsContainer.innerHTML = ''; // Limpa o container antes de adicionar novos slots
    horariosDisponiveis.forEach(time => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = time;
        slot.addEventListener('click', () => selectTimeSlot(slot)); // Adiciona listener para seleção
        timeSlotsContainer.appendChild(slot);
    });
}

function selectTimeSlot(selectedSlot) {
    // Remove a classe 'selected' de todos os outros slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    // Adiciona a classe 'selected' ao slot clicado
    selectedSlot.classList.add('selected');
}

// LÓGICA DE SUBMISSÃO: Agora lida com agendamentos e vendas
async function handleFormSubmit(e) {
    if(e) e.preventDefault(); // Previne o comportamento padrão do formulário, se for um evento

    // Verifica conexão com a internet
    if (!navigator.onLine) {
        alert("Parece que você está sem conexão com a internet. Verifique sua conexão e tente novamente.");
        return;
    }
    
    // Filtra os itens selecionados por tipo (serviço ou produto)
    const servicosParaAgendamento = servicosSelecionados.filter(item => item.type === 'servico');
    const produtosParaVenda = servicosSelecionados.filter(item => item.type === 'produto');
    
    const hasService = servicosParaAgendamento.length > 0;
    const hasProduct = produtosParaVenda.length > 0;
    
    // Prepara os dados básicos para o registro no Firebase
    let agendamentoData = {
        cliente: {
            nome: document.getElementById('nome').value,
            telefone: document.getElementById('telefone').value,
            endereco: document.getElementById('endereco').value,
        },
        // Define data/hora como não aplicável se não houver serviços, mas mantém a estrutura
        data: hasService ? formatDate(datePicker.value) : 'Não aplicável',
        hora: hasService ? document.querySelector('.time-slot.selected')?.textContent : 'Não aplicável',
        observacoes: document.getElementById('observacoes').value,
        orcamentoTotal: servicosSelecionados.reduce((sum, s) => sum + (s.precoCalculado || 0), 0), // Soma os preços calculados de todos os itens
        formaPagamento: formaPagamentoSelecionada,
        status: 'Pendente' // Status inicial do pedido
    };

    // Validações específicas antes de salvar
    if (hasService && !agendamentoData.hora) { // Se houver serviço, a hora é obrigatória
        alert("Por favor, selecione um horário para o agendamento.");
        return;
    }
    
    if (!agendamentoData.formaPagamento) { // Forma de pagamento é obrigatória para qualquer tipo de transação
        alert("Por favor, selecione uma forma de pagamento.");
        return;
    }
    
    // Mapeia os detalhes de cada item (serviço ou produto) para o registro no Firebase
    agendamentoData.itens = servicosSelecionados.map(({ key, nome, precoCalculado, camposAdicionaisSelecionados, type }) => ({
        key, // ID do serviço/produto original
        nome,
        precoCalculado,
        camposAdicionaisSelecionados, // Detalhes das opções selecionadas pelo cliente
        type // 'servico' ou 'produto'
    }));

    try {
        const agendamentosRef = ref(database, 'agendamentos'); // Referência para a coleção de agendamentos/pedidos
        await push(agendamentosRef, agendamentoData); // Salva os dados no Firebase
        showConfirmation(); // Mostra a tela de confirmação
    } catch (error) {
        console.error("Erro ao salvar agendamento/pedido:", error);
        alert("Ocorreu um erro ao salvar seu pedido. Por favor, tente novamente.");
    }
}

function showConfirmation() {
    // Oculta as seções anteriores
    agendamentoSection.classList.add('hidden');
    clienteFormSection.classList.add('hidden'); 
    confirmationPopup.classList.remove('hidden'); // Mostra o pop-up de confirmação
    updateProgressBar(4); // Avança a barra de progresso para o último passo

    // Gera a mensagem para o WhatsApp e configura o link
    const whatsappMsg = createWhatsAppMessage();
    whatsappLink.href = `https://wa.me/${configGlobais.whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;

    // Adiciona um listener para, após o clique no WhatsApp, redirecionar para a página inicial após um pequeno delay
    whatsappLink.addEventListener('click', () => {
        setTimeout(() => {
            window.location.href = 'index.html'; // Redireciona para a página principal
        }, 500); // Pequeno delay para permitir a ação do link do WhatsApp
    });
}

// LÓGICA DA MENSAGEM DO WHATSAPP: Agora inteligente para serviços e/ou produtos
function createWhatsAppMessage() {
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const endereco = document.getElementById('endereco').value;
    const observacoes = document.getElementById('observacoes').value;
    const total = orcamentoTotalDisplay.textContent;

    // Verifica a presença de serviços e produtos no pedido atual
    const hasService = servicosSelecionados.some(item => item.type === 'servico');
    const hasProduct = servicosSelecionados.some(item => item.type === 'produto');

    const data = hasService ? formatDate(datePicker.value) : ''; // Formata a data se houver serviço
    const hora = hasService ? document.querySelector('.time-slot.selected')?.textContent : ''; // Pega a hora selecionada se houver serviço

    // Define o início da mensagem com base no tipo de pedido
    let mensagemFinal = `Olá, gostaria de confirmar um ${hasService ? (hasProduct ? 'agendamento e compra' : 'agendamento') : 'compra'}.`;

    // Adiciona os dados do cliente
    mensagemFinal += `
    \n\n*👤 Dados do Cliente:*
    Nome: ${nome}
    Telefone: ${telefone}
    Endereço: ${endereco}`;

    // Adiciona os detalhes do agendamento, apenas se houver serviços
    if (hasService) {
        mensagemFinal += `
    \n\n*📅 Detalhes do Agendamento:*
    Data: ${data}
    Hora: ${hora}`;
    }

    // Lista de Itens (Serviços e/ou Produtos)
    let itensTexto = '\n\n*📝 Detalhes do Pedido:*\n';
    servicosSelecionados.forEach(item => {
        const itemTypeLabel = item.type === 'servico' ? 'Serviço' : 'Produto';
        // Formata o preço calculado para exibição clara
        const precoFormatado = item.precoCalculado !== undefined && item.precoCalculado !== null ? `R$ ${item.precoCalculado.toFixed(2)}` : 'R$ 0,00';
        itensTexto += `  - *${item.nome}* (${itemTypeLabel}): ${precoFormatado}\n`;
        
        // Detalha os campos adicionais selecionados, se houver
        if (item.camposAdicionaisSelecionados) {
            for (const campo in item.camposAdicionaisSelecionados) {
                const valor = item.camposAdicionaisSelecionados[campo];
                let subDetalhe = `    - ${campo}: ${valor}`;
                // Formata opções que incluem preço (ex: "Opção, R$ Valor")
                if (typeof valor === 'string' && valor.includes(', R$ ')) {
                    const [descricao, preco] = valor.split(', R$ ');
                    subDetalhe = `    - ${campo}: ${descricao} (R$ ${preco})`;
                }
                itensTexto += subDetalhe + '\n';
            }
        }
    });

    mensagemFinal += itensTexto;

    // Adiciona o resumo do pagamento
    mensagemFinal += `
    \n*💰 Orçamento Total: ${total}*
    *💳 Forma de Pagamento: ${formaPagamentoSelecionada}`;
    
    // Adiciona observações se houver
    if (observacoes) {
        mensagemFinal += `
    \n\n*📝 Observações:* ${observacoes}`;
    }

    return mensagemFinal;
}

// ==========================================================================
// 7. NAVEGAÇÃO E FUNÇÕES AUXILIARES
// ==========================================================================

function setupEventListeners() {
    datePicker.addEventListener('change', handleDateSelection); // Listener para seleção de data
    agendamentoForm.addEventListener('submit', handleFormSubmit); // Listener para submissão do formulário principal

    // Listeners para os botões de voltar
    backButton1.addEventListener('click', () => {
        servicosFormSection.classList.add('hidden');
        servicosSection.classList.remove('hidden');
        updateProgressBar(1); // Volta para a Etapa 1
    });

    backButton2.addEventListener('click', () => {
        clienteFormSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        updateProgressBar(2); // Volta para a Etapa 2
    });

    backButton3.addEventListener('click', () => {
        agendamentoSection.classList.add('hidden');
        clienteFormSection.classList.remove('hidden');
        updateProgressBar(3); // Volta para a Etapa 3
    });
}

function updateProgressBar(step) {
    // Atualiza a visualização da barra de progresso
    progressSteps.forEach((s, index) => {
        if (index + 1 === step) {
            s.classList.add('active'); // Marca o passo atual como ativo
        } else {
            s.classList.remove('active'); // Remove a classe ativa dos outros passos
        }
    });
}

function updateOrcamentoTotal() {
    // Calcula o orçamento total somando os preços calculados de todos os itens selecionados
    const total = servicosSelecionados.reduce((sum, item) => sum + (item.precoCalculado || 0), 0);
    orcamentoTotalDisplay.textContent = `R$ ${total.toFixed(2)}`; // Exibe o total formatado
}

function formatDate(dateString) {
    // Formata a data de YYYY-MM-DD para DD/MM/YYYY
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function getDayOfWeek(dateString) {
    // Retorna o nome do dia da semana em português a partir de uma string de data
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const date = new Date(dateString + 'T00:00:00'); // Garante que a data seja interpretada corretamente
    return days[date.getDay()];
}

function capitalize(s) {
    // Capitaliza a primeira letra de uma string
    if (typeof s !== 'string') return ''; // Retorna string vazia se a entrada não for string
    return s.charAt(0).toUpperCase() + s.slice(1);
}
