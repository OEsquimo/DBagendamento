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
    } else {
        agendamentoValido = false;
    }

    btnFinalizar.disabled = !(dadosBasicosValidos && (appState.servicoSelecionado.showBudget || appState.servicoSelecionado.showSchedule) && (!appState.servicoSelecionado.showSchedule || agendamentoValido));
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
        <div class="orcamento-item"><strong>WhatsApp:</strong><span>${whatsappInput.value}</span></div>
        <div class="orcamento-item"><strong>Equipamento:</strong><span>${tipoEquipamentoSelect.value}</span></div>
        <div class="orcamento-item"><strong>Capacidade:</strong><span>${capacidadeBtusSelect.value} BTUs</span></div>
    `;
    if (observacoesTexto) {
        html += `<div class="orcamento-item"><strong>Observações:</strong><span>${observacoesTexto}</span></div>`;
    }
    html += `<div class="orcamento-total"><strong>Valor Total:</strong><span>${valorTexto}</span></div>`;
    relatorioOrcamentoDiv.innerHTML = html;
}

// --- Calendário e Horários ---
let calendario = null;
function initCalendar() {
    calendario = flatpickr(dataAgendamentoInput, {
        locale: "pt",
        minDate: "today",
        dateFormat: "d/m/Y",
        disable: [(date) => date.getDay() === 0], // Desabilita Domingos
        onChange: (selectedDates) => {
            if (selectedDates.length > 0) {
                const dataFormatada = calendario.input.value;
                atualizarHorariosDisponiveis(dataFormatada);
            }
        }
    });
}

async function atualizarHorariosDisponiveis(dataSelecionada) {
    horarioAgendamentoSelect.disabled = true;
    horarioAgendamentoSelect.innerHTML = '<option value="">Verificando horários...</option>';
    try {
        const horariosBase = appState.configSchedule.slots.sort((a, b) => a.time.localeCompare(b.time)) || [];
        if (horariosBase.length === 0) {
            horarioAgendamentoSelect.innerHTML = '<option value="">Nenhum horário configurado</option>';
            return;
        }

        const q = query(collection(db, "agendamentos"), where("dataAgendamento", "==", dataSelecionada));
        const querySnapshot = await getDocs(q);
        const agendamentosDoDia = querySnapshot.docs.map(d => d.data().horaAgendamento);

        const contagemAgendamentos = agendamentosDoDia.reduce((acc, hora) => {
            acc[hora] = (acc[hora] || 0) + 1;
            return acc;
        }, {});

        const agora = new Date();
        const [dia, mes, ano] = dataSelecionada.split('/');
        const dataSelecionadaObj = new Date(`${ano}-${mes}-${dia}T00:00:00`);
        const isToday = agora.toDateString() === dataSelecionadaObj.toDateString();

        const horariosDisponiveis = horariosBase.filter(slot => {
            const vagasOcupadas = contagemAgendamentos[slot.time] || 0;
            if (vagasOcupadas >= slot.vacancies) {
                return false;
            }
            if (isToday) {
                const [horaSlot, minutoSlot] = slot.time.split(':');
                if (agora.getHours() > horaSlot || (agora.getHours() == horaSlot && agora.getMinutes() >= minutoSlot)) {
                    return false;
                }
            }
            return true;
        });

        if (horariosDisponiveis.length > 0) {
            horarioAgendamentoSelect.innerHTML = '<option value="">Selecione um horário</option>';
            horariosDisponiveis.forEach(slot => {
                horarioAgendamentoSelect.innerHTML += `<option value="${slot.time}">${slot.time}</option>`;
            });
            horarioAgendamentoSelect.disabled = false;
        } else {
            horarioAgendamentoSelect.innerHTML = '<option value="">Não há horários para este dia</option>';
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
        telefoneCliente: "55" + whatsappInput.value.replace(/\D/g, ""), // Garante o DDI do cliente
        tipoEquipamento: tipoEquipamentoSelect.value,
        capacidadeBtus: capacidadeBtusSelect.value,
        observacoes: observacoesTextarea.value.trim() || "Nenhuma",
        status: "Agendado",
        origem: "Site",
        timestamp: new Date().getTime()
    };

    if (appState.servicoSelecionado.showSchedule) {
        dadosAgendamento.dataAgendamento = dataAgendamentoInput.value;
        dadosAgendamento.horaAgendamento = horarioAgendamentoSelect.value;
        dadosAgendamento.formaPagamento = formaPagamentoSelect.value;
        const [dia, mes, ano] = dadosAgendamento.dataAgendamento.split('/');
        const [hora, minuto] = dadosAgendamento.horaAgendamento.split(':');
        dadosAgendamento.timestamp = new Date(ano, mes - 1, dia, hora, minuto).getTime();
    }

    try {
        await addDoc(collection(db, "agendamentos"), dadosAgendamento);
        const mensagem = criarMensagemWhatsApp(dadosAgendamento);
        
        const adminWhatsAppNumber = appState.configSite.whatsappNumber.replace(/\D/g, "");
        const url = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(mensagem)}`;
        
        alert("Seu agendamento foi recebido com sucesso! Você receberá uma confirmação no WhatsApp em breve.");
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
    msg += `📞 *Contato:* ${dados.telefoneCliente.replace(/^55/, '')}\n`; // Mostra o número sem o 55 na mensagem
    msg += `🛠️ *Serviço:* ${dados.servico}\n`;
    msg += `🔌 *Equipamento:* ${dados.tipoEquipamento} - ${dados.capacidadeBtus} BTUs\n`;

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
