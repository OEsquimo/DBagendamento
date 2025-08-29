/*
 * Arquivo: script.js
 * Descrição: Lógica principal do formulário de agendamento do cliente.
 * Versão: 3.0 (Com funcionalidade de agendamento por dia da semana)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ==========================================================================

// Configuração do Firebase
// ATENÇÃO: Substitua os dados abaixo pelos dados do seu projeto no Firebase Console

// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);




// Variáveis de estado global
let currentStep = 1; // Controla o passo atual do formulário
let cart = []; // O "carrinho de compras" que armazena os serviços selecionados
let allServicesData = {}; // Armazena todos os dados dos serviços carregados do Firebase
let systemConfig = {}; // Armazena as configurações do sistema (horários, número do WhatsApp, etc.)

// Elementos HTML
const form = document.getElementById('agendamentoForm');
const steps = document.querySelectorAll('.form-step');
const stepIndicators = document.querySelectorAll('.step-indicator');
const servicosList = document.getElementById('servicosList');
const dynamicFieldsContainer = document.getElementById('dynamicFieldsContainer');
const resumoServicosList = document.getElementById('resumoServicosList');
const orcamentoValorInput = document.getElementById('orcamentoValor');
const agendamentoDataInput = document.getElementById('agendamentoData');
const agendamentoHoraSelect = document.getElementById('agendamentoHora');
const resumoAgendamentoDiv = document.getElementById('resumoAgendamento');
const whatsappLinkBtn = document.getElementById('whatsappLink');

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E DADOS
// ==========================================================================

/**
 * Função principal que inicia a aplicação.
 * Carrega a configuração do sistema e os serviços do Firebase.
 */
async function initApp() {
    await loadConfig();
    await loadServices();
    setupEventListeners();
    updateUI();
}

/**
 * Carrega as configurações do sistema do Firebase (WhatsApp, horários, etc.).
 */
