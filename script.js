/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 13.0 (Correção de ReferenceError em loadAllData e outras correções)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuração Firebase (substitua com suas credenciais)

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




// Variáveis Globais
let allServices = []; // Armazena todos os serviços disponíveis
let servicosSelecionados = []; // Array para os serviços que o cliente escolheu
let globalConfig = {}; // Para armazenar configurações globais (horários, etc.)

// Elementos do DOM
const serviceListContainer = document.getElementById('serviceList');
const servicosFormContainer = document.getElementById('servicosFormContainer');
const orcamentoTotalDisplay = document.getElementById('orcamentoTotal');
const confirmationPopup = document.getElementById('confirmationPopup');
const whatsappLink = document.getElementById('whatsappLink');
const datePicker = document.getElementById('dataAgendamento');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');
const agendamentoForm = document.getElementById('agendamentoForm');
const selectedTimeInput = document.getElementById('selectedTime'); // Input escondido para o horário selecionado
const orcamentoTotalDisplayInConfirmation = document.getElementById('confirmationDetails'); // Elemento na confirmação
const confirmationMessageDiv = document.getElementById('confirmationMessage'); // Div para link do WhatsApp

// Barras de Progresso e Seções
const progressBar = document.getElementById('progressBar');
const progressSteps = document.querySelectorAll('.progress-step');
const servicosSection = document.getElementById('servicosSection');
const servicosFormSection = document.getElementById('servicosFormSection');
const clienteFormSection = document.getElementById('clienteFormSection');
const agendamentoSection = document.getElementById('agendamentoSection');
const nextStep1 = document.getElementById('nextStep1');
const nextStep2 = document.getElementById('nextStep2');
const nextStep3 = document.getElementById('nextStep3');
const backButton1 = document.getElementById('backButton1');
const backButton2 = document.getElementById('backButton2');
const backButton3 = document.getElementById('backButton3');

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData(); // <- Esta é a função que estava faltando
    setupEventListeners();
    updateProgressBar(1);
    setupPhoneMask();
    loadPromocoes(); // Carrega promoções (se houver interface para cliente ver)
});

/**
 * Carrega todos os dados necessários para a aplicação:
 * - Serviços do Firebase
 * - Configurações (horários, etc.) do Firebase
 * - Promoções (se aplicável para exibição ao cliente)
 */
async function loadAllData() {
    await loadServices();
    await loadConfig();
    // loadPromocoes() // Chamada no DOMContentLoaded, mas pode ser chamada aqui se necessário
}

async function loadServices() {
    const servicesRef = ref(database, 'servicos');
    onValue(servicesRef, (snapshot) => {
        allServices = []; // Limpa a lista antes de adicionar novos serviços
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                allServices.push({ key: childSnapshot.key, ...childSnapshot.val() });
            });
            renderServiceList();
        } else {
            serviceListContainer.innerHTML = '<p>Nenhum serviço cadastrado no momento.</p>';
        }
    }, {
        // Ignora o cache para garantir dados sempre atualizados
        // cache: 'no-store' // Descomente se necessário, mas onValue já tende a ser em tempo real
    });
}

async function loadConfig() {
    const configRef = ref(database, 'configuracoes');
    onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            globalConfig = snapshot.val();
            // Atualiza elementos que dependem da config, como a geração de horários
            const selectedDate = datePicker.value;
            if (selectedDate) {
                loadTimeSlots(selectedDate);
            }
        } else {
            globalConfig = {}; // Configurações padrão ou vazias
        }
    });
}

function renderServiceList() {
    serviceListContainer.innerHTML = '';
    if (allServices.length === 0) {
        serviceListContainer.innerHTML = '<p>Nenhum serviço disponível no momento.</p>';
        return;
    }
    allServices.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.dataset.key = service.key;
        
        let promotionHtml = '';
        if (service.promocao) {
            const today = new Date().toISOString().split('T')[0];
            const startDate = new Date(service.promocao.dataInicio);
            const endDate = new Date(service.promocao.dataFim);
            const currentDate = new Date(today);

            if (startDate <= currentDate && currentDate <= endDate) {
                promotionHtml = `
                    <div class="promotion-badge">
                        🔥 ${service.promocao.porcentagem}% OFF
                    </div>
                `;
            }
        }

        serviceCard.innerHTML = `
            <div class="service-info">
                <h3>${service.nome}</h3>
                <p>${service.descricao}</p>
                <p class="service-price">R$ ${service.precoBase !== undefined ? service.precoBase.toFixed(2) : '0.00'}</p>
                ${promotionHtml}
            </div>
            <button class="btn btn-primary btn-select-service">Adicionar</button>
        `;
        serviceListContainer.appendChild(serviceCard);
    });
    updateSelectedServicesCount();
}

