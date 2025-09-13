// script.js
import { ServiceCarousel } from './carousel.js'; // Importa a classe do carrossel

// --- Variáveis Globais ---
let servicosDisponiveis = []; // Dados de todos os serviços que podem ser oferecidos
let servicosSelecionadosNoPasso1 = []; // Servicos que o usuário escolheu na ETAPA 1 (sem detalhes ainda)
let servicosComDetalhesColetados = []; // Servicos com todos os detalhes coletados na ETAPA 2
let formaPagamentoSelecionada = '';
let serviceCarouselsInstances = []; // Array para gerenciar as instâncias de CADA carrossel de serviço
let currentStep = 1;

// --- Elementos DOM ---
const servicosSection = document.getElementById('servicosSection');
const servicosFormSection = document.getElementById('servicosFormSection');
const clienteFormSection = document.getElementById('clienteFormSection');
const pagamentoSection = document.getElementById('pagamentoSection');
const confirmacaoSection = document.getElementById('confirmacaoSection');

const nextStep1Button = document.getElementById('nextStep1');
const backButton1 = document.getElementById('backButton1');
const nextStep2Button = document.getElementById('nextStep2');
const backButton2 = document.getElementById('backButton2');
const nextStep3Button = document.getElementById('nextStep3');
const backButton3 = document.getElementById('backButton3');
const finalizarOrcamentoButton = document.getElementById('finalizarOrcamento');
const voltarInicioButton = document.getElementById('voltarInicio');

const servicesGrid = document.querySelector('.services-grid');
const servicesCarouselContainer = document.getElementById('servicesCarouselContainer');
const orcamentoTotalDisplay = document.getElementById('orcamentoTotal');
const orcamentoResumoDisplay = document.getElementById('orcamentoResumo');
const paymentOptions = document.querySelectorAll('.btn-payment');
const paymentDetailsDiv = document.getElementById('paymentDetails');

// Barra de progresso
const progressBar = document.getElementById('progressBar');
const steps = document.querySelectorAll('.step');

// --- Funções de Carregamento e Renderização ---

// Função para carregar dados dos serviços (simulado)
async function loadServicesData() {
    console.log("Carregando dados dos serviços disponíveis...");
    // Em um projeto real, você faria uma requisição fetch aqui
    servicosDisponiveis = [
        { key: 'instalacao-ar', nome: 'Instalação de Ar Condicionado', precoBase: 300.00, temEquipamentos: true, equipamentos: [
            { nome: '9.000 BTUs', valor: 150.00 },
            { nome: '12.000 BTUs', valor: 200.00 },
            { nome: '18.000 BTUs', valor: 250.00 },
            { nome: '24.000 BTUs', valor: 300.00 }
        ]},
        { key: 'limpeza-ar', nome: 'Limpeza de Ar Condicionado', precoBase: 80.00, temEquipamentos: false },
        { key: 'manutencao-preventiva', nome: 'Manutenção Preventiva', precoBase: 120.00, temEquipamentos: false },
        { key: 'conserto-ar', nome: 'Conserto de Ar Condicionado', precoBase: 200.00, temEquipamentos: false }
    ];
    renderServiceSelection();
    console.log("Dados dos serviços carregados e renderização inicial concluída.");
}

// Renderiza a tela inicial com os serviços disponíveis
function renderServiceSelection() {
    console.log("Renderizando seleção de serviços...");
    servicesGrid.innerHTML = ''; // Limpa o grid
    servicosDisponiveis.forEach(service => {
        const serviceElement = document.createElement('div');
        serviceElement.className = 'service-item';
        serviceElement.dataset.serviceKey = service.key;
        serviceElement.innerHTML = `
            <h3>${service.nome}</h3>
            <p>A partir de R$ ${service.precoBase.toFixed(2)}</p>
            <button class="btn btn-outline-secondary select-service-btn">Selecionar</button>
        `;
        servicesGrid.appendChild(serviceElement);
    });
    addServiceSelectionListeners();
    console.log("Seleção de serviços renderizada.");
}

