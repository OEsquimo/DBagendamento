/*
 * Arquivo: admin.js
 * Descrição: Lógica para o painel de administração.
 * Versão: 7.0 (Com navegação por abas e novo tipo de campo)
 */

// Importa funções do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ==========================================================================

// Configurações do Firebase
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
const servicoForm = document.getElementById('servicoForm');
const servicosList = document.getElementById('servicosList');
// ... outros seletores ...

const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

// Executa ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadBookings();
    loadConfig();
    setupConfigForm();
    setupServicoForm();
    setupTabNavigation(); // Lógica para as abas
});

// Configura os eventos de clique para alternar entre as abas
function setupTabNavigation() {
    // ...
}

// Lida com o formulário de cadastro de serviço
function setupServicoForm() {
    servicoForm.addEventListener('submit', handleServicoFormSubmit);
    addFieldBtn.addEventListener('click', () => addAdditionalFieldForm());
}

// ==========================================================================
// 3. GERENCIAMENTO DE SERVIÇOS (CRUD)
// ==========================================================================

// Adiciona dinamicamente um novo campo ao formulário de serviço
function addAdditionalFieldForm(fieldData = {}) {
    // ...
}

// Lida com o envio do formulário de serviço (salvar ou atualizar)
function handleServicoFormSubmit(e) {
    e.preventDefault();
    // ...
}

// Carrega a lista de serviços cadastrados do Firebase
function loadServices() {
    onValue(ref(database, 'servicos'), (snapshot) => {
        // ...
    });
}

// Cria o cartão de exibição para cada serviço
function createServicoCard(servico, key) {
    // ...
}

// ==========================================================================
// 4. GERENCIAMENTO DE AGENDAMENTOS
// ==========================================================================

// Carrega todos os agendamentos do Firebase
function loadBookings() {
    onValue(ref(database, 'agendamentos'), (snapshot) => {
        // ...
    });
}

// Cria o cartão de exibição para cada agendamento
function createAgendamentoCard(agendamento, key) {
    // ...
}

// Atualiza o status de um agendamento (Concluído/Cancelado)
function updateBookingStatus(key, newStatus) {
    // ...
}

// ==========================================================================
// 5. GERENCIAMENTO DE CONFIGURAÇÕES
// ==========================================================================

// Lida com o envio do formulário de configurações
function handleConfigFormSubmit(e) {
    e.preventDefault();
    // ...
}

// Carrega as configurações atuais do Firebase
function loadConfig() {
    onValue(ref(database, 'configuracoes'), (snapshot) => {
        // ...
    });
}
