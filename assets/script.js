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
      equipamentosContainer = document.getElementById("equipamentos-container"),
      orcamentoStep = document.getElementById("orcamento-step"),
      btnConfirmarOrcamento = document.getElementById("btn-confirmar-orcamento"),
      relatorioOrcamentoDiv = document.getElementById("relatorio-orcamento"),
      dadosClienteStep = document.getElementById("dados-cliente-step"),
      nomeInput = document.getElementById("nome"),
      enderecoInput = document.getElementById("endereco"),
      whatsappInput = document.getElementById("whatsapp"),
      agendamentoStep = document.getElementById("agendamento-step"),
      dataAgendamentoInput = document.getElementById("data_agendamento"),
      horarioAgendamentoSelect = document.getElementById("horario_agendamento"),
      formaPagamentoSelect = document.getElementById("forma_pagamento"),
      btnFinalizar = document.getElementById("btn_finalizar"),
      btnFinalizarTexto = btnFinalizar.querySelector("span"),
      steps = {
          escolhaServico: document.getElementById("escolha-servico-step"),
          detalhesEquipamentos: document.getElementById("detalhes-equipamentos-step"),
          orcamento: document.getElementById("orcamento-step"),
          dadosCliente: document.getElementById("dados-cliente-step"),
          agendamento: document.getElementById("agendamento-step")
      };