// Adiciona listeners para os botões de selecionar serviço
function addServiceSelectionListeners() {
    console.log("Adicionando listeners para seleção de serviços...");
    document.querySelectorAll('.select-service-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const serviceItem = e.target.closest('.service-item');
            const serviceKey = serviceItem.dataset.serviceKey;
            const service = servicosDisponiveis.find(s => s.key === serviceKey);

            if (service) {
                // Verifica se o serviço já foi selecionado para evitar duplicatas no array servicosSelecionadosNoPasso1
                if (!servicosSelecionadosNoPasso1.some(s => s.key === serviceKey)) {
                    servicosSelecionadosNoPasso1.push(service); // Adiciona o serviço ao array de selecionados
                    serviceItem.classList.add('selected'); // Adiciona uma classe visual para indicar que foi selecionado
                    e.target.textContent = 'Selecionado'; // Muda o texto do botão
                    e.target.disabled = true; // Desabilita o botão
                    console.log(`Serviço '${service.nome}' selecionado.`);
                }
            }
        });
    });
}

// Renderiza os carrosséis na etapa de detalhes do serviço
function renderServiceForms() {
    console.log("Renderizando formulários de detalhes dos serviços selecionados...");
    const container = servicesCarouselContainer;
    container.innerHTML = ''; // Limpa o contêiner
    serviceCarouselsInstances = []; // Limpa o array de instâncias de carrossel

    if (servicosSelecionadosNoPasso1.length === 0) {
        console.warn("Nenhum serviço selecionado para renderizar formulários.");
        return;
    }

    servicosSelecionadosNoPasso1.forEach(service => {
        // Cria um div wrapper para cada serviço, que conterá seu próprio carrossel
        const serviceCarouselWrapper = document.createElement('div');
        serviceCarouselWrapper.className = 'service-carousel-wrapper';
        serviceCarouselWrapper.id = `carousel-${service.key}`; // Um ID único para cada wrapper

        container.appendChild(serviceCarouselWrapper);

        // Cria uma nova instância de ServiceCarousel PARA ESTE SERVIÇO
        // Passamos um array com apenas o serviço atual para o construtor
        const carouselInstance = new ServiceCarousel(serviceCarouselWrapper.id, [service]); 
        serviceCarouselsInstances.push(carouselInstance); // Adiciona a instância ao nosso array de gerenciamento
        carouselInstance.init(); // Inicializa o carrossel para este serviço específico

        // Lógica para ocultar o botão "Adicionar Outro Equipamento" se o serviço não for de Ar Condicionado
        const serviceNameLower = service.nome.toLowerCase();
        const isArCondicionadoService = serviceNameLower.includes('ar condicionado');
        
        if (!isArCondicionadoService) {
            const addBtn = serviceCarouselWrapper.querySelector('.add-equipment-btn');
            if(addBtn) {
                addBtn.style.display = 'none';
                console.log(`Botão 'Adicionar Equipamento' ocultado para o serviço: ${service.nome}`);
            }
        }
    });

    updateTotalBudget(); // Atualiza o orçamento total com base nos carrosséis criados
    console.log(`Renderização de ${serviceCarouselsInstances.length} carrosséis concluída.`);
}

// --- Funções de Navegação ---

function updateProgressBar(step) {
    currentStep = step;
    steps.forEach((stepEl, index) => {
        const stepNumber = index + 1;
        if (stepNumber === step) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else if (stepNumber < step) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    });
    const progressWidth = ((currentStep - 1) / (steps.length - 1)) * 100;
    progressBar.style.width = `${progressWidth}%`;
    console.log(`Barra de progresso atualizada para o passo: ${currentStep}`);
}

function showStep(stepToShow) {
    servicosSection.classList.add('hidden');
    servicosFormSection.classList.add('hidden');
    clienteFormSection.classList.add('hidden');
    pagamentoSection.classList.add('hidden');
    confirmacaoSection.classList.add('hidden');

    switch (stepToShow) {
        case 1:
            servicosSection.classList.remove('hidden');
            break;
        case 2:
            servicosFormSection.classList.remove('hidden');
            break;
        case 3:
            clienteFormSection.classList.remove('hidden');
            break;
        case 4:
            pagamentoSection.classList.remove('hidden');
            break;
        case 5: // Para a seção de confirmação
            confirmacaoSection.classList.remove('hidden');
            break;
    }
    updateProgressBar(stepToShow);
    console.log(`Exibindo etapa: ${stepToShow}`);
}

// --- Funções de Lógica e Controle ---

// Função global para atualizar o orçamento total exibido
function updateTotalBudget() {
    let total = 0;
    serviceCarouselsInstances.forEach(carousel => {
        total += carousel.totalBudget; // Cada instância de ServiceCarousel mantém seu próprio total
    });
    orcamentoTotalDisplay.textContent = `R$ ${total.toFixed(2)}`;
    console.log(`Orçamento total atualizado: R$ ${total.toFixed(2)}`);
}

