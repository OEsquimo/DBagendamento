import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Configuração Firebase (sem alterações) ---
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

// --- Mapeamento DOM (com novos elementos) ---
const loginSection = document.getElementById("loginSection"),
      adminContent = document.getElementById("adminContent"),
      adminEmail = document.getElementById("adminEmail"),
      adminPassword = document.getElementById("adminPassword"),
      btnLogin = document.getElementById("btnLogin"),
      loginMsg = document.getElementById("loginMsg"),
      cfgCompanyName = document.getElementById("cfgCompanyName"),
      cfgCompanyDesc = document.getElementById("cfgCompanyDesc"),
      cfgHeroUrl = document.getElementById("cfgHeroUrl"),
      heroImagePreview = document.getElementById("heroImagePreview"),
      cfgWhats = document.getElementById("cfgWhats"),
      siteMsg = document.getElementById("siteMsg"),
      btnSaveSite = document.getElementById("btnSaveSite"),
      serviceFormContainer = document.getElementById("service-form-container"),
      btnShowAddServiceForm = document.getElementById("btnShowAddServiceForm"),
      srvList = document.getElementById("srvList"),
      srvMsg = document.getElementById("srvMsg"),
      // Novos elementos da Gestão de Serviços
      searchClientPhone = document.getElementById("searchClientPhone"),
      btnSearchClient = document.getElementById("btnSearchClient"),
      searchMsg = document.getElementById("searchMsg"),
      manualServiceForm = document.getElementById("manualServiceForm"),
      mServiceId = document.getElementById("mServiceId"),
      mNome = document.getElementById("mNome"),
      mFone = document.getElementById("mFone"),
      mEndereco = document.getElementById("mEndereco"),
      mTipoEquipamento = document.getElementById("mTipoEquipamento"),
      mCapacidade = document.getElementById("mCapacidade"),
      mObs = document.getElementById("mObs"),
      mData = document.getElementById("mData"),
      mHora = document.getElementById("mHora"),
      btnSaveManual = document.getElementById("btnSaveManual"),
      btnUpdateManual = document.getElementById("btnUpdateManual"),
      btnDeleteManual = document.getElementById("btnDeleteManual"),
      // Novos elementos de Lembretes
      cfgReminderMonths = document.getElementById("cfgReminderMonths"),
      btnRodarLembretes = document.getElementById("btnRodarLembretes"),
      reminderLog = document.getElementById("reminderLog");

// --- Estado e Helpers (sem alterações) ---
let siteState = {};
const imageGallery = [
    { name: "Técnico em Serviço", url: "assets/imagens/tecnico-trabalhando.jpg" },
    { name: "Limpeza de Split", url: "assets/imagens/limpeza-split.jpg" },
    { name: "Instalação de Ar", url: "assets/imagens/instalacao-ar.jpg" },
    { name: "Manutenção Preventiva", url: "assets/imagens/manutencao-ar.jpg" },
    { name: "Condensadora Externa", url: "assets/imagens/condensadora_lg.jpg" }
];
const maskPhone = (input) => { /* ...código da máscara... */ };
const showMessage = (el, text, success = true, duration = 3000) => { /* ...código da mensagem... */ };

// --- Autenticação (sem alterações) ---
onAuthStateChanged(auth, user => { /* ...código de autenticação... */ });
btnLogin.addEventListener("click", async () => { /* ...código do botão de login... */ });

// --- Carregamento de Dados ---
async function loadAdminData() {
    await Promise.all([loadSiteConfig(), loadServices()]);
    maskPhone(searchClientPhone); // Aplica máscara no novo campo de busca
}

async function loadSiteConfig() {
    cfgHeroUrl.innerHTML = imageGallery.map(img => `<option value="${img.url}">${img.name}</option>`).join('');
    const docRef = doc(db, "config", "site");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        siteState = docSnap.data();
        cfgCompanyName.value = siteState.companyName || "";
        cfgCompanyDesc.value = siteState.description || "";
        cfgWhats.value = siteState.whatsappNumber || "";
        cfgReminderMonths.value = siteState.reminderMonths || 12; // Carrega o valor dos meses
        if (siteState.heroUrl) {
            cfgHeroUrl.value = siteState.heroUrl;
            heroImagePreview.src = siteState.heroUrl;
            heroImagePreview.style.display = 'block';
        } else {
            heroImagePreview.src = cfgHeroUrl.value;
            heroImagePreview.style.display = 'block';
        }
        maskPhone(cfgWhats);
    }
    cfgHeroUrl.addEventListener('change', () => {
        heroImagePreview.src = cfgHeroUrl.value;
        heroImagePreview.style.display = 'block';
    });
}