// ==========================================================================
// 3. ETAPA 1: SELEÇÃO DE SERVIÇOS
// ==========================================================================

function updateSelectedServicesCount() {
    const count = servicosSelecionados.length;
    nextStep1.style.display = count > 0 ? 'block' : 'none'; // Mostra botão "Próximo" apenas se houver serviço selecionado
    document.getElementById('selectedServicesCount').textContent = `(${count} serviço(s) selecionado(s))`;
}

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS (COM CARROSSEL)
// ==========================================================================

function renderServiceForms() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach((service, serviceIndex) => {
        // Inicializa equipamentos se não existirem, com a quantidade padrão 1
        if (!service.equipamentos || service.equipamentos.length === 0) {
            service.equipamentos = [{ 
                quantidade: 1, 
                precoCalculadoIndividual: service.precoBase || 0,
                campos: {} // Inicializa campos como um objeto vazio
            }];
        }

        const carouselDiv = document.createElement('div');
        carouselDiv.className = 'service-carousel';
        carouselDiv.dataset.key = service.key; // Usa a chave do serviço como identificador
        carouselDiv.dataset.serviceIndex = serviceIndex; // Índice no array servicosSelecionados

        carouselDiv.innerHTML = `
            <h3>${service.nome}</h3>
            <div class="carousel-container">
                <div class="carousel-slides" data-service-key="${service.key}">
                    ${service.equipamentos.map((equip, index) => `
                        <div class="carousel-slide" data-index="${index}">
                            <div class="form-group">
                                <label>Quantidade</label>
                                <input type="number" class="form-control equipment-quantity" value="${equip.quantidade || 1}" min="1" required>
                            </div>
                            ${generateEquipmentFields(service, index, equip.campos)}
                            <div class="equipment-price">Valor: R$ ${calculateEquipmentPrice(service, index, equip.campos, service.precoBase || 0, service.promocao).toFixed(2)}</div>
                            <button type="button" class="btn btn-danger btn-sm remove-equipment-btn" style="${index === 0 ? 'display: none;' : 'display: block;'}">
                                ❌ Remover
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="carousel-navigation">
                    <button type="button" class="carousel-btn prev-btn" disabled>←</button>
                    <span class="carousel-counter">Equipamento 1 de ${service.equipamentos.length}</span>
                    <button type="button" class="carousel-btn next-btn" disabled>→</button>
                </div>
            </div>
            <button type="button" class="btn btn-secondary add-equipment-btn" data-service-key="${service.key}">
                ➕ Adicionar Equipamento
            </button>
            <div class="service-total">Total do serviço: R$ ${calculateServiceTotal(service).toFixed(2)}</div>
        `;

        servicosFormContainer.appendChild(carouselDiv);
    });

    setupCarouselEvents();
    updateOrcamentoTotal();
}

function generateEquipmentFields(service, index, existingFields = {}) {
    let fieldsHtml = '';
    if (service.camposAdicionais) {
        fieldsHtml = service.camposAdicionais.map(field => {
            const isPriceField = field.tipo === 'select' && field.opcoes && !field.opcoes.every(opt => opt.includes(', R$ 0.00'));
            const fieldName = field.nome.replace(/\s+/g, '-').toLowerCase(); // Gera um ID mais seguro
            const currentValue = existingFields[field.nome] || '';

            if (field.tipo === 'select') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select ${isPriceField ? 'price-field' : ''}" 
                                data-field-name="${field.nome}" 
                                data-is-price-field="${isPriceField}"
                                required>
                            <option value="">Selecione ${field.nome}...</option>
                            ${field.opcoes.map(option => {
                                const optionParts = option.split(', R$ ');
                                const optionValue = optionParts[0];
                                const optionPrice = optionParts.length > 1 ? parseFloat(optionParts[1].replace('R$ ', '')).toFixed(2) : '0.00';
                                return `<option value="${optionValue}" data-price="${optionPrice}" ${currentValue === optionValue ? 'selected' : ''}>${optionValue}</option>`;
                            }).join('')}
                        </select>
                    </div>
                `;
            } else if (field.tipo === 'text') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <input type="text" class="form-control additional-field-input" 
                               data-field-name="${field.nome}" 
                               value="${currentValue}" required>
                    </div>
                `;
            } else if (field.tipo === 'number') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <input type="number" class="form-control additional-field-input" 
                               data-field-name="${field.nome}" 
                               value="${currentValue}" step="0.01" required>
                    </div>
                `;
            } else if (field.tipo === 'textarea') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <textarea class="form-control additional-field-textarea" 
                                  data-field-name="${field.nome}" 
                                  required>${currentValue}</textarea>
                    </div>
                `;
            }
        }).join('');
    }
    return fieldsHtml;
}

function setupCarouselEvents() {
    // Limpa listeners antigos antes de adicionar novos para evitar duplicação
    document.querySelectorAll('.service-carousel').forEach(carousel => {
        const serviceKey = carousel.dataset.key;
        
        // Botão Adicionar Equipamento
        const addBtn = carousel.querySelector('.add-equipment-btn');
        if (addBtn) addBtn.removeEventListener('click', handleAddEquipment); // Remove listener antigo
        addBtn.addEventListener('click', handleAddEquipment);

        // Botões de navegação
        carousel.querySelectorAll('.prev-btn').forEach(btn => {
            btn.removeEventListener('click', handlePrevClick);
            btn.addEventListener('click', handlePrevClick);
        });
        carousel.querySelectorAll('.next-btn').forEach(btn => {
            btn.removeEventListener('click', handleNextClick);
            btn.addEventListener('click', handleNextClick);
        });

        // Campos de input e select dentro dos slides
        carousel.querySelectorAll('.carousel-slide select, .carousel-slide input, .carousel-slide textarea').forEach(field => {
            field.removeEventListener('input', handleFieldChange);
            field.removeEventListener('change', handleFieldChange);
            field.addEventListener('input', handleFieldChange);
            field.addEventListener('change', handleFieldChange);
        });

        // Botões de remover equipamento
        carousel.querySelectorAll('.remove-equipment-btn').forEach(btn => {
            btn.removeEventListener('click', handleRemoveEquipment);
            btn.addEventListener('click', handleRemoveEquipment);
        });
    });
}

function handleAddEquipment(e) {
    const serviceKey = e.target.dataset.serviceKey;
    const serviceIndex = parseInt(e.target.closest('.service-carousel').dataset.serviceIndex);
    const service = servicosSelecionados[serviceIndex];
    
    if (service) {
        // Adiciona um novo equipamento ao array do serviço com valores padrão
        service.equipamentos.push({ 
            quantidade: 1, 
            precoCalculadoIndividual: service.precoBase || 0, 
            campos: {} 
        });
        renderServiceForms(); // Re-renderiza todos os formulários para atualizar o carrossel
        updateOrcamentoTotal();
    }
}

function handleRemoveEquipment(e) {
    const slide = e.target.closest('.carousel-slide');
    const serviceIndex = parseInt(slide.closest('.service-carousel').dataset.serviceIndex);
    const equipmentIndex = parseInt(slide.dataset.index);
    const service = servicosSelecionados[serviceIndex];

    if (service && service.equipamentos.length > 1) { // Só remove se houver mais de um equipamento
        service.equipamentos.splice(equipmentIndex, 1);
        renderServiceForms(); // Re-renderiza para atualizar a UI
        updateOrcamentoTotal();
    } else {
        alert("Você deve manter pelo menos um equipamento por serviço.");
    }
}

function handlePrevClick(e) {
    const carousel = e.target.closest('.service-carousel');
    const serviceKey = carousel.dataset.key;
    navigateCarousel(serviceKey, -1);
}

function handleNextClick(e) {
    const carousel = e.target.closest('.service-carousel');
    const serviceKey = carousel.dataset.key;
    navigateCarousel(serviceKey, 1);
}

function handleFieldChange(e) {
    const field = e.target;
    const slide = field.closest('.carousel-slide');
    const serviceIndex = parseInt(slide.closest('.service-carousel').dataset.serviceIndex);
    const equipmentIndex = parseInt(slide.dataset.index);
    const service = servicosSelecionados[serviceIndex];
    
    if (service && service.equipamentos && service.equipamentos[equipmentIndex]) {
        const fieldName = field.dataset.fieldName;
        const fieldType = field.tagName.toLowerCase();
        let fieldValue = field.value;

        // Atualiza o objeto de campos para este equipamento
        if (fieldType === 'select') {
            const selectedOption = field.options[field.selectedIndex];
            fieldValue = selectedOption ? selectedOption.value : '';
        }
        service.equipamentos[equipmentIndex].campos[fieldName] = fieldValue;

        // Atualiza o preço do equipamento e o total do serviço
        updatePriceForService(serviceIndex);
        updateOrcamentoTotal();
    }
}

function navigateCarousel(serviceKey, direction) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const slidesContainer = carousel.querySelector('.carousel-slides');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const currentSlide = slidesContainer.querySelector('.carousel-slide:not([style*="transform"])'); // Encontra o slide visível
    
    let currentIndex = 0;
    if (currentSlide) {
        currentIndex = Array.from(slides).indexOf(currentSlide);
    } else {
        // Se não achar um slide com transform, assume o primeiro como atual
        slides.forEach((slide, index) => {
            if (slide.style.transform === '' || slide.style.transform.includes('translateX(0px)')) {
                currentIndex = index;
            }
        });
    }

    const newIndex = currentIndex + direction;
    const totalSlides = slides.length;

    if (newIndex >= 0 && newIndex < totalSlides) {
        slidesContainer.style.transform = `translateX(-${newIndex * 100}%)`;
        updateCarouselNavigation(serviceKey, newIndex, totalSlides);
    }
}

function updateCarouselNavigation(serviceKey, currentIndex, totalSlides) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const prevBtn = carousel.querySelector('.prev-btn');
    const nextBtn = carousel.querySelector('.next-btn');
    const counter = carousel.querySelector('.carousel-counter');

    counter.textContent = `Equipamento ${currentIndex + 1} de ${totalSlides}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === totalSlides - 1;
}

