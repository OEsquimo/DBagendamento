import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Configuração Firebase (usando as suas credenciais) ---
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
      cfgWhats = document.getElementById("cfgWhats"),
      cfgReminderMonths = document.getElementById("cfgReminderMonths"),
      siteMsg = document.getElementById("siteMsg"),
      btnSaveSite = document.getElementById("btnSaveSite"),
      serviceFormContainer = document.getElementById("service-form-container"),
      btnShowAddServiceForm = document.getElementById("btnShowAddServiceForm"),
      srvList = document.getElementById("srvList"),
      srvMsg = document.getElementById("srvMsg"),
      mNome = document.getElementById("mNome"),
      mFone = document.getElementById("mFone"),
      mEndereco = document.getElementById("mEndereco"),
      mTipoEquipamento = document.getElementById("mTipoEquipamento"),
      mCapacidade = document.getElementById("mCapacidade"),
      mServico = document.getElementById("mServico"),
      mObs = document.getElementById("mObs"),
      mData = document.getElementById("mData"),
      mHora = document.getElementById("mHora"),
      btnSalvarManual = document.getElementById("btnSalvarManual"),
      manualMsg = document.getElementById("manualMsg"),
      btnRodarLembretes = document.getElementById("btnRodarLembretes"),
      reminderLog = document.getElementById("reminderLog");

// --- Estado e Helpers ---
let siteState = {};
const imageGallery = [
    { name: "Instalação Padrão", url: "assets/imagens/instalacao-ar.jpg" },
    { name: "Limpeza de Split", url: "assets/imagens/limpeza-split.jpg" },
    { name: "Manutenção Preventiva", url: "assets/imagens/manutencao-ar.jpg" },
    { name: "Técnico em Serviço", url: "assets/imagens/tecnico-trabalhando.jpg" },
    { name: "Condensadora Externa", url: "assets/imagens/condensadora_lg.jpg" }
];

// Aplica máscara de telefone a um campo de input
const maskPhone = (input) => {
    const applyMask = (e) => {
        let v = e.target.value.replace(/\D/g, "").slice(0, 11);
        if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
        if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
        e.target.value = v;
    };
    input.addEventListener('input', applyMask);
    // Força a aplicação da máscara no valor inicial, se houver
    input.dispatchEvent(new Event('input'));
};

// Exibe uma mensagem de feedback para o usuário
const showMessage = (el, text, success = true, duration = 3000) => {
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
// Função principal que carrega todos os dados necessários para o painel
async function loadAdminData() {
    await Promise.all([loadSiteConfig(), loadServices()]);
}

// Carrega as configurações do site (nome, whats, etc) e preenche os campos
async function loadSiteConfig() {
    const docRef = doc(db, "config", "site");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        siteState = docSnap.data();
        cfgCompanyName.value = siteState.companyName || "";
        cfgCompanyDesc.value = siteState.description || "";
        cfgHeroUrl.value = siteState.heroUrl || "";
        cfgWhats.value = siteState.whatsappNumber || "";
        cfgReminderMonths.value = siteState.reminderMonths || 12;
        maskPhone(cfgWhats);
    }
}

// --- Gerenciamento de Serviços (CRUD Dinâmico) ---

// Cria e exibe o formulário para adicionar ou editar um serviço
function createServiceForm(service = {}) {
    const isEditing = !!service.id;
    serviceFormContainer.innerHTML = `
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

    const fieldsContainer = document.getElementById('dynamic-fields-container');
    if (service.prices) {
        Object.entries(service.prices).forEach(([btu, price]) => addPriceField(fieldsContainer, btu, price));
    }

    // Adiciona os listeners de evento aos novos elementos do formulário
    document.getElementById('srvImage').addEventListener('change', e => {
        document.getElementById('srvImagePreview').src = e.target.value;
    });
    document.getElementById('btnAddField').addEventListener('click', () => addPriceField(fieldsContainer));
    document.getElementById('btnSaveSrv').addEventListener('click', saveService);
    document.getElementById('btnCancelSrv').addEventListener('click', () => {
        serviceFormContainer.innerHTML = '';
        btnShowAddServiceForm.style.display = 'flex';
    });
    
    // Esconde o botão "Adicionar Novo" para evitar confusão
    btnShowAddServiceForm.style.display = 'none';
}

// Adiciona um novo par de campos (BTU e Preço) ao formulário de serviço
function addPriceField(container, btu = '', price = '') {
    const fieldId = `field-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'dynamic-field';
    div.id = fieldId;
    div.innerHTML = `
        <input type="text" class="btu-input" placeholder="Capacidade (BTUs)" value="${btu}">
        <input type="number" class="price-input" placeholder="Preço (R$)" value="${price}">
        <button type="button" class="remove-field-btn" onclick="document.getElementById('${fieldId}').remove()">×</button>
    `;
    container.appendChild(div);
}

// Salva (cria ou atualiza) um serviço no Firestore
async function saveService() {
    const id = document.getElementById('srvId').value;
    const name = document.getElementById('srvName').value.trim();
    if (!name) {
        showMessage(srvMsg, "O nome do serviço é obrigatório.", false);
        return;
    }

    const prices = {};
    document.querySelectorAll('.dynamic-field').forEach(field => {
        const btu = field.querySelector('.btu-input').value.trim();
        const price = parseFloat(field.querySelector('.price-input').value);
        if (btu && !isNaN(price)) {
            prices[btu] = price;
        }
    });

    const serviceData = {
        name,
        description: document.getElementById('srvDescription').value.trim(),
        imageUrl: document.getElementById('srvImage').value,
        showBudget: document.getElementById('srvShowBudget').checked,
        showSchedule: document.getElementById('srvShowSchedule').checked,
        prices: prices,
        lastUpdated: new Date().toISOString()
    };

    try {
        const docRef = id ? doc(db, "services", id) : doc(collection(db, "services"));
        await setDoc(docRef, serviceData, { merge: true });
        showMessage(srvMsg, `Serviço ${id ? 'atualizado' : 'salvo'} com sucesso!`);
        serviceFormContainer.innerHTML = '';
        btnShowAddServiceForm.style.display = 'flex';
        loadServices(); // Recarrega a lista para mostrar as alterações
    } catch (e) {
        showMessage(srvMsg, "Erro ao salvar o serviço.", false);
        console.error(e);
    }
}

