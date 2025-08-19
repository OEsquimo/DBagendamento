import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where, doc, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Configuração Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyCFf5gckKE6rg7MFuBYAO84aV-sNrdY2JQ",
    authDomain: "agendamento-esquimo.firebaseapp.com",
    projectId: "agendamento-esquimo",
    storageBucket: "agendamento-esquimo.appspot.com",
    messagingSenderId: "348946727206",
    appId: "1:348946727206:web:f5989788f13c259be0c1e7"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Mapeamento DOM ---
const siteTitle = document.getElementById("siteTitle"),
      heroImage = document.getElementById("heroImage"),
      companyNameEl = document.getElementById("companyName"),
      companyDescEl = document.getElementById("companyDescription"),
      servicosGrid = document.getElementById("servicosGrid"),
      form = document.getElementById("formulario"),
      detalhesWrapper = document.getElementById("detalhes-cliente-wrapper"),
      orcamentoWrapper = document.getElementById("orcamento-wrapper"),
      agendamentoWrapper = document.getElementById("agendamento-wrapper"),
      nomeInput = document.getElementById("nome"),
      whatsappInput = document.getElementById("whatsapp"),
      tipoEquipamentoSelect = document.getElementById("tipo_equipamento"),
      capacidadeBtusSelect = document.getElementById("capacidade_btus"),
      observacoesTextarea = document.getElementById("observacoes"),
      relatorioOrcamentoDiv = document.getElementById("relatorio-orcamento"),
      dataAgendamentoInput = document.getElementById("data_agendamento"),
      horarioAgendamentoSelect = document.getElementById("horario_agendamento"),
      formaPagamentoSelect = document.getElementById("forma_pagamento"),
      btnFinalizar = document.getElementById("btn_finalizar"),
      btnFinalizarTexto = btnFinalizar.querySelector("span"),
      ultimaAtualizacaoEl = document.getElementById("ultima-atualizacao");

// --- Estado da Aplicação ---
const appState = {
    servicoSelecionado: null,
    valorOrcamento: 0,
    configSite: {},
    configSchedule: { slots: [] },
    servicos: []
};

// --- Helpers ---
const maskPhone = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
    e.target.value = v;
};
whatsappInput.addEventListener('input', maskPhone);

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadSiteConfig(), loadScheduleConfig(), loadServices()]);
    initCalendar();
    renderServices();
    form.addEventListener("input", validarFormulario);
    observacoesTextarea.addEventListener('input', validarFormulario);
});

async function loadSiteConfig() {
    try {
        const docSnap = await getDoc(doc(db, "config", "site"));
        if (docSnap.exists()) {
            appState.configSite = docSnap.data();
            siteTitle.textContent = appState.configSite.companyName || "Agendamento de Serviço";
            companyNameEl.textContent = appState.configSite.companyName || "Sua Empresa";
            companyDescEl.textContent = appState.configSite.description || "Serviços de qualidade para você.";
            if (appState.configSite.heroUrl) {
                heroImage.src = appState.configSite.heroUrl;
            }
        }
    } catch (error) {
        console.error("Erro ao carregar configurações do site:", error);
    }
}

async function loadScheduleConfig() {
    try {
        const docSnap = await getDoc(doc(db, "config", "schedule"));
        if (docSnap.exists()) {
            appState.configSchedule = docSnap.data();
        }
    } catch (error) {
        console.error("Erro ao carregar grade de horários:", error);
    }
}

async function loadServices() {
    try {
        const q = query(collection(db, "services"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        appState.servicos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
    }
}

function renderServices() {
    servicosGrid.innerHTML = "";
    if (appState.servicos.length === 0) {
        servicosGrid.innerHTML = "<p>Nenhum serviço disponível no momento.</p>";
        return;
    }
    appState.servicos.forEach(servico => {
        const div = document.createElement("div");
        div.className = "servico";
        div.innerHTML = `<img src="${servico.imageUrl}" alt="${servico.name}"/><p>${servico.name}</p>`;
        div.addEventListener("click", () => handleServiceSelection(servico));
        servicosGrid.appendChild(div);
    });
}

function handleServiceSelection(servico) {
    if (servico.externalLink) {
        window.open(servico.externalLink, '_blank');
        return;
    }
    document.querySelectorAll(".servico").forEach(s => s.classList.remove("selecionado"));
    const clickedElement = Array.from(servicosGrid.children).find(el => el.querySelector('p').textContent === servico.name);
    if (clickedElement) {
        clickedElement.classList.add("selecionado");
    }
    app