// --- Gerenciamento de Serviços (CRUD Dinâmico) ---
// **FUNÇÃO ATUALIZADA** para incluir o campo de Link Externo
function createServiceForm(service = {}) {
    const isEditing = !!service.id;
    serviceFormContainer.innerHTML = ''; 

    const formHtml = `
        <div class="service-form active">
            <h4>${isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h4>
            <input type="hidden" id="srvId" value="${service.id || ''}">
            <label>Nome do Serviço</label>
            <input type="text" id="srvName" placeholder="Ex: Limpeza Completa" value="${service.name || ''}" required>
            
            <label>Descrição Curta</label>
            <input type="text" id="srvDescription" placeholder="O que inclui o serviço" value="${service.description || ''}">

            <label>Imagem do Serviço</label>
            <select id="srvImage" required>${imageGallery.map(img => `<option value="${img.url}" ${service.imageUrl === img.url ? 'selected' : ''}>${img.name}</option>`).join('')}</select>
            <img id="srvImagePreview" src="${service.imageUrl || imageGallery[0].url}" alt="Preview" class="image-preview">

            <!-- NOVO CAMPO DE LINK EXTERNO -->
            <label>Link Externo (Opcional)</label>
            <input type="text" id="srvExternalLink" placeholder="https://... (preencha para desativar o formulário)" value="${service.externalLink || ''}">

            <div id="dynamic-fields-container"></div>
            <button id="btnAddField" type="button" class="secondary-button">Adicionar Campo de Preço (por BTUs)</button>

            <div class="checkbox-group">
                <input type="checkbox" id="srvShowBudget" ${service.showBudget ? 'checked' : ''}>
                <label for="srvShowBudget">Deseja mostrar Orçamento para o cliente?</label>
            </div>
            <div class="checkbox-group">
                <input type="checkbox" id="srvShowSchedule" ${service.showSchedule ? 'checked' : ''}>
                <label for="srvShowSchedule">Deseja mostrar Agendamento para o cliente?</label>
            </div>

            <div class="form-actions">
                <button id="btnSaveSrv" class="final-button">${isEditing ? 'Atualizar Serviço' : 'Salvar Serviço'}</button>
                <button id="btnCancelSrv" type="button" class="cancel-button">Cancelar</button>
            </div>
        </div>
    `;
    serviceFormContainer.innerHTML = formHtml;
    // ... resto da função createServiceForm ...
}

// **FUNÇÃO ATUALIZADA** para salvar o novo campo de link
async function saveService() {
    const id = document.getElementById('srvId').value;
    const name = document.getElementById('srvName').value.trim();
    if (!name) { /* ... validação ... */ return; }

    const prices = {};
    document.querySelectorAll('.dynamic-field').forEach(field => { /* ... código para pegar preços ... */ });

    const serviceData = {
        name,
        description: document.getElementById('srvDescription').value.trim(),
        imageUrl: document.getElementById('srvImage').value,
        externalLink: document.getElementById('srvExternalLink').value.trim(), // Salva o link
        showBudget: document.getElementById('srvShowBudget').checked,
        showSchedule: document.getElementById('srvShowSchedule').checked,
        prices: prices,
        lastUpdated: new Date().toISOString()
    };

    try {
        const docRef = id ? doc(db, "services", id) : doc(collection(db, "services"));
        await setDoc(docRef, serviceData, { merge: true });
        showMessage(srvMsg, `Serviço ${id ? 'atualizado' : 'salvo'} com sucesso!`);
        hideServiceForm();
        loadServices();
    } catch (e) { /* ... tratamento de erro ... */ }
}

