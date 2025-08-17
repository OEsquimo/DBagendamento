/**
 * Painel Admin
 * - Login por E-mail/Senha (Firebase Auth)
 * - Gerenciamento completo do site
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ============== Firebase ==============
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
const auth = getAuth(app);

// ============== Mapeamento DOM ==============
const loginSection = document.getElementById("loginSection");
const adminContent = document.getElementById("adminContent");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const btnLogin = document.getElementById("btnLogin");
const loginMsg = document.getElementById("loginMsg");
const cfgCompanyName = document.getElementById("cfgCompanyName");
const cfgCompanyDesc = document.getElementById("cfgCompanyDesc");
const cfgHeroUrl = document.getElementById("cfgHeroUrl");
const cfgWhats = document.getElementById("cfgWhats");
const cfgReminderMonths = document.getElementById("cfgReminderMonths");
const siteMsg = document.getElementById("siteMsg");
const btnSaveSite = document.getElementById("btnSaveSite");
const srvName = document.getElementById("srvName");
const srvIcon = document.getElementById("srvIcon");
const btnAddSrv = document.getElementById("btnAddSrv");
const srvList = document.getElementById("srvList");
const srvMsg  = document.getElementById("srvMsg");
const priceInstalacao = document.getElementById("priceInstalacao");
const priceLimpeza = document.getElementById("priceLimpeza");
const btnSavePrices = document.getElementById("btnSavePrices");
const priceMsg = document.getElementById("priceMsg");
const mNome = document.getElementById("mNome");
const mFone = document.getElementById("mFone");
const mEndereco = document.getElementById("mEndereco");
const mServico = document.getElementById("mServico");
const mBtus = document.getElementById("mBtus");
const mObs = document.getElementById("mObs");
const mData = document.getElementById("mData");
const mHora = document.getElementById("mHora");
const btnSalvarManual = document.getElementById("btnSalvarManual");
const manualMsg = document.getElementById("manualMsg");
const btnRodarLembretes = document.getElementById("btnRodarLembretes");
const reminderLog = document.getElementById("reminderLog");

// ============== Estado ==============
let priceState = {
  instalacao: { "9000": 500, "12000":600, "18000":700, "24000":800, "30000":900 },
  limpeza:    { "9000": 180, "12000":230, "18000":280, "24000":330, "30000":380 }
};
let siteState = {
  companyName: "O Esquimó",
  description: "Serviços de instalação, limpeza e manutenção de ar-condicionado.",
  heroUrl: "",
  whatsappNumber: "5581983259341",
  reminderMonths: 12,
  btusOptions: ["9000","12000","18000","24000","30000"]
};

// ============== Lógica Principal ==============

// Verifica o estado do login assim que a página carrega
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Usuário está logado, mostra o painel
    loginSection.style.display = "none";
    adminContent.style.display = "block";
    loadAll(); // Carrega todos os dados do admin
  } else {
    // Usuário não está logado, mostra a tela de login
    loginSection.style.display = "block";
    adminContent.style.display = "none";
  }
});

// Lógica do botão de login
btnLogin.addEventListener("click", async () => {
  loginMsg.textContent = "";
  const email = adminEmail.value.trim();
  const password = adminPassword.value.trim();

  if (!email || !password) {
    loginMsg.textContent = "Por favor, informe o e-mail e a senha.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Se o login for bem-sucedido, o onAuthStateChanged acima cuidará de mostrar o painel.
  } catch (error) {
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      loginMsg.textContent = "E-mail ou senha incorretos.";
    } else {
      loginMsg.textContent = "Ocorreu um erro ao tentar fazer o login.";
      console.error("Erro de autenticação:", error);
    }
  }
});

// ============== Loaders ==============
async function loadAll(){
  await Promise.all([ loadSite(), loadPrices() ]);
}

async function loadSite(){
  const s = await getDoc(doc(db, "config", "site"));
  if(s.exists()){
    const d = s.data();
    siteState = { ...siteState, ...d };
  }
  cfgCompanyName.value = siteState.companyName;
  cfgCompanyDesc.value = siteState.description;
  cfgHeroUrl.value = siteState.heroUrl || "";
  cfgWhats.value = siteState.whatsappNumber || "";
  cfgReminderMonths.value = siteState.reminderMonths || 12;
  await loadServicesIntoUI();
}

async function loadServicesIntoUI(){
  await renderServiceList();
  const snap = await getDocs(collection(db, "services"));
  let items = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
  if(items.length===0){
    items = [{ name:"Instalação" },{ name:"Limpeza" },{ name:"Reparo" }];
  }
  mServico.innerHTML = "";
  items.forEach(it=>{
    const op = document.createElement("option");
    op.value = it.name; op.textContent = it.name;
    mServico.appendChild(op);
  });
}

async function renderServiceList(){
  srvList.innerHTML = "";
  const snap = await getDocs(collection(db, "services"));
  let items = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
  if(items.length===0){
    const li = document.createElement("li");
    li.textContent = "Sem categorias cadastradas.";
    srvList.appendChild(li);
    return;
  }
  items.forEach(it=>{
    const li = document.createElement("li");
    li.style = "display:flex;align-items:center;justify-content:space-between;border:1px solid var(--cor-borda);padding:10px;border-radius:8px;margin-bottom:8px;";
    li.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${it.iconUrl || 'assets/imagens/limpeza-split.jpg'}" alt="${it.name}" style="width:42px;height:42px;object-fit:cover;border-radius:8px;"/>
        <b>${it.name}</b>
      </div>
      <button data-id="${it.id}" class="btnDel final-button" style="max-width:200px;padding:10px 16px;"><span>Remover</span></button>
    `;
    srvList.appendChild(li);
  });
  srvList.querySelectorAll(".btnDel").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-id");
      if(confirm("Remover esta categoria?")){
        await deleteDoc(doc(db,"services",id));
        await renderServiceList();
        await loadServicesIntoUI();
        srvMsg.textContent = "Categoria removida.";
        setTimeout(()=> srvMsg.textContent = "", 2000);
      }
    });
  });
}

async function loadPrices(){
  const p = await getDoc(doc(db, "config", "prices"));
  if(p.exists()){
    const d = p.data();
    if(d.instalacao) priceState.instalacao = d.instalacao;
    if(d.limpeza)    priceState.limpeza    = d.limpeza;
  }
  renderPriceGrid();
}

function renderPriceGrid(){
  const keys = ["9000","12000","18000","24000","30000"];
  priceInstalacao.innerHTML = "";
  priceLimpeza.innerHTML = "";
  keys.forEach(k=>{
    const i = document.createElement("input");
    i.type="number"; i.min="0"; i.value = priceState.instalacao[k] ?? 0;
    i.addEventListener("input",()=> priceState.instalacao[k]= Number(i.value||0));
    priceInstalacao.appendChild(i);

    const l = document.createElement("input");
    l.type="number"; l.min="0"; l.value = priceState.limpeza[k] ?? 0;
    l.addEventListener("input",()=> priceState.limpeza[k]= Number(l.value||0));
    priceLimpeza.appendChild(l);
  });
}

// ============== Ações ==============
btnSaveSite.addEventListener("click", async ()=>{
  try{
    await setDoc(doc(db, "config", "site"), {
      companyName: cfgCompanyName.value.trim(),
      description: cfgCompanyDesc.value.trim(),
      heroUrl: cfgHeroUrl.value.trim(),
      whatsappNumber: String(cfgWhats.value.trim() || ""),
      reminderMonths: Number(cfgReminderMonths.value || 12),
      btusOptions: siteState.btusOptions
    }, { merge:true });
    siteMsg.textContent = "Configurações salvas!";
    setTimeout(()=> siteMsg.textContent="", 2000);
  }catch(e){
    siteMsg.textContent = "Erro ao salvar.";
    console.error(e);
  }
});

btnAddSrv.addEventListener("click", async ()=>{
  const name = srvName.value.trim();
  const icon = srvIcon.value.trim();
  if(!name){ srvMsg.textContent = "Informe um nome para a categoria."; return; }
  try{
    const qy = query(collection(db, "services"), where("name","==",name));
    const qs = await getDocs(qy);
    if(!qs.empty){ srvMsg.textContent = "Categoria já existe."; return; }

    await addDoc(collection(db, "services"), { name, iconUrl: icon || "" });
    srvName.value=""; srvIcon.value="";
    srvMsg.textContent = "Categoria adicionada!";
    await renderServiceList();
    await loadServicesIntoUI();
    setTimeout(()=> srvMsg.textContent="", 2000);
  }catch(e){
    srvMsg.textContent = "Erro ao adicionar.";
    console.error(e);
  }
});

btnSavePrices.addEventListener("click", async ()=>{
  try{
    await setDoc(doc(db, "config", "prices"), {
      instalacao: priceState.instalacao,
      limpeza: priceState.limpeza
    }, { merge:true });
    priceMsg.textContent = "Preços salvos!";
    setTimeout(()=> priceMsg.textContent="", 2000);
  }catch(e){
    priceMsg.textContent = "Erro ao salvar preços.";
    console.error(e);
  }
});

btnSalvarManual.addEventListener("click", async ()=>{
  manualMsg.textContent = "";
  try{
    if(!mNome.value.trim() || !mFone.value.trim() || !mEndereco.value.trim() || !mServico.value || !mData.value || !mHora.value){
      manualMsg.textContent = "Preencha os campos obrigatórios.";
      return;
    }
    const dataSelecionada = mData.value.split("-").reverse().join("/");
    const horaSelecionada = mHora.value;
    const dataHora = new Date(`${mData.value}T${horaSelecionada}`);

    const qy = query(collection(db, "agendamentos"), where("nomeCliente","==",mNome.value.trim()), where("dataAgendamento","==",dataSelecionada), where("horaAgendamento","==",horaSelecionada));
    const qs = await getDocs(qy);
    if(!qs.empty){
      manualMsg.textContent = "Já existe um serviço para este cliente nesse dia/horário.";
      return;
    }

    await addDoc(collection(db, "agendamentos"), {
      servico: mServico.value,
      valor: 0,
      nomeCliente: mNome.value.trim(),
      enderecoCliente: mEndereco.value.trim(),
      telefoneCliente: mFone.value.trim(),
      btus: mBtus.value || "N/A",
      defeito: mServico.value==="Reparo" ? (mObs.value.trim() || "N/A") : "N/A",
      dataAgendamento: dataSelecionada,
      horaAgendamento: horaSelecionada,
      formaPagamento: "N/A",
      observacoes: mObs.value.trim() || "Nenhuma",
      timestamp: dataHora.getTime(),
      status: "Concluído"
    });

    manualMsg.textContent = "Serviço cadastrado!";
    setTimeout(()=> manualMsg.textContent="", 2000);
    mNome.value = mFone.value = mEndereco.value = mObs.value = "";
    mBtus.value = ""; mServico.selectedIndex=0; mData.value=""; mHora.value="";
  }catch(e){
    manualMsg.textContent = "Erro ao salvar serviço.";
    console.error(e);
  }
});

btnRodarLembretes.addEventListener("click", async ()=>{
  reminderLog.innerHTML = "";
  try{
    const s = await getDoc(doc(db, "config", "site"));
    const months = (s.exists() && s.data().reminderMonths) ? Number(s.data().reminderMonths) : 12;
    
    const today = new Date();
    const target = new Date(today);
    target.setMonth(target.getMonth() - months);

    const dd = String(target.getDate()).padStart(2,"0");
    const mm = String(target.getMonth()+1).padStart(2,"0");
    const yyyy = target.getFullYear();
    const alvo = `${dd}/${mm}/${yyyy}`;

    const qy = query(collection(db, "agendamentos"), where("servico","==","Limpeza"), where("dataAgendamento","==",alvo));
    const qs = await getDocs(qy);

    if(qs.empty){
      addLog("Nenhum cliente elegível para lembrete hoje.");
      return;
    }

    qs.forEach(docSnap=>{
      const d = docSnap.data();
      const msg = `🔔 *Lembrete de Limpeza* \nOlá, ${d.nomeCliente}! Tudo bem?\nFaz ${months} meses desde sua última *Limpeza* de ar-condicionado.\nDeseja agendar uma nova visita?`;
      const url = `https://wa.me/${d.telefoneCliente.replace(/\D/g,"")}?text=${encodeURIComponent(msg)}`;
      addLog(`Abrindo WhatsApp para ${d.nomeCliente}`);
      window.open(url,"_blank");
    });

  }catch(e){
    addLog("Erro ao processar lembretes. Veja o console.");
    console.error(e);
  }
});

function addLog(t){
  const li = document.createElement("li");
  li.textContent = t;
  reminderLog.appendChild(li);
}
