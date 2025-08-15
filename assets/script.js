
/**
 * Público - Index
 * Mantém a lógica do seu script ORIGINAL (anti-conflito + horários dinâmicos),
 * adicionando: serviços dinâmicos, preços dinâmicos, BTUs dinâmicos e WhatsApp dinâmico.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, query, where, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ===================== Firebase (CONFIG EXISTENTE) =====================
const firebaseConfig = {
  apiKey: "AIzaSyCFf5gckKE6rg7MFuBYAO84aV-sNrdY2JQ",
  authDomain: "agendamento-esquimo.firebaseapp.com",
  projectId: "agendamento-esquimo",
  storageBucket: "agendamento-esquimo.appspot.com",
  messagingSenderId: "348946727206",
  appId: "1:348946727206:web:f5989788f13c259be0c1e7",
  measurementId: "G-Z0EMQ3XQ1D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================== Coleções & Config doc =====================
const colAgendamentos = collection(db, "agendamentos");
const docSite = doc(db, "config", "site");         // { companyName, description, heroUrl, whatsappNumber, reminderMonths }
const docPrices = doc(db, "config", "prices");      // { instalacao:{...}, limpeza:{...} }
const colServices = collection(db, "services");     // [{ name, iconUrl }]

// ===================== Mapeamento DOM =====================
const servicosGrid = document.getElementById("servicosGrid");
const form = document.getElementById("formulario");
const dadosClienteWrapper = document.getElementById("dados-cliente-wrapper");
const orcamentoWrapper = document.getElementById("orcamento-wrapper");
const agendamentoWrapper = document.getElementById("agendamento-wrapper");
const nomeInput = document.getElementById("nome");
const enderecoInput = document.getElementById("endereco");
const whatsappInput = document.getElementById("whatsapp");
const btusSelect = document.getElementById("btus");
const defeitoTextarea = document.getElementById("defeito");
const campoBtusWrapper = document.getElementById("campo-btus-wrapper");
const campoDefeitoWrapper = document.getElementById("campo-defeito-wrapper");
const dataAgendamentoInput = document.getElementById("data_agendamento");
const horarioAgendamentoSelect = document.getElementById("horario_agendamento");
const formaPagamentoSelect = document.getElementById("forma_pagamento");
const obsClienteTextarea = document.getElementById("obs_cliente");
const relatorioOrcamentoDiv = document.getElementById("relatorio-orcamento");
const btnAgendarServico = document.getElementById("btn_agendar_servico");
const btnAgendarServicoSpan = btnAgendarServico.querySelector("span");
const heroImage = document.getElementById("heroImage");
const companyNameEl = document.getElementById("companyName");
const companyDescEl = document.getElementById("companyDescription");
const siteTitle = document.getElementById("siteTitle");

// ===================== Estado =====================
const appState = {
  servico: null,
  valor: 0,
  precos: {
    instalacao: { "9000": 500, "12000": 600, "18000": 700, "24000": 800, "30000": 900 },
    limpeza:    { "9000": 180, "12000": 230, "18000": 280, "24000": 330, "30000": 380 },
    reparo: 0
  },
  whatsappNumber: "5581983259341", // sobrescrito pela config
  btusOptions: ["9000","12000","18000","24000","30000"]
};

// ===================== Helpers =====================
function maskWhatsInput(e){
  let v = e.target.value.replace(/\D/g,"").slice(0,11);
  if(v.length>2) v = `(${v.substring(0,2)}) ${v.substring(2)}`;
  if(v.length>9) v = `${v.substring(0,9)}-${v.substring(9)}`;
  e.target.value = v;
}
whatsappInput.addEventListener("input", maskWhatsInput);

function calcularValorOrcamento(){
  const s = appState.servico;
  const btus = btusSelect.value;
  if(s==="Instalação") return appState.precos.instalacao[btus] || 0;
  if(s==="Limpeza")    return appState.precos.limpeza[btus]    || 0;
  // demais serviços (categorias novas) ficam sob análise por padrão (0)
  return 0;
}
function gerarHtmlOrcamento(){
  appState.valor = calcularValorOrcamento();
  const valorTexto = (appState.servico==="Reparo" || !appState.valor) ? "Sob Análise" : `R$ ${appState.valor.toFixed(2)}`;
  const btusTexto = btusSelect.value ? btusSelect.options[btusSelect.selectedIndex].text : "N/A";
  const defeitoTexto = defeitoTextarea.value.trim();
  return `
    <div class="orcamento-item"><strong>Nome:</strong><span>${nomeInput.value}</span></div>
    <div class="orcamento-item"><strong>Endereço:</strong><span>${enderecoInput.value}</span></div>
    <div class="orcamento-item"><strong>Contato:</strong><span>${whatsappInput.value}</span></div>
    <div class="orcamento-item"><strong>Serviço:</strong><span>${appState.servico}</span></div>
    ${(appState.servico==="Instalação"||appState.servico==="Limpeza") ? `<div class="orcamento-item"><strong>Capacidade:</strong><span>${btusTexto}</span></div>` : ""}
    ${appState.servico==="Reparo" ? `<div class="orcamento-item"><strong>Problema:</strong><span>${defeitoTexto}</span></div>` : ""}
    <div class="orcamento-total"><strong>Valor Total:</strong><span>${valorTexto}</span></div>
  `;
}

// ===================== Form Validation =====================
function validarFormularioCompleto(){
  const nomeValido = nomeInput.value.trim().length>2;
  const enderecoValido = enderecoInput.value.trim().length>5;
  const whatsappValido = whatsappInput.value.replace(/\D/g,"").length===11;

  let servicoValido = false;
  if(appState.servico==="Instalação"||appState.servico==="Limpeza"){
    servicoValido = btusSelect.value!=="";
  }else if(appState.servico==="Reparo"){
    servicoValido = defeitoTextarea.value.trim().length>3;
  }else{
    // demais serviços não exigem BTUs/defeito por padrão
    servicoValido = true;
  }

  const dadosClientePreenchidos = nomeValido && enderecoValido && whatsappValido && servicoValido;

  document.getElementById("orcamento-wrapper").style.display = dadosClientePreenchidos ? "block":"none";
  document.getElementById("agendamento-wrapper").style.display = dadosClientePreenchidos ? "block":"none";

  if(dadosClientePreenchidos){
    relatorioOrcamentoDiv.innerHTML = gerarHtmlOrcamento();
  }

  const dataValida = dataAgendamentoInput.value!=="";
  const horarioValido = (horarioAgendamentoSelect.value!=="" && !horarioAgendamentoSelect.disabled);
  const pagamentoValido = formaPagamentoSelect.value!=="";

  btnAgendarServico.disabled = !(dadosClientePreenchidos && dataValida && horarioValido && pagamentoValido);
}
form.addEventListener("input", validarFormularioCompleto);

// ===================== Calendário + Horários Dinâmicos =====================
let calendario = null;
function initCalendar(){
  calendario = flatpickr(dataAgendamentoInput, {
    locale: "pt",
    minDate: "today",
    dateFormat: "d/m/Y",
    disable: [(date)=> date.getDay()===0 || date.getDay()===6],
    onChange:(selectedDates)=>{
      if(selectedDates.length>0){
        const dataFormatada = calendario.input.value;
        atualizarHorariosDisponiveis(dataFormatada);
      }
    }
  });
}
async function atualizarHorariosDisponiveis(dataSelecionada){
  horarioAgendamentoSelect.disabled = true;
  horarioAgendamentoSelect.innerHTML = '<option value="">Verificando horários...</option>';
  try{
    const horariosBase = ["08:00","10:00","13:00","15:00"];
    const qy = query(colAgendamentos, where("dataAgendamento","==",dataSelecionada));
    const qs = await getDocs(qy);
    const ocupados = qs.docs.map(d=> d.data().horaAgendamento);
    const livres = horariosBase.filter(h=> !ocupados.includes(h));
    if(livres.length>0){
      horarioAgendamentoSelect.innerHTML = '<option value="">Selecione um horário</option>';
      livres.forEach(h=>{
        horarioAgendamentoSelect.innerHTML += `<option value="${h}">${h}</option>`;
      });
      horarioAgendamentoSelect.disabled = false;
    }else{
      horarioAgendamentoSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
    }
  }catch(err){
    console.error("Erro ao buscar horários:",err);
    horarioAgendamentoSelect.innerHTML = '<option value="">Erro ao carregar</option>';
  }finally{
    validarFormularioCompleto();
  }
}

// ===================== Submissão (Anti-Conflito) =====================
form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(btnAgendarServico.disabled) return;

  btnAgendarServico.disabled = true;
  btnAgendarServicoSpan.textContent = "Verificando horário...";

  const dataSelecionada = dataAgendamentoInput.value;
  const horaSelecionada = horarioAgendamentoSelect.value;

  try{
    const qy = query(colAgendamentos, where("dataAgendamento","==",dataSelecionada), where("horaAgendamento","==",horaSelecionada));
    const snap = await getDocs(qy);
    if(!snap.empty){
      alert("Desculpe, este horário acabou de ser preenchido! Por favor, selecione outro horário.");
      btnAgendarServico.disabled = false;
      btnAgendarServicoSpan.textContent = "Agendar Serviço";
      atualizarHorariosDisponiveis(dataSelecionada);
      return;
    }

    btnAgendarServicoSpan.textContent = "Salvando...";

    const [dia, mes, ano] = dataSelecionada.split('/');
    const dataHoraAgendamento = new Date(`${ano}-${mes}-${dia}T${horaSelecionada}`);

    const dados = {
      servico: appState.servico,
      valor: appState.valor,
      nomeCliente: nomeInput.value.trim(),
      enderecoCliente: enderecoInput.value.trim(),
      telefoneCliente: whatsappInput.value.trim(),
      btus: btusSelect.value || "N/A",
      defeito: defeitoTextarea.value.trim() || "N/A",
      dataAgendamento: dataSelecionada,
      horaAgendamento: horaSelecionada,
      formaPagamento: formaPagamentoSelect.value,
      observacoes: obsClienteTextarea.value.trim() || "Nenhuma",
      timestamp: dataHoraAgendamento.getTime(),
      status: "Agendado"
    };

    await addDoc(colAgendamentos, dados);

    const valorTxt = appState.valor>0 ? `R$ ${appState.valor.toFixed(2)}` : "Sob Análise";
    const capTxt = (appState.servico==="Instalação"||appState.servico==="Limpeza") ? (dados.btus) : "N/A";

    const mensagem =
`✅ *Novo Agendamento Confirmado* ✅
-----------------------------------
👤 *Cliente:* ${dados.nomeCliente}
📍 *Endereço:* ${dados.enderecoCliente}
📞 *Contato:* ${dados.telefoneCliente}
🛠️ *Serviço:* ${dados.servico}
❄️ *Capacidade:* ${capTxt}
💰 *Valor:* ${valorTxt}
🗓️ *Data:* ${dados.dataAgendamento}
⏰ *Hora:* ${dados.horaAgendamento}
💳 *Pagamento:* ${dados.formaPagamento}
📝 *Observações:* ${dados.observacoes}`;

    const url = `https://wa.me/${appState.whatsappNumber}?text=${encodeURIComponent(mensagem)}`;
    alert("Agendamento salvo com sucesso! Você será redirecionado para o WhatsApp.");
    window.open(url, "_blank");
    setTimeout(()=> window.location.reload(), 500);

  }catch(err){
    console.error("Falha ao salvar agendamento:", err);
    alert("Houve uma falha ao salvar seu agendamento. Verifique sua conexão e tente novamente.");
    btnAgendarServico.disabled = false;
    btnAgendarServicoSpan.textContent = "Tentar Novamente";
  }
});

// ===================== Carregamento Dinâmico (Site/Preços/Serviços) =====================
async function loadSiteConfig(){
  const s = await getDoc(docSite);
  if(s.exists()){
    const data = s.data();
    if(data.companyName){ companyNameEl.textContent = data.companyName; siteTitle.textContent = `${data.companyName} - Agendamento`; }
    if(data.description){ companyDescEl.textContent = data.description; }
    if(data.heroUrl){ heroImage.src = data.heroUrl; }
    if(data.whatsappNumber){ appState.whatsappNumber = String(data.whatsappNumber); }
    if(Array.isArray(data.btusOptions) && data.btusOptions.length){
      appState.btusOptions = data.btusOptions.map(String);
    }
  }
  // montar btus
  btusSelect.innerHTML = `<option value="">Selecione a capacidade</option>`;
  appState.btusOptions.forEach(v=>{
    const label = (v==="30000") ? "Acima de 30.000 BTUs" :
                  (v==="9000") ? "Até 9.000 BTUs" : `${Number(v).toLocaleString('pt-BR')} BTUs`;
    btusSelect.innerHTML += `<option value="${v}">${label}</option>`;
  });
}
async function loadPrices(){
  const p = await getDoc(docPrices);
  if(p.exists()){
    const d = p.data();
    if(d.instalacao) appState.precos.instalacao = d.instalacao;
    if(d.limpeza)    appState.precos.limpeza    = d.limpeza;
  }
}
async function loadServices(){
  servicosGrid.innerHTML = "";
  const snap = await getDocs(colServices);
  let items = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
  if(items.length===0){
    // defaults se admin ainda não configurou
    items = [
      { name:"Instalação", iconUrl:"assets/imagens/instalacao-ar.jpg" },
      { name:"Limpeza",    iconUrl:"assets/imagens/limpeza-split.jpg" },
      { name:"Reparo",     iconUrl:"assets/imagens/manutencao-ar.jpg" }
    ];
  }
  items.forEach(item=>{
    const div = document.createElement("div");
    div.className = "servico";
    div.dataset.servico = item.name;
    div.innerHTML = `
      <img src="${item.iconUrl || 'assets/imagens/limpeza-split.jpg'}" alt="${item.name}"/>
      <p>${item.name}</p>
    `;
    div.addEventListener("click", ()=>{
      document.querySelectorAll(".servico").forEach(s=> s.classList.remove("selecionado"));
      div.classList.add("selecionado");
      appState.servico = item.name;

      // Regras condicionais: Instalação/Limpeza pedem BTUs, Reparo pede defeito.
      const precisaBtus = (item.name==="Instalação" || item.name==="Limpeza");
      const precisaDefeito = (item.name==="Reparo");

      dadosClienteWrapper.style.display = "block";
      campoBtusWrapper.style.display = precisaBtus ? "block":"none";
      campoDefeitoWrapper.style.display = precisaDefeito ? "block":"none";

      btusSelect.required = precisaBtus;
      defeitoTextarea.required = precisaDefeito;

      nomeInput.scrollIntoView({ behavior:"smooth", block:"center" });
      nomeInput.focus();

      validarFormularioCompleto();
    });
    servicosGrid.appendChild(div);
  });
}

// ===================== Init =====================
(async function init(){
  await Promise.all([
    loadSiteConfig(),
    loadPrices(),
    loadServices()
  ]);
  initCalendar();
})();
