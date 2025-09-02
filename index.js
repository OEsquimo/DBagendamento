/*
 * Arquivo: index.js
 * Descrição: Lógica para a página de agendamento de serviços.
 * Versão: 11.0 (Corrigido e completo com funcionalidades de agendamento e promoção)
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
const passos = document.querySelectorAll('.progress-bar .step');
const conteudosPasso = document.querySelectorAll('.step-content');
const servicosContainer = document.getElementById('servicos-container');
const servicosDetalhes = document.getElementById('servicos-detalhes');
const proximoPasso1Btn = document.getElementById('proximoPasso1');
const voltarPasso2Btn = document.getElementById('voltarPasso2');
const proximoPasso2Btn = document.getElementById('proximoPasso2');
const voltarPasso3Btn = document.getElementById('voltarPasso3');
const proximoPasso3Btn = document.getElementById('proximoPasso3');
const voltarPasso4Btn = document.getElementById('voltarPasso4');
const confirmarAgendamentoBtn = document.getElementById('confirmarAgendamento');
const clienteForm = document.getElementById('clienteForm');
const dataAgendamentoInput = document.getElementById('dataAgendamento');
const horaAgendamentoSelect = document.getElementById('horaAgendamento');
const nomeInput = document.getElementById('nome');
const telefoneInput = document.getElementById('telefone');
const enderecoInput = document.getElementById('endereco');
const observacoesInput = document.getElementById('observacoes');
const formaPagamentoSelect = document.getElementById('formaPagamento');

// Elementos da Promoção
const promocaoBanner = document.getElementById('promocao-banner');
const promocaoTexto = document.getElementById('promocao-texto');
const promocaoBtn = document.getElementById('promo-btn');

// Variáveis de estado
let passoAtual = 1;
let servicosSelecionados = [];
let servicosDisponiveis = {};
let promocaoAtiva = null;

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadServicesAndPromotions();
    setupEventListeners();
});

function setupEventListeners() {
    proximoPasso1Btn.addEventListener('click', () => navegarParaPasso(2));
    voltarPasso2Btn.addEventListener('click', () => navegarParaPasso(1));
    proximoPasso2Btn.addEventListener('click', () => navegarParaPasso(3));
    voltarPasso3Btn.addEventListener('click', () => navegarParaPasso(2));
    proximoPasso3Btn.addEventListener('click', handleClienteFormSubmit);
    voltarPasso4Btn.addEventListener('click', ()anto de Agendamento:", error);
            alert("Ocorreu um erro ao confirmar o agendamento. Tente novamente.");
        });
}

// ==========================================================================
// 5. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