// Coleta os dados finais de todos os formulários e prepara o resumo
function collectFinalData() {
    console.log("Coletando dados finais...");
    const nomeCliente = document.getElementById('nomeCliente').value.trim();
    const telefoneCliente = document.getElementById('telefoneCliente').value.trim();
    const emailCliente = document.getElementById('emailCliente').value.trim();
    const enderecoCliente = document.getElementById('enderecoCliente').value.trim();

    // Valida campos obrigatórios do cliente
    if (!nomeCliente || !telefoneCliente) {
        alert('Por favor, preencha o Nome e o Telefone do cliente.');
        console.error("Validação de cliente falhou: Nome ou Telefone em branco.");
        return false; // Indica que a coleta falhou
    }

    servicosComDetalhesColetados = []; // Limpa o array antes de coletar novamente
    let allCarouselsValid = true;

    // Itera sobre CADA instância de carrossel de serviço para validação e coleta
    for (const carousel of serviceCarouselsInstances) {
        if (!carousel.validateFields()) { // Valida os campos DENTRO deste carrossel
            allCarouselsValid = false;
            console.error(`Validação falhou no carrossel: ${carousel.serviceData.nome}`);
            // Poderíamos focar no carrossel que contém o erro para melhor UX
            // Ex: carousel.focus(); // Se a classe ServiceCarousel tiver um método `focus`
            break; // Interrompe a validação se um erro for encontrado
        }
        // Coleta os dados detalhados de todos os itens/equipamentos dentro deste carrossel
        servicosComDetalhesColetados.push(...carousel.getDetailedServices()); 
    }

    if (!allCarouselsValid) {
        alert("Por favor, preencha todos os campos obrigatórios em todos os serviços selecionados.");
        console.error("Coleta de dados falhou devido a campos inválidos nos carrosséis.");
        return false; // Indica que a coleta falhou
    }

    // Monta o resumo final para exibição
    let resumo = `Serviços:\n`;
    servicosComDetalhesColetados.forEach(item => {
        resumo += `- ${item.nome}${item.nomeEquipamento ? ` (${item.nomeEquipamento})` : ''}`;
        resumo += ` - ${item.quantidade}x R$ ${item.valorUnitario.toFixed(2)} (Total Item: R$ ${item.precoTotalItem.toFixed(2)})\n`;
        if (item.observacoes) {
            resumo += `  Observações: ${item.observacoes}\n`;
        }
    });
    resumo += `\nOrçamento Total: R$ ${totalBudgetDisplay.textContent}\n`; // Usa o valor já formatado
    resumo += `\nCliente:\n`;
    resumo += `- Nome: ${nomeCliente}\n`;
    resumo += `- Telefone: ${telefoneCliente}\n`;
    if (emailCliente) resumo += `- Email: ${emailCliente}\n`;
    if (enderecoCliente) resumo += `- Endereço: ${enderecoCliente}\n`;
    resumo += `\nForma de Pagamento: ${formaPagamentoSelecionada.toUpperCase()}\n`;

    orcamentoResumoDisplay.textContent = resumo; // Atualiza o campo de resumo na tela de confirmação

    console.log("Dados finais coletados e resumo gerado.");
    return true; // Indica que a coleta foi bem-sucedida
}

// --- Event Listeners ---

nextStep1Button.addEventListener('click', () => {
    console.log("Botão 'Próximo' (Etapa 1) clicado.");
    if (servicosSelecionadosNoPasso1.length === 0) {
        alert('Por favor, selecione pelo menos um serviço.');
        console.warn("Tentativa de avançar sem selecionar serviços.");
        return;
    }
    renderServiceForms(); // Renderiza os carrosséis para a etapa 2
    showStep(2);
});

backButton1.addEventListener('click', () => {
    console.log("Botão 'Voltar' (Etapa 2 para Etapa 1) clicado.");
    // Resetar estado visual dos botões de seleção de serviço
    document.querySelectorAll('.service-item').forEach(item => {
        const btn = item.querySelector('.select-service-btn');
        // Verifica se o item ainda está selecionado (pode ter sido deselecionado se adicionamos lógica para isso)
        // Se queremos resetar TODOS, ignoramos a checagem de 'selected'
        item.classList.remove('selected');
        btn.textContent = 'Selecionar';
        btn.disabled = false;
    });
    servicosSelecionadosNoPasso1 = []; // Limpa os serviços selecionados para o próximo ciclo
    serviceCarouselsInstances = []; // Limpa as instâncias de carrossel
    servicesCarouselContainer.innerHTML = ''; // Limpa o DOM
    updateTotalBudget(); // Reseta o orçamento exibido
    showStep(1);
});