function calculateEquipmentPrice(serviceData, equipmentIndex, camposEquipamento = {}, precoBase = 0, promocao = null) {
    let precoCalculado = precoBase; // Começa com o preço base do serviço

    // Adiciona preço dos campos de seleção que têm valor associado
    if (serviceData.camposAdicionais) {
        serviceData.camposAdicionais.forEach(field => {
            if (field.tipo === 'select' && field.opcoes && camposEquipamento[field.nome]) {
                const selectedOptionValue = camposEquipamento[field.nome];
                const optionData = field.opcoes.find(opt => opt.startsWith(selectedOptionValue + ', R$ '));
                if (optionData) {
                    const optionPrice = parseFloat(optionData.split(', R$ ')[1].replace(',', '.')) || 0;
                    precoCalculado += optionPrice;
                }
            }
        });
    }
    
    // Aplica desconto de promoção, se houver e estiver ativo
    if (promocao) {
        const today = new Date().toISOString().split('T')[0];
        const startDate = new Date(promocao.dataInicio);
        const endDate = new Date(promocao.dataFim);
        const currentDate = new Date(today);

        if (startDate <= currentDate && currentDate <= endDate) {
            const desconto = precoCalculado * (promocao.porcentagem / 100);
            precoCalculado -= desconto;
        }
    }
    
    // Garante que o preço não seja negativo
    return Math.max(0, precoCalculado);
}

