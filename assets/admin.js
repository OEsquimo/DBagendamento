import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const auth = getAuth(app);

// --- Mapeamento DOM ---
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
      scheduleGridContainer = document.getElementById("schedule-grid-container"),
      btnAddScheduleSlot = document.getElementById("btnAddScheduleSlot"),
      btnSaveSchedule = document.getElementById("btnSaveSchedule"),
      scheduleMsg = document.getElementById("scheduleMsg"),
      serviceFormContainer = document.getElementById("service-form-container"),
      btnShowAddServiceForm = document.getElementById("btnShowAddServiceForm"),
      srvList = document.getElementById("srvList"),
      srvMsg = document.getElementById("srvMsg"),
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
      cfgReminderMonths = document.getElementById("cfgReminderMonths"),
      btnRodarLembretes = document.getElementById("btnRodarLembretes"),
      reminderLog = document.getElementById("reminderLog");

// --- Estado e Helpers ---
let siteState = {};
const imageGallery = [
    { name: "Técnico em Serviço", url: "assets/imagens/tecnico-trabalhando.jpg" },
    { name: "Limpeza de Split", url: "assets/imagens/limpeza-split.jpg" },
    { name: "Instalação de Ar", url: "assets/imagens/instalacao-ar.jpg" },
    { name: "Manutenção Preventiva", url: "assets/imagens/manutencao-ar.jpg" },
    { name: "Condensadora Externa", url: "assets/imagens/condensadora_lg.jpg" }
];

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

// --- Autenticação ---
onAuthStateChanged(auth, user => {
    loginSection.style.display = user ? "none" : "block";
    adminContent.style.display = user ? "block" : "none";
    if (user) {
        loadAdminData();
    }
});

btnLogin.addEventListener("click", async () => {
    loginMsg.textContent = "";
    try {
        await signInWithEmailAndPassword(auth, adminEmail.value, adminPassword.value);
    } catch (error) {
        showMessage(loginMsg, "E-mail ou senha inválidos.", false, 0);
    }
});

// --- Carregamento de Dados ---
async function loadAdminData() {
    await Promise.all([loadSiteConfig(), loadSchedule(), loadServices()]);
    maskPhone(searchClientPhone);
    maskPhone(mFone);
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
        cfgReminderMonths.value = siteState.reminderMonths || 12;
        if (siteState.heroUrl) {
            cfgHeroUrl.value = siteState.heroUrl;
            heroImagePreview.src = siteState.heroUrl;
            heroImagePreview.style.display = 'block';
        }
        maskPhone(cfgWhats);
    }
    cfgHeroUrl.addEventListener('change', () => {
        heroImagePreview.src = cfgHeroUrl.value;
        heroImagePreview.style.display = 'block';
    });
}

// --- Grade de Horários ---
async function loadSchedule() {
    const docRef = doc(db, "config", "schedule");
    const docSnap = await getDoc(docRef);
    scheduleGridContainer.innerHTML = '';
    if (docSnap.exists() && docSnap.data().slots) {
        const slots = docSnap.data().slots.sort((a, b) => a.time.localeCompare(b.time));
        slots.forEach(slot => addScheduleSlot(slot.time, slot.vacancies));
    } else {
        addScheduleSlot("08:00", 1);
        addScheduleSlot("10:00", 1);
        addScheduleSlot("14:00", 1);
    }
}

