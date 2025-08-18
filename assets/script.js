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
    await Promise.all([loadSiteConfig(), loadServices()]);
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
    appState.servicoSelecionado = servico;
    detalhesWrapper.style.display = "block";
    if (window.innerWidth < 768) {
        detalhesWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    nomeInput.focus();
    validarFormulario();
}

function validarFormulario() {
    if (!appState.servicoSelecionado) return;

    const nomeValido = nomeInput.value.trim().length > 2;
    const whatsappValido = whatsappInput.value.replace(/\D/g, "").length === 11;
    const tipoEquipamentoValido = tipoEquipamentoSelect.value !== "";
    const capacidadeValida = capacidadeBtusSelect.value !== "";
    const dadosBasicosValidos = nomeValido && whatsappValido && tipoEquipamentoValido && capacidadeValida;

    orcamentoWrapper.style.display = dadosBasicosValidos && appState.servicoSelecionado.showBudget ? "block" : "none";
    agendamentoWrapper.style.display = dadosBasicosValidos && appState.servicoSelecionado.showSchedule ? "block" : "none";

    if (orcamentoWrapper.style.display === "block") {
        gerarHtmlOrcamento();
    }

    let agendamentoValido = true;
    if (agendamentoWrapper.style.display === "block") {
        const dataValida = dataAgendamentoInput.value !== "";
        const horarioValido = horarioAgendamentoSelect.value !== "" && !horarioAgendamentoSelect.disabled;
        const pagamentoValido = formaPagamentoSelect.value !== "";
        agendamentoValido = dataValida && horarioValido && pagamentoValido;
    }

    btnFinalizar.disabled = !(dadosBasicosValidos && (orcamentoWrapper.style.display === "block" || agendamentoWrapper.style.display === "block") && agendamentoValido);
}

function calcularValorOrcamento() {
    if (!appState.servicoSelecionado || !appState.servicoSelecionado.prices) return 0;
    const btuSelecionado = capacidadeBtusSelect.value;
    return appState.servicoSelecionado.prices[btuSelecionado] || 0;
}

function gerarHtmlOrcamento() {
    appState.valorOrcamento = calcularValorOrcamento();
    const valorTexto = appState.valorOrcamento > 0 ? `R$ ${appState.valorOrcamento.toFixed(2)}` : "Sob Consulta";
    const observacoesTexto = observacoesTextarea.value.trim();

    let html = `
        <div class="orcamento-item"><strong>Serviço:</strong><span>${appState.servicoSelecionado.name}</span></div>
        <div class="orcamento-item"><strong>Nome:</strong><span>${nomeInput.value}</span></div>
        <div class="orcamento-item"><strong>Equipamento:</strong><span>${tipoEquipamentoSelect.value}</span></div>
        <div class="orcamento-item"><strong>Capacidade:</strong><span>${capacidadeBtusSelect.value} BTUs</span></div>
        <div class="orcamento-total"><strong>Valor Total:</strong><span>${valorTexto}</span></div>`;
    
    if (observacoesTexto) {
        html += `<div class="orcamento-item"><strong>Observações:</strong><span>${observacoesTexto}</span></div>`;
    }
    relatorioOrcamentoDiv.innerHTML = html;
}

// --- Calendário e Horários ---
let calendario = null;
function initCalendar() {
    calendario = flatpickr(dataAgendamentoInput, {
        locale: "pt",
        minDate: "today",
        dateFormat: "d/m/Y",
        disable: [(date) => date.getDay() === 0],
        onChange: (selectedDates, dateStr) => {
            if (dateStr) {
                atualizarHorariosDisponiveis(dateStr);
            }
        }
    });
}