nextStep2Button.addEventListener('click', () => {
    console.log("Botão 'Próximo' (Etapa 2) clicado.");
    // A validação e coleta de dados já estão dentro de collectFinalData
    if (collectFinalData()) {
        showStep(3);
    } else {
        console.error("Falha ao avançar da Etapa 2 para a Etapa 3 devido a dados inválidos.");
    }
});

backButton2.addEventListener('click', () => {
    console.log("Botão 'Voltar' (Etapa 3 para Etapa 2) clicado.");
    showStep(2); // Volta para a etapa de detalhes
});

nextStep3Button.addEventListener('click', () => {
    console.log("Botão 'Próximo' (Etapa 3) clicado.");
    // Validação dos campos do cliente
    const nomeCliente = document.getElementById('nomeCliente').value.trim();
    const telefoneCliente = document.getElementById('telefoneCliente').value.trim();

    if (!nomeCliente || !telefoneCliente) {
        alert('Por favor, preencha nome e telefone.');
        console.error("Tentativa de avançar da Etapa 3 sem preencher Nome ou Telefone.");
        return;
    }
    showStep(4);
});

backButton3.addEventListener('click', () => {
    console.log("Botão 'Voltar' (Etapa 4 para Etapa 3) clicado.");
    showStep(3); // Volta para a etapa do cliente
});

paymentOptions.forEach(button => {
    button.addEventListener('click', (e) => {
        formaPagamentoSelecionada = e.target.dataset.payment;
        // Remove a classe 'active' de todos os botões de pagamento
        paymentOptions.forEach(btn => btn.classList.remove('active'));
        // Adiciona a classe 'active' ao botão clicado
        e.target.classList.add('active');
        // Aqui você pode adicionar lógica para mostrar campos específicos da forma de pagamento
        paymentDetailsDiv.innerHTML = `<p>Você selecionou: <strong>${formaPagamentoSelecionada.toUpperCase()}</strong>. Detalhes serão exibidos aqui.</p>`;
        console.log(`Forma de pagamento selecionada: ${formaPagamentoSelecionada}`);
    });
});

finalizarOrcamentoButton.addEventListener('click', () => {
    console.log("Botão 'Finalizar Orçamento' clicado.");
    if (!formaPagamentoSelecionada) {
        alert('Por favor, selecione uma forma de pagamento.');
        console.warn("Tentativa de finalizar sem forma de pagamento selecionada.");
        return;
    }
    // A coleta final de dados já acontece em collectFinalData
    // Se collectFinalData retornar true, podemos prosseguir para a confirmação
    if (collectFinalData()) { // Re-executa a coleta para garantir que os dados estão atualizados e válidos
        showStep(5); // Mostra a tela de confirmação
    } else {
        console.error("Falha ao finalizar o orçamento devido a dados inválidos.");
    }
});

voltarInicioButton.addEventListener('click', () => {
    console.log("Botão 'Novo Agendamento' clicado.");
    // Reinicia todas as etapas para o início
    servicosSelecionadosNoPasso1 = [];
    servicosComDetalhesColetados = [];
    formaPagamentoSelecionada = '';
    serviceCarouselsInstances = []; // Limpa as instâncias
    servicesCarouselContainer.innerHTML = ''; // Limpa o DOM
    
    // Limpa campos de cliente
    document.getElementById('nomeCliente').value = '';
    document.getElementById('telefoneCliente').value = '';
    document.getElementById('emailCliente').value = '';
    document.getElementById('enderecoCliente').value = '';
    
    // Reseta seleção de pagamento
    paymentOptions.forEach(btn => btn.classList.remove('active'));
    paymentDetailsDiv.innerHTML = '';
    
    // Reseta a seleção de serviços
    document.querySelectorAll('.service-item').forEach(item => {
        item.classList.remove('selected');
        const btn = item.querySelector('.select-service-btn');
        btn.textContent = 'Selecionar';
        btn.disabled = false;
    });

    updateTotalBudget(); // Reseta o orçamento
    showStep(1); // Volta para a primeira etapa
    console.log("Sistema reiniciado para nova seleção de serviços.");
});

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM completamente carregado.");
    loadServicesData(); // Carrega os dados e renderiza a primeira etapa
    showStep(1); // Garante que a primeira etapa esteja visível
});