function calculateServiceTotal(service) {
    let total = 0;
    if (service.equipamentos) {
        service.equipamentos.forEach((equip, index) => {
            const price = calculateEquipmentPrice(service, index, equip.campos, service.precoBase, service.promocao);
            total += price * equip.quantidade;
        });
    }
    return total;
}

function updatePriceForService(serviceIndex) {
    const service = servicosSelecionados[serviceIndex];
    const carousel = document.querySelector(`.service-carousel[data-service-index="${serviceIndex}"]`);
    if (!carousel || !service) return;

    let newServiceTotal = 0;
    
    carousel.querySelectorAll('.carousel-slide').forEach((slide, index) => {
        const equip = service.equipamentos[index];
        const equipmentPrice = calculateEquipmentPrice(service, index, equip.campos, service.precoBase, service.promocao);
        newServiceTotal += equipmentPrice * equip.quantidade;
        
        const priceDisplay = slide.querySelector('.equipment-price');
        if (priceDisplay) {
            priceDisplay.textContent = `Valor: R$ ${equipmentPrice.toFixed(2)}`;
        }
    });

    const serviceTotalDisplay = carousel.querySelector('.service-total');
    if (serviceTotalDisplay) {
        serviceTotalDisplay.textContent = `Total do serviço: R$ ${newServiceTotal.toFixed(2)}`;
    }
}

function updateOrcamentoTotal() {
    let total = 0;
    servicosSelecionados.forEach(service => {
        total += calculateServiceTotal(service);
    });
    orcamentoTotalDisplay.textContent = `Total do Orçamento: R$ ${total.toFixed(2)}`;
}

