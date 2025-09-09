/*
 * Arquivo: admin.js
 * Descrição: Lógica para o painel de administração.
 * Versão: 8.1 (Correções em campos adicionais, promoções, agendamentos e config)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ... (Configuração Firebase e Variáveis Globais permanecem as mesmas) ...

// Elementos do DOM (adicionados/modificados)
const servicoPrecoInput = document.getElementById('servicoPreco');
const promotionFields = document.getElementById('promotionFields');
const togglePromotionBtn = document.getElementById('togglePromotionBtn');
const removePromotionBtn = document.getElementById('removePromotionBtn');
const promotionDiscount = document.getElementById('promotionDiscount');
const promotionDescription = document.getElementById('promotionDescription');
const promotionStartDate = document.getElementById('promotionStartDate');
const promotionEndDate = document.getElementById('promotionEndDate');

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
    setupPromocoes(); // Chamada corrigida
});

// ... (setupTabNavigation, setupServicoForm, setupConfigForm permanecem as mesmas) ...

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
            setupOptionEvents(optionsContainer);
        } else {
            optionsContainer.innerHTML = '';
        }
    });

    if (fieldElement.dataset.type === 'select') {
        setupOptionEvents(optionsContainer);
    }
    fieldElement.querySelector('.remove-field-btn').addEventListener('click', removeAdditionalFieldForm);
}

function generateOptionsHTML(opcoes = []) {
    const options = opcoes.length > 0 ? opcoes : [''];
    return `
        <p>Opções:</p>
        <div class="option-list">
            ${options.map(option => {
                // Tenta separar valor e preço, assume que o preço começa com ", R$ "
                const optionParts = option.split(', R$ ');
                const optionValue = optionParts[0] || '';
                let optionPrice = '0.00'; // Preço padrão
                if (optionParts.length === 2) {
                    optionPrice = parseFloat(optionParts[1].replace(',', '.')).toFixed(2); // Garante formatação correta
                }
                return `
                    <div class="option-item">
                        <input type="text" class="form-control option-value" placeholder="Nome da opção (Ex: 9.000 BTUs)" value="${optionValue}" required>
                        <input type="number" class="form-control option-price" placeholder="Preço adicional" step="0.01" value="${optionPrice}">
                        <button type="button" class="btn btn-danger btn-sm remove-option-btn">Remover</button>
                    </div>
                `;
            }).join('')}
        </div>
        <button type="button" class="btn btn-sm btn-light add-option-btn">Adicionar Opção</button>
    `;
}


function setupOptionEvents(container) {
    container.querySelector('.add-option-btn').addEventListener('click', addOptionForm);
    container.querySelectorAll('.remove-option-btn').forEach(btn => {
        btn.addEventListener('click', removeOptionForm);
    });
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
        const fieldNameInput = fieldElement.querySelector('.field-name');
        const fieldTypeSelect = fieldElement.querySelector('.field-type');
        const fieldName = fieldNameInput.value;
        const fieldType = fieldTypeSelect.value;
        
        if (!fieldName) {
            fieldNameInput.classList.add('error'); // Marca campo obrigatório não preenchido
            return; // Pula para o próximo campo
        }

        const campoData = {
            nome: fieldName,
            tipo: fieldType
        };

        if (fieldType === 'select') {
            const opcoes = [];
            fieldElement.querySelectorAll('.option-item').forEach(optionItem => {
                const optionValueInput = optionItem.querySelector('.option-value');
                const optionPriceInput = optionItem.querySelector('.option-price');

                if (optionValueInput.value.trim()) { // Só adiciona se o nome da opção não estiver vazio
                    const optionValue = optionValueInput.value.trim();
                    const optionPrice = parseFloat(optionPriceInput.value) || 0;
                    opcoes.push(`${optionValue}, R$ ${optionPrice.toFixed(2)}`);
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

    // Processar dados de promoção apenas se estiverem visíveis e preenchidos
    if (!promotionFields.classList.contains('hidden')) {
        const promocaoPorcentagem = parseFloat(promotionDiscount.value);
        const promocaoDescricao = promotionDescription.value.trim();
        const promocaoDataInicio = promotionStartDate.value;
        const promocaoDataFim = promotionEndDate.value;

        if (promocaoPorcentagem && promocaoDescricao && promocaoDataInicio && promocaoDataFim) {
            servico.promocao = {
                porcentagem: promocaoPorcentagem,
                descricao: promocaoDescricao,
                dataInicio: promocaoDataInicio,
                dataFim: promocaoDataFim
            };
        } else {
            // Se a seção de promoção estava visível mas os campos obrigatórios não foram preenchidos,
            // informamos que a promoção não será salva.
            alert("Os campos de promoção não foram preenchidos corretamente. A promoção não será salva para este serviço.");
            // Opcional: remover os campos de promoção do objeto servico se não forem válidos
            // delete servico.promocao;
        }
    } else {
        // Se a seção de promoção não está visível, garantir que não haja promoção salva
        delete servico.promocao; // Remove qualquer promoção antiga se a seção estiver oculta
    }

    const servicosRef = ref(database, `servicos/${servicoKey || ''}`);
    
    if (servicoKey) { // Atualizar serviço existente
        set(servicosRef, servico)
            .then(() => {
                alert('Serviço atualizado com sucesso!');
                resetServicoForm();
                // Limpar dados de promoção do Firebase se o usuário removeu a promoção
                if (promotionFields.classList.contains('hidden') && servicoKey) {
                     const promoRef = ref(database, `servicos/${servicoKey}/promocao`);
                     remove(promoRef).catch(error => console.error("Erro ao remover promoção antiga:", error));
                }
            })
            .catch(error => {
                console.error("Erro ao atualizar serviço:", error);
                alert("Ocorreu um erro ao atualizar o serviço. Verifique o console.");
            });
    } else { // Criar novo serviço
        push(servicosRef, servico)
            .then(() => {
                alert('Serviço cadastrado com sucesso!');
                resetServicoForm();
            })
            .catch(error => {
                console.error("Erro ao cadastrar serviço:", error);
                alert("Ocorreu um erro ao cadastrar o serviço. Verifique o console.");
            });
    }
}

function resetServicoForm() {
    servicoForm.reset();
    servicoForm.removeAttribute('data-key');
    additionalFieldsContainer.innerHTML = '';
    
    // Resetar promoções
    promotionFields.classList.add('hidden');
    togglePromotionBtn.textContent = 'Criar Promoção';
    promotionDiscount.value = '';
    promotionDescription.value = '';
    promotionStartDate.value = '';
    promotionEndDate.value = '';

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
    if (servico.camposAdicionais && servico.camposAdicionais.length > 0) {
        camposAdicionaisHtml = servico.camposAdicionais.map(campo => {
            let opcoesHtml = '';
            if (campo.tipo === 'select' && campo.opcoes && campo.opcoes.length > 0) {
                opcoesHtml = `<ul>${campo.opcoes.map(opcao => `<li>${opcao}</li>`).join('')}</ul>`;
            } else if (campo.tipo !== 'select') {
                opcoesHtml = `<p>Tipo: ${capitalize(campo.tipo)}</p>`;
            } else {
                 opcoesHtml = `<p>Nenhuma opção definida.</p>`;
            }
            return `<li><strong>${campo.nome}</strong>: ${opcoesHtml}</li>`;
        }).join('');
    } else {
        camposAdicionaisHtml = '<p>Nenhum campo adicional.</p>';
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
            <p class="card-text"><strong>Preço Base:</strong> R$ ${servico.precoBase !== undefined ? servico.precoBase.toFixed(2) : '0.00'}</p>
            ${promocaoHtml}
            <h6>Campos Adicionais:</h6>
            <ul>${camposAdicionaisHtml}</ul>
            <button class="btn btn-warning btn-sm edit-service-btn" data-key="${key}">Editar</button>
            <button class="btn btn-danger btn-sm delete-service-btn" data-key="${key}">Excluir</button>
        </div>
    `;
    servicosList.appendChild(card);
    card.querySelector('.edit-service-btn').addEventListener('click', () => editService(key));
    card.querySelector('.delete-service-btn').addEventListener('click', () => deleteService(key));
}

function editService(key) {
    const servicoRef = ref(database, `servicos/${key}`);
    get(servicoRef).then(snapshot => {
        if (!snapshot.exists()) {
            alert("Serviço não encontrado.");
            return;
        }
        const servicoData = snapshot.val();
        
        servicoNomeInput.value = servicoData.nome || '';
        servicoDescricaoInput.value = servicoData.descricao || '';
        servicoPrecoInput.value = servicoData.precoBase !== undefined ? servicoData.precoBase : 0;
        servicoForm.dataset.key = key;
        
        additionalFieldsContainer.innerHTML = '';
        if (servicoData.camposAdicionais) {
            servicoData.camposAdicionais.forEach(field => addAdditionalFieldForm(field));
        }

        if (servicoData.promocao) {
            promotionDiscount.value = servicoData.promocao.porcentagem || '';
            promotionDescription.value = servicoData.promocao.descricao || '';
            promotionStartDate.value = servicoData.promocao.dataInicio || '';
            promotionEndDate.value = servicoData.promocao.dataFim || '';
            
            promotionFields.classList.remove('hidden');
            togglePromotionBtn.textContent = 'Cancelar';
        } else {
            promotionFields.classList.add('hidden');
            togglePromotionBtn.textContent = 'Criar Promoção';
        }

        servicoForm.querySelector('button[type="submit"]').textContent = 'Atualizar Serviço';
        document.querySelector('[data-tab="addServicoTab"]').click(); // Abre a aba de edição
    }).catch(error => {
        console.error("Erro ao carregar dados do serviço:", error);
        alert("Ocorreu um erro ao carregar os dados do serviço. Verifique o console.");
    });
}

function deleteService(key) {
    if (confirm('Tem certeza que deseja excluir este serviço? Esta ação é irreversível.')) {
        const servicoRef = ref(database, `servicos/${key}`);
        remove(servicoRef)
            .then(() => alert('Serviço excluído com sucesso!'))
            .catch(error => {
                console.error("Erro ao excluir serviço:", error);
                alert("Ocorreu um erro ao excluir o serviço. Verifique o console.");
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
            const agendamentosArray = Object.entries(agendamentos).reverse(); // Mais recentes primeiro
            agendamentosArray.forEach(([key, agendamento]) => {
                createAgendamentoCard(agendamento, key);
            });
        } else {
            agendamentosList.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
        }
    });
}

function createAgendamentoCard(agendamento, key) {
    const card = document.createElement('div');
    const statusClass = agendamento.status ? agendamento.status.toLowerCase() : 'pendente';
    card.className = `card mb-3 booking-card booking-${statusClass}`;
    
    let servicosHtml = '<ul>';
    if (agendamento.servicos) {
        agendamento.servicos.forEach(servico => {
            servicosHtml += `<li><strong>${servico.nome}</strong>: R$ ${servico.precoCalculado !== undefined ? servico.precoCalculado.toFixed(2) : '0.00'}`;
            
            // Detalhes dos equipamentos
            if (servico.equipamentos && servico.equipamentos.length > 0) {
                servicosHtml += `<ul>`;
                servico.equipamentos.forEach(equip => {
                    servicosHtml += `<li>${equip.quantidade}x Equipamento: R$ ${equip.precoTotalEquipamento !== undefined ? equip.precoTotalEquipamento.toFixed(2) : '0.00'}`;
                    if (equip.campos && Object.keys(equip.campos).length > 0) {
                        servicosHtml += `<ul>`;
                        Object.entries(equip.campos).forEach(([campo, valor]) => {
                            // Formata valores numéricos como moeda
                            const displayValor = (typeof valor === 'string' && valor.match(/^\d+(\.\d+)?$/)) ? parseFloat(valor) : valor;
                            const formattedValor = (typeof displayValor === 'number' && !isNaN(displayValor) && displayValor > 0) ? `R$ ${displayValor.toFixed(2)}` : displayValor;
                            servicosHtml += `<li>${campo}: ${formattedValor}</li>`;
                        });
                        servicosHtml += `</ul>`;
                    }
                    servicosHtml += `</li>`;
                });
                servicosHtml += `</ul>`;
            }
            servicosHtml += `</li>`;
        });
    }
    servicosHtml += '</ul>';

    const formattedDate = agendamento.data ? formatDate(agendamento.data) : 'N/D';
    const formattedHora = agendamento.hora || 'N/D';
    const clienteNome = agendamento.cliente?.nome || 'Anônimo';
    const clienteTelefone = agendamento.cliente?.telefone || 'N/D';
    const clienteEndereco = agendamento.cliente?.endereco || 'N/D';
    const observacoes = agendamento.observacoes ? `<p><strong>Obs Cliente:</strong> ${agendamento.observacoes}</p>` : '';
    const formaPagamento = agendamento.formaPagamento || 'N/D';
    const total = agendamento.total !== undefined ? agendamento.total.toFixed(2) : '0.00';

    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">Agendamento de ${clienteNome}</h5>
            <p><strong>Data:</strong> ${formattedDate} às ${formattedHora}</p>
            <p><strong>Status:</strong> <span class="badge badge-${statusClass}">${agendamento.status || 'Pendente'}</span></p>
            <hr>
            <h6>Detalhes do Cliente:</h6>
            <p><strong>Telefone:</strong> ${clienteTelefone}</p>
            <p><strong>Endereço:</strong> ${clienteEndereco}</p>
            ${observacoes}
            <hr>
            <h6>Serviços:</h6>
            ${servicosHtml}
            <p><strong>Total:</strong> R$ ${total}</p>
            <p><strong>Pagamento:</strong> ${formaPagamento}</p>
            <div class="mt-3">
                <button class="btn btn-success btn-sm mark-completed" data-key="${key}" ${statusClass === 'concluido' ? 'disabled' : ''}>Marcar como Concluído</button>
                <button class="btn btn-info btn-sm" data-key="${key}" ${statusClass === 'cancelado' ? 'disabled' : ''} onclick="updateBookingStatus('${key}', 'Cancelado')">Cancelar</button>
                <button class="btn btn-danger btn-sm delete-booking" data-key="${key}">Excluir</button>
            </div>
        </div>
    `;
    agendamentosList.appendChild(card);
    
    card.querySelector('.mark-completed').addEventListener('click', () => updateBookingStatus(key, 'Concluído'));
    // O botão de cancelar está com onclick direto para simplificar a chamada da função.
    // card.querySelector('.cancel-booking').addEventListener('click', () => updateBookingStatus(key, 'Cancelado')); 
    card.querySelector('.delete-booking').addEventListener('click', () => deleteBooking(key));
}

// Função para atualizar status, chamada tanto pelo botão quanto pelo onclick inline
function updateBookingStatus(key, newStatus) {
    const agendamentoRef = ref(database, `agendamentos/${key}`);
    get(agendamentoRef).then(snapshot => {
        if (!snapshot.exists()) {
            alert("Agendamento não encontrado.");
            return;
        }
        const agendamentoData = snapshot.val();
        set(agendamentoRef, { ...agendamentoData, status: newStatus })
            .then(() => alert(`Agendamento ${newStatus.toLowerCase()} com sucesso!`))
            .catch(error => {
                console.error("Erro ao atualizar status:", error);
                alert("Ocorreu um erro ao atualizar o status. Verifique o console.");
            });
    }).catch(error => {
        console.error("Erro ao buscar agendamento para atualizar status:", error);
        alert("Ocorreu um erro ao buscar o agendamento. Verifique o console.");
    });
}

function deleteBooking(key) {
    if (confirm('Tem certeza que deseja EXCLUIR este agendamento? Esta ação é irreversível e os dados serão perdidos permanentemente.')) {
        const agendamentoRef = ref(database, `agendamentos/${key}`);
        remove(agendamentoRef)
            .then(() => alert('Agendamento excluído com sucesso!'))
            .catch(error => {
                console.error("Erro ao excluir agendamento:", error);
                alert("Ocorreu um erro ao excluir o agendamento. Verifique o console.");
            });
    }
}

// ==========================================================================
// 5. GERENCIAMENTO DE CONFIGURAÇÕES
// ==========================================================================

function handleConfigFormSubmit(e) {
    e.preventDefault();
    const whatsappNumber = whatsappNumberInput.value.replace(/\D/g, ''); // Remove caracteres não numéricos
    const horariosPorDia = {};

    diasDaSemana.forEach(dia => {
        const ativoCheckbox = document.getElementById(`${dia}Ativo`);
        const horarioInicioInput = document.getElementById(`${dia}Inicio`);
        const horarioFimInput = document.getElementById(`${dia}Fim`);
        const duracaoServicoInput = document.getElementById(`${dia}Duracao`);

        const ativo = ativoCheckbox ? ativoCheckbox.checked : false;
        const horarioInicio = horarioInicioInput ? horarioInicioInput.value : "08:00";
        const horarioFim = horarioFimInput ? horarioFimInput.value : "18:00";
        const duracaoServico = parseInt(duracaoServicoInput ? duracaoServicoInput.value : "60");

        horariosPorDia[dia] = { ativo, horarioInicio, horarioFim, duracaoServico };
    });

    const configRef = ref(database, 'configuracoes');
    set(configRef, { whatsappNumber, horariosPorDia })
        .then(() => alert('Configurações salvas com sucesso!'))
        .catch(error => {
            console.error("Erro ao salvar configurações:", error);
            alert("Ocorreu um erro ao salvar configurações. Verifique o console.");
        });
}

function loadConfig() {
    const configRef = ref(database, 'configuracoes');
    onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            const config = snapshot.val();
            if (config.whatsappNumber) {
                whatsappNumberInput.value = config.whatsappNumber;
            }
            if (config.horariosPorDia) {
                diasDaSemana.forEach(dia => {
                    const diaConfig = config.horariosPorDia[dia];
                    if (diaConfig) {
                        const ativoCheckbox = document.getElementById(`${dia}Ativo`);
                        const horarioInicioInput = document.getElementById(`${dia}Inicio`);
                        const horarioFimInput = document.getElementById(`${dia}Fim`);
                        const duracaoServicoInput = document.getElementById(`${dia}Duracao`);

                        if (ativoCheckbox) ativoCheckbox.checked = diaConfig.ativo || false;
                        if (horarioInicioInput) horarioInicioInput.value = diaConfig.horarioInicio || "08:00";
                        if (horarioFimInput) horarioFimInput.value = diaConfig.horarioFim || "18:00";
                        if (duracaoServicoInput) duracaoServicoInput.value = diaConfig.duracaoServico || 60;
                    }
                });
            }
        }
    });
}

// ==========================================================================
// 6. MENSAGENS PERSONALIZADAS
// ==========================================================================

function setupMensagensTab() {
    const mensagemForm = document.getElementById('mensagemForm');
    loadMensagens();
    
    mensagemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const titulo = document.getElementById('mensagemTitulo').value.trim();
        const texto = document.getElementById('mensagemTexto').value.trim();
        const key = e.target.dataset.key; // Key do formulário para atualização

        if (!titulo || !texto) {
            alert('Por favor, preencha o título e o texto da mensagem.');
            return;
        }

        const mensagem = { titulo, texto };

        const mensagemRefBase = ref(database, 'mensagensWhatsApp');
        let mensagemRef;

        if (key) { // Atualizar mensagem existente
            mensagemRef = ref(database, `mensagensWhatsApp/${key}`);
            set(mensagemRef, mensagem)
                .then(() => {
                    alert('Mensagem atualizada com sucesso!');
                    e.target.reset();
                    delete e.target.dataset.key; // Limpa a chave do dataset
                })
                .catch(error => {
                    console.error("Erro ao atualizar mensagem:", error);
                    alert("Ocorreu um erro ao atualizar a mensagem. Verifique o console.");
                });
        } else { // Criar nova mensagem
            mensagemRef = push(mensagemRefBase); // Cria uma nova chave
            set(mensagemRef, mensagem)
                .then(() => {
                    alert('Mensagem salva com sucesso!');
                    e.target.reset();
                })
                .catch(error => {
                    console.error("Erro ao salvar mensagem:", error);
                    alert("Ocorreu um erro ao salvar a mensagem. Verifique o console.");
                });
        }
    });
}

function loadMensagens() {
    const mensagensRef = ref(database, 'mensagensWhatsApp');
    onValue(mensagensRef, (snapshot) => {
        const listaMensagens = document.getElementById('listaMensagens');
        listaMensagens.innerHTML = '';
        
        if (snapshot.exists()) {
            const mensagens = snapshot.val();
            for (const key in mensagens) {
                createMensagemCard(mensagens[key], key);
            }
        } else {
            listaMensagens.innerHTML = '<p>Nenhuma mensagem cadastrada.</p>';
        }
    });
}

function createMensagemCard(mensagem, key) {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${mensagem.titulo}</h5>
            <p class="card-text">${mensagem.texto}</p>
            <button class="btn btn-warning btn-sm edit-mensagem-btn" data-key="${key}">Editar</button>
            <button class="btn btn-danger btn-sm delete-mensagem-btn" data-key="${key}">Excluir</button>
        </div>
    `;
    
    document.getElementById('listaMensagens').appendChild(card);
    
    card.querySelector('.edit-mensagem-btn').addEventListener('click', () => editMensagem(key));
    card.querySelector('.delete-mensagem-btn').addEventListener('click', () => deleteMensagem(key));
}

function editMensagem(key) {
    const mensagemRef = ref(database, `mensagensWhatsApp/${key}`);
    get(mensagemRef).then(snapshot => {
        if (!snapshot.exists()) {
            alert("Mensagem não encontrada.");
            return;
        }
        const mensagemData = snapshot.val();
        document.getElementById('mensagemTitulo').value = mensagemData.titulo || '';
        document.getElementById('mensagemTexto').value = mensagemData.texto || '';
        document.getElementById('mensagemForm').dataset.key = key;
    }).catch(error => {
        console.error("Erro ao carregar dados da mensagem:", error);
        alert("Ocorreu um erro ao carregar os dados da mensagem. Verifique o console.");
    });
}

function deleteMensagem(key) {
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
        const mensagemRef = ref(database, `mensagensWhatsApp/${key}`);
        remove(mensagemRef)
            .then(() => alert('Mensagem excluída com sucesso!'))
            .catch(error => {
                console.error("Erro ao excluir mensagem:", error);
                alert("Ocorreu um erro ao excluir a mensagem. Verifique o console.");
            });
    }
}

// ==========================================================================
// 7. PROMOÇÕES
// ==========================================================================

function setupPromocoes() {
    const togglePromotionBtn = document.getElementById('togglePromotionBtn');
    const promotionFields = document.getElementById('promotionFields');
    const removePromotionBtn = document.getElementById('removePromotionBtn');
    
    togglePromotionBtn.addEventListener('click', () => {
        promotionFields.classList.toggle('hidden');
        togglePromotionBtn.textContent = promotionFields.classList.contains('hidden') 
            ? 'Criar Promoção' 
            : 'Cancelar';
    });
    
    removePromotionBtn.addEventListener('click', () => {
        promotionDiscount.value = '';
        promotionDescription.value = '';
        promotionStartDate.value = '';
        promotionEndDate.value = '';
        promotionFields.classList.add('hidden');
        togglePromotionBtn.textContent = 'Criar Promoção';
    });

    // Adicionar validação para campos de promoção ao serem preenchidos
    const promotionInputs = [promotionDiscount, promotionDescription, promotionStartDate, promotionEndDate];
    promotionInputs.forEach(input => {
        input.addEventListener('input', () => {
            if (!promotionFields.classList.contains('hidden')) {
                const allFieldsFilled = promotionInputs.every(field => field.value.trim() !== '');
                if (allFieldsFilled) {
                    // Opcional: Habilitar um botão de salvar promoção aqui se houver um separado
                }
            }
        });
    });
}

// ==========================================================================
// 8. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Erro ao formatar data:", dateString, e);
        return dateString; // Retorna a string original se houver erro
    }
}

// ==========================================================================
// FIM DO ARQUIVO
// ==========================================================================