async function atualizarHorariosDisponiveis(dataSelecionada) {
    horarioAgendamentoSelect.disabled = true;
    horarioAgendamentoSelect.innerHTML = '<option value="">Verificando...</option>';
    
    try {
        const scheduleDoc = await getDoc(doc(db, "config", "schedule"));
        if (!scheduleDoc.exists() || !scheduleDoc.data().slots) {
            horarioAgendamentoSelect.innerHTML = '<option value="">Nenhum horário configurado</option>';
            return;
        }
        const gradeDeHorarios = scheduleDoc.data().slots.sort((a, b) => a.time.localeCompare(b.time));

        const q = query(collection(db, "agendamentos"), where("dataAgendamento", "==", dataSelecionada));
        const querySnapshot = await getDocs(q);
        
        const agendamentosPorHora = {};
        querySnapshot.forEach(doc => {
            const hora = doc.data().horaAgendamento;
            if (!agendamentosPorHora[hora]) {
                agendamentosPorHora[hora] = 0;
            }
            agendamentosPorHora[hora]++;
        });

        const horariosLivres = gradeDeHorarios.filter(slot => {
            const agendados = agendamentosPorHora[slot.time] || 0;
            return agendados < slot.vacancies;
        });

        if (horariosLivres.length > 0) {
            horarioAgendamentoSelect.innerHTML = '<option value="">Selecione um horário</option>';
            horariosLivres.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot.time;
                option.textContent = slot.time;
                horarioAgendamentoSelect.appendChild(option);
});
            horarioAgendamentoSelect.disabled = false;
        } else {
            horarioAgendamentoSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
        }
    } catch (err) {
        console.error("Ocorreu um erro ao buscar horários:", err);
        horarioAgendamentoSelect.innerHTML = '<option value="">Erro ao carregar</option>';
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

    const dadosAgendamento = {
        servico: appState.servicoSelecionado.name,
        valor: appState.valorOrcamento,
        nomeCliente: nomeInput.value.trim(),
        telefoneCliente: whatsappInput.value.replace(/\D/g, ""),
        tipoEquipamento: tipoEquipamentoSelect.value,
        capacidadeBtus: capacidadeBtusSelect.value,
        observacoes: observacoesTextarea.value.trim() || "Nenhuma",
        timestamp: new Date().getTime(),
        status: "Agendado",
        whatsappStatus: "pending" // Para controle de back-end
    };

    if (appState.servicoSelecionado.showSchedule) {
        dadosAgendamento.dataAgendamento = dataAgendamentoInput.value;
        dadosAgendamento.horaAgendamento = horarioAgendamentoSelect.value;
        dadosAgendamento.formaPagamento = formaPagamentoSelect.value;
    }

    try {
        await addDoc(collection(db, "agendamentos"), dadosAgendamento);
        
        alert("Agendamento salvo com sucesso! Você receberá uma confirmação no WhatsApp em breve.");
        
        const mensagem = criarMensagemWhatsApp(dadosAgendamento);
        const url = `https://wa.me/${appState.configSite.whatsappNumber}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, "_blank");
        
        setTimeout(() => window.location.reload(), 500);

    } catch (err) {
        console.error("Falha ao salvar agendamento:", err);
        alert("Houve uma falha ao salvar seu agendamento. Por favor, tente novamente. Se o erro persistir, entre em contato conosco.");
        btnFinalizar.disabled = false;
        btnFinalizarTexto.textContent = "Tentar Novamente";
    }
});

function criarMensagemWhatsApp(dados) {
    let msg = `✅ *Nova Solicitação de Serviço* ✅\n-----------------------------------\n`;
    msg += `👤 *Cliente:* ${dados.nomeCliente}\n`;
    msg += `📞 *Contato:* ${dados.telefoneCliente}\n`;
    msg += `🛠️ *Serviço:* ${dados.servico}\n`;
    msg += `🔌 *Equipamento:* ${dados.tipoEquipamento} (${dados.capacidadeBtus} BTUs)\n`;

    if (appState.servicoSelecionado.showBudget) {
        const valorTxt = dados.valor > 0 ? `R$ ${dados.valor.toFixed(2)}` : "Sob Consulta";
        msg += `💰 *Valor:* ${valorTxt}\n`;
    }
    if (appState.servicoSelecionado.showSchedule) {
        msg += `🗓️ *Data:* ${dados.dataAgendamento}\n`;
        msg += `⏰ *Hora:* ${dados.horaAgendamento}\n`;
        msg += `💳 *Pagamento:* ${dados.formaPagamento}\n`;
    }
    
    if (dados.observacoes && dados.observacoes !== "Nenhuma") {
        msg += `📝 *Observações:* ${dados.observacoes}`;
    }
    
    return msg;
}

// --- Atualização da Data no Rodapé ---
if (ultimaAtualizacaoEl) {
    const dataModificacao = new Date(document.lastModified);
    ultimaAtualizacaoEl.textContent = "Última atualização: " + dataModificacao.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}
