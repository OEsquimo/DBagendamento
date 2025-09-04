/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 10.1 (Redirecionamento, mensagem do WhatsApp ajustada)
 */

// Importa funções necessárias do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ==========================================================================

// Configurações do seu projeto Firebase
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

// Seletores dos elementos do DOM
const servicosContainer = document.getElementById('servicosContainer');
// ... outros seletores ...

// Dados de controle do agendamento
let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

// Executa quando a página é carregada
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    updateProgressBar(1);
    setupPhoneMask();
});

// Carrega configurações e serviços do Firebase
async function loadAllData() {
    await loadConfig();
    loadServices();
}

// Carrega os dados dos serviços e renderiza os cards
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
        }
    });
}

// ==========================================================================
// 3. ETAPA 1: SELEÇÃO DE SERVIÇOS
// ==========================================================================

// Cria dinamicamente os cards de serviço
function createServiceCard(service, key) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.key = key;

    card.innerHTML = `<h3>${service.nome}</h3><p>${service.descricao}</p><button class="btn btn-primary btn-select-service">Adicionar</button>`;

    // Adiciona evento de clique para selecionar/remover o serviço
    card.querySelector('.btn-select-service').addEventListener('click', () => {
        // ... lógica de seleção ...
    });

    servicosContainer.appendChild(card);
}

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS
// ==========================================================================

// Renderiza os formulários adicionais para os serviços selecionados
function renderServiceForms() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach(service => {
        const formGroup = document.createElement('div');
        // ... lógica de renderização dos campos ...
        servicosFormContainer.appendChild(formGroup);
    });

    // Adiciona eventos para atualizar o preço em tempo real
    document.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-textarea').forEach(field => {
        field.addEventListener('change', updatePrice);
        field.addEventListener('input', updatePrice);
    });
}

// ==========================================================================
// 5. ETAPA 3: INFORMAÇÕES DO CLIENTE
// ==========================================================================

// Aplica uma máscara ao campo de telefone
function setupPhoneMask() {
    telefoneInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
        // ... lógica da máscara ...
        e.target.value = maskedValue;
    });
}

// ==========================================================================
// 6. ETAPA 4: AGENDAMENTO E FINALIZAÇÃO
// ==========================================================================

// Lida com a seleção de data e carrega os horários disponíveis
async function handleDateSelection() {
    const selectedDate = datePicker.value;
    // ... lógica para carregar horários do Firebase e filtrar ...
    displayTimeSlots(horariosDisponiveis);
}

// Exibe os horários disponíveis como botões clicáveis
function displayTimeSlots(horariosDisponiveis) {
    // ... lógica de renderização dos slots ...
}

// Lida com o envio final do formulário de agendamento
async function handleFormSubmit(e) {
    e.preventDefault();
    // ... lógica para criar o objeto de agendamento e salvar no Firebase ...
    try {
        await push(ref(database, 'agendamentos'), agendamentoData);
        showConfirmation();
    } catch (error) {
        console.error("Erro ao salvar agendamento:", error);
    }
}

// Mostra a tela de confirmação e gera o link do WhatsApp
function showConfirmation() {
    agendamentoSection.classList.add('hidden');
    confirmationPopup.classList.remove('hidden');
    updateProgressBar(5);
    const whatsappMsg = createWhatsAppMessage();
    whatsappLink.href = `https://wa.me/${configGlobais.whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;
}
