/*
 * Arquivo: admin.js
 * Descrição: Lógica para o painel de administração.
 * Versão: 10.0 (Inclui exclusão de serviço e restauração de limite)
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

const servicoForm = document.getElementById('servicoForm');
const servicoNomeInput = document.getElementById('servicoNome');
const servicoDescricaoInput = document.getElementById('servicoDescricao');
const servicoPrecoInput = document.getElementById('servicoPreco');
const servicosListElement = document.getElementById('listaServicosTab'); // Renomeado para evitar conflito com a var global
const agendamentosList = document.getElementById('agendamentosList');
const configForm = document.getElementById('configForm');
const whatsappNumberInput = document.getElementById('whatsappNumber');
const horariosContainer = document.getElementById('horariosContainer');
const addFieldBtn = document.getElementById('addFieldBtn');
const additionalFieldsContainer = document.getElementById('additionalFieldsContainer');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    loadBookings();
    loadConfig();
    setupConfigForm();
    setupServicoForm();
    setupTabNavigation();
});

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
    addFieldBtn.addEventListener('click', () => addAdditionalFieldForm());
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
            <div class="form-group">
                <label for="${dia}Limite">Limite de Agendamentos (por dia):</label>
                <input type="number" class="form-control horario-limite" id="${dia}Limite" value="0" min="0">
            </div>
        `;
        horariosContainer.appendChild(div);
    });

    configForm.addEventListener('submit', handleConfigFormSubmit);
}

// ==========================================================================
// 3. GERENCIAMENTO DE SERVIÇOS (CRUD)
// ==========================================================================

function addAdditionalFieldForm(fieldData = {}) {
    const fieldHtml = `
        <div class="additional-field" data-type="${fieldData.tipo || 'select_com_preco'}">
            <div class="form-group">
                <label>Nome do Campo</label>
                <input type="text" class="form-control field-name" placeholder="Ex: Capacidade de BTUs" value="${fieldData.nome || ''}" required>
            </div>
            <div class="form-group">
                <label>Tipo do Campo</label>
                <select class="form-control field-type">
                    <option value="select_com_preco" ${fieldData.tipo === 'select_com_preco' ? 'selected' : ''}>Lista de Opções (com preço)</option>
                    <option value="select_sem_preco" ${fieldData.tipo === 'select_sem_preco' ? 'selected' : ''}>Lista de Opções (sem preço)</option>
                    <option value="select_quantidade" ${fieldData.tipo === 'select_quantidade' ? 'selected' : ''}>Campo de Quantidade</option>
                    <option value="text" ${fieldData.tipo === 'text' ? 'selected' : ''}>Campo de Texto</option>
                    <option value="textarea" ${fieldData.tipo === 'textarea' ? 'selected' : ''}>Campo de Texto Longo</option>
                    <option value="number" ${fieldData.tipo === 'number' ? 'selected' : ''}>Campo Numérico</option>
                </select>
            </div>
            <div class="options-container">
                ${(fieldData.tipo === 'select_com_preco' || !fieldData.tipo) ? generateOptionsHTML(fieldData.opcoes, 'com_preco') : ''}
                ${(fieldData.tipo === 'select_sem_preco') ? generateOptionsHTML(fieldData.opcoes, 'sem_preco') : ''}
                ${(fieldData.tipo === 'select_quantidade') ? generateOptionsHTML(fieldData.opcoes, 'quantidade') : ''}
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-field-btn">Remover Campo</button>
        </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fieldHtml;
    const fieldElement = tempDiv.firstElementChild;
    additionalFieldsContainer.appendChild(fieldElement);

    const fieldTypeSelect = fieldElement.querySelector('.field-type');
    const optionsContainer = fieldElement.querySelector('.options-container');

    fieldTypeSelect.addEventListener('change', (e) => {
        const selectedType = e.target.value;
        fieldElement.dataset.type = selectedType;
        if (selectedType === 'select_com_preco') {
            optionsContainer.innerHTML = generateOptionsHTML([], 'com_preco');
        } else if (selectedType === 'select_sem_preco') {
            optionsContainer.innerHTML = generateOptionsHTML([], 'sem_preco');
        } else if (selectedType === 'select_quantidade') {
            optionsContainer.innerHTML = generateOptionsHTML([], 'quantidade');
        } else {
            optionsContainer.innerHTML = '';
        }

        if (selectedType.startsWith('select')) {
            optionsContainer.querySelector('.add-option-btn').addEventListener('click', addOptionForm);
            optionsContainer.querySelectorAll('.remove-option-btn').forEach(btn => btn.addEventListener('click', removeOptionForm));
        }
    });

    if (fieldElement.dataset.type.startsWith('select')) {
        optionsContainer.querySelector('.add-option-btn').addEventListener('click', addOptionForm);
        optionsContainer.querySelectorAll('.remove-option-btn').forEach(btn => btn.addEventListener('click', removeOptionForm));
    }
    fieldElement.querySelector('.remove-field-btn').addEventListener('click', removeAdditionalFieldForm);
}

function generateOptionsHTML(opcoes = [''], type = 'com_preco') {
    const isQuantity = type === 'quantidade';
    const hasPrice = type === 'com_preco';
    return `
        <p>Opções:</p>
        <div class="option-list">
            ${opcoes.map(option => {
                let optionValue = option;
                let optionPrice = '0.00';
                if (hasPrice) {
                    const parts = option.split(', R$ ');
                    optionValue = parts[0] || '';
                    optionPrice = parts[1] || '0.00';
                }
                return `
                    <div class="option-item">
                        <input type="text" class="form-control option-value" placeholder="Nome da opção (Ex: 9.000 BTUs)" value="${optionValue}" required>
                        ${hasPrice ? `<input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="${parseFloat(optionPrice).toFixed(2)}">` : ''}
                        <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
                    </div>
                `;
            }).join('')}
        </div>
        <button type="button" class="btn btn-sm btn-light add-option-btn">Adicionar Opção</button>
    `;
}

function addOptionForm(e) {
    const optionList = e.target.closest('.options-container').querySelector('.option-list');
    const fieldElement = e.target.closest('.additional-field');
    const fieldType = fieldElement.dataset.type;
    const isQuantity = fieldType === 'select_quantidade';
    const hasPrice = fieldType === 'select_com_preco';

    const optionHtml = `
        <div class="option-item mt-2">
            <input type="text" class="form-control option-value" placeholder="Nome da opção" required>
            ${hasPrice ? `<input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="0.00">` : ''}
            <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
        </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = optionHtml;
    const newOption = tempDiv.firstElementChild;
    optionList.appendChild(newOption);
    newOption.querySelector('.remove-option-btn').addEventListener('click', removeOptionForm);
}

function removeOptionForm(e) {
    e.target.closest('.option-item').remove();
}

function removeAdditionalFieldForm(e) {
    e.target.closest('.additional-field').remove();
}

function handleServicoFormSubmit(e) {
    e.preventDefault();

    const nome = servicoNomeInput.value;
    const descricao = servicoDescricaoInput.value;
    const precoBase = parseFloat(servicoPrecoInput.value) || 0;
    const servicoKey = servicoForm.dataset.key;

    const camposAdicionais = [];
    document.querySelectorAll('.additional-field').forEach(fieldElement => {
        const fieldName = fieldElement.querySelector('.field-name').value;
        const fieldType = fieldElement.querySelector('.field-type').value;

        const campoData = {
            nome: fieldName,
            tipo: fieldType
        };

        if (fieldType === 'select_com_preco' || fieldType === 'select_sem_preco' || fieldType === 'select_quantidade') {
            const opcoes = [];
            fieldElement.querySelectorAll('.option-item').forEach(optionItem => {
                const optionValue = optionItem.querySelector('.option-value').value;
                if (fieldType === 'select_com_preco') {
                    const optionPrice = parseFloat(optionItem.querySelector('.option-price').value) || 0;
                    opcoes.push(`${optionValue}, R$ ${optionPrice.toFixed(2)}`);
                } else {
                    opcoes.push(optionValue);
                }
            });
            campoData.opcoes = opcoes;
        }

        camposAdicionais.push(campoData);
    });

    const servico = {
        nome,
        descricao,
        precoBase,
        camposAdicionais
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
    additionalFieldsContainer.innerHTML = '';
    servicoForm.querySelector('button[type="submit"]').textContent = 'Salvar Serviço';
}

function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        const servicesListElement = document.getElementById('listaServicosTab'); // Nome correto do ID
        if (servicesListElement) {
            servicesListElement.innerHTML = '';
            if (snapshot.exists()) {
                const servicos = snapshot.val();
                for (const key in servicos) {
                    const servico = servicos[key];
                    createServicoCard(servico, key);
                }
            } else {
                servicesListElement.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
            }
        }
    });
}

function createServicoCard(servico, key) {
    const card = document.createElement('div');
    card.className = 'card mb-3';

    let camposAdicionaisHtml = '';
    if (servico.camposAdicionais && servico.camposAdicionais.length > 0) {
        camposAdicionaisHtml = servico.camposAdicionais.map(campo => {
            let opcoesHtml = '';
            if (campo.opcoes && campo.opcoes.length > 0) {
                opcoesHtml = `<ul>${campo.opcoes.map(opcao => `<li>${opcao}</li>`).join('')}</ul>`;
            } else {
                opcoesHtml = `<p>Tipo: ${campo.tipo}</p>`;
            }
            return `<li><strong>${campo.nome}</strong>: ${opcoesHtml}</li>`;
        }).join('');
    } else {
        camposAdicionaisHtml = '<p>Nenhum campo adicional.</p>';
    }

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${servico.nome}</h5>
            <p class="card-text"><strong>Descrição:</strong> ${servico.descricao}</p>
            <p class="card-text"><strong>Preço Base:</strong> R$ ${servico.precoBase ? servico.precoBase.toFixed(2) : '0.00'}</p>
            <h6>Campos Adicionais:</h6>
            ${camposAdicionaisHtml}
            <button class="btn btn-warning btn-sm edit-service-btn" data-key="${key}">Editar</button>
            <button class="btn btn-danger btn-sm delete-service-btn" data-key="${key}">Excluir</button>
        </div>
    `;
    const servicesListElement = document.getElementById('listaServicosTab');
    if (servicesListElement) {
        servicesListElement.appendChild(card);
    }
    card.querySelector('.edit-service-btn').addEventListener('click', editService);
    card.querySelector('.delete-service-btn').addEventListener('click', deleteService);
}

function editService(e) {
    const key = e.target.dataset.key;
    const servicoRef = ref(database, `servicos/${key}`);
    get(servicoRef).then(snapshot => {
        const servicoData = snapshot.val();
        servicoNomeInput.value = servicoData.nome;
        servicoDescricaoInput.value = servicoData.descricao;
        servicoPrecoInput.value = servicoData.precoBase || 0;
        servicoForm.dataset.key = key;

        additionalFieldsContainer.innerHTML = '';
        if (servicoData.camposAdicionais) {
            servicoData.camposAdicionais.forEach(field => addAdditionalFieldForm(field));
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
            let camposDetalhados = '';
            if (servico.camposAdicionaisSelecionados) {
                Object.entries(servico.camposAdicionaisSelecionados).forEach(([campoNome, valor]) => {
                    if (valor !== "" && valor !== "Não" && valor !== null && valor !== undefined) { // Evita mostrar campos vazios ou "Não"
                        let valorFormatado = valor;
                        if (typeof valor === 'number') {
                            valorFormatado = `R$ ${valor.toFixed(2)}`;
                        } else if (typeof valor === 'string' && valor.includes(', R$ ')) {
                            // Extrai o nome da opção se for do tipo "Opção, R$ Preço"
                            valorFormatado = valor.split(', R$ ')[0];
                        }
                        camposDetalhados += `<li>${campoNome}: ${valorFormatado}</li>`;
                    }
                });
            }
            servicosHtml += `<li><strong>${servico.nome}</strong>: R$ ${servico.precoCalculado ? servico.precoCalculado.toFixed(2) : '0.00'}
                ${camposDetalhados ? `<ul>${camposDetalhados}</ul>` : ''}
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
            <hr>
            <h6>Serviços:</h6>
            ${servicosHtml}
            <p><strong>Total:</strong> R$ ${agendamento.orcamentoTotal ? agendamento.orcamentoTotal.toFixed(2) : '0.00'}</p>
            <p><strong>Forma de Pagamento:</strong> ${agendamento.formaPagamento}</p>
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
// 5. GERENCIAMENTO DE CONFIGURAÇÕES
// ==========================================================================

function handleConfigFormSubmit(e) {
    e.preventDefault();
    const whatsappNumber = whatsappNumberInput.value.replace(/\D/g, '');
    const horariosPorDia = {};

    diasDaSemana.forEach(dia => {
        const ativo = document.getElementById(`${dia}Ativo`).checked;
        const horarioInicio = document.getElementById(`${dia}Inicio`).value;
        const horarioFim = document.getElementById(`${dia}Fim`).value;
        const duracaoServico = parseInt(document.getElementById(`${dia}Duracao`).value);
        const limiteServico = parseInt(document.getElementById(`${dia}Limite`).value) || 0; // Captura o novo campo

        horariosPorDia[dia] = { ativo, horarioInicio, horarioFim, duracaoServico, limiteServico };
    });

    const configRef = ref(database, 'configuracoes');
    set(configRef, { whatsappNumber, horariosPorDia })
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
            whatsappNumberInput.value = config.whatsappNumber || '';
            diasDaSemana.forEach(dia => {
                const diaConfig = config.horariosPorDia && config.horariosPorDia[dia];
                const diaAtivoInput = document.getElementById(`${dia}Ativo`);
                const inicioInput = document.getElementById(`${dia}Inicio`);
                const fimInput = document.getElementById(`${dia}Fim`);
                const duracaoInput = document.getElementById(`${dia}Duracao`);
                const limiteInput = document.getElementById(`${dia}Limite`); // Referência ao novo campo

                if (diaConfig) {
                    diaAtivoInput.checked = diaConfig.ativo !== undefined ? diaConfig.ativo : false;
                    inicioInput.value = diaConfig.horarioInicio || '08:00';
                    fimInput.value = diaConfig.horarioFim || '18:00';
                    duracaoInput.value = diaConfig.duracaoServico || 60;
                    limiteInput.value = diaConfig.limiteServico !== undefined ? diaConfig.limiteServico : 0; // Define o valor do limite
                } else {
                     // Define valores padrão se a configuração para o dia não existir
                     diaAtivoInput.checked = false;
                     inicioInput.value = '08:00';
                     fimInput.value = '18:00';
                     duracaoInput.value = 60;
                     limiteInput.value = 0;
                }
            });
        } else {
             // Se não houver configurações salvas, preenche com valores padrão
             diasDaSemana.forEach(dia => {
                document.getElementById(`${dia}Ativo`).checked = false;
                document.getElementById(`${dia}Inicio`).value = '08:00';
                document.getElementById(`${dia}Fim`).value = '18:00';
                document.getElementById(`${dia}Duracao`).value = 60;
                document.getElementById(`${dia}Limite`).value = 0;
            });
        }
    });
}

// ==========================================================================
// 6. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