// Carrega e exibe a lista de serviços já cadastrados
async function loadServices() {
    const q = query(collection(db, "services"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    srvList.innerHTML = "";
    if (querySnapshot.empty) {
        srvList.innerHTML = "<p>Nenhum serviço cadastrado.</p>";
        return;
    }
    querySnapshot.forEach(docSnap => {
        const service = { id: docSnap.id, ...docSnap.data() };
        const div = document.createElement('div');
        div.className = 'service-item-admin';
        div.innerHTML = `
            <img src="${service.imageUrl}" alt="${service.name}">
            <div class="service-info">
                <strong>${service.name}</strong>
                <span>${service.description || 'Sem descrição'}</span>
            </div>
            <div class="service-actions">
                <button class="edit-btn">Editar</button>
                <button class="delete-btn">Excluir</button>
            </div>
        `;
        div.querySelector('.edit-btn').addEventListener('click', () => createServiceForm(service));
        div.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja excluir o serviço "${service.name}"?`)) {
                await deleteDoc(doc(db, "services", service.id));
                showMessage(srvMsg, "Serviço excluído.");
                loadServices();
            }
        });
        srvList.appendChild(div);
    });
}

btnShowAddServiceForm.addEventListener('click', () => createServiceForm());

// --- Ações Gerais e Manuais ---

// Salva as configurações gerais do site
btnSaveSite.addEventListener("click", async () => {
    try {
        await setDoc(doc(db, "config", "site"), {
            companyName: cfgCompanyName.value.trim(),
            description: cfgCompanyDesc.value.trim(),
            heroUrl: cfgHeroUrl.value.trim(),
            whatsappNumber: cfgWhats.value.replace(/\D/g, ""),
            reminderMonths: Number(cfgReminderMonths.value)
        }, { merge: true });
        showMessage(siteMsg, "Configurações salvas com sucesso!");
    } catch (e) {
        showMessage(siteMsg, "Erro ao salvar configurações.", false);
    }
});

// Salva um serviço realizado manualmente
btnSalvarManual.addEventListener("click", async () => {
    const requiredFields = [mNome, mFone, mData, mHora, mTipoEquipamento, mCapacidade, mServico];
    if (requiredFields.some(f => !f.value.trim())) {
        showMessage(manualMsg, "Preencha todos os campos obrigatórios.", false);
        return;
    }
    try {
        await addDoc(collection(db, "agendamentos"), {
            nomeCliente: mNome.value.trim(),
            telefoneCliente: mFone.value.replace(/\D/g, ""),
            enderecoCliente: mEndereco.value.trim(),
            tipoEquipamento: mTipoEquipamento.value,
            capacidadeBtus: mCapacidade.value,
            servicoDesejado: mServico.value,
            observacoes: mObs.value.trim(),
            dataAgendamento: mData.value.split('-').reverse().join('/'),
            horaAgendamento: mHora.value,
            timestamp: new Date(`${mData.value}T${mHora.value}`).getTime(),
            status: "Concluído",
            origem: "Manual"
        });
        showMessage(manualMsg, "Serviço manual cadastrado com sucesso!");
        [...requiredFields, mEndereco, mObs].forEach(f => f.value = '');
    } catch (e) {
        showMessage(manualMsg, "Erro ao salvar serviço manual.", false);
    }
});

// Roda a lógica para encontrar e sugerir o envio de lembretes de limpeza
btnRodarLembretes.addEventListener("click", async () => {
    reminderLog.innerHTML = "<li>Buscando clientes...</li>";
    const months = siteState.reminderMonths || 12;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - months);
    
    // Para simplificar, vamos considerar o início do dia para a comparação
    targetDate.setHours(0, 0, 0, 0);
    const targetTimestamp = targetDate.getTime();

    const q = query(collection(db, "agendamentos"), where("servicoDesejado", "==", "Limpeza"), where("timestamp", "<=", targetTimestamp));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        reminderLog.innerHTML = "<li>Nenhum cliente elegível para lembrete hoje.</li>";
        return;
    }
    reminderLog.innerHTML = "";
    querySnapshot.forEach(docSnap => {
        const d = docSnap.data();
        const msg = `🔔 *Lembrete de Limpeza* \nOlá, ${d.nomeCliente}! Notamos que sua última limpeza de ar-condicionado foi há ${months} meses. Deseja agendar uma nova visita para manter seu equipamento funcionando perfeitamente?`;
        const url = `https://wa.me/55${d.telefoneCliente.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
        const li = document.createElement('li');
        li.innerHTML = `Enviando para ${d.nomeCliente}... <a href="${url}" target="_blank">Abrir no WhatsApp</a>`;
        reminderLog.appendChild(li);
        window.open(url, "_blank");
    });
});

// --- Inicialização ---
// Aplica as máscaras de telefone assim que o script carrega
maskPhone(cfgWhats);
maskPhone(mFone);