function addScheduleSlot(time = '', vacancies = 1) {
    const slotId = `slot-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'dynamic-field';
    div.id = slotId;
    div.innerHTML = `
        <input type="time" class="time-input" value="${time}" required>
        <input type="number" class="vacancies-input" min="1" value="${vacancies}" required>
        <label>vaga(s)</label>
        <button type="button" class="remove-field-btn" onclick="document.getElementById('${slotId}').remove()">×</button>
    `;
    scheduleGridContainer.appendChild(div);
}

btnAddScheduleSlot.addEventListener('click', () => addScheduleSlot());

btnSaveSchedule.addEventListener('click', async () => {
    const slots = [];
    let isValid = true;
    document.querySelectorAll('#schedule-grid-container .dynamic-field').forEach(field => {
        const time = field.querySelector('.time-input').value;
        const vacancies = parseInt(field.querySelector('.vacancies-input').value, 10);
        if (!time || isNaN(vacancies) || vacancies < 1) {
            isValid = false;
        }
        slots.push({ time, vacancies });
    });

    if (!isValid) {
        showMessage(scheduleMsg, "Preencha todos os horários e vagas corretamente.", false);
        return;
    }

    try {
        await setDoc(doc(db, "config", "schedule"), { slots });
        showMessage(scheduleMsg, "Grade de horários salva com sucesso!");
    } catch (e) {
        showMessage(scheduleMsg, "Erro ao salvar a grade.", false);
        console.error(e);
    }
});


// --- Gerenciamento de Serviços (CRUD Dinâmico) ---
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
        </div>`;
    serviceFormContainer.innerHTML = formHtml;
    const fieldsContainer = document.getElementById('dynamic-fields-container');
    if (service.prices) {
        Object.entries(service.prices).forEach(([btu, price]) => addPriceField(fieldsContainer, btu, price));
    }
    document.getElementById('srvImage').addEventListener('change', e => { document.getElementById('srvImagePreview').src = e.target.value; });
    document.getElementById('btnAddField').addEventListener('click', () => addPriceField(fieldsContainer));
    document.getElementById('btnSaveSrv').addEventListener('click', saveService);
    document.getElementById('btnCancelSrv').addEventListener('click', hideServiceForm);
    btnShowAddServiceForm.style.display = 'none';
    serviceFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideServiceForm() {
    serviceFormContainer.innerHTML = '';
    btnShowAddServiceForm.style.display = 'flex';
}

function addPriceField(container, btu = '', price = '') {
    const fieldId = `field-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'dynamic-field';
    div.id = fieldId;
    div.innerHTML = `<input type="text" class="btu-input" placeholder="Capacidade (BTUs)" value="${btu}"><input type="number" class="price-input" placeholder="Preço (R$)" value="${price}"><button type="button" class="remove-field-btn" onclick="document.getElementById('${fieldId}').remove()">×</button>`;
    container.appendChild(div);
}

async function saveService() {
    const id = document.getElementById('srvId').value;
    const name = document.getElementById('srvName').value.trim();
    if (!name) { 
        showMessage(srvMsg, "O nome do serviço é obrigatório.", false); 
        return; 
    }
    const prices = {};
    document.querySelectorAll('#dynamic-fields-container .dynamic-field').forEach(field => {
        const btu = field.querySelector('.btu-input').value.trim();
        const price = parseFloat(field.querySelector('.price-input').value);
        if (btu && !isNaN(price)) { prices[btu] = price; }
    });
    const serviceData = {
        name,
        description: document.getElementById('srvDescription').value.trim(),
        imageUrl: document.getElementById('srvImage').value,
        externalLink: document.getElementById('srvExternalLink').value.trim(),
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
        await loadServices(); 
    } catch (e) { 
        showMessage(srvMsg, "Erro ao salvar o serviço.", false); 
        console.error(e); 
    }
}

async function loadServices() {
    const q = query(collection(db, "services"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    srvList.innerHTML = "";
    if (querySnapshot.empty) { srvList.innerHTML = "<p>Nenhum serviço cadastrado.</p>"; return; }
    querySnapshot.forEach(docSnap => {
        const service = { id: docSnap.id, ...docSnap.data() };
        const div = document.createElement('div');
        div.className = 'service-item-admin';
        div.innerHTML = `<img src="${service.imageUrl}" alt="${service.name}"><div class="service-info"><strong>${service.name}</strong><span>${service.description || 'Sem descrição'}</span></div><div class="service-actions"><button class="edit-btn">Editar</button><button class="delete-btn">Excluir</button></div>`;
        div.querySelector('.edit-btn').addEventListener('click', () => createServiceForm(service));
        div.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja excluir o serviço "${service.name}"?`)) {
                await deleteDoc(doc(db, "services", service.id));
                showMessage(srvMsg, "Serviço excluído.");
                await loadServices(); 
            }
        });
        srvList.appendChild(div);
    });
}

btnShowAddServiceForm.addEventListener('click', () => createServiceForm());

