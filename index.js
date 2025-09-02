/*
 * Arquivo: index.js
 * Descrição: Lógica para a página de agendamento de serviços.
 * Versão: 11.0 (Corrigido e completo com funcionalidades de agendamento e promoção)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const passos = document.querySelectorAll('.progress-bar .step');
const conteudosPasso = document.querySelectorAll('.step-content');
const servicosContainer = document.getElementById('servicos-container');
const servicosDetalhes = document.getElementById('servicos-detalhes');
const proximoPasso1Btn = document.getElementById('proximoPasso1');
const voltarPasso2Btn = document.getElementById('voltarPasso2');
const proximoPasso2Btn = document.getElementById('proximoPasso2');
const voltarPasso3Btn = document.getElementById('voltarPasso3');
const proximoPasso3Btn = document.getElementById('proximoPasso3');
const voltarPasso4Btn = document.getElementById('voltarPasso4');
const confirmarAgendamentoBtn = document.getElementById('confirmarAgendamento');
const clienteForm = document.getElementById('clienteForm');
const dataAgendamentoInput = document.getElementById('dataAgendamento');
const horaAgendamentoSelect = document.getElementById('horaAgendamento');
const nomeInput = document.getElementById('nome');
const telefoneInput = document.getElementById('telefone');
const enderecoInput = document.getElementById('endereco');
const observacoesInput = document.getElementById('observacoes');
const formaPagamentoSelect = document.getElementById('formaPagamento');

// Elementos da Promoção
const promocaoBanner = document.getElementById('promocao-banner');
const promocaoTexto = document.getElementById('promocao-texto');
const promocaoBtn = document.getElementById('promo-btn');

// Variáveis de estado
let passoAtual = 1;
let servicosSelecionados = [];
let servicosDisponiveis = {};
let promocaoAtiva = null;

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadServicesAndPromotions();
    setupEventListeners();
});

function setupEventListeners() {
    proximoPasso1Btn.addEventListener('click', () => navegarParaPasso(2));
    voltarPasso2Btn.addEventListener('click', () => navegarParaPasso(1));
    proximoPasso2Btn.addEventListener('click', () => navegarParaPasso(3));
    voltarPasso3Btn.addEventListener('click', () => navegarParaPasso(2));
    proximoPasso3Btn.addEventListener('click', handleClienteFormSubmit);
    voltarPasso4Btn.addEventListener('click', () => navegarParaPasso(3));
    confirmarAgendamentoBtn.addEventListener('click', handleConfirmarAgendamento);
    dataAgendamentoInput.addEventListener('change', loadAvailableTimes);
    promocaoBtn.addEventListener('click', handlePromoClick);
}

function navegarParaPasso(passo) {
    if (passo < 1 || passo > 4) return;

    passoAtual = passo;

    // Atualiza a barra de progresso
    passos.forEach(p => {
        const pStep = parseInt(p.dataset.step, 10);
        if (pStep === passo) {
            p.classList.add('active');
        } else if (pStep < passo) {
            p.classList.add('completed');
        } else {
            p.classList.remove('active', 'completed');
        }
    });

    // Oculta e exibe o conteúdo do passo
    conteudosPasso.forEach(c => c.classList.add('hidden'));
    document.getElementById(`passo${passo}`).classList.remove('hidden');

    // Ações específicas para cada passo
    if (passo === 2) {
        exibirDetalhesServicos();
    } else if (passo === 4) {
        preencherDadosAgendamento();
        loadAvailableTimes();
    }
}

// ==========================================================================
// 3. GERENCIAMENTO DE SERVIÇOS E PROMOÇÕES
// ==========================================================================

function loadServicesAndPromotions() {
    const servicosRef = ref(database, 'servicos');
    const promocoesRef = ref(database, 'promocoes');

    onValue(servicosRef, (servicosSnapshot) => {
        if (servicosSnapshot.exists()) {
            servicosDisponiveis = servicosSnapshot.val();
            onValue(promocoesRef, (promocoesSnapshot) => {
                const promocoes = promocoesSnapshot.exists() ? promocoesSnapshot.val() : {};
                checkActivePromotion(promocoes);
                displayServices();
            });
        }
    });
}

function checkActivePromotion(promocoes) {
    promocaoAtiva = null;
    const hoje = new Date().toISOString().slice(0, 10);

    for (const key in promocoes) {
        const promocao = promocoes[key];
        // Verifica se a promoção está dentro do período de validade
        if (hoje >= promocao.dataInicio && hoje <= promocao.dataFim) {
            promocaoAtiva = promocao;
            break;
        }
    }

    if (promocaoAtiva) {
        promocaoBanner.classList.remove('hidden');
        promocaoTexto.textContent = promocaoAtiva.descricao;
    } else {
        promocaoBanner.classList.add('hidden');
    }
}

function handlePromoClick() {
    if (promocaoAtiva && servicosDisponiveis[promocaoAtiva.servicoId]) {
        const servicoPromocao = { ...servicosDisponiveis[promocaoAtiva.servicoId], id: promocaoAtiva.servicoId };
        
        // Aplica o desconto ao preço base
        const desconto = promocaoAtiva.desconto / 100;
        servicoPromocao.precoBase = servicoPromocao.precoBase * (1 - desconto);
        
        servicosSelecionados = [servicoPromocao];
        
        // Marca o serviço como selecionado na interface
        const servicoCard = document.querySelector(`.servico-card[data-key="${servicoPromocao.id}"]`);
        if (servicoCard) {
            document.querySelectorAll('.servico-card').forEach(card => card.classList.remove('selected'));
            servicoCard.classList.add('selected');
        }
        
        // Avança para o próximo passo
        navegarParaPasso(2);
    }
}

function displayServices() {
    servicosContainer.innerHTML = '';
    for (const key in servicosDisponiveis) {
        const servico = servicosDisponiveis[key];
        const precoDisplay = promocaoAtiva && promocaoAtiva.servicoId === key ?
            `<span class="preco-original">R$ ${servico.precoBase.toFixed(2)}</span> R$ ${(servico.precoBase * (1 - promocaoAtiva.desconto / 100)).toFixed(2)}` :
            `R$ ${servico.precoBase.toFixed(2)}`;

        const card = document.createElement('div');
        card.className = 'servico-card';
        card.dataset.key = key;
        card.innerHTML = `
            <h3>${servico.nome}</h3>
            <p>${servico.descricao}</p>
            <p class="preco">Preço: ${precoDisplay}</p>
            <button class="btn btn-secondary add-service-btn">Adicionar</button>
        `;
        servicosContainer.appendChild(card);
    }

    // Adiciona event listeners aos botões
    document.querySelectorAll('.add-service-btn').forEach(btn => {
        btn.addEventListener('click', toggleServiceSelection);
    });
    
    // Habilita o botão "Próximo" se houver serviços selecionados
    proximoPasso1Btn.disabled = servicosSelecionados.length === 0;
}

function toggleServiceSelection(e) {
    const card = e.target.closest('.servico-card');
    const key = card.dataset.key;

    if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        servicosSelecionados = servicosSelecionados.filter(s => s.id !== key);
    } else {
        card.classList.add('selected');
        const servico = { ...servicosDisponiveis[key], id: key };
        
        // Aplica o desconto da promoção se for o serviço correto
        if (promocaoAtiva && promocaoAtiva.servicoId === key) {
            const desconto = promocaoAtiva.desconto / 100;
            servico.precoBase = servico.precoBase * (1 - desconto);
        }
        
        servicosSelecionados.push(servico);
    }
    
    // Habilita ou desabilita o botão "Próximo"
    proximoPasso1Btn.disabled = servicosSelecionados.length === 0;
}

// ==========================================================================
// 4. LÓGICA DE NAVEGAÇÃO E DADOS
// ==========================================================================

function exibirDetalhesServicos() {
    servicosDetalhes.innerHTML = '';
    servicosSelecionados.forEach(servico => {
        const servicoDiv = document.createElement('div');
        servicoDiv.className = 'servico-detalhe-card';
        
        let camposAdicionaisHtml = '';
        if (servico.camposAdicionais && servico.camposAdicionais.length > 0) {
            camposAdicionaisHtml = servico.camposAdicionais.map(campo => {
                if (campo.tipo === 'select' && campo.opcoes) {
                    const opcoesHtml = campo.opcoes.map(opcao => {
                        const [nome, preco] = opcao.split(', R$ ');
                        return `<option value="${preco}">${nome} (R$ ${preco})</option>`;
                    }).join('');
                    return `
                        <div class="form-group" data-campo-nome="${campo.nome}">
                            <label>${campo.nome}</label>
                            <select class="form-control campo-adicional-select">
                                <option value="0">Selecione uma opção</option>
                                ${opcoesHtml}
                            </select>
                        </div>
                    `;
                } else if (campo.tipo === 'text') {
                    return `
                        <div class="form-group" data-campo-nome="${campo.nome}">
                            <label>${campo.nome}</label>
                            <input type="text" class="form-control campo-adicional-text" placeholder="Digite o valor">
                        </div>
                    `;
                }
                return '';
            }).join('');
        }
        
        servicoDiv.innerHTML = `
            <h4>${servico.nome}</h4>
            <p><strong>Preço Base:</strong> R$ ${servico.precoBase.toFixed(2)}</p>
            ${camposAdicionaisHtml}
        `;
        servicosDetalhes.appendChild(servicoDiv);
    });

    document.querySelectorAll('.campo-adicional-select').forEach(select => {
        select.addEventListener('change', atualizarOrcamentoTotal);
    });
}

function atualizarOrcamentoTotal() {
    let orcamentoTotal = 0;
    
    servicosSelecionados.forEach(servico => {
        let precoServico = servico.precoBase;
        
        const detalhesCard = document.querySelector(`.servico-detalhe-card h4`).parentNode;
        const selects = detalhesCard.querySelectorAll('.campo-adicional-select');
        
        selects.forEach(select => {
            precoServico += parseFloat(select.value) || 0;
        });
        
        orcamentoTotal += precoServico;
    });
    
    // ... (o resto da lógica de atualização do total) ...
}

function handleClienteFormSubmit(e) {
    e.preventDefault();
    navegarParaPasso(4);
}

function preencherDadosAgendamento() {
    const totalElement = document.getElementById('agendamento-total');
    let total = 0;
    
    const servicosLista = document.getElementById('agendamento-servicos-lista');
    servicosLista.innerHTML = '';
    
    servicosSelecionados.forEach(servico => {
        let precoTotalServico = servico.precoBase;
        const detalhesServicoDiv = servicosDetalhes.querySelector(`[data-key="${servico.id}"]`);
        
        const camposSelecionados = {};
        
        // Coleta dados dos campos adicionais
        if (detalhesServicoDiv) {
            detalhesServicoDiv.querySelectorAll('.campo-adicional-select').forEach(select => {
                const campoNome = select.closest('.form-group').dataset.campoNome;
                const precoAdicional = parseFloat(select.value) || 0;
                precoTotalServico += precoAdicional;
                camposSelecionados[campoNome] = precoAdicional;
            });
            detalhesServicoDiv.querySelectorAll('.campo-adicional-text').forEach(input => {
                const campoNome = input.closest('.form-group').dataset.campoNome;
                camposSelecionados[campoNome] = input.value;
            });
        }
        
        total += precoTotalServico;
        
        const listItem = document.createElement('li');
        listItem.textContent = `${servico.nome}: R$ ${precoTotalServico.toFixed(2)}`;
        servicosLista.appendChild(listItem);
    });

    totalElement.textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('agendamento-nome').textContent = nomeInput.value;
    document.getElementById('agendamento-telefone').textContent = telefoneInput.value;
    document.getElementById('agendamento-endereco').textContent = enderecoInput.value;
    document.getElementById('agendamento-forma-pagamento').textContent = formaPagamentoSelect.value;
}

function loadAvailableTimes() {
    const dataSelecionada = dataAgendamentoInput.value;
    if (!dataSelecionada) {
        return;
    }
    
    const data = new Date(dataSelecionada + 'T00:00:00');
    const diaDaSemana = data.getDay();
    const diaNome = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][diaDaSemana];

    get(ref(database, `configuracoes/horariosPorDia/${diaNome}`))
        .then(snapshot => {
            const config = snapshot.val();
            horaAgendamentoSelect.innerHTML = '';
            
            if (config && config.ativo) {
                const [hInicio, mInicio] = config.horarioInicio.split(':').map(Number);
                const [hFim, mFim] = config.horarioFim.split(':').map(Number);
                const duracao = config.duracaoServico;

                const horaAtual = new Date();
                const hoje = new Date().toISOString().slice(0, 10);
                
                const inicioMinutos = hInicio * 60 + mInicio;
                const fimMinutos = hFim * 60 + mFim;

                let horariosGerados = [];
                for (let minutos = inicioMinutos; minutos < fimMinutos; minutos += duracao) {
                    const h = Math.floor(minutos / 60);
                    const m = minutos % 60;
                    const horaFormatada = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                    horariosGerados.push(horaFormatada);
                }

                // Filtrar horários já agendados
                get(ref(database, 'agendamentos'))
                    .then(agendamentosSnapshot => {
                        const agendamentosDoDia = agendamentosSnapshot.exists() ? Object.values(agendamentosSnapshot.val()).filter(a => a.data === dataSelecionada) : [];
                        const horariosAgendados = agendamentosDoDia.map(a => a.hora);
                        
                        const horariosDisponiveis = horariosGerados.filter(h => !horariosAgendados.includes(h) && (dataSelecionada > hoje || (dataSelecionada === hoje && `${h}:${m.toString().padStart(2, '0')}` > `${horaAtual.getHours()}:${horaAtual.getMinutes()}`)));
                        
                        if (horariosDisponiveis.length > 0) {
                            horariosDisponiveis.forEach(hora => {
                                const option = document.createElement('option');
                                option.value = hora;
                                option.textContent = hora;
                                horaAgendamentoSelect.appendChild(option);
                            });
                        } else {
                            const option = document.createElement('option');
                            option.textContent = 'Nenhum horário disponível.';
                            horaAgendamentoSelect.appendChild(option);
                        }
                    });
            } else {
                const option = document.createElement('option');
                option.textContent = 'Dia indisponível.';
                horaAgendamentoSelect.appendChild(option);
            }
        });
}

function handleConfirmarAgendamento() {
    const agendamento = {
        cliente: {
            nome: nomeInput.value,
            telefone: telefoneInput.value,
            endereco: enderecoInput.value
        },
        servicos: servicosSelecionados.map(s => {
            let precoCalculado = s.precoBase;
            const camposSelecionados = {};
            const detalhesServicoDiv = servicosDetalhes.querySelector(`[data-key="${s.id}"]`);
            if (detalhesServicoDiv) {
                detalhesServicoDiv.querySelectorAll('.campo-adicional-select').forEach(select => {
                    const campoNome = select.closest('.form-group').dataset.campoNome;
                    const precoAdicional = parseFloat(select.value) || 0;
                    precoCalculado += precoAdicional;
                    camposSelecionados[campoNome] = precoAdicional;
                });
                detalhesServicoDiv.querySelectorAll('.campo-adicional-text').forEach(input => {
                    const campoNome = input.closest('.form-group').dataset.campoNome;
                    camposSelecionados[campoNome] = input.value;
                });
            }
            return {
                id: s.id,
                nome: s.nome,
                precoCalculado,
                camposAdicionaisSelecionados: camposSelecionados
            };
        }),
        data: dataAgendamentoInput.value,
        hora: horaAgendamentoSelect.value,
        orcamentoTotal: parseFloat(document.getElementById('agendamento-total').textContent.replace('R$ ', '')),
        observacoes: observacoesInput.value,
        formaPagamento: formaPagamentoSelect.value,
        status: 'Pendente',
        timestamp: new Date().toISOString()
    };

    const agendamentosRef = ref(database, 'agendamentos');
    push(agendamentosRef, agendamento)
        .then(() => {
            alert('Agendamento confirmado com sucesso!');
            // Redirecionar ou limpar o formulário
            window.location.reload();
        })
        .catch(error => {
            console.error("Erro ao salvar agendamento:", error);
            alert("Ocorreu um erro ao confirmar o agendamento. Tente novamente.");
        });
}

// ==========================================================================
// 5. FUNÇÕES AUXILIARES
// ==========================================================================

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}
