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

// --- Mapeamento DOM (sem alterações) ---
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
      btnFinalizarTexto = document.getElementById("btn_finalizar_texto");

// --- Estado da Aplicação (sem alterações) ---
const appState = {
    servicoSelecionado: null,
    valorOrcamento: 0,
    whatsappNumber: "5581000000000",
    configSite: {},
    servicos: []
};

// --- Helpers (sem alterações) ---
const maskPhone = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
    e.target.value = v;
};
whatsappInput.addEventListener("input", maskPhone);

// --- Lógica Principal (sem alterações) ---
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadSiteConfig(), loadServices()]);
    initCalendar();
    renderServices();
    form.addEventListener("input", validarFormulario);
});

async function loadSiteConfig() {
    try {
        const docSnap = await getDoc(doc(db, "config", "site"));
        if (docSnap.exists()) {
            appState.configSite = docSnap.data();
            companyNameEl.textContent = appState.configSite.companyName || "Nome da Empresa";
            siteTitle.textContent = `${appState.configSite.companyName || "Serviços"} - Agendamento`;
            companyDescEl.textContent = appState.configSite.description || "Descrição dos serviços.";
            if (appState.configSite.heroUrl) heroImage.src = appState.configSite.heroUrl;
            if (appState.configSite.whatsappNumber) appState.whatsappNumber = appState.configSite.whatsappNumber;
        }
    } catch (error) {
        console.error("Erro ao carregar configurações do site:", error);
    }
}