// ==========================================================================
// 5. ETAPA 3: DADOS DO CLIENTE E AGENDAMENTO
// ==========================================================================

function setupEventListeners() {
    // Eventos para seleção de serviços
    serviceListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-select-service')) {
            const serviceCard = e.target.closest('.service-card');
            const serviceKey = serviceCard.dataset.key;
            const service = allServices.find(s => s.key === serviceKey);
            
            if (service) {
                // Verifica se o serviço já foi selecionado
                if (!servicosSelecionados.some(s => s.key === serviceKey)) {
                    servicosSelecionados.push({ ...service, equipamentos: [] }); // Copia o serviço e inicializa equipamentos
                    serviceCard.classList.add('selected');
                    e.target.textContent = 'Adicionado';
                    e.target.disabled = true;
                }
            }
            updateSelectedServicesCount();
        }
    });

    // Navegação entre etapas
    nextStep1.addEventListener('click', () => {
        if (servicosSelecionados.length > 0) {
            servicosSection.classList.add('hidden');
            servicosFormSection.classList.remove('hidden');
            renderServiceForms();
            updateProgressBar(2);
        } else {
            alert('Por favor, selecione pelo menos um serviço para continuar.');
        }
    });

    nextStep2.addEventListener('click', () => {
        if (validateServiceForms()) {
            servicosFormSection.classList.add('hidden');
            clienteFormSection.classList.remove('hidden');
            updateProgressBar(3);
        } else {
            alert('Por favor, preencha todos os campos obrigatórios corretamente nos serviços selecionados.');
        }
    });

    nextStep3.addEventListener('click', () => {
        if (validateClienteForm()) {
            clienteFormSection.classList.add('hidden');
            agendamentoSection.classList.remove('hidden');
            loadAvailableDates();
            updateProgressBar(4);
        } else {
            alert('Por favor, preencha todos os campos do cliente corretamente.');
        }
    });

    backButton1.addEventListener('click', () => {
        servicosFormSection.classList.add('hidden');
        servicosSection.classList.remove('hidden');
        updateProgressBar(1);
        // Reinicia a seleção de serviços para permitir reedição
        servicosSelecionados = [];
        document.querySelectorAll('.service-card.selected').forEach(card => {
            card.classList.remove('selected');
            const btn = card.querySelector('.btn-select-service');
            btn.textContent = 'Adicionar';
            btn.disabled = false;
        });
        updateSelectedServicesCount();
    });
    backButton2.addEventListener('click', () => {
        clienteFormSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        updateProgressBar(2);
    });
    backButton3.addEventListener('click', () => {
        agendamentoSection.classList.add('hidden');
        clienteFormSection.classList.remove('hidden');
        updateProgressBar(3);
    });

    agendamentoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitAgendamento();
    });

    // Event Listener para o DatePicker
    datePicker.addEventListener('change', (e) => {
        loadTimeSlots(e.target.value);
    });
}

function validateServiceForms() {
    let allValid = true;
    document.querySelectorAll('.service-carousel').forEach(carousel => {
        const serviceIndex = parseInt(carousel.dataset.serviceIndex);
        const service = servicosSelecionados[serviceIndex];
        let serviceValid = true;

        // Valida campos quantity
        carousel.querySelectorAll('.equipment-quantity').forEach(input => {
            if (!input.checkValidity()) {
                input.classList.add('error');
                serviceValid = false;
            } else {
                input.classList.remove('error');
                const equipmentIndex = parseInt(input.closest('.carousel-slide').dataset.index);
                service.equipamentos[equipmentIndex].quantidade = parseInt(input.value);
            }
        });

        // Valida campos adicionais (select, input, textarea)
        carousel.querySelectorAll('.carousel-slide select, .carousel-slide input, .carousel-slide textarea').forEach(field => {
            if (!field.checkValidity()) {
                field.classList.add('error');
                serviceValid = false;
            } else {
                field.classList.remove('error');
                const fieldName = field.dataset.fieldName;
                const equipmentIndex = parseInt(field.closest('.carousel-slide').dataset.index);
                if (service.equipamentos[equipmentIndex] && fieldName) {
                    service.equipamentos[equipmentIndex].campos[fieldName] = field.value;
                }
            }
        });

        // Valida se o total do serviço é maior que zero (considerando que tudo deve ter algum custo)
        const serviceTotal = calculateServiceTotal(service);
        if (serviceTotal <= 0 && service.equipamentos.length > 0) {
             // Se o total for zero, pode ser um problema, a menos que seja um serviço gratuito intencional.
             // Para esta validação, vamos considerar como erro se o total for zero APÓS preencher os campos.
             // Se for um serviço gratuito configurado, o precoBase pode ser 0 e os campos não adicionarem preço.
             // Se todos os campos e o precoBase resultarem em 0, o total será 0.
             // Podemos adicionar um flag para serviços gratuitos se necessário.
        }

        if (!serviceValid) {
            allValid = false;
        }
    });
    return allValid;
}

