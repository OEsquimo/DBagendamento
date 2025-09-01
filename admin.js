/*
 * Arquivo: admin.js
 * Descrição: Lógica principal para o painel administrativo.
 * Versão: 14.0 (Versão Final - Correções e Melhorias)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, get, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

// Elementos do DOM - Login
const loginContainer = document.getElementById('login-container');
const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');

// Elementos do DOM - Navegação
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// Elementos do DOM - Agendamentos
const agendamentosList = document.getElementById('agendamentos-list');
const statusFilter = document.getElementById('status-filter');
const dateFilter = document.getElementById('date-filter');

// Elementos do DOM - Serviços
const servicosList = document.getElementById('servicos-list');
const addServiceBtn = document.getElementById('add-service-btn');
const serviceModal = document.getElementById('service-modal');
const serviceForm = document.getElementById('service-form');
const closeModalBtn = serviceModal.querySelector('.close-btn');
const modalTitle = document.getElementById('modal-title');
const blockEditorContainer = document.getElementById('block-editor-container');
const addBlockBtn = document.getElementById('add-block-btn');
const blockTypeSelect = document.getElementById('block-type-select');

// Elementos do DOM - Promoções
const promocoesList = document.getElementById('promocoes-list');
const addPromocaoBtn = document.getElementById('add-promocao-btn');
const promocaoModal = document.getElementById('promocao-modal');
const promocaoForm = document.getElementById('promocao-form');
const promocaoCloseBtn = promocaoModal.querySelector('.close-btn');

// Elementos do DOM - Configurações
const saveConfigBtn = document.getElementById('save-config-btn');
const whatsappNumberInput = document.getElementById('whatsappNumber');
const whatsappTemplateInput = document.getElementById('whatsappTemplate');
const paymentOptionsContainer = document.getElementById('payment-options-container');
const newPaymentOptionInput = document.getElementById('new-payment-option');
const addPaymentBtn = document.getElementById('add-payment-btn');
const horariosContainer = document.getElementById('horarios-container');
const saveHorariosBtn = document.getElementById('save-horarios-btn');

// Variáveis de Estado
let editServiceKey = null;
let editPromocaoKey = null;
let currentServiceBlocks = [];

// ==========================================================================
// 2. FUNÇÕES DE AUTENTICAÇÃO E NAVEGAÇÃO
// ==========================================================================

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    if (username === 'admin' && password === '123') {
        loginContainer.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        loadInitialData();
    } else {
        alert('Usuário ou senha incorretos.');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    adminPanel.classList.add('hidden');
    loginContainer.classList.remove('hidden');
});

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));
        button.classList.add('active');
        document.getElementById(tab).classList.remove('hidden');
    });
});

function loadInitialData() {
    loadAgendamentos();
    loadServicos();
    loadPromocoes();
    loadConfiguracoes();
}

// ==========================================================================
// 3. GERENCIAMENTO DE AGENDAMENTOS
// ==========================================================================

function loadAgendamentos() {
    const agendamentosRef = ref(database, 'agendamentos');
    onValue(agendamentosRef, (snapshot) => {
        const agendamentos = snapshot.val() || {};
        renderAgendamentos(agendamentos);
    });
}

function renderAgendamentos(agendamentos) {
    agendamentosList.innerHTML = '';
    const filteredStatus = statusFilter.value;
    const filteredDate = dateFilter.value;

    const agendamentosArray = Object.keys(agendamentos).map(key => ({
        key,
        ...agendamentos[key]
    })).sort((a, b) => new Date(b.data + ' ' + b.hora) - new Date(a.data + ' ' + a.hora));

    if (agendamentosArray.length === 0) {
        agendamentosList.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
        return;
    }

    agendamentosArray.forEach(agendamento => {
        if ((filteredStatus === 'Todos' || agendamento.status === filteredStatus) &&
            (!filteredDate || agendamento.data === formatDate(filteredDate))) {
            const card = document.createElement('div');
            card.className = 'agendamento-card';
            
            const servicosList = agendamento.servicos.map(s => s.nome).join(', ');

            card.innerHTML = `
                <div class="agendamento-details">
                    <h4>Agendamento de ${agendamento.cliente.nome}</h4>
                    <p><strong>Data:</strong> ${agendamento.data} às ${agendamento.hora}</p>
                    <p><strong>Serviços:</strong> ${servicosList}</p>
                    <p><strong>Total:</strong> R$ ${agendamento.orcamentoTotal.toFixed(2)}</p>
                    <p><strong>Status:</strong> <span class="agendamento-status status-${agendamento.status}">${agendamento.status}</span></p>
                </div>
                <div class="agendamento-actions">
                    <button class="btn btn-primary btn-update-status" data-key="${agendamento.key}" data-status="Confirmado">Confirmar</button>
                    <button class="btn btn-success btn-update-status" data-key="${agendamento.key}" data-status="Concluído">Concluir</button>
                    <button class="btn btn-danger btn-update-status" data-key="${agendamento.key}" data-status="Cancelado">Cancelar</button>
                </div>
            `;
            agendamentosList.appendChild(card);
        }
    });

    document.querySelectorAll('.btn-update-status').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            const newStatus = e.target.dataset.status;
            updateAgendamentoStatus(key, newStatus);
        });
    });
}

statusFilter.addEventListener('change', () => {
    loadAgendamentos();
});

dateFilter.addEventListener('change', () => {
    loadAgendamentos();
});

function updateAgendamentoStatus(key, status) {
    const agendamentoRef = ref(database, `agendamentos/${key}`);
    update(agendamentoRef, { status })
        .then(() => {
            alert(`Status do agendamento ${key} atualizado para ${status}.`);
        })
        .catch(error => {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao atualizar status.");
        });
}

// ==========================================================================
// 4. GERENCIAMENTO DE SERVIÇOS E EDITOR DE BLOCOS
// ==========================================================================

function loadServicos() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        const servicos = snapshot.val() || {};
        renderServicos(servicos);
        populatePromocaoServicoSelect(servicos);
    });
}

function renderServicos(servicos) {
    servicosList.innerHTML = '';
    const servicosArray = Object.keys(servicos).map(key => ({ key, ...servicos[key] }));
    if (servicosArray.length === 0) {
        servicosList.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        return;
    }

    servicosArray.forEach(servico => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="item-details">
                <h4>${servico.nome}</h4>
                <p>R$ ${servico.precoBase.toFixed(2)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-edit-service" data-key="${servico.key}">Editar</button>
                <button class="btn btn-danger btn-delete-service" data-key="${servico.key}">Excluir</button>
            </div>
        `;
        servicosList.appendChild(item);
    });

    document.querySelectorAll('.btn-edit-service').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            editService(key);
        });
    });

    document.querySelectorAll('.btn-delete-service').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            deleteService(key);
        });
    });
}

addServiceBtn.addEventListener('click', () => {
    openServiceModal();
});

closeModalBtn.addEventListener('click', () => {
    serviceModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === serviceModal) {
        serviceModal.style.display = 'none';
    }
});

function openServiceModal(service = null) {
    serviceModal.style.display = 'block';
    serviceForm.reset();
    currentServiceBlocks = [];
    blockEditorContainer.innerHTML = '';
    editServiceKey = null;

    if (service) {
        modalTitle.textContent = 'Editar Serviço';
        document.getElementById('service-name').value = service.nome;
        document.getElementById('service-description').value = service.descricao;
        document.getElementById('service-base-price').value = service.precoBase;
        document.getElementById('service-key').value = service.key;
        editServiceKey = service.key;

        if (service.conteudoDinamico) {
            currentServiceBlocks = service.conteudoDinamico;
            renderBlockEditor();
        }
    } else {
        modalTitle.textContent = 'Adicionar Serviço';
    }
}

function editService(key) {
    const servicoRef = ref(database, `servicos/${key}`);
    get(servicoRef).then(snapshot => {
        if (snapshot.exists()) {
            const service = snapshot.val();
            service.key = key;
            openServiceModal(service);
        }
    });
}

function deleteService(key) {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
        const servicoRef = ref(database, `servicos/${key}`);
        remove(servicoRef)
            .then(() => {
                alert('Serviço excluído com sucesso!');
            })
            .catch(error => {
                console.error("Erro ao excluir serviço:", error);
                alert("Erro ao excluir serviço.");
            });
    }
}

// NOVO: Funções do Editor de Blocos
addBlockBtn.addEventListener('click', () => {
    const blockType = blockTypeSelect.value;
    let newBlock = { tipo: blockType, conteudo: '' };

    if (blockType === 'campo') {
        newBlock.conteudo = { nome: '', tipo: 'text', opcoes: [] };
    }

    currentServiceBlocks.push(newBlock);
    renderBlockEditor();
});

function renderBlockEditor() {
    blockEditorContainer.innerHTML = '';
    currentServiceBlocks.forEach((block, index) => {
        const blockItem = document.createElement('div');
        blockItem.className = 'block-item';
        
        let contentHtml = '';
        if (block.tipo === 'titulo' || block.tipo === 'paragrafo' || block.tipo === 'imagem') {
            contentHtml = `
                <div class="block-input-group">
                    <label>${capitalize(block.tipo)}</label>
                    <input type="text" class="form-control" value="${block.conteudo}" placeholder="${block.tipo === 'imagem' ? 'Nome do arquivo de imagem (ex: imagem1.jpg)' : ''}">
                </div>
            `;
        } else if (block.tipo === 'campo') {
            const campo = block.conteudo;
            let opcoesHtml = '';
            if (campo.tipo === 'select') {
                opcoesHtml = `
                    <div class="form-group options-container">
                        ${campo.opcoes.map(opt => `
                            <div class="option-tag">
                                <span>${opt.nome} (R$ ${opt.precoAdicional.toFixed(2)})</span>
                                <button type="button" class="remove-option-btn">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="form-group block-input-group">
                        <label>Adicionar Opção</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" class="form-control new-option-name" placeholder="Nome (ex: 9000 BTUs)">
                            <input type="number" class="form-control new-option-price" placeholder="Preço Adicional (R$)" step="0.01">
                        </div>
                        <button type="button" class="btn btn-secondary add-option-btn">Adicionar Opção</button>
                    </div>
                `;
            }

            contentHtml = `
                <div class="block-input-group">
                    <label>Nome do Campo</label>
                    <input type="text" class="form-control field-name" value="${campo.nome}" placeholder="Ex: Capacidade, Tipo de Instalação">
                </div>
                <div class="block-input-group">
                    <label>Tipo de Campo</label>
                    <select class="form-control field-type">
                        <option value="text" ${campo.tipo === 'text' ? 'selected' : ''}>Texto</option>
                        <option value="number" ${campo.tipo === 'number' ? 'selected' : ''}>Número</option>
                        <option value="textarea" ${campo.tipo === 'textarea' ? 'selected' : ''}>Área de Texto</option>
                        <option value="select" ${campo.tipo === 'select' ? 'selected' : ''}>Seleção (Dropdown)</option>
                    </select>
                </div>
                ${opcoesHtml}
            `;
        }

        blockItem.innerHTML = `
            <div class="block-content">
                <small>Tipo: ${capitalize(block.tipo)}</small>
                ${contentHtml}
            </div>
            <div class="block-controls">
                <button type="button" class="btn btn-secondary move-up-btn" data-index="${index}">▲</button>
                <button type="button" class="btn btn-secondary move-down-btn" data-index="${index}">▼</button>
                <button type="button" class="btn btn-danger remove-block-btn" data-index="${index}">X</button>
            </div>
        `;
        blockEditorContainer.appendChild(blockItem);

        // Event Listeners para os controles
        blockItem.querySelector('.remove-block-btn').addEventListener('click', () => {
            currentServiceBlocks.splice(index, 1);
            renderBlockEditor();
        });

        if (blockItem.querySelector('.move-up-btn')) {
            blockItem.querySelector('.move-up-btn').addEventListener('click', () => {
                if (index > 0) {
                    const temp = currentServiceBlocks[index];
                    currentServiceBlocks[index] = currentServiceBlocks[index - 1];
                    currentServiceBlocks[index - 1] = temp;
                    renderBlockEditor();
                }
            });
            if (index === 0) blockItem.querySelector('.move-up-btn').disabled = true;
        }
        
        if (blockItem.querySelector('.move-down-btn')) {
            blockItem.querySelector('.move-down-btn').addEventListener('click', () => {
                if (index < currentServiceBlocks.length - 1) {
                    const temp = currentServiceBlocks[index];
                    currentServiceBlocks[index] = currentServiceBlocks[index + 1];
                    currentServiceBlocks[index + 1] = temp;
                    renderBlockEditor();
                }
            });
            if (index === currentServiceBlocks.length - 1) blockItem.querySelector('.move-down-btn').disabled = true;
        }

        // Event Listeners para os campos
        const inputElement = blockItem.querySelector('.block-content input');
        if (inputElement) {
            inputElement.addEventListener('input', (e) => {
                currentServiceBlocks[index].conteudo = e.target.value;
            });
        }
        const textareaElement = blockItem.querySelector('.block-content textarea');
        if (textareaElement) {
            textareaElement.addEventListener('input', (e) => {
                currentServiceBlocks[index].conteudo = e.target.value;
            });
        }
        
        if (block.tipo === 'campo') {
            const fieldNameInput = blockItem.querySelector('.field-name');
            if (fieldNameInput) {
                fieldNameInput.addEventListener('input', (e) => {
                    currentServiceBlocks[index].conteudo.nome = e.target.value;
                });
            }
            const fieldTypeSelect = blockItem.querySelector('.field-type');
            if (fieldTypeSelect) {
                fieldTypeSelect.addEventListener('change', (e) => {
                    currentServiceBlocks[index].conteudo.tipo = e.target.value;
                    if (e.target.value !== 'select') {
                        delete currentServiceBlocks[index].conteudo.opcoes;
                    } else {
                        currentServiceBlocks[index].conteudo.opcoes = [];
                    }
                    renderBlockEditor();
                });
            }

            if (block.conteudo.tipo === 'select') {
                const addOptionBtn = blockItem.querySelector('.add-option-btn');
                addOptionBtn.addEventListener('click', () => {
                    const optionName = blockItem.querySelector('.new-option-name').value;
                    const optionPrice = blockItem.querySelector('.new-option-price').value;
                    if (optionName && optionPrice !== '') {
                        currentServiceBlocks[index].conteudo.opcoes.push({
                            nome: optionName,
                            precoAdicional: parseFloat(optionPrice)
                        });
                        renderBlockEditor();
                    } else {
                        alert('Por favor, preencha o nome e o preço da opção.');
                    }
                });

                blockItem.querySelectorAll('.remove-option-btn').forEach((btn, optionIndex) => {
                    btn.addEventListener('click', () => {
                        currentServiceBlocks[index].conteudo.opcoes.splice(optionIndex, 1);
                        renderBlockEditor();
                    });
                });
            }
        }
    });
}

serviceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const serviceData = {
        nome: document.getElementById('service-name').value,
        descricao: document.getElementById('service-description').value,
        precoBase: parseFloat(document.getElementById('service-base-price').value),
        conteudoDinamico: currentServiceBlocks
    };

    if (editServiceKey) {
        const servicoRef = ref(database, `servicos/${editServiceKey}`);
        set(servicoRef, serviceData)
            .then(() => {
                alert('Serviço atualizado com sucesso!');
                serviceModal.style.display = 'none';
            })
            .catch(error => {
                console.error("Erro ao atualizar serviço:", error);
                alert("Erro ao atualizar serviço.");
            });
    } else {
        const servicosRef = ref(database, 'servicos');
        push(servicosRef, serviceData)
            .then(() => {
                alert('Serviço adicionado com sucesso!');
                serviceModal.style.display = 'none';
            })
            .catch(error => {
                console.error("Erro ao adicionar serviço:", error);
                alert("Erro ao adicionar serviço.");
            });
    }
});

// ==========================================================================
// 5. GERENCIAMENTO DE PROMOÇÕES
// ==========================================================================

function loadPromocoes() {
    const promocoesRef = ref(database, 'promocoes');
    onValue(promocoesRef, (snapshot) => {
        const promocoes = snapshot.val() || {};
        renderPromocoes(promocoes);
    });
}

function renderPromocoes(promocoes) {
    promocoesList.innerHTML = '';
    const promocoesArray = Object.keys(promocoes).map(key => ({ key, ...promocoes[key] }));
    if (promocoesArray.length === 0) {
        promocoesList.innerHTML = '<p>Nenhuma promoção cadastrada.</p>';
        return;
    }

    promocoesArray.forEach(promocao => {
        const servicoNome = getServicoNome(promocao.servicoId);
        const item = document.createElement('div');
        item.className = 'list-item promocao-item';
        item.innerHTML = `
            <div class="item-details">
                <h4>${promocao.nome}</h4>
                <p><strong>Serviço:</strong> ${servicoNome}</p>
                <p><strong>Desconto:</strong> ${promocao.tipoDesconto === 'fixo' ? `R$ ${promocao.valorDesconto.toFixed(2)}` : `${promocao.valorDesconto}%`}</p>
                <p><strong>Válido de:</strong> ${promocao.dataInicio} a ${promocao.dataFim}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-edit-promocao" data-key="${promocao.key}">Editar</button>
                <button class="btn btn-danger btn-delete-promocao" data-key="${promocao.key}">Excluir</button>
            </div>
        `;
        promocoesList.appendChild(item);
    });

    document.querySelectorAll('.btn-edit-promocao').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            editPromocao(key);
        });
    });

    document.querySelectorAll('.btn-delete-promocao').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.target.dataset.key;
            deletePromocao(key);
        });
    });
}

addPromocaoBtn.addEventListener('click', () => {
    openPromocaoModal();
});

promocaoCloseBtn.addEventListener('click', () => {
    promocaoModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === promocaoModal) {
        promocaoModal.style.display = 'none';
    }
});

function openPromocaoModal(promocao = null) {
    promocaoModal.style.display = 'block';
    promocaoForm.reset();
    editPromocaoKey = null;

    if (promocao) {
        document.getElementById('promocao-modal-title').textContent = 'Editar Promoção';
        document.getElementById('promocao-nome').value = promocao.nome;
        document.getElementById('promocao-servico').value = promocao.servicoId;
        document.getElementById('promocao-tipo').value = promocao.tipoDesconto;
        document.getElementById('promocao-valor').value = promocao.valorDesconto;
        document.getElementById('promocao-data-inicio').value = promocao.dataInicio;
        document.getElementById('promocao-data-fim').value = promocao.dataFim;
        editPromocaoKey = promocao.key;
    } else {
        document.getElementById('promocao-modal-title').textContent = 'Adicionar Promoção';
    }
}

function editPromocao(key) {
    const promocaoRef = ref(database, `promocoes/${key}`);
    get(promocaoRef).then(snapshot => {
        if (snapshot.exists()) {
            const promocao = snapshot.val();
            promocao.key = key;
            openPromocaoModal(promocao);
        }
    });
}

function deletePromocao(key) {
    if (confirm('Tem certeza que deseja excluir esta promoção?')) {
        const promocaoRef = ref(database, `promocoes/${key}`);
        remove(promocaoRef)
            .then(() => {
                alert('Promoção excluída com sucesso!');
            })
            .catch(error => {
                console.error("Erro ao excluir promoção:", error);
                alert("Erro ao excluir promoção.");
            });
    }
}

promocaoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const promocaoData = {
        nome: document.getElementById('promocao-nome').value,
        servicoId: document.getElementById('promocao-servico').value,
        tipoDesconto: document.getElementById('promocao-tipo').value,
        valorDesconto: parseFloat(document.getElementById('promocao-valor').value),
        dataInicio: document.getElementById('promocao-data-inicio').value,
        dataFim: document.getElementById('promocao-data-fim').value,
    };

    if (editPromocaoKey) {
        const promocaoRef = ref(database, `promocoes/${editPromocaoKey}`);
        set(promocaoRef, promocaoData)
            .then(() => {
                alert('Promoção atualizada com sucesso!');
                promocaoModal.style.display = 'none';
            })
            .catch(error => {
                console.error("Erro ao atualizar promoção:", error);
                alert("Erro ao atualizar promoção.");
            });
    } else {
        const promocoesRef = ref(database, 'promocoes');
        push(promocoesRef, promocaoData)
            .then(() => {
                alert('Promoção adicionada com sucesso!');
                promocaoModal.style.display = 'none';
            })
            .catch(error => {
                console.error("Erro ao adicionar promoção:", error);
                alert("Erro ao adicionar promoção.");
            });
    }
});

function getServicoNome(servicoId) {
    if (servicoId && servicosGlobais[servicoId]) {
        return servicosGlobais[servicoId].nome;
    }
    return 'Serviço não encontrado';
}

function populatePromocaoServicoSelect(servicos) {
    const select = document.getElementById('promocao-servico');
    select.innerHTML = '<option value="">Selecione um serviço...</option>';
    for (const key in servicos) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = servicos[key].nome;
        select.appendChild(option);
    }
}

// ==========================================================================
// 6. GERENCIAMENTO DE CONFIGURAÇÕES
// ==========================================================================

function loadConfiguracoes() {
    const configRef = ref(database, 'configuracoes');
    onValue(configRef, (snapshot) => {
        const config = snapshot.val() || {};
        renderConfiguracoes(config);
    });
}

function renderConfiguracoes(config) {
    // Configurações gerais
    whatsappNumberInput.value = config.whatsappNumber || '';
    whatsappTemplateInput.value = config.whatsappTemplate || '';

    // Formas de Pagamento
    paymentOptionsContainer.innerHTML = '';
    const formasPagamento = config.formasPagamento || [];
    formasPagamento.forEach(option => {
        createPaymentTag(option);
    });

    // Horários de Atendimento
    horariosContainer.innerHTML = '';
    const horarios = config.horariosPorDia || {};
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    diasSemana.forEach(dia => {
        const diaHorario = horarios[dia] || { ativo: false, horarioInicio: '08:00', horarioFim: '18:00', duracaoServico: 60 };
        const horarioHtml = `
            <div class="horario-dia">
                <input type="checkbox" id="dia-${dia}" data-dia="${dia}" ${diaHorario.ativo ? 'checked' : ''}>
                <label for="dia-${dia}">${capitalize(dia)}</label>
                <span>Início:</span>
                <input type="time" class="form-control" data-dia="${dia}" data-tipo="inicio" value="${diaHorario.horarioInicio}">
                <span>Fim:</span>
                <input type="time" class="form-control" data-dia="${dia}" data-tipo="fim" value="${diaHorario.horarioFim}">
                <span>Duração (min):</span>
                <input type="number" class="form-control" data-dia="${dia}" data-tipo="duracao" value="${diaHorario.duracaoServico}" step="15">
            </div>
        `;
        horariosContainer.innerHTML += horarioHtml;
    });
}

saveConfigBtn.addEventListener('click', () => {
    const configRef = ref(database, 'configuracoes');
    const formasPagamento = Array.from(paymentOptionsContainer.querySelectorAll('.option-tag span')).map(span => span.textContent);
    
    set(configRef, {
        whatsappNumber: whatsappNumberInput.value,
        whatsappTemplate: whatsappTemplateInput.value,
        formasPagamento: formasPagamento,
        horariosPorDia: getCurrentHorarios()
    })
    .then(() => {
        alert('Configurações salvas com sucesso!');
    })
    .catch(error => {
        console.error("Erro ao salvar configurações:", error);
        alert("Erro ao salvar configurações.");
    });
});

addPaymentBtn.addEventListener('click', () => {
    const newOption = newPaymentOptionInput.value.trim();
    if (newOption) {
        createPaymentTag(newOption);
        newPaymentOptionInput.value = '';
    }
});

function createPaymentTag(optionText) {
    const tag = document.createElement('div');
    tag.className = 'option-tag';
    tag.innerHTML = `<span>${optionText}</span><button type="button" class="remove-option-btn">&times;</button>`;
    paymentOptionsContainer.appendChild(tag);
    tag.querySelector('.remove-option-btn').addEventListener('click', () => {
        tag.remove();
    });
}

saveHorariosBtn.addEventListener('click', () => {
    const configRef = ref(database, 'configuracoes/horariosPorDia');
    set(configRef, getCurrentHorarios())
        .then(() => {
            alert('Horários salvos com sucesso!');
        })
        .catch(error => {
            console.error("Erro ao salvar horários:", error);
            alert("Erro ao salvar horários.");
        });
});

function getCurrentHorarios() {
    const horarios = {};
    document.querySelectorAll('.horario-dia').forEach(diaDiv => {
        const dia = diaDiv.querySelector('input[type="checkbox"]').dataset.dia;
        const ativo = diaDiv.querySelector('input[type="checkbox"]').checked;
        const inicio = diaDiv.querySelector('input[data-tipo="inicio"]').value;
        const fim = diaDiv.querySelector('input[data-tipo="fim"]').value;
        const duracao = parseInt(diaDiv.querySelector('input[data-tipo="duracao"]').value, 10);
        horarios[dia] = { ativo, horarioInicio: inicio, horarioFim: fim, duracaoServico: duracao };
    });
    return horarios;
}

// ==========================================================================
// 7. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}
