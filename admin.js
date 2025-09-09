/*
 * Arquivo: admin.js
 * Descrição: Lógica para o painel de administração.
 * Versão: 8.0 (Suporte a múltiplos equipamentos e carrossel)
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
const servicoDescricaoInput = document.getElementById('servicoDescricao');
const servicoPrecoInput = document.getElementById('servicoPreco');
const servicosList = document.getElementById('servicosList');
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
    setupMensagensTab();
    setupPromocoes();
});

function setupTabNavigation() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove a classe 'active' de todos os botões e 'tab-pane'
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.add('hidden'));

            // Adiciona a classe 'active' ao botão clicado
            button.classList.add('active');

            // Exibe o painel de conteúdo correspondente
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
        <div class="additional-field" data-type="${fieldData.tipo || 'select'}">
            <div class="form-group">
                <label>Nome do Campo</label>
                <input type="text" class="form-control field-name" placeholder="Ex: Capacidade de BTUs" value="${fieldData.nome || ''}" required>
            </div>
            <div class="form-group">
                <label>Tipo do Campo</label>
                <select class="form-control field-type">
                    <option value="select" ${fieldData.tipo === 'select' ? 'selected' : ''}>Lista de Opções (select)</option>
                    <option value="text" ${fieldData.tipo === 'text' ? 'selected' : ''}>Campo de Texto</option>
                    <option value="number" ${fieldData.tipo === 'number' ? 'selected' : ''}>Campo Numérico</option>
                    <option value="textarea" ${fieldData.tipo === 'textarea' ? 'selected' : ''}>Campo de Texto Longo</option>
                </select>
            </div>
            <div class="options-container">
                ${fieldData.tipo === 'select' || !fieldData.tipo ? generateOptionsHTML(fieldData.opcoes) : ''}
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
        if (selectedType === 'select') {
            optionsContainer.innerHTML = generateOptionsHTML();
            optionsContainer.querySelector('.add-option-btn').addEventListener('click', addOptionForm);
            optionsContainer.querySelectorAll('.remove-option-btn').forEach(btn => btn.addEventListener('click', removeOptionForm));
        } else {
            optionsContainer.innerHTML = '';
        }
    });

    if (fieldElement.dataset.type === 'select') {
        optionsContainer.querySelector('.add-option-btn').addEventListener('click', addOptionForm);
        optionsContainer.querySelectorAll('.remove-option-btn').forEach(btn => btn.addEventListener('click', removeOptionForm));
    }
    fieldElement.querySelector('.remove-field-btn').addEventListener('click', removeAdditionalFieldForm);
}

function generateOptionsHTML(opcoes = ['']) {
    return `
        <p>Opções:</p>
        <div class="option-list">
            ${opcoes.map(option => {
                const parts = option.split(', R$ ');
                const optionValue = parts[0] || '';
                const optionPrice = parts[1] || '0.00';
                return `
                    <div class="option-item">
                        <input type="text" class="form-control option-value" placeholder="Nome da opção (Ex: 9.000 BTUs)" value="${optionValue}" required>
                        <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="${parseFloat(optionPrice).toFixed(2)}">
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
    const optionHtml = `
        <div class="option-item mt-2">
            <input type="text" class="form-control option-value" placeholder="Nome da opção" required>
            <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="0.00">
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

        if (fieldType === 'select') {
            const opcoes = [];
            fieldElement.querySelectorAll('.option-item').forEach(optionItem => {
                const optionValue = optionItem.querySelector('.option-value').value;
                const optionPrice = parseFloat(optionItem.querySelector('.option-price').value) || 0;
                opcoes.push(`${optionValue}, R$ ${optionPrice.toFixed(2)}`);
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

    // Adicionar informações de promoção se existirem
    const promocaoPorcentagem = parseFloat(document.getElementById('promotionDiscount').value);
    const promocaoDescricao = document.getElementById('promotionDescription').value;
    const promocaoDataInicio = document.getElementById('promotionStartDate').value;
    const promocaoDataFim = document.getElementById('promotionEndDate').value;

    if (promocaoPorcentagem && promocaoDescricao && promocaoDataInicio && promocaoDataFim) {
        servico.promocao = {
            porcentagem: promocaoPorcentagem,
            descricao: promocaoDescricao,
            dataInicio: promocaoDataInicio,
            dataFim: promocaoDataFim
        };

        // Salvar a promoção em um nó separado para fácil consulta
        const promocaoRef = ref(database, `promocoes/${servicoKey || ''}`);
        set(promocaoRef, {
            servicoKey: servicoKey,
            porcentagem: promocaoPorcentagem,
            descricao: promocaoDescricao,
            dataInicio: promocaoDataInicio,
            dataFim: promocaoDataFim
        });
    }

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
    document.getElementById('promotionFields').classList.add('hidden');
    document.getElementById('togglePromotionBtn').textContent = 'Criar Promoção';
    document.getElementById('promotionDiscount').value = '';
    document.getElementById('promotionDescription').value = '';
    document.getElementById('promotionStartDate').value = '';
    document.getElementById('promotionEndDate').value = '';
    servicoForm.querySelector('button[type="submit"]').textContent = 'Salvar Serviço';
}

function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicosList.innerHTML = '';
        if (snapshot.exists()) {
            const servicos = snapshot.val();
            for (const key in servicos) {
                const servico = servicos[key];
                createServicoCard(servico, key);
            }
        } else {
            servicosList.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        }
    });
}

function createServicoCard(servico, key) {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    
    let camposAdicionaisHtml = '';
    if (servico.camposAdicionais) {
        camposAdicionaisHtml = servico.camposAdicionais.map(campo => {
            let opcoesHtml = '';
            if (campo.tipo === 'select' && campo.opcoes) {
                opcoesHtml = `<ul>${campo.opcoes.map(opcao => `<li>${opcao}</li>`).join('')}</ul>`;
            } else {
                opcoesHtml = `<p>Tipo: ${campo.tipo}</p>`;
            }
            return `<li><strong>${campo.nome}</strong>: ${opcoesHtml}</li>`;
        }).join('');
    }

    let promocaoHtml = '';
    if (servico.promocao) {
        promocaoHtml = `
            <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;">
                <strong>🎯 Promoção Ativa!</strong><br>
                Desconto: ${servico.promocao.porcentagem}%<br>
                Descrição: ${servico.promocao.descricao}<br>
                Período: ${formatDate(servico.promocao.dataInicio)} à ${formatDate(servico.promocao.dataFim)}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${servico.nome}</h5>
            <p class="card-text"><strong>Descrição:</strong> ${servico.descricao}</p>
            <p class="card-text"><strong>Preço Base:</strong> R$ ${servico.precoBase ? servico.precoBase.toFixed(2) : '0.00'}</p>
            ${promocaoHtml}
            <h6>Campos Adicionais:</h6>
            <ul>${camposAdicionaisHtml || '<p>Nenhum campo adicional.</p>'}</ul>
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
        servicoDescricaoInput.value = servicoData.descricao;
        servicoPrecoInput.value = servicoData.precoBase || 0;
        servicoForm.dataset.key = key;
        
        additionalFieldsContainer.innerHTML = '';
        if (servicoData.camposAdicionais) {
            servicoData.camposAdicionais.forEach(field => addAdditionalFieldForm(field));
        }

        // Preencher campos de promoção se existirem
        if (servicoData.promocao) {
            document.getElementById('promotionDiscount').value = servicoData.promocao.porcentagem;
            document.getElementById('promotionDescription').value = servicoData.promocao.descricao;
            document.getElementById('promotionStartDate').value = servicoData.promocao.dataInicio;
            document.getElementById('promotionEndDate').value = servicoData.promocao.dataFim;
            document.getElementById('promotionFields').classList.remove('hidden');
            document.getElementById('togglePromotionBtn').textContent = 'Cancelar';