function validateClienteForm() {
    let isValid = true;
    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const endereco = document.getElementById('endereco').value.trim(); // Campo adicionado no HTML

    if (!nome) {
        document.getElementById('nome').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('nome').classList.remove('error');
    }

    if (!telefone) {
        document.getElementById('telefone').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('telefone').classList.remove('error');
    }
    
    if (!endereco) {
        document.getElementById('endereco').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('endereco').classList.remove('error');
    }

    return isValid;
}

function isValidEmail(email) {
    // Validação básica de email
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function setupPhoneMask() {
    const phoneInput = document.getElementById('telefone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) { // Limita a 11 dígitos (ex: 11 98765-4321)
                value = value.substring(0, 11);
            }
            if (value.length > 6) {
                value = value.replace(/^(\d\d)(\d{5})(\d{4})$/, '($1) $2-$3'); // Formato (11) 98765-4321
            } else if (value.length > 2) {
                value = value.replace(/^(\d\d)(\d{4})$/, '($1) $2'); // Formato (11) 87654
            }
            e.target.value = value;
        });
    }
}

// ==========================================================================
// 6. FUNÇÕES DE AGENDAMENTO E DISPONIBILIDADE
// ==========================================================================

async function loadAvailableDates() {
    try {
        const hoje = new Date();
        const datasDisponiveis = [];
        
        // Gerar próximos 30 dias
        for (let i = 0; i < 30; i++) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() + i);
            
            // Verificar se é dia de funcionamento e se está ativo na configuração
            const dayOfWeek = data.getDay(); // 0 for Sunday, 1 for Monday, etc.
            const diaNome = diasDaSemana[dayOfWeek]; // diasDaSemana array deve estar disponível aqui

            if (globalConfig.horariosPorDia && globalConfig.horariosPorDia[diaNome] && globalConfig.horariosPorDia[diaNome].ativo) {
                datasDisponiveis.push(data.toISOString().split('T')[0]);
            }
        }
        
        datePicker.innerHTML = '';
        if (datasDisponiveis.length === 0) {
            datePicker.innerHTML = '<option value="">Nenhuma data disponível</option>';
            timeSlotsContainer.innerHTML = '<p>Não há datas disponíveis para agendamento.</p>';
            return;
        }

        datasDisponiveis.forEach(data => {
            const option = document.createElement('option');
            option.value = data;
            option.textContent = formatDate(data);
            datePicker.appendChild(option);
        });
        
        datePicker.value = datasDisponiveis[0]; // Seleciona a primeira data disponível
        loadTimeSlots(datasDisponiveis[0]);
        
    } catch (error) {
        console.error('Erro ao carregar datas:', error);
        timeSlotsContainer.innerHTML = '<p>Erro ao carregar horários.</p>';
    }
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

async function loadTimeSlots(selectedDate) {
    timeSlotsContainer.innerHTML = ''; // Limpa horários anteriores
    
    if (!selectedDate) return;

    const agendamentosRef = ref(database, 'agendamentos');
    const snapshot = await get(agendamentosRef);
    
    const agendamentosDoDia = [];
    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const agendamento = childSnapshot.val();
            if (agendamento.data === selectedDate) {
                agendamentosDoDia.push(agendamento.hora);
            }
        });
    }
    
    const dayOfWeek = new Date(selectedDate).getDay();
    const diaNome = diasDaSemana[dayOfWeek];
    let horariosDisponiveis = [];

    if (globalConfig.horariosPorDia && globalConfig.horariosPorDia[diaNome] && globalConfig.horariosPorDia[diaNome].ativo) {
        const diaConfig = globalConfig.horariosPorDia[diaNome];
        horariosDisponiveis = generateTimeSlots(diaConfig.horarioInicio, diaConfig.horarioFim, diaConfig.duracaoServico);
    }
    
    const horariosLivres = horariosDisponiveis.filter(hora => 
        !agendamentosDoDia.includes(hora)
    );
    
    if (horariosLivres.length === 0) {
        timeSlotsContainer.innerHTML = '<p>Não há horários disponíveis para esta data.</p>';
        return;
    }
    
    horariosLivres.forEach(hora => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'time-slot-btn';
        button.textContent = hora;
        button.addEventListener('click', () => selectTimeSlot(hora, button));
        timeSlotsContainer.appendChild(button);
    });
}