// --- Estado da Aplicação ---
const appState = {
    servicosSelecionados: [],
    configSite: {},
    configSchedule: { slots: [] },
    servicos: [],
    orcamentoTotal: 0
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
    btnConfirmarOrcamento.addEventListener('click', mostrarDadosCliente);
    form.addEventListener("submit", enviarFormulario);
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
    // Verificar se o serviço já foi selecionado
    const index = appState.servicosSelecionados.findIndex(s => s.id === servico.id);
    
    if (index === -1) {
        // Adicionar serviço com quantidade padrão 1
        appState.servicosSelecionados.push({
            ...servico,
            quantidade: 1,
            equipamentos: Array(1).fill().map(() => ({
                tipoEquipamento: "",
                capacidadeBtus: "",
                parteEletricaPronta: "Não",
                observacoes: ""
            }))
        });
        
        // Destacar visualmente o serviço selecionado
        const elementosServico = servicosGrid.querySelectorAll('.servico');
        elementosServico.forEach(el => {
            if (el.querySelector('p').textContent === servico.name) {
                el.classList.add('selecionado');
            }
        });
    } else {
        // Remover serviço se já estiver selecionado
        appState.servicosSelecionados.splice(index, 1);
        
        // Remover destaque visual
        const elementosServico = servicosGrid.querySelectorAll('.servico');
        elementosServico.forEach(el => {
            if (el.querySelector('p').textContent === servico.name) {
                el.classList.remove('selecionado');
            }
        });
    }
    
    // Atualizar interface
    if (appState.servicosSelecionados.length > 0) {
        steps.detalhesEquipamentos.style.display = "block";
        renderFormulariosEquipamentos();
        
        if (window.innerWidth < 768) {
            steps.detalhesEquipamentos.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } else {
        steps.detalhesEquipamentos.style.display = "none";
        steps.orcamento.style.display = "none";
        steps.dadosCliente.style.display = "none";
        steps.agendamento.style.display = "none";
    }
    
    validarFormulario();
}

function renderFormulariosEquipamentos() {
    equipamentosContainer.innerHTML = "";
    
    appState.servicosSelecionados.forEach((servico, servicoIndex) => {
        const servicoSection = document.createElement("div");
        servicoSection.className = "servico-section";
        servicoSection.innerHTML = `
            <h3>${servico.name}</h3>
            <div class="service-quantity">
                <label>Quantidade:</label>
                <input type="number" min="1" value="${servico.quantidade}" 
                       data-servico-index="${servicoIndex}" 
                       class="quantidade-servico">
            </div>
        `;
        
        // Adicionar formulários para cada equipamento
        servico.equipamentos.forEach((equipamento, equipamentoIndex) => {
            let equipamentoHtml = `
                <div class="equipamento-item" data-servico-index="${servicoIndex}" data-equipamento-index="${equipamentoIndex}">
                    <div class="equipamento-header">
                        <h4>${servico.name} #${equipamentoIndex + 1}</h4>
                        ${equipamentoIndex > 0 ? '<button type="button" class="remove-equipamento">Remover</button>' : ''}
                    </div>
                    <div class="grid-form">
                        <div>
                            <label>Tipo de equipamento</label>
                            <select class="tipo-equipamento" required>
                                <option value="">Selecione...</option>
                                <option value="Janela" ${equipamento.tipoEquipamento === "Janela" ? "selected" : ""}>Janela</option>
                                <option value="Split" ${equipamento.tipoEquipamento === "Split" ? "selected" : ""}>Split (Hi-Wall)</option>
                                <option value="Multi-Split" ${equipamento.tipoEquipamento === "Multi-Split" ? "selected" : ""}>Multi-Split</option>
                                <option value="Cassete" ${equipamento.tipoEquipamento === "Cassete" ? "selected" : ""}>Cassete</option>
                                <option value="Piso-Teto" ${equipamento.tipoEquipamento === "Piso-Teto" ? "selected" : ""}>Piso-Teto</option>
                                <option value="Outro" ${equipamento.tipoEquipamento === "Outro" ? "selected" : ""}>Outro</option>
                            </select>
                        </div>
                        <div>
                            <label>Capacidade (BTUs)</label>
                            <select class="capacidade-btus" required>
                                <option value="">Selecione...</option>
                                <option value="9000" ${equipamento.capacidadeBtus === "9000" ? "selected" : ""}>9.000 BTUs</option>
                                <option value="12000" ${equipamento.capacidadeBtus === "12000" ? "selected" : ""}>12.000 BTUs</option>
                                <option value="18000" ${equipamento.capacidadeBtus === "18000" ? "selected" : ""}>18.000 BTUs</option>
                                <option value="24000" ${equipamento.capacidadeBtus === "24000" ? "selected" : ""}>24.000 BTUs</option>
                                <option value="30000" ${equipamento.capacidadeBtus === "30000" ? "selected" : ""}>30.000 BTUs</option>
                                <option value="36000" ${equipamento.capacidadeBtus === "36000" ? "selected" : ""}>36.000 BTUs</option>
                                <option value="48000" ${equipamento.capacidadeBtus === "48000" ? "selected" : ""}>48.000 BTUs</option>
                            </select>
                        </div>
            `;
            
            // Adicionar campo de parte elétrica apenas para serviços de instalação
            if (servico.name.toLowerCase().includes('instalação') || servico.name.toLowerCase().includes('instalacao')) {
                equipamentoHtml += `
                        <div>
                            <label>Parte elétrica pronta?</label>
                            <select class="parte-eletrica">
                                <option value="Sim" ${equipamento.parteEletricaPronta === "Sim" ? "selected" : ""}>Sim</option>
                                <option value="Não" ${equipamento.parteEletricaPronta === "Não" ? "selected" : ""}>Não</option>
                            </select>
                        </div>
                `;
            }
            
            equipamentoHtml += `
                        <div class="full-width">
                            <label>Observações (Opcional)</label>
                            <textarea class="observacoes" placeholder="Detalhes adicionais">${equipamento.observacoes || ""}</textarea>
                        </div>
                    </div>
                </div>
            `;
            
            servicoSection.innerHTML += equipamentoHtml;
        });
        
        equipamentosContainer.appendChild(servicoSection);
    });
    
    // Adicionar event listeners
    document.querySelectorAll('.quantidade-servico').forEach(input => {
        input.addEventListener('change', alterarQuantidadeServico);
    });
    
    document.querySelectorAll('.remove-equipamento').forEach(button => {
        button.addEventListener('click', removerEquipamento);
    });
    
    document.querySelectorAll('.tipo-equipamento, .capacidade-btus, .parte-eletrica, .observacoes').forEach(input => {
        input.addEventListener('change', atualizarDadosEquipamento);
    });
}

function alterarQuantidadeServico(e) {
    const servicoIndex = parseInt(e.target.dataset.servicoIndex);
    const novaQuantidade = parseInt(e.target.value);
    
    if (novaQuantidade < 1) {
        e.target.value = 1;
        return;
    }
    
    const servico = appState.servicosSelecionados[servicoIndex];
    const quantidadeAtual = servico.equipamentos.length;
    
    if (novaQuantidade > quantidadeAtual) {
        // Adicionar equipamentos
        for (let i = quantidadeAtual; i < novaQuantidade; i++) {
            servico.equipamentos.push({
                tipoEquipamento: "",
                capacidadeBtus: "",
                parteEletricaPronta: "Não",
                observacoes: ""
            });
        }
    } else if (novaQuantidade < quantidadeAtual) {
        // Remover equipamentos
        servico.equipamentos.splice(novaQuantidade);
    }
    
    servico.quantidade = novaQuantidade;
    renderFormulariosEquipamentos();
    validarFormulario();
}

function removerEquipamento(e) {
    const equipamentoItem = e.target.closest('.equipamento-item');
    const servicoIndex = parseInt(equipamentoItem.dataset.servicoIndex);
    const equipamentoIndex = parseInt(equipamentoItem.dataset.equipamentoIndex);
    
    appState.servicosSelecionados[servicoIndex].equipamentos.splice(equipamentoIndex, 1);
    appState.servicosSelecionados[servicoIndex].quantidade--;
    
    // Atualizar o campo de quantidade
    const quantidadeInput = document.querySelector(`.quantidade-servico[data-servico-index="${servicoIndex}"]`);
    if (quantidadeInput) {
        quantidadeInput.value = appState.servicosSelecionados[servicoIndex].quantidade;
    }
    
    renderFormulariosEquipamentos();
    validarFormulario();
}

function atualizarDadosEquipamento(e) {
    const equipamentoItem = e.target.closest('.equipamento-item');
    if (!equipamentoItem) return;
    
    const servicoIndex = parseInt(equipamentoItem.dataset.servicoIndex);
    const equipamentoIndex = parseInt(equipamentoItem.dataset.equipamentoIndex);
    
    const equipamento = appState.servicosSelecionados[servicoIndex].equipamentos[equipamentoIndex];
    const inputs = equipamentoItem.querySelectorAll('select, textarea');
    
    inputs.forEach(input => {
        if (input.classList.contains('tipo-equipamento')) {
            equipamento.tipoEquipamento = input.value;
        } else if (input.classList.contains('capacidade-btus')) {
            equipamento.capacidadeBtus = input.value;
        } else if (input.classList.contains('parte-eletrica')) {
            equipamento.parteEletricaPronta = input.value;
        } else if (input.classList.contains('observacoes')) {
            equipamento.observacoes = input.value;
        }
    });
    
    validarFormulario();
}

function validarFormulario() {
    // Verificar se há serviços selecionados
    if (appState.servicosSelecionados.length === 0) {
        btnFinalizar.disabled = true;
        btnFinalizarTexto.textContent = "Selecione pelo menos um serviço";
        return;
    }
    
    // Verificar se todos os equipamentos têm dados válidos
    const equipamentosValidos = appState.servicosSelecionados.every(servico => 
        servico.equipamentos.every(equipamento => 
            equipamento.tipoEquipamento && equipamento.capacidadeBtus
        )
    );
    
    if (!equipamentosValidos) {
        steps.orcamento.style.display = "none";
        steps.dadosCliente.style.display = "none";
        steps.agendamento.style.display = "none";
        btnFinalizar.disabled = true;
        btnFinalizarTexto.textContent = "Preencha todos os dados dos equipamentos";
        return;
    }
    
    // Mostrar orçamento
    steps.orcamento.style.display = "block";
    calcularOrcamento();
    
    // Habilitar botão de confirmar orçamento
    btnConfirmarOrcamento.disabled = false;
    
    if (window.innerWidth < 768) {
        steps.orcamento.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function calcularOrcamento() {
    appState.orcamentoTotal = 0;
    let html = "<h3>Resumo do Orçamento</h3>";
    
    appState.servicosSelecionados.forEach(servico => {
        html += `<div class="orcamento-servico"><strong>${servico.name} (${servico.quantidade} unidade(s))</strong></div>`;
        
        servico.equipamentos.forEach((equipamento, index) => {
            const preco = calcularPrecoEquipamento(servico, equipamento);
            appState.orcamentoTotal += preco;
            
            html += `
                <div class="orcamento-item">
                    <div>${servico.name} #${index + 1} - ${equipamento.tipoEquipamento} ${equipamento.capacidadeBtus} BTUs</div>
                    <div>R$ ${preco.toFixed(2)}</div>
                </div>
            `;
            
            if (equipamento.parteEletricaPronta === "Não" && servico.name.toLowerCase().includes('instalação')) {
                const custoEletrica = 150; // Custo adicional estimado
                appState.orcamentoTotal += custoEletrica;
                
                html += `
                    <div class="orcamento-item">
                        <div>Preparação da parte elétrica</div>
                        <div>R$ ${custoEletrica.toFixed(2)}</div>
                    </div>
                `;
            }
        });
    });
    
    html += `
        <div class="orcamento-total">
            <strong>Total:</strong>
            <span>R$ ${appState.orcamentoTotal.toFixed(2)}</span>
        </div>
    `;
    
    relatorioOrcamentoDiv.innerHTML = html;
}

function calcularPrecoEquipamento(servico, equipamento) {
    // Esta é uma implementação simplificada
    // Na implementação real, você buscaria os preços configurados no Firebase
    
    const precoBase = {
        "Limpeza": 120,
        "Instalação": 300,
        "Manutenção": 150,
        "Higienização": 100
    };
    
    let preco = precoBase[servico.name] || 200;
    
    // Ajustar preço com base na capacidade BTUs
    const fatorBTU = {
        "9000": 1.0,
        "12000": 1.2,
        "18000": 1.5,
        "24000": 1.8,
        "30000": 2.0,
        "36000": 2.3,
        "48000": 2.8
    };
    
    if (fatorBTU[equipamento.capacidadeBtus]) {
        preco *= fatorBTU[equipamento.capacidadeBtus];
    }
    
    return preco;
}

function mostrarDadosCliente() {
    steps.dadosCliente.style.display = "block";
    
    if (window.innerWidth < 768) {
        steps.dadosCliente.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    
    // Verificar se o serviço requer agendamento
    const requerAgendamento = appState.servicosSelecionados.some(servico => 
        servico.showSchedule !== false // Assume true por padrão
    );
    
    if (requerAgendamento) {
        steps.agendamento.style.display = "block";
    }
    
    btnFinalizar.disabled = !(
        nomeInput.value.trim() && 
        enderecoInput.value.trim() && 
        whatsappInput.value.replace(/\D/g, "").length === 11
    );
    
    if (btnFinalizar.disabled) {
        btnFinalizarTexto.textContent = "Preencha seus dados para continuar";
    } else {
        btnFinalizarTexto.textContent = "Finalizar Agendamento";
    }
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
async function enviarFormulario(e) {
    e.preventDefault();
    if (btnFinalizar.disabled) return;

    btnFinalizar.disabled = true;
    btnFinalizarTexto.textContent = "Salvando...";

    const phoneWithDDI = "55" + whatsappInput.value.replace(/\D/g, "");

    try {
        const adminWhatsAppNumber = appState.configSite.whatsappNumber ? appState.configSite.whatsappNumber.replace(/\D/g, "") : "";
        if (!adminWhatsAppNumber || adminWhatsAppNumber.length < 10) {
            alert("Erro: O número de WhatsApp do administrador não está configurado. Não é possível enviar a notificação.");
            btnFinalizar.disabled = false;
            btnFinalizarTexto.textContent = "Tentar Novamente";
            return;
        }

        // Preparar dados do agendamento
        const dadosAgendamento = {
            servicos: appState.servicosSelecionados,
            valorTotal: appState.orcamentoTotal,
            nomeCliente: nomeInput.value.trim(),
            enderecoCliente: enderecoInput.value.trim(),
            telefoneCliente: phoneWithDDI,
            status: "Solicitado",
            origem: "Site",
            timestamp: new Date().getTime()
        };

        // Adicionar dados de agendamento se aplicável
        if (steps.agendamento.style.display !== "none") {
            dadosAgendamento.dataAgendamento = dataAgendamentoInput.value;
            dadosAgendamento.horaAgendamento = horarioAgendamentoSelect.value;
            dadosAgendamento.formaPagamento = formaPagamentoSelect.value;
            
            const [dia, mes, ano] = dadosAgendamento.dataAgendamento.split('/');
            const [hora, minuto] = dadosAgendamento.horaAgendamento.split(':');
            dadosAgendamento.timestampAgendamento = new Date(ano, mes - 1, dia, hora, minuto).getTime();
        }

        await addDoc(collection(db, "agendamentos"), dadosAgendamento);
        const mensagem = criarMensagemWhatsApp(dadosAgendamento);
        
        const url = `https://wa.me/55${adminWhatsAppNumber}?text=${encodeURIComponent(mensagem)}`;
        
        window.open(url, "_blank");
        setTimeout(() => {
            alert("Solicitação enviada com sucesso! Entraremos em contato em breve.");
            window.location.reload();
        }, 1000);

    } catch (err) {
        console.error("Falha ao salvar agendamento:", err);
        alert("Houve uma falha ao enviar sua solicitação. Por favor, tente novamente.");
        btnFinalizar.disabled = false;
        btnFinalizarTexto.textContent = "Tentar Novamente";
    }
}

function criarMensagemWhatsApp(dados) {
    let msg = `✅ *Nova Solicitação de Serviço* ✅\n-----------------------------------\n`;
    msg += `👤 *Cliente:* ${dados.nomeCliente}\n`;
    msg += `📞 *Contato:* ${dados.telefoneCliente.replace(/^55/, '')}\n`;
    msg += `🏠 *Endereço:* ${dados.enderecoCliente}\n\n`;
    msg += `🛠️ *Serviços Solicitados:*\n`;
    
    dados.servicos.forEach(servico => {
        msg += `• ${servico.name} (${servico.quantidade} unidade(s))\n`;
        
        servico.equipamentos.forEach((equipamento, index) => {
            msg += `  - Equipamento ${index + 1}: ${equipamento.tipoEquipamento} ${equipamento.capacidadeBtus} BTUs\n`;
            if (equipamento.parteEletricaPronta && servico.name.toLowerCase().includes('instalação')) {
                msg += `    Parte elétrica: ${equipamento.parteEletricaPronta}\n`;
            }
            if (equipamento.observacoes) {
                msg += `    Observações: ${equipamento.observacoes}\n`;
            }
        });
    });
    
    msg += `\n💰 *Valor Total Estimado:* R$ ${dados.valorTotal.toFixed(2)}\n`;
    
    if (dados.dataAgendamento) {
        msg += `🗓️ *Data Agendada:* ${dados.dataAgendamento}\n`;
        msg += `⏰ *Horário:* ${dados.horaAgendamento}\n`;
        msg += `💳 *Pagamento:* ${dados.formaPagamento}\n`;
    }
    
    return msg;
}