// --- Gestão de Serviços Realizados (CRUD) ---
btnSearchClient.addEventListener('click', async () => {
    const phone = searchClientPhone.value.replace(/\D/g, "");
    if (phone.length < 10) { showMessage(searchMsg, "Digite um número de WhatsApp válido.", false); return; }
    
    showMessage(searchMsg, "Buscando...", true, 0);
    const q = query(collection(db, "agendamentos"), where("telefoneCliente", "==", "55" + phone), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        showMessage(searchMsg, "Nenhum serviço encontrado. Preencha para criar um novo.", false);
        resetManualForm();
        mFone.value = searchClientPhone.value;
        maskPhone(mFone);
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
    mFone.value = (data.telefoneCliente || "").replace(/^55/, ''); 
    maskPhone(mFone);
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
    manualServiceForm.querySelectorAll('input:not([type=hidden]), select, textarea').forEach(el => el.value = '');
    mServiceId.value = '';
}

function getManualFormData() {
    const requiredFields = [mNome, mFone, mData, mHora, mTipoEquipamento, mCapacidade];
    if (requiredFields.some(f => !f.value.trim())) {
        showMessage(searchMsg, "Preencha todos os campos obrigatórios.", false);
        return null;
    }
    const [ano, mes, dia] = mData.value.split('-');
    const phoneOnlyDigits = mFone.value.replace(/\D/g, "");

    return {
        nomeCliente: mNome.value.trim(),
        telefoneCliente: "55" + phoneOnlyDigits,
        enderecoCliente: mEndereco.value.trim(),
        tipoEquipamento: mTipoEquipamento.value,
        capacidadeBtus: mCapacidade.value,
        observacoes: mObs.value.trim(),
        dataAgendamento: `${dia}/${mes}/${ano}`,
        horaAgendamento: mHora.value,
        timestamp: new Date(`${mData.value}T${mHora.value}`).getTime(),
        status: "Concluído",
        origem: "Manual"
    };
}

btnSaveManual.addEventListener('click', async () => {
    const data = getManualFormData();
    if (!data) return;
    try {
        await addDoc(collection(db, "agendamentos"), data);
        showMessage(searchMsg, "Novo serviço salvo com sucesso!", true);
        manualServiceForm.style.display = 'none';
    } catch (e) { showMessage(searchMsg, "Erro ao salvar novo serviço.", false); }
});

btnUpdateManual.addEventListener('click', async () => {
    const id = mServiceId.value;
    if (!id) return;
    const data = getManualFormData();
    if (!data) return;
    try {
        await setDoc(doc(db, "agendamentos", id), data, { merge: true });
        showMessage(searchMsg, "Serviço atualizado com sucesso!", true);
    } catch (e) { showMessage(searchMsg, "Erro ao atualizar serviço.", false); }
});

btnDeleteManual.addEventListener('click', async () => {
    const id = mServiceId.value;
    if (!id || !confirm("Tem certeza que deseja excluir este registro de serviço?")) return;
    try {
        await deleteDoc(doc(db, "agendamentos", id));
        showMessage(searchMsg, "Registro excluído com sucesso!", true);
        manualServiceForm.style.display = 'none';
    } catch (e) { showMessage(searchMsg, "Erro ao excluir registro.", false); }
});

// --- Ações Gerais e Lembretes ---
btnSaveSite.addEventListener("click", async () => {
    try {
        await setDoc(doc(db, "config", "site"), {
            companyName: cfgCompanyName.value.trim(),
            description: cfgCompanyDesc.value.trim(),
            heroUrl: cfgHeroUrl.value,
            whatsappNumber: cfgWhats.value.replace(/\D/g, ""),
            reminderMonths: Number(cfgReminderMonths.value) || 12
        }, { merge: true });
        showMessage(siteMsg, "Configurações salvas com sucesso!");
    } catch (e) { showMessage(siteMsg, "Erro ao salvar configurações.", false); }
});

btnRodarLembretes.addEventListener("click", async () => {
    reminderLog.innerHTML = "<li>Buscando clientes...</li>";
    const months = Number(cfgReminderMonths.value) || 12;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - months);
    const targetTimestamp = targetDate.getTime();
    const q = query(collection(db, "agendamentos"), where("timestamp", "<=", targetTimestamp));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) { reminderLog.innerHTML = "<li>Nenhum cliente elegível para lembrete hoje.</li>"; return; }
    reminderLog.innerHTML = "";
    let foundAny = false;
    querySnapshot.forEach(docSnap => {
        const d = docSnap.data();
        const servicoInfo = d.servico || d.tipoEquipamento || '';
        if (servicoInfo.toLowerCase().includes('limpeza')) {
            foundAny = true;
            const msg = `🔔 *Lembrete de Limpeza* \nOlá, ${d.nomeCliente}! Notamos que sua última limpeza de ar-condicionado foi há ${months} meses. Deseja agendar uma nova visita?`;
            
            // CORREÇÃO DEFINITIVA: Usa o número do cliente que já está com '55' no banco.
            const url = `https://wa.me/${d.telefoneCliente}?text=${encodeURIComponent(msg)}`;
            
            const li = document.createElement('li');
            li.innerHTML = `Encontrado: ${d.nomeCliente} (${new Date(d.timestamp).toLocaleDateString()}) - <a href="${url}" target="_blank">Enviar Lembrete</a>`;
            reminderLog.appendChild(li);
        }
    });
    if (!foundAny) { reminderLog.innerHTML = "<li>Nenhum serviço de 'Limpeza' encontrado no período.</li>"; }
});