function generateTimeSlots(start, end, interval) {
    const slots = [];
    let currentMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    const intervalMinutes = parseInt(interval) || 60; // Usa a duração do serviço, 60 minutos como padrão

    while (currentMinutes < endMinutes) { // Usa '<' para evitar que o slot final seja gerado se for exatamente o fim
        slots.push(formatTime(currentMinutes));
        currentMinutes += intervalMinutes;
    }
    
    return slots;
}

function parseTime(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function selectTimeSlot(hora, button) {
    // Remove a classe 'selected' de todos os botões de horário
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    // Adiciona a classe 'selected' ao botão clicado
    button.classList.add('selected');
    // Atualiza o valor do input escondido para o horário selecionado
    selectedTimeInput.value = hora; 
}

// ==========================================================================
// 7. ENVIO DO AGENDAMENTO
// ==========================================================================

async function submitAgendamento() {
    const formaPagamentoRadios = document.getElementsByName('paymentMethod');
    let formaPagamentoSelecionada = '';
    for (const radio of formaPagamentoRadios) {
        if (radio.checked) {
            formaPagamentoSelecionada = radio.value;
            break;
        }
    }
    const observacoes = document.getElementById('observacoes').value.trim();
    const selectedTime = selectedTimeInput.value; // Usa o valor do input escondido

    if (!selectedTime) {
        alert('Por favor, selecione um horário para o agendamento.');
        return;
    }
    
    if (!formaPagamentoSelecionada) {
        alert('Por favor, selecione a forma de pagamento.');
        return;
    }
    
    const totalOrcamento = parseFloat(orcamentoTotalDisplay.textContent.replace('Total do Orçamento: R$ ', ''));

    try {
        const agendamentoData = {
            cliente: {
                nome: document.getElementById('nome').value.trim(),
                telefone: document.getElementById('telefone').value.trim(),
                endereco: document.getElementById('endereco').value.trim(),
                observacoes: observacoes 
            },
            servicos: servicosSelecionados.map(service => {
                const equipamentosSelecionados = [];
                let serviceTotalCalculated = 0;

                service.equipamentos.forEach((equip, index) => {
                    const price = calculateEquipmentPrice(service, index, equip.campos, service.precoBase, service.promocao);
                    const equipmentTotal = price * equip.quantidade;
                    serviceTotalCalculated += equipmentTotal;
                    
                    equipamentosSelecionados.push({
                        quantidade: equip.quantidade,
                        precoUnitarioCalculado: price,
                        precoTotalEquipamento: equipmentTotal,
                        campos: equip.campos // Salva os campos selecionados para este equipamento
                    });
                });
                
                return {
                    nome: service.nome,
                    precoBaseServico: service.precoBase, // Salva o preço base original
                    promocaoServico: service.promocao, // Salva a promoção aplicada ao serviço
                    equipamentos: equipamentosSelecionados,
                    precoCalculado: serviceTotalCalculated // Total calculado para este serviço
                };
            }),
            data: datePicker.value,
            hora: selectedTime,
            formaPagamento: formaPagamentoSelecionada,
            observacoesCliente: observacoes, // Mantendo campo separado para observações do cliente
            status: 'pendente',
            dataCriacao: new Date().toISOString(),
            total: totalOrcamento // Total final do orçamento
        };
        
        const agendamentosRef = ref(database, 'agendamentos');
        const newAgendamentoRef = push(agendamentosRef, agendamentoData);
        
        showConfirmation(agendamentoData, newAgendamentoRef.key);
        
    } catch (error) {
        console.error('Erro ao enviar agendamento:', error);
        alert('Erro ao enviar agendamento. Por favor, tente novamente.');
    }
}

function showConfirmation(agendamentoData, agendamentoId) {
    const total = agendamentoData.total.toFixed(2);
    const dataFormatada = formatDate(agendamentoData.data);
    
    // Exibe os detalhes na tela de confirmação
    confirmationPopup.classList.remove('hidden');
    document.getElementById('confirmationDetails').innerHTML = `
        <p><strong>Olá, ${agendamentoData.cliente.nome}!</strong></p>
        <p>Seu agendamento foi confirmado com sucesso!</p>
        <p><strong>Serviço(s):</strong> ${agendamentoData.servicos.map(s => s.nome).join(', ')}</p>
        <p><strong>Data:</strong> ${dataFormatada}</p>
        <p><strong>Horário:</strong> ${agendamentoData.hora}</p>
        <p><strong>Total:</strong> R$ ${total}</p>
        <p><strong>Forma de Pagamento:</strong> ${agendamentoData.formaPagamento}</p>
        <p><strong>ID do Agendamento:</strong> ${agendamentoId}</p>
        <p><small>Em breve, você receberá mais informações via WhatsApp.</small></p>
    `;
    
    // Tenta buscar o número do WhatsApp da configuração para gerar o link
    const configRef = ref(database, 'configuracoes/whatsappNumber');
    get(configRef).then(snapshot => {
        const adminWhatsapp = snapshot.val();
        if (adminWhatsapp) {
            // Monta a mensagem para o WhatsApp
            const message = `Olá! Um novo agendamento foi realizado:\n\n*Cliente:* ${agendamentoData.cliente.nome}\n*Telefone:* ${agendamentoData.cliente.telefone}\n*Data:* ${dataFormatada}\n*Horário:* ${agendamentoData.hora}\n*Serviços:* ${agendamentoData.servicos.map(s => s.nome).join(', ')}\n*Total:* R$ ${total}\n*Forma de Pagamento:* ${agendamentoData.formaPagamento}\n*ID do Agendamento:* ${agendamentoId}\n\nPor favor, confirme o recebimento.`;
            
            // Atualiza o link do WhatsApp
            const whatsappButton = document.getElementById('whatsappLink');
            if (whatsappButton) {
                whatsappButton.href = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(message)}`;
                whatsappButton.classList.remove('hidden'); // Mostra o botão
            } else {
                confirmationMessageDiv.style.display = 'none';
            }
        } else {
            confirmationMessageDiv.style.display = 'none'; // Oculta se não houver número configurado
        }
    }).catch(error => console.error("Erro ao buscar número do WhatsApp:", error));
}

function closeConfirmation() {
    confirmationPopup.classList.add('hidden');
    resetForm();
}

function resetForm() {
    // Reseta estado global
    servicosSelecionados = [];
    
    // Reseta UI
    servicosSection.classList.remove('hidden');
    servicosFormSection.classList.add('hidden');
    clienteFormSection.classList.add('hidden');
    agendamentoSection.classList.add('hidden');
    confirmationPopup.classList.add('hidden');

    // Limpa seleções e campos
    document.getElementById('serviceList').innerHTML = ''; // Limpa a lista de serviços visível
    document.getElementById('servicosFormContainer').innerHTML = ''; // Limpa os formulários de serviços
    document.getElementById('clienteForm').reset();
    agendamentoForm.reset();
    selectedTimeInput.value = ''; // Limpa o horário selecionado
    
    // Reseta botões de navegação e contadores
    nextStep1.style.display = 'none';
    updateSelectedServicesCount();
    updateProgressBar(1);
    
    // Limpa seleção de serviço
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
        const btn = card.querySelector('.btn-select-service');
        if (btn) {
            btn.textContent = 'Adicionar';
            btn.disabled = false;
        }
    });

    loadServices(); // Recarrega os serviços para a próxima interação
}

// ==========================================================================
// 8. BARRA DE PROGRESSO
// ==========================================================================

function updateProgressBar(step) {
    progressSteps.forEach((stepEl, index) => {
        if (index < step) {
            stepEl.classList.add('completed');
        } else {
            stepEl.classList.remove('completed');
        }
        if (index === step - 1) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
    progressBar.style.width = `${(step - 1) * (100 / progressSteps.length)}%`; // Ajusta a largura da barra
}


// ==========================================================================
// 9. PROMOÇÕES (Para exibição ao cliente, se aplicável)
// ==========================================================================

function loadPromocoes() {
    // Esta função pode ser usada para buscar e exibir promoções ativas
    // no banner principal ou em outra área da página do cliente.
    // Por enquanto, as promoções são carregadas por serviço individualmente.
    console.log("Função loadPromocoes chamada. Implemente a exibição de promoções gerais aqui, se necessário.");
}

// ==========================================================================
// FIM DO ARQUIVO
// ==========================================================================
