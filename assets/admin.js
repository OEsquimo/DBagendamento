import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Configuração Firebase
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
const auth = getAuth(app);

// Elementos DOM
const elementos = {
    loginSection: document.getElementById("loginSection"),
    adminContent: document.getElementById("adminContent"),
    adminEmail: document.getElementById("adminEmail"),
    adminPassword: document.getElementById("adminPassword"),
    btnLogin: document.getElementById("btnLogin"),
    loginMsg: document.getElementById("loginMsg"),
    cfgCompanyName: document.getElementById("cfgCompanyName"),
    cfgCompanyDesc: document.getElementById("cfgCompanyDesc"),
    cfgHeroUrl: document.getElementById("cfgHeroUrl"),
    heroImagePreview: document.getElementById("heroImagePreview"),
    cfgWhats: document.getElementById("cfgWhats"),
    siteMsg: document.getElementById("siteMsg"),
    btnSaveSite: document.getElementById("btnSaveSite"),
    scheduleGridContainer: document.getElementById("schedule-grid-container"),
    btnAddScheduleSlot: document.getElementById("btnAddScheduleSlot"),
    btnSaveSchedule: document.getElementById("btnSaveSchedule"),
    scheduleMsg: document.getElementById("scheduleMsg"),
    serviceFormContainer: document.getElementById("service-form-container"),
    btnShowAddServiceForm: document.getElementById("btnShowAddServiceForm"),
    srvList: document.getElementById("srvList"),
    srvMsg: document.getElementById("srvMsg"),
    searchClientPhone: document.getElementById("searchClientPhone"),
    btnSearchClient: document.getElementById("btnSearchClient"),
    searchMsg: document.getElementById("searchMsg"),
    manualServiceForm: document.getElementById("manualServiceForm"),
    mServiceId: document.getElementById("mServiceId"),
    mNome: document.getElementById("mNome"),
    mFone: document.getElementById("mFone"),
    mEndereco: document.getElementById("mEndereco"),
    mTipoEquipamento: document.getElementById("mTipoEquipamento"),
    mCapacidade: document.getElementById("mCapacidade"),
    mObs: document.getElementById("mObs"),
    mData: document.getElementById("mData"),
    mHora: document.getElementById("mHora"),
    btnSaveManual: document.getElementById("btnSaveManual"),
    btnUpdateManual: document.getElementById("btnUpdateManual"),
    btnDeleteManual: document.getElementById("btnDeleteManual"),
    cfgReminderMonths: document.getElementById("cfgReminderMonths"),
    btnRodarLembretes: document.getElementById("btnRodarLembretes"),
    reminderLog: document.getElementById("reminderLog"),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane')
};

// Estado e Helpers
let siteState = {};
const imageGallery = [
    { name: "Técnico em Serviço", url: "assets/imagens/tecnico-trabalhando.jpg" },
    { name: "Limpeza de Split", url: "assets/imagens/limpeza-split.jpg" },
    { name: "Instalação de Ar", url: "assets/imagens/instalacao-ar.jpg" },
    { name: "Manutenção Preventiva", url: "assets/imagens/manutencao-ar.jpg" },
    { name: "Condensadora Externa", url: "assets/imagens/condensadora_lg.jpg" }
];

// Funções de utilidade
const maskPhone = (input) => {
    if (!input) return;
    const applyMask = (e) => {
        let v = e.target.value.replace(/\D/g, "").slice(0, 11);
        if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
        e.target.value = v;
    };
    input.addEventListener('input', applyMask);
};

const showMessage = (el, text, success = true, duration = 3000) => {
    if (!el) return;
    el.textContent = text;
    el.className = `form-message ${success ? 'success' : 'error'}`;
    if (duration > 0) {
        setTimeout(() => el.textContent = "", duration);
    }
};

// Sistema de abas
elementos.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remover classe active de todos os botões e painéis
        elementos.tabBtns.forEach(b => b.classList.remove('active'));
        elementos.tabPanes.forEach(p => p.classList.remove('active'));
        
        // Adicionar classe active ao botão clicado
        btn.classList.add('active');
        
        // Mostrar o painel correspondente
        const tabId = btn.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

// Autenticação
onAuthStateChanged(auth, user => {
    elementos.loginSection.classList.toggle('active', !user);
    elementos.adminContent.classList.toggle('active', !!user);
    if (user) {
        loadAdminData();
    }
});

elementos.btnLogin.addEventListener("click", async () => {
    elementos.loginMsg.textContent = "";
    try {
        await signInWithEmailAndPassword(auth, elementos.adminEmail.value, elementos.adminPassword.value);
    } catch (error) {
        showMessage(elementos.loginMsg, "E-mail ou senha inválidos.", false, 0);
    }
});

// Carregamento de dados
async function loadAdminData() {
    await Promise.all([loadSiteConfig(), loadSchedule(), loadServices()]);
    maskPhone(elementos.searchClientPhone);
    maskPhone(elementos.mFone);
    maskPhone(elementos.cfgWhats);
}

async function loadSiteConfig() {
    elementos.cfgHeroUrl.innerHTML = imageGallery.map(img => 
        `<option value="${img.url}">${img.name}</option>`
    ).join('');
    
    const docRef = doc(db, "config", "site");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        siteState = docSnap.data();
        elementos.cfgCompanyName.value = siteState.companyName || "";
        elementos.cfgCompanyDesc.value = siteState.description || "";
        elementos.cfgWhats.value = siteState.whatsappNumber || "";
        elementos.cfgReminderMonths.value = siteState.reminderMonths || 12;
        
        if (siteState.heroUrl) {
            elementos.cfgHeroUrl.value = siteState.heroUrl;
            elementos.heroImagePreview.src = siteState.heroUrl;
            elementos.heroImagePreview.style.display = 'block';
        }
    }
    
    elementos.cfgHeroUrl.addEventListener('change', () => {
        elementos.heroImagePreview.src = elementos.cfgHeroUrl.value;
        elementos.heroImagePreview.style.display = 'block';
    });
}

// As demais funções (loadSchedule, addScheduleSlot, createServiceForm, etc.)
// seguiriam a mesma lógica do código anterior, mas adaptadas para a nova interface

// Event listeners para botões
elementos.btnSaveSite.addEventListener("click", async () => {
    try {
        await setDoc(doc(db, "config", "site"), {
            companyName: elementos.cfgCompanyName.value.trim(),
            description: elementos.cfgCompanyDesc.value.trim(),
            heroUrl: elementos.cfgHeroUrl.value,
            whatsappNumber: elementos.cfgWhats.value.replace(/\D/g, ""),
            reminderMonths: Number(elementos.cfgReminderMonths.value) || 12
        }, { merge: true });
        
        showMessage(elementos.siteMsg, "Configurações salvas com sucesso!");
    } catch (e) {
        showMessage(elementos.siteMsg, "Erro ao salvar configurações.", false);
    }
});

// Implementação das outras funcionalidades do admin...
// (loadSchedule, addScheduleSlot, createServiceForm, etc.)