async function loadServices() {
    try {
        const q = query(collection(db, "services"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        appState.servicos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        servicosGrid.innerHTML = "<p>Não foi possível carregar os serviços. Tente novamente mais tarde.</p>";
    }
}

function renderServices() {
    servicosGrid.innerHTML = "";
    if (appState.servicos.length === 0) {
        servicosGrid.innerHTML = "<p>Nenhum serviço disponível no momento.</p>";
        return;
    }
    appState.servicos.forEach(service => {
        const div = document.createElement("div");
        div.className = "servico";
        div.dataset.serviceId = service.id;
        div.innerHTML = `
            <img src="${service.imageUrl || 'assets/imagens/placeholder.jpg'}" alt="${service.name}"/>
            <p>${service.name}</p>
        `;
        div.addEventListener("click", () => handleServiceSelection(service.id));
        servicosGrid.appendChild(div);
    });
}

function handleServiceSelection(serviceId) {
    appState.servicoSelecionado = appState.servicos.find(s => s.id === serviceId);
    
    document.querySelectorAll(".servico").forEach(el => el.classList.remove("selecionado"));
    document.querySelector(`[data-service-id="${serviceId}"]`).classList.add("selecionado");

    detalhesWrapper.style.display = "block";
    if (window.innerWidth < 768) {
        detalhesWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    nomeInput.focus();
    validarFormulario();
}

function calcularOrcamento() {
    if (!appState.servicoSelecionado || !appState.servicoSelecionado.prices) return 0;
    const btu = capacidadeBtusSelect.value;
    return appState.servicoSelecionado.prices[btu] || 0;
}

function gerarHtmlOrcamento() {
    appState.valorOrcamento = calcularOrcamento();
    const valorTexto = appState.valorOrcamento > 0 ? `R$ ${appState.valorOrcamento.toFixed(2)}` : "Sob Análise";
    
    return `
        <div class="orcamento-item"><strong>Serviço:</strong><span>${appState.servicoSelecionado.name}</span></div>
        <div class="orcamento-item"><strong>Nome:</strong><span>${nomeInput.value}</span></div>
        <div class="orcamento-item"><strong>Capacidade:</strong><span>${capacidadeBtusSelect.options[capacidadeBtusSelect.selectedIndex].text}</span></div>
        <div class="orcamento-total"><strong>Valor Total:</strong><span>${valorTexto}</span></div>
    `;
}

function validarFormulario() {
    if (!appState.servicoSelecionado) return;

    const { showBudget, showSchedule } = appState.servicoSelecionado;
    let isFormValid = true;

    const fields = [nomeInput, whatsappInput, tipoEquipamentoSelect, capacidadeBtusSelect];
    for (const field of fields) {
        if (!field.value) {
            isFormValid = false;
            break;
        }
    }
    if (whatsappInput.value.replace(/\D/g, "").length < 10) isFormValid = false;

    if (isFormValid && showBudget) {
        orcamentoWrapper.style.display = 'block';
        relatorioOrcamentoDiv.innerHTML = gerarHtmlOrcamento();
    } else {
        orcamentoWrapper.style.display = 'none';
    }

    if (isFormValid && showSchedule) {
        agendamentoWrapper.style.display = 'block';
    } else {
        agendamentoWrapper.style.display = 'none';
    }

    let isButtonEnabled = isFormValid;
    if (showSchedule && isFormValid) {
        if (!dataAgendamentoInput.value || !horarioAgendamentoSelect.value || !formaPagamentoSelect.value) {
            isButtonEnabled = false;
        }
    }
    
    btnFinalizar.disabled = !isButtonEnabled;
    
    if (!isFormValid) {
        btnFinalizarTexto.textContent = "Preencha os dados para continuar";
    } else if (showSchedule && !dataAgendamentoInput.value) {
        btnFinalizarTexto.textContent = "Escolha uma data";
    } else if (showSchedule && !horarioAgendamentoSelect.value) {
        btnFinalizarTexto.textContent = "Escolha um horário";
    } else {
        btnFinalizarTexto.textContent = showSchedule ? "Finalizar Agendamento" : "Solicitar Orçamento";
    }
}

// --- Calendário e Horários ---
let calendario = null;
function initCalendar() {
    calendario = flatpickr(dataAgendamentoInput, {
        locale: "pt",
        minDate: "today",
        dateFormat: "d/m/Y",
        disable: [(date) => date.getDay() === 0],
        onChange: (selectedDates, dateStr) => { // Usar o segundo argumento (dateStr)
            if (selectedDates.length > 0) {
                atualizarHorariosDisponiveis(dateStr); // Passa a data formatada
            }
        }
    });
}

// CORRIGIDO: Lógica de consulta de horários restaurada para a versão funcional
async function atualizarHorariosDisponiveis(dataSelecionada) {
    horarioAgendamentoSelect.disabled = true;
    horarioAgendamentoSelect.innerHTML = '<option value="">Verificando...</option>';
    try {
        const horariosBase = ["08:00", "10:00", "13:00", "15:00", "17:00"];
        // A consulta funciona perfeitamente com o campo de texto 'dataAgendamento'
        const q = query(collection(db, "agendamentos"), where("dataAgendamento", "==", dataSelecionada));
        const querySnapshot = await getDocs(q);
        const ocupados = querySnapshot.docs.map(d => d.data().horaAgendamento);
        const livres = horariosBase.filter(h => !ocupados.includes(h));

        if (livres.length > 0) {
            horarioAgendamentoSelect.innerHTML = '<option value="">Selecione um horário</option>';
            livres.forEach(h => horarioAgendamentoSelect.innerHTML += `<option value="${h}">${h}</option>`);
            horarioAgendamentoSelect.disabled = false;
        } else {
            horarioAgendamentoSelect.innerHTML = '<option value="">Sem horários hoje</option>';
        }
    } catch (err) {
        console.error("Erro ao buscar horários:", err);
        horarioAgendamentoSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
    } finally {
        validarFormulario();
    }
}

// --- Submissão do Formulário ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnFinalizar.disabled) return;

    btnFinalizar.disabled = true;
    btnFinalizarTexto.textContent = "Salvando...";

    // CORRIGIDO: Garante que a data e o timestamp sejam salvos corretamente
    const dataSelecionada = dataAgendamentoInput.value;
    const horaSelecionada = horarioAgendamentoSelect.value;
    let timestamp = new Date().getTime();
    if (dataSelecionada && horaSelecionada) {
        const [dia, mes, ano] = dataSelecionada.split('/');
        timestamp = new Date(`${ano}-${mes}-${dia}T${horaSelecionada}`).getTime();
    }

    const dadosAgendamento = {
        servico: appState.servicoSelecionado.name,
        valor: appState.valorOrcamento,
        nomeCliente: nomeInput.value.trim(),
        telefoneCliente: whatsappInput.value.replace(/\D/g, ""),
        tipoEquipamento: tipoEquipamentoSelect.value,
        capacidadeBtus: capacidadeBtusSelect.value,
        observacoes: observacoesTextarea.value.trim() || "Nenhuma",
        timestamp: timestamp,
        status: appState.servicoSelecionado.showSchedule ? "Agendado" : "Orçamento Solicitado",
        dataAgendamento: dataSelecionada || null,
        horaAgendamento: horaSelecionada || null,
        formaPagamento: formaPagamentoSelect.value || null
    };

    try {
        if (appState.servicoSelecionado.showSchedule) {
            const q = query(collection(db, "agendamentos"), where("dataAgendamento", "==", dadosAgendamento.dataAgendamento), where("horaAgendamento", "==", dadosAgendamento.horaAgendamento));
            const snap = await getDocs(q);
            if (!snap.empty) {
                alert("Desculpe, este horário acabou de ser preenchido! Por favor, selecione outro.");
                btnFinalizar.disabled = false;
                atualizarHorariosDisponiveis(dadosAgendamento.dataAgendamento);
                return;
            }
        }

        await addDoc(collection(db, "agendamentos"), dadosAgendamento);

        const mensagemWhats = criarMensagemWhatsApp(dadosAgendamento);
        const url = `https://wa.me/55${appState.whatsappNumber}?text=${encodeURIComponent(mensagemWhats)}`;
        
        alert("Solicitação enviada com sucesso! Você será redirecionado para o WhatsApp para confirmar.");
        window.open(url, "_blank");
        setTimeout(() => window.location.reload(), 500);

    } catch (err) {
        console.error("Falha ao salvar agendamento:", err);
        alert("Houve uma falha ao enviar sua solicitação. Tente novamente.");
        btnFinalizar.disabled = false;
        btnFinalizarTexto.textContent = "Tentar Novamente";
    }
});

function criarMensagemWhatsApp(dados) {
    let msg = `✅ *Nova Solicitação de Serviço* ✅\n-----------------------------------\n`;
    msg += `👤 *Cliente:* ${dados.nomeCliente}\n`;
    msg += `📞 *Contato:* ${dados.telefoneCliente}\n`;
    msg += `🛠️ *Servi