async function loadConfig() {
    try {
        const configRef = ref(database, 'configuracoes');
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
            systemConfig = snapshot.val();
            // Atualiza o link do WhatsApp no cabeçalho
            if (systemConfig.whatsappNumber) {
                whatsappLinkBtn.href = `https://wa.me/${systemConfig.whatsappNumber.replace(/\D/g, '')}`;
            }
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

/**
 * Carrega todos os serviços do Firebase e os renderiza na tela.
 */
async function loadServices() {
    const servicosRef = ref(database, 'servicos');
    const servicosLoader = servicosList.querySelector('.loading-state');

    try {
        const snapshot = await get(servicosRef);
        if (snapshot.exists()) {
            const servicos = snapshot.val();
            allServicesData = servicos; // Armazena todos os serviços para uso posterior
            servicosList.innerHTML = ''; // Limpa o estado de carregamento
            
            // Renderiza cada serviço como um card clicável
            for (const key in servicos) {
                const service = servicos[key];
                const card = document.createElement('div');
                card.className = 'service-card';
                card.dataset.serviceKey = key;
                card.innerHTML = `
                    <i class="fas fa-tools"></i>
                    <h3>${service.nome}</h3>
                    <p>R$ ${parseFloat(service.precoBase).toFixed(2)}</p>
                `;
                card.addEventListener('click', () => toggleServiceSelection(key, service));
                servicosList.appendChild(card);
            }
        } else {
            servicosList.innerHTML = '<p class="loading-state">Nenhum serviço disponível.</p>';
        }
    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        servicosList.innerHTML = '<p class="loading-state">Erro ao carregar serviços.</p>';
    }
}

// ==========================================================================
// 3. LÓGICA DO CARRINHO DE COMPRAS E ORÇAMENTO
// ==========================================================================

/**
 * Adiciona ou remove um serviço do carrinho.
 * @param {string} key - A chave única do serviço no Firebase.
 * @param {object} service - O objeto do serviço.
 */
function toggleServiceSelection(key, service) {
    const index = cart.findIndex(item => item.key === key);
    const card = document.querySelector(`[data-service-key="${key}"]`);
    
    if (index === -1) {
        // Adiciona o serviço ao carrinho
        cart.push({ key, ...service, camposAdicionaisSelecionados: {} });
        card.classList.add('selected');
    } else {
        // Remove o serviço do carrinho
        cart.splice(index, 1);
        card.classList.remove('selected');
    }

    updateSummary(); // Atualiza o resumo do orçamento
}

/**
 * Gera e renderiza os campos adicionais para os serviços no carrinho.
 */
function renderDynamicFields() {
    dynamicFieldsContainer.innerHTML = ''; // Limpa a seção
    if (cart.length === 0) {
        dynamicFieldsContainer.innerHTML = '<p>Selecione um serviço para ver os detalhes.</p>';
        return;
    }

    cart.forEach(service => {
        const serviceDiv = document.createElement('div');
        serviceDiv.className = 'service-dynamic-fields mt-3';
        serviceDiv.innerHTML = `<h4>Detalhes para: ${service.nome}</h4>`;
        
        // Verifica se o serviço tem campos adicionais
        if (service.camposAdicionais && service.camposAdicionais.length > 0) {
            service.camposAdicionais.forEach(field => {
                const fieldGroup = document.createElement('div');
                fieldGroup.className = 'form-group';
                
                if (field.tipo === 'text') {
                    fieldGroup.innerHTML = `
                        <label for="field-${service.key}-${field.nome}">${field.nome}</label>
                        <input type="text" id="field-${service.key}-${field.nome}" class="form-control dynamic-field" data-service-key="${service.key}" data-field-name="${field.nome}" required>
                    `;
                } else if (field.tipo === 'select') {
                    let optionsHtml = field.opcoes.map(option => {
                        const [text, priceStr] = option.split(', R$ ');
                        return `<option value="${priceStr}">${text} (R$ ${priceStr})</option>`;
                    }).join('');
                    
                    fieldGroup.innerHTML = `
                        <label for="field-${service.key}-${field.nome}">${field.nome}</label>
                        <select id="field-${service.key}-${field.nome}" class="form-control dynamic-field" data-service-key="${service.key}" data-field-name="${field.nome}" required>
                            <option value="" disabled selected>Selecione uma opção</option>
                            ${optionsHtml}
                        </select>
                    `;
                }
                
                fieldGroup.querySelector('.dynamic-field').addEventListener('change', (e) => {
                    // Salva a seleção do usuário e recalcula o orçamento
                    const selectedService = cart.find(s => s.key === service.key);
                    selectedService.camposAdicionaisSelecionados[field.nome] = e.target.value;
                    updateSummary();
                });
                
                serviceDiv.appendChild(fieldGroup);
            });
        } else {
            serviceDiv.innerHTML += '<p>Não há campos adicionais para este serviço.</p>';
        }
        
        dynamicFieldsContainer.appendChild(serviceDiv);
    });
}

/**
 * Calcula o valor total do orçamento com base nos serviços e campos adicionais selecionados.
 */
function calculateOrcamento() {
    let total = 0;
    cart.forEach(service => {
        total += parseFloat(service.precoBase);
        
        // Adiciona o valor dos campos adicionais
        for (const fieldName in service.camposAdicionaisSelecionados) {
            const value = parseFloat(service.camposAdicionaisSelecionados[fieldName]);
            if (!isNaN(value)) {
                total += value;
            }
        }
    });
    return total;
}

/**
 * Atualiza o resumo do orçamento na interface.
 */
function updateSummary() {
    resumoServicosList.innerHTML = ''; // Limpa a lista
    
    if (cart.length === 0) {
        resumoServicosList.innerHTML = '<li>Nenhum serviço selecionado.</li>';
    } else {
        cart.forEach(service => {
            const serviceItem = document.createElement('li');
            
            // Calcula o preço total do serviço individual
            let serviceTotal = parseFloat(service.precoBase);
            for (const fieldName in service.camposAdicionaisSelecionados) {
                const value = parseFloat(service.camposAdicionaisSelecionados[fieldName]);
                if (!isNaN(value)) {
                    serviceTotal += value;
                }
            }
            
            let html = `<strong>${service.nome}</strong>: R$ ${serviceTotal.toFixed(2)}`;
            
            // Adiciona os detalhes dos campos adicionais
            if (Object.keys(service.camposAdicionaisSelecionados).length > 0) {
                html += '<ul>';
                for (const fieldName in service.camposAdicionaisSelecionados) {
                    const value = parseFloat(service.camposAdicionaisSelecionados[fieldName]);
                    const field = service.camposAdicionais.find(f => f.nome === fieldName);
                    const optionText = field.opcoes.find(o => o.endsWith(value.toFixed(2)));
                    html += `<li>- ${fieldName}: ${optionText ? optionText.split(', R$')[0] : 'Valor não especificado'} (R$ ${value.toFixed(2)})</li>`;
                }
                html += '</ul>';
            }
            serviceItem.innerHTML = html;
            resumoServicosList.appendChild(serviceItem);
        });
    }

    const total = calculateOrcamento();
    orcamentoValorInput.value = `R$ ${total.toFixed(2)}`;
}

// ==========================================================================
// 4. LÓGICA DO FORMULÁRIO E NAVEGAÇÃO
// ==========================================================================

/**
 * Configura todos os ouvintes de evento para os botões e campos do formulário.
 */
function setupEventListeners() {
    document.querySelectorAll('.btn-next').forEach(button => {
        button.addEventListener('click', () => changeStep(1));
    });
    document.querySelectorAll('.btn-prev').forEach(button => {
        button.addEventListener('click', () => changeStep(-1));
    });
    
    agendamentoDataInput.addEventListener('change', updateHorarios);
    document.getElementById('btnEnviarWhatsapp').addEventListener('click', handleSubmit);
}

/**
 * Altera o passo do formulário.
 * @param {number} direction - 1 para próximo, -1 para anterior.
 */
function changeStep(direction) {
    if (validateStep(currentStep)) {
        steps[currentStep - 1].classList.remove('active');
        stepIndicators[currentStep - 1].classList.remove('active');
        currentStep += direction;
        steps[currentStep - 1].classList.add('active');
        stepIndicators[currentStep - 1].classList.add('active');
        updateUI();
    }
}

/**
 * Valida o passo atual do formulário.
 * @param {number} step - O número do passo a ser validado.
 */
function validateStep(step) {
    if (step === 1 && cart.length === 0) {
        alert('Selecione pelo menos um serviço para continuar!');
        return false;
    }
    if (step === 2) {
        // Valida se todos os campos dinâmicos obrigatórios foram preenchidos
        const dynamicFields = document.querySelectorAll('.dynamic-field[required]');
        for (let field of dynamicFields) {
            if (!field.value) {
                alert('Por favor, preencha todos os campos adicionais obrigatórios.');
                return false;
            }
        }
    }
    if (step === 3) {
        // Valida se a data e a hora foram selecionadas
        if (!agendamentoDataInput.value || !agendamentoHoraSelect.value) {
            alert('Por favor, selecione uma data e um horário.');
            return false;
        }
    }
    if (step === 4) {
        // Valida os campos de dados do cliente
        const requiredInputs = document.querySelectorAll('#step4 input[required], #step4 textarea[required]');
        for (let input of requiredInputs) {
            if (!input.value) {
                alert('Por favor, preencha todos os seus dados.');
                return false;
            }
        }
    }
    return true;
}

/**
 * Atualiza a interface do usuário com base no passo atual.
 */
function updateUI() {
    if (currentStep === 2) {
        renderDynamicFields();
        updateSummary();
    }
    if (currentStep === 5) {
        generateFinalSummary();
    }
}

// ==========================================================================
// 5. LÓGICA DE AGENDAMENTO AVANÇADO E ENVIO
// ==========================================================================

/**
 * Mapeamento de números de dia da semana para chaves de objeto.
 * 0 = Domingo, 1 = Segunda, etc.
 */
const diasDaSemana = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado'
};

/**
 * Gera os horários disponíveis com base na data selecionada e nas regras do admin.
 */
function updateHorarios() {
    agendamentoHoraSelect.innerHTML = '<option value="" disabled selected>Selecione uma hora</option>';
    const selectedDate = agendamentoDataInput.value;
    const selectedDay = new Date(selectedDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Converte a data selecionada para um formato de comparação
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');

    // 1. Impede a seleção de datas passadas
    if (selectedDateObj < today) {
        agendamentoDataInput.value = '';
        alert('Não é possível agendar em uma data passada.');
        return;
    }

    // 2. Verifica se o dia da semana selecionado é um dia útil
    const diaDaSemana = diasDaSemana[selectedDay.getDay()];
    const horarioDoDia = systemConfig.horariosPorDia[diaDaSemana];

    if (!horarioDoDia || horarioDoDia.ativo === false) {
        agendamentoHoraSelect.innerHTML = '<option value="" disabled selected>Dia indisponível</option>';
        alert('Desculpe, este dia não está disponível para agendamento.');
        return;
    }

    // 3. Usa os horários específicos daquele dia para gerar as opções
    const { horarioInicio, horarioFim, duracaoServico } = horarioDoDia;
    if (!horarioInicio || !horarioFim || !duracaoServico) {
        console.error("Configurações de horário ausentes para o dia selecionado.");
        return;
    }

    let [startHour, startMin] = horarioInicio.split(':').map(Number);
    let [endHour, endMin] = horarioFim.split(':').map(Number);
    
    let current = new Date();
    current.setHours(startHour, startMin, 0);

    let end = new Date();
    end.setHours(endHour, endMin, 0);

    while (current <= end) {
        const hour = current.getHours().toString().padStart(2, '0');
        const minute = current.getMinutes().toString().padStart(2, '0');
        const timeValue = `${hour}:${minute}`;
        
        const option = document.createElement('option');
        option.value = timeValue;
        option.textContent = timeValue;
        agendamentoHoraSelect.appendChild(option);

        current.setMinutes(current.getMinutes() + duracaoServico);
    }
}

/**
 * Gera o resumo final antes de enviar o agendamento.
 */
function generateFinalSummary() {
    const nome = document.getElementById('clienteNome').value;
    const telefone = document.getElementById('clienteTelefone').value;
    const endereco = document.getElementById('clienteEndereco').value;
    const data = document.getElementById('agendamentoData').value;
    const hora = document.getElementById('agendamentoHora').value;
    const observacoes = document.getElementById('clienteObservacoes').value;
    
    let servicosHtml = '<ul>';
    cart.forEach(service => {
        let serviceTotal = parseFloat(service.precoBase);
        let serviceDetails = `<li><strong>${service.nome}</strong>: R$ ${serviceTotal.toFixed(2)}`;
        
        if (Object.keys(service.camposAdicionaisSelecionados).length > 0) {
            serviceDetails += '<ul>';
            for (const fieldName in service.camposAdicionaisSelecionados) {
                const value = parseFloat(service.camposAdicionaisSelecionados[fieldName]);
                const field = service.camposAdicionais.find(f => f.nome === fieldName);
                const optionText = field.opcoes.find(o => o.endsWith(value.toFixed(2)));
                serviceDetails += `<li>- ${fieldName}: ${optionText ? optionText.split(', R$')[0] : 'Valor não especificado'} (R$ ${value.toFixed(2)})</li>`;
                serviceTotal += value;
            }
            serviceDetails += '</ul>';
        }
        serviceDetails += '</li>';
        servicosHtml += serviceDetails;
    });
    servicosHtml += '</ul>';
    
    const total = calculateOrcamento();
    
    resumoAgendamentoDiv.innerHTML = `
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Telefone:</strong> ${telefone}</p>
        <p><strong>Endereço:</strong> ${endereco}</p>
        <p><strong>Data:</strong> ${data}</p>
        <p><strong>Hora:</strong> ${hora}</p>
        <p><strong>Observações:</strong> ${observacoes || 'Nenhuma'}</p>
        <hr>
        <h4>Serviços Agendados</h4>
        ${servicosHtml}
        <hr>
        <p><strong>Valor Total Estimado:</strong> <span class="destaque-valor">R$ ${total.toFixed(2)}</span></p>
    `;
}

/**
 * Salva o agendamento no Firebase e redireciona para o WhatsApp.
 */
async function handleSubmit() {
    // Valida o último passo antes de enviar
    if (!validateStep(5)) {
        return;
    }

    const agendamentoData = {
        cliente: {
            nome: document.getElementById('clienteNome').value,
            telefone: document.getElementById('clienteTelefone').value,
            endereco: document.getElementById('clienteEndereco').value,
            observacoes: document.getElementById('clienteObservacoes').value,
        },
        data: document.getElementById('agendamentoData').value,
        hora: document.getElementById('agendamentoHora').value,
        servicos: cart, // Salva o carrinho completo no Firebase
        orcamentoTotal: calculateOrcamento(),
        status: 'Pendente', // Novo agendamento tem o status 'Pendente'
        timestamp: new Date().toISOString()
    };
    
    try {
        const agendamentosRef = ref(database, 'agendamentos');
        await push(agendamentosRef, agendamentoData);
        
        // Mensagem para o WhatsApp
        let whatsappMessage = `Olá! Tenho um novo agendamento de serviço:%0A%0A`;
        whatsappMessage += `*Dados do Cliente:*%0A`;
        whatsappMessage += `Nome: ${agendamentoData.cliente.nome}%0A`;
        whatsappMessage += `Telefone: ${agendamentoData.cliente.telefone}%0A`;
        whatsappMessage += `Endereço: ${agendamentoData.cliente.endereco}%0A`;
        whatsappMessage += `Observações: ${agendamentoData.cliente.observacoes || 'Nenhuma'}%0A%0A`;
        whatsappMessage += `*Detalhes do Agendamento:*%0A`;
        whatsappMessage += `Data: ${agendamentoData.data}%0A`;
        whatsappMessage += `Hora: ${agendamentoData.hora}%0A%0A`;
        whatsappMessage += `*Serviços Contratados:*%0A`;
        
        agendamentoData.servicos.forEach(service => {
            whatsappMessage += `- ${service.nome}%0A`;
            if (Object.keys(service.camposAdicionaisSelecionados).length > 0) {
                for (const fieldName in service.camposAdicionaisSelecionados) {
                    const value = parseFloat(service.camposAdicionaisSelecionados[fieldName]);
                    const field = service.camposAdicionais.find(f => f.nome === fieldName);
                    const optionText = field.opcoes.find(o => o.endsWith(value.toFixed(2)));
                    whatsappMessage += `  - ${fieldName}: ${optionText ? optionText.split(', R$')[0] : 'Valor não especificado'} (R$ ${value.toFixed(2)})%0A`;
                }
            }
        });

        whatsappMessage += `%0A*Valor Total Estimado:* R$ ${agendamentoData.orcamentoTotal.toFixed(2)}`;

        // Abre o link do WhatsApp
        const whatsappUrl = `https://wa.me/${systemConfig.whatsappNumber.replace(/\D/g, '')}?text=${whatsappMessage}`;
        window.open(whatsappUrl, '_blank');

    } catch (error) {
        console.error("Erro ao salvar o agendamento:", error);
        alert("Ocorreu um erro ao salvar seu agendamento. Por favor, tente novamente.");
    }
}

// Inicia a aplicação quando a página é carregada
document.addEventListener('DOMContentLoaded', initApp);