// --- **NOVA SEÇÃO: GESTÃO DE SERVIÇOS REALIZADOS (CRUD)** ---
btnSearchClient.addEventListener('click', async () => {
    const phone = searchClientPhone.value.replace(/\D/g, "");
    if (phone.length < 10) {
        showMessage(searchMsg, "Digite um número de WhatsApp válido.", false);
        return;
    }

    showMessage(searchMsg, "Buscando...", true, 0);
    const q = query(collection(db, "agendamentos"), where("telefoneCliente", "==", phone), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        showMessage(searchMsg, "Nenhum serviço encontrado para este cliente. Preencha para criar um novo.", false);
        resetManualForm(); // Limpa o formulário para um novo cadastro
        mFone.value = searchClientPhone.value; // Preenche o telefone buscado
        manualServiceForm.style.display = 'block';
        btnUpdateManual.style.display = 'none';
        btnDeleteManual.style.display = 'none';
        btnSaveManual.style.display = 'inline-block';
    } else {
        const lastService = querySnapshot.docs[0].data();
        const serviceId = querySnapshot.docs[0].id;
        showMessage(searchMsg, "Cliente encontrado! Último serviço carregado.", true);
        fillManualForm(lastService, serviceId);
        manualServiceForm.style.display = 'block';
        btnUpdateManual.style.display = 'inline-block';
        btnDeleteManual.style.display = 'inline-block';
        btnSaveManual.style.display = 'none';
    }
});

function fillManualForm(data, id) {
    mServiceId.value = id;
    mNome.value = data.nomeCliente || "";
    mFone.value = `(${data.telefoneCliente.substring(0, 2)}) ${data.telefoneCliente.substring(2, 7)}-${data.telefoneCliente.substring(7)}`;
    mEndereco.value = data.enderecoCliente || "";
    mTipoEquipamento.value = data.tipoEquipamento || "";
    mCapacidade.value = data.capacidadeBtus || "";
    mObs.value = data.observacoes || "";
    
    if (data.timestamp) {
        const date = new Date(data.timestamp);
        mData.value = date.toISOString().split('T')[0];
        mHora.value = date.toTimeString().split(' ')[0].substring(0, 5);
    }
}

function resetManualForm() {
    manualServiceForm.querySelectorAll('input, select, textarea').forEach(el => {
        if(el.type !== 'hidden') el.value = '';
    });
    mServiceId.value = '';
}

btnSaveManual.addEventListener('click', async () => {
    // Lógica para salvar um NOVO serviço (semelhante à anterior)
    // ...
});

btnUpdateManual.addEventListener('click', async () => {
    const id = mServiceId.value;
    if (!id) return;
    // Lógica para pegar os dados do formulário e usar setDoc com o ID
    // ...
    showMessage(searchMsg, "Serviço atualizado com sucesso!", true);
});

btnDeleteManual.addEventListener('click', async () => {
    const id = mServiceId.value;
    if (!id || !confirm("Tem certeza que deseja excluir este registro de serviço?")) return;
    await deleteDoc(doc(db, "agendamentos", id));
    showMessage(searchMsg, "Registro excluído com sucesso!", true);
    manualServiceForm.style.display = 'none';
});


// --- Ações Gerais e Lembretes ---
btnSaveSite.addEventListener("click", async () => {
    try {
        await setDoc(doc(db, "config", "site"), {
            companyName: cfgCompanyName.value.trim(),
            description: cfgCompanyDesc.value.trim(),
            heroUrl: cfgHeroUrl.value,
            whatsappNumber: cfgWhats.value.replace(/\D/g, ""),
            // Salva o valor dos meses junto com as outras configs
            reminderMonths: Number(cfgReminderMonths.value) 
        }, { merge: true });
        showMessage(siteMsg, "Configurações salvas com sucesso!");
    } catch (e) { /* ... */ }
});

btnRodarLembretes.addEventListener("click", async () => {
    // A lógica desta função permanece a mesma, mas agora ela lê o valor
    // do campo cfgReminderMonths que está no final da página.
    const months = Number(cfgReminderMonths.value) || 12;
    // ... resto da lógica de lembretes ...
});

// --- Inicialização ---
maskPhone(cfgWhats);
maskPhone(mFone);
