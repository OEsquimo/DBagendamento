/*
 * Arquivo: admin.js
 * Descrição: Lógica para o painel de administração.
 * Versão: 8.0 (Com navegação por abas e novo tipo de campo)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================================================================
// 1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyCFf5gckKE6rg7MFuBYAO84aV-sNrdY2JQ",
    authDomain: "agendamento-esquimo.firebaseapp.com",
    databaseURL: "https://agendamento-esquimo-default-rtdb.firebaseio.com",
    projectId: "agendamento-esquimo",
    storageBucket: "agendamento-esquimo.firebasestorage.app",
    messagingSenderId: "348946727206",
    appId: "1:348946727206:web:f5989788f13c259be0c1e7",
    measurementId: "G-Z0EMQ3XQ1D"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Elementos do DOM
const servicoForm = document.getElementById('servicoForm');
const servicoNomeInput = document.getElementById('servicoNome');
const servicoPrecoInput = document.getElementById('servicoPreco');
const dynamicContentContainer = document.getElementById('dynamicContentContainer');
const addBlockSelect = document.getElementById('addBlockSelect');
const addBlockBtn = document.getElementById('addBlockBtn');
const servicosList = document.getElementById('servicosList');
const agendamentosList = document.getElementById('agendamentosList');
const promocaoForm = document.getElementById('promocaoForm');
const promocoesList = document.getElementById('promocoesList');
const promocaoServicoSelect = document.getElementById('promocaoServico');
const configForm = document.getElementById('configForm');
const whatsappNumberInput = document.getElementById('whatsappNumber');
const whatsappTemplateInput = document.getElementById('whatsappTemplate');
const horariosContainer = document.getElementById('horariosContainer');
const formasPagamentoContainer = document.getElementById('formasPagamentoContainer');
const addPagamentoBtn = document.getElementById('addPagamentoBtn');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
let servicosGlobais = {};

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupTabNavigation();
    setupServicoForm();
    setupConfigForm();
    setupPromocaoForm();
});

async function loadAllData() {
    await loadServices();
    loadBookings();
    loadConfig();
    loadPromotions();
}

function setupTabNavigation() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.add('hidden'));
            button.classList.add('active');
            const targetId = button.dataset.tab;
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
}

function setupServicoForm() {
    servicoForm.addEventListener('submit', handleServicoFormSubmit);
    addBlockBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const blockType = addBlockSelect.value;
        if (blockType) {
            addDynamicBlock(blockType);
            addBlockSelect.value = '';
        }
    });
}

function setupConfigForm() {
    diasDaSemana.forEach(dia => {
        const div = document.createElement('div');
        div.className = 'horario-dia';
        div.innerHTML = `
            <h5>${capitalize(dia)}</h5>
            <div class="form-check">
                <input type="checkbox" class="form-check-input dia-ativo" id="${dia}Ativo">
                <label class="form-check-label" for="${dia}Ativo">Ativo</label>
            </div>
            <div class="form-group mt-2">
                <label for="${dia}Inicio">Início:</label>
                <input type="time" class="form-control horario-inicio" id="${dia}Inicio" value="08:00">
            </div>
            <div class="form-group">
                <label for="${dia}Fim">Fim:</label>
                <input type="time" class="form-control horario-fim" id="${dia}Fim" value="18:00">
            </div>
            <div class="form-group">
                <label for="${dia}Duracao">Duração (minutos):</label>
                <input type="number" class="form-control horario-duracao" id="${dia}Duracao" value="60" min="15" step="15">
            </div>
        `;
        horariosContainer.appendChild(div);
    });

    addPagamentoBtn.addEventListener('click', addPagamentoField);
    configForm.addEventListener('submit', handleConfigFormSubmit);
}

function setupPromocaoForm() {
    promocaoForm.addEventListener('submit', handlePromocaoFormSubmit);
}

// ==========================================================================
// 3. GERENCIAMENTO DE SERVIÇOS (CRUD)
// ==========================================================================

function addDynamicBlock(blockType, blockData = {}) {
    const blockElement = document.createElement('div');
    blockElement.className = 'dynamic-content-block';
    blockElement.dataset.type = blockType;

    let html = '';
    if (blockType === 'titulo') {
        html = `
            <input type="text" class="form-control block-input" placeholder="Título" value="${blockData.conteudo || ''}" required>
        `;
    } else if (blockType === 'paragrafo') {
        html = `
            <textarea class="form-control block-input" placeholder="Parágrafo">${blockData.conteudo || ''}</textarea>
        `;
    } else if (blockType === 'imagem') {
        html = `
            <input type="text" class="form-control block-input" placeholder="Nome da imagem (ex: imagem.jpg)" value="${blockData.conteudo || ''}" required>
            <small class="form-text text-muted">A imagem deve estar na pasta "imagens/".</small>
        `;
    } else if (blockType === 'campo') {
        const campo = blockData.conteudo || {};
        html = `
            <div class="form-group">
                <label>Nome do Campo</label>
                <input type="text" class="form-control campo-nome" placeholder="Ex: Capacidade de BTUs" value="${campo.nome || ''}" required>
            </div>
            <div class="form-group">
                <label>Tipo do Campo</label>
                <select class="form-control campo-tipo">
                    <option value="select" ${campo.tipo === 'select' ? 'selected' : ''}>Lista de Opções (select)</option>
                    <option value="text" ${campo.tipo === 'text' ? 'selected' : ''}>Campo de Texto</option>
                    <option value="number" ${campo.tipo === 'number' ? 'selected' : ''}>Campo Numérico</option>
                    <option value="textarea" ${campo.tipo === 'textarea' ? 'selected' : ''}>Campo de Texto Longo</option>
                </select>
            </div>
            <div class="campo-options-container">
                ${campo.tipo === 'select' || !campo.tipo ? generateCampoOptionsHTML(campo.opcoes) : ''}
            </div>
        `;
    }
    
    blockElement.innerHTML = `
        <div class="block-actions">
            <button type="button" class="btn btn-secondary btn-sm block-up-btn">▲</button>
            <button type="button" class="btn btn-secondary btn-sm block-down-btn">▼</button>
            <button type="button" class="btn btn-danger btn-sm block-remove-btn">x</button>
        </div>
        ${html}
    `;

    dynamicContentContainer.appendChild(blockElement);

    if (blockType === 'campo') {
        const campoTipoSelect = blockElement.querySelector('.campo-tipo');
        campoTipoSelect.addEventListener('change', (e) => {
            const optionsContainer = blockElement.querySelector('.campo-options-container');
            if (e.target.value === 'select') {
                optionsContainer.innerHTML = generateCampoOptionsHTML();
                optionsContainer.querySelector('.add-option-btn').addEventListener('click', addCampoOption);
            } else {
                optionsContainer.innerHTML = '';
            }
        });
        const addOptionBtn = blockElement.querySelector('.add-option-btn');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', addCampoOption);
        }
    }
    
    blockElement.querySelector('.block-remove-btn').addEventListener('click', () => blockElement.remove());
    blockElement.querySelector('.block-up-btn').addEventListener('click', () => moveBlock(blockElement, -1));
    blockElement.querySelector('.block-down-btn').addEventListener('click', () => moveBlock(blockElement, 1));
}

function generateCampoOptionsHTML(opcoes = []) {
    let optionsHtml = opcoes.length > 0 ? opcoes.map(op => `
        <div class="campo-option-item">
            <input type="text" class="form-control option-value" placeholder="Nome da opção" value="${op.valor || ''}" required>
            <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="${op.precoAdicional || 0}">
            <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
        </div>
    `).join('') : '';

    if (opcoes.length === 0) {
        optionsHtml = `
            <div class="campo-option-item">
                <input type="text" class="form-control option-value" placeholder="Nome da opção" required>
                <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="0.00">
                <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
            </div>
        `;
    }

    return `
        <p>Opções:</p>
        <div class="option-list">
            ${optionsHtml}
        </div>
        <button type="button" class="btn btn-sm btn-light add-option-btn">Adicionar Opção</button>
    `;
}

function addCampoOption(e) {
    const optionList = e.target.closest('.campo-options-container').querySelector('.option-list');
    const optionHtml = `
        <div class="campo-option-item">
            <input type="text" class="form-control option-value" placeholder="Nome da opção" required>
            <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="0.00">
            <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
        </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = optionHtml;
    const newOption = tempDiv.firstElementChild;
    optionList.appendChild(newOption);
    newOption.querySelector('.remove-option-btn').addEventListener('click', (e) => e.target.closest('.campo-option-item').remove());
}

function moveBlock(block, direction) {
    const parent = block.parentNode;
    if (direction === -1 && block.previousElementSibling) {
        parent.insertBefore(block, block.previousElementSibling);
    } else if (direction === 1 && block.nextElementSibling) {
        parent.insertBefore(block.nextElementSibling, block);
    }
}

function handleServicoFormSubmit(e) {
    e.preventDefault();

    const nome = servicoNomeInput.value;
    const precoBase = parseFloat(servicoPrecoInput.value) || 0;
    const servicoKey = servicoForm.dataset.key;
    
    const conteudoDinamico = [];
    document.querySelectorAll('#dynamicContentContainer .dynamic-content-block').forEach(blockElement => {
        const blockType = blockElement.dataset.type;
        const blockData = { tipo: blockType };

        if (blockType === 'titulo' || blockType === 'paragrafo' || blockType === 'imagem') {
            blockData.conteudo = blockElement.querySelector('.block-input').value;
        } else if (blockType === 'campo') {
            const campo = {};
            campo.nome = blockElement.querySelector('.campo-nome').value;
            campo.tipo = blockElement.querySelector('.campo-tipo').value;
            if (campo.tipo === 'select') {
                campo.opcoes = [];
                blockElement.querySelectorAll('.campo-option-item').forEach(optionItem => {
                    const valor = optionItem.querySelector('.option-value').value;
                    const precoAdicional = parseFloat(optionItem.querySelector('.option-price').value) || 0;
                    campo.opcoes.push({ valor, precoAdicional });
                });
            }
            blockData.conteudo = campo;
        }
        conteudoDinamico.push(blockData);
    });

    const servico = {
        nome,
        precoBase,
        conteudoDinamico
    };

    const servicosRef = ref(database, `servicos/${servicoKey || ''}`);
    
    if (servicoKey) {
        set(servicosRef, servico)
            .then(() => {
                alert('Serviço atualizado com sucesso!');
                resetServicoForm();
            })
            .catch(error => {
                console.error("Erro ao atualizar serviço:", error);
                alert("Ocorreu um erro. Verifique o console.");
            });
    } else {
        push(servicosRef, servico)
            .then(() => {
                alert('Serviço cadastrado com sucesso!');
                resetServicoForm();
            })
            .catch(error => {
                console.error("Erro ao cadastrar serviço:", error);
                alert("Ocorreu um erro. Verifique o console.");
            });
    }
}

function resetServicoForm() {
    servicoForm.reset();
    servicoForm.removeAttribute('data-key');
    dynamicContentContainer.innerHTML = '';
    servicoForm.querySelector('button[type="submit"]').textContent = 'Salvar Serviço';
}

async function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicosList.innerHTML = '';
        promocaoServicoSelect.innerHTML = '<option value="">Selecione um serviço</option>';
        if (snapshot.exists()) {
            servicosGlobais = snapshot.val();
            for (const key in servicosGlobais) {
                const servico = servicosGlobais[key];
                createServicoCard(servico, key);
                const option = document.createElement('option');
                option.value = key;
                option.textContent = servico.nome;
                promocaoServicoSelect.appendChild(option);
            }
        } else {
            servicosList.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        }
    });
}

function createServicoCard(servico, key) {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    
    let conteudoHtml = '';
    if (servico.conteudoDinamico) {
        conteudoHtml = servico.conteudoDinamico.map(block => {
            if (block.tipo === 'titulo') return `<h4>${block.conteudo}</h4>`;
            if (block.tipo === 'paragrafo') return `<p>${block.conteudo}</p>`;
            if (block.tipo === 'imagem') return `<p>Imagem: ${block.conteudo}</p>`;
            if (block.tipo === 'campo') {
                let optionsHtml = '';
                if (block.conteudo.opcoes) {
                    optionsHtml = block.conteudo.opcoes.map(op => `<li>${op.valor} (R$ ${op.precoAdicional.toFixed(2)})</li>`).join('');
                }
                return `<p><strong>Campo ${block.conteudo.nome}</strong> (${block.conteudo.tipo})</p><ul>${optionsHtml}</ul>`;
            }
            return '';
        }).join('');
    }

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${servico.nome}</h5>
            <p class="card-text"><strong>Preço Base:</strong> R$ ${servico.precoBase ? servico.precoBase.toFixed(2) : '0.00'}</p>
            <h6>Conteúdo da Página:</h6>
            ${conteudoHtml || '<p>Nenhum conteúdo.</p>'}
            <button class="btn btn-warning btn-sm edit-service-btn" data-key="${key}">Editar</button>
            <button class="btn btn-danger btn-sm delete-service-btn" data-key="${key}">Excluir</button>
        </div>
    `;
    servicosList.appendChild(card);
    card.querySelector('.edit-service-btn').addEventListener('click', editService);
    card.querySelector('.delete-service-btn').addEventListener('click', deleteService);
}

function editService(e) {
    const key = e.target.dataset.key;
    const servicoRef = ref(database, `servicos/${key}`);
    get(servicoRef).then(snapshot => {
        const servicoData = snapshot.val();
        servicoNomeInput.value = servicoData.nome;
        servicoPrecoInput.value = servicoData.precoBase || 0;
        servicoForm.dataset.key = key;
        
        dynamicContentContainer.innerHTML = '';
        if (servicoData.conteudoDinamico) {
            servicoData.conteudoDinamico.forEach(block => {
                addDynamicBlock(block.tipo, block);
            });
        }
        servicoForm.querySelector('button[type="submit"]').textContent = 'Atualizar Serviço';
        document.querySelector('[data-tab="addServicoTab"]').click();
    });
}

function deleteService(e) {
    const key = e.target.dataset.key;
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        const servicoRef = ref(database, `servicos/${key}`);
        remove(servicoRef)
            .then(() => alert('Serviço excluído com sucesso!'))
            .catch(error => {
                console.error("Erro ao excluir serviço:", error);
                alert("Ocorreu um erro. Verifique o console.");
            });
    }
}

// ==========================================================================
// 4. GERENCIAMENTO DE AGENDAMENTOS
// ==========================================================================

function loadBookings() {
    const agendamentosRef = ref(database, 'agendamentos');
    onValue(agendamentosRef, (snapshot) => {
        agendamentosList.innerHTML = '';
        if (snapshot.exists()) {
            const agendamentos = snapshot.val();
            const agendamentosArray = Object.entries(agendamentos).reverse();
            agendamentosArray.forEach(([key, agendamento]) => {
                createAgendamentoCard(agendamento, key);
            });
        } else {
            agendamentosList.innerHTML = '<p>Nenhum agendamento pendente.</p>';
        }
    });
}

function createAgendamentoCard(agendamento, key) {
    const card = document.createElement('div');
    card.className = `card mb-3 booking-card booking-${agendamento.status.toLowerCase()}`;
    
    let servicosHtml = '<ul>';
    if (agendamento.servicos) {
        agendamento.servicos.forEach(servico => {
            servicosHtml += `<li><strong>${servico.nome}</strong>: R$ ${servico.precoCalculado.toFixed(2)}
                <ul>
                    ${servico.camposAdicionaisSelecionados ? Object.entries(servico.camposAdicionaisSelecionados).map(([campo, valor]) => `
                        <li>${campo}: ${typeof valor === 'number' ? `R$ ${valor.toFixed(2)}` : valor}</li>
                    `).join('') : ''}
                </ul>
            </li>`;
        });
    }
    servicosHtml += '</ul>';

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">Agendamento de ${agendamento.cliente.nome}</h5>
            <p><strong>Data:</strong> ${agendamento.data} às ${agendamento.hora}</p>
            <p><strong>Status:</strong> <span class="badge badge-${agendamento.status.toLowerCase()}">${agendamento.status}</span></p>
            <hr>
            <h6>Detalhes do Cliente:</h6>
            <p><strong>Telefone:</strong> ${agendamento.cliente.telefone}</p>
            <p><strong>Endereço:</strong> ${agendamento.cliente.endereco}</p>
            <p><strong>Forma de Pagamento:</strong> ${agendamento.formaPagamento}</p>
            <hr>
            <h6>Serviços:</h6>
            ${servicosHtml}
            <p><strong>Total:</strong> R$ ${agendamento.orcamentoTotal.toFixed(2)}</p>
            ${agendamento.observacoes ? `<p><strong>Obs:</strong> ${agendamento.observacoes}</p>` : ''}
            <div class="mt-3">
                <button class="btn btn-success btn-sm mark-completed" data-key="${key}" ${agendamento.status === 'Concluído' ? 'disabled' : ''}>Marcar como Concluído</button>
                <button class="btn btn-danger btn-sm cancel-booking" data-key="${key}" ${agendamento.status === 'Cancelado' ? 'disabled' : ''}>Cancelar</button>
                <button class="btn btn-danger btn-sm delete-booking" data-key="${key}">Excluir</button>
            </div>
        </div>
    `;
    agendamentosList.appendChild(card);
    card.querySelector('.mark-completed').addEventListener('click', () => updateBookingStatus(key, 'Concluído'));
    card.querySelector('.cancel-booking').addEventListener('click', () => updateBookingStatus(key, 'Cancelado'));
    card.querySelector('.delete-booking').addEventListener('click', () => deleteBooking(key));
}

function updateBookingStatus(key, newStatus) {
    const agendamentoRef = ref(database, `agendamentos/${key}`);
    get(agendamentoRef).then(snapshot => {
        const agendamentoData = snapshot.val();
        set(agendamentoRef, { ...agendamentoData, status: newStatus })
            .then(() => alert(`Agendamento ${newStatus.toLowerCase()} com sucesso!`))
            .catch(error => {
                console.error("Erro ao atualizar status:", error);
                alert("Ocorreu um erro. Verifique o console.");
            });
    });
}

function deleteBooking(key) {
    if (confirm('Tem certeza que deseja EXCLUIR este agendamento? Esta ação é irreversível.')) {
        const agendamentoRef = ref(database, `agendamentos/${key}`);
        remove(agendamentoRef)
            .then(() => alert('Agendamento excluído com sucesso!'))
            .catch(error => {
                console.error("Erro ao excluir agendamento:", error);
                alert("Ocorreu um erro. Verifique o console.");
            });
    }
}

// ==========================================================================
// 5. GERENCIAMENTO DE PROMOÇÕES
// ==========================================================================

function loadPromotions() {
    const promocoesRef = ref(database, 'promocoes');
    onValue(promocoesRef, (snapshot) => {
        promocoesList.innerHTML = '';
        if (snapshot.exists()) {
            const promocoes = snapshot.val();
            for (const key in promocoes) {
                const promocao = promocoes[key];
                createPromocaoCard(promocao, key);
            }
        } else {
            promocoesList.innerHTML = '<p>Nenhuma promoção cadastrada.</p>';
        }
    });
}

function createPromocaoCard(promocao, key) {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    
    const servicoNome = servicosGlobais[promocao.servicoId] ? servicosGlobais[promocao.servicoId].nome : 'Serviço excluído';

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${promocao.nome}</h5>
            <p class="card-text"><strong>Serviço:</strong> ${servicoNome}</p>
            <p class="card-text"><strong>Desconto:</strong> ${promocao.tipoDesconto === 'percentual' ? `${promocao.valorDesconto}%` : `R$ ${promocao.valorDesconto.toFixed(2)}`}</p>
            <p class="card-text"><strong>Válido de:</strong> ${promocao.dataInicio} até ${promocao.dataFim}</p>
            <button class="btn btn-warning btn-sm edit-promocao-btn" data-key="${key}">Editar</button>
            <button class="btn btn-danger btn-sm delete-promocao-btn" data-key="${key}">Excluir</button>
        </div>
    `;
    promocoesList.appendChild(card);
    card.querySelector('.edit-promocao-btn').addEventListener('click', editPromocao);
    card.querySelector('.delete-promocao-btn').addEventListener('click', deletePromocao);
}

function handlePromocaoFormSubmit(e) {
    e.preventDefault();
    const promocaoKey = promocaoForm.dataset.key;
    const promocaoData = {
        nome: document.getElementById('promocaoNome').value,
        servicoId: document.getElementById('promocaoServico').value,
        dataInicio: document.getElementById('dataInicio').value,
        dataFim: document.getElementById('dataFim').value,
        tipoDesconto: document.getElementById('tipoDesconto').value,
        valorDesconto: parseFloat(document.getElementById('valorDesconto').value)
    };

    const promocoesRef = ref(database, `promocoes/${promocaoKey || ''}`);
    if (promocaoKey) {
        set(promocoesRef, promocaoData).then(() => {
            alert('Promoção atualizada com sucesso!');
            promocaoForm.reset();
            promocaoForm.removeAttribute('data-key');
        });
    } else {
        push(promocoesRef, promocaoData).then(() => {
            alert('Promoção criada com sucesso!');
            promocaoForm.reset();
        });
    }
}

function editPromocao(e) {
    const key = e.target.dataset.key;
    const promocaoRef = ref(database, `promocoes/${key}`);
    get(promocaoRef).then(snapshot => {
        const promocaoData = snapshot.val();
        document.getElementById('promocaoNome').value = promocaoData.nome;
        document.getElementById('promocaoServico').value = promocaoData.servicoId;
        document.getElementById('dataInicio').value = promocaoData.dataInicio;
        document.getElementById('dataFim').value = promocaoData.dataFim;
        document.getElementById('tipoDesconto').value = promocaoData.tipoDesconto;
        document.getElementById('valorDesconto').value = promocaoData.valorDesconto;
        promocaoForm.dataset.key = key;
        document.querySelector('[data-tab="promocoesTab"]').click();
    });
}

function deletePromocao(e) {
    const key = e.target.dataset.key;
    if (confirm('Tem certeza que deseja excluir esta promoção?')) {
        const promocaoRef = ref(database, `promocoes/${key}`);
        remove(promocaoRef).then(() => alert('Promoção excluída!'));
    }
}

// ==========================================================================
// 6. GERENCIAMENTO DE CONFIGURAÇÕES
// ==========================================================================

function addPagamentoField(forma = '') {
    const item = document.createElement('div');
    item.className = 'pagamento-item';
    item.innerHTML = `
        <input type="text" class="form-control pagamento-input" value="${forma}" required placeholder="Ex: Pix, Cartão de Crédito">
        <button type="button" class="btn btn-danger btn-sm remove-pagamento-btn">Remover</button>
    `;
    formasPagamentoContainer.appendChild(item);
    item.querySelector('.remove-pagamento-btn').addEventListener('click', () => item.remove());
}

function handleConfigFormSubmit(e) {
    e.preventDefault();
    const whatsappNumber = whatsappNumberInput.value.replace(/\D/g, '');
    const whatsappTemplate = whatsappTemplateInput.value;
    const horariosPorDia = {};
    const formasPagamento = [];

    document.querySelectorAll('.pagamento-input').forEach(input => {
        if (input.value) formasPagamento.push(input.value);
    });

    diasDaSemana.forEach(dia => {
        const ativo = document.getElementById(`${dia}Ativo`).checked;
        const horarioInicio = document.getElementById(`${dia}Inicio`).value;
        const horarioFim = document.getElementById(`${dia}Fim`).value;
        const duracaoServico = parseInt(document.getElementById(`${dia}Duracao`).value);
        horariosPorDia[dia] = { ativo, horarioInicio, horarioFim, duracaoServico };
    });

    const configRef = ref(database, 'configuracoes');
    set(configRef, { whatsappNumber, whatsappTemplate, horariosPorDia, formasPagamento })
        .then(() => alert('Configurações salvas com sucesso!'))
        .catch(error => {
            console.error("Erro ao salvar configurações:", error);
            alert("Ocorreu um erro. Verifique o console.");
        });
}

function loadConfig() {
    const configRef = ref(database, 'configuracoes');
    onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            const config = snapshot.val();
            whatsappNumberInput.value = config.whatsappNumber;
            whatsappTemplateInput.value = config.whatsappTemplate || '';
            
            formasPagamentoContainer.innerHTML = '';
            (config.formasPagamento || []).forEach(forma => addPagamentoField(forma));

            diasDaSemana.forEach(dia => {
                const diaConfig = config.horariosPorDia[dia];
                if (diaConfig) {
                    document.getElementById(`${dia}Ativo`).checked = diaConfig.ativo;
                    document.getElementById(`${dia}Inicio`).value = diaConfig.horarioInicio;
                    document.getElementById(`${dia}Fim`).value = diaConfig.horarioFim;
                    document.getElementById(`${dia}Duracao`).value = diaConfig.duracaoServico;
                }
            });
        }
    });
}

// ==========================================================================
// 7. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
