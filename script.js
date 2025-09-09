/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 12.0 (Sistema de carrossel completo e debugado)
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
const servicosContainer = document.getElementById('servicosContainer');
const servicosSection = document.getElementById('servicos');
const servicosFormSection = document.getElementById('servicosForm');
const clienteFormSection = document.getElementById('clienteForm');
const agendamentoSection = document.getElementById('agendamento');
const servicosFormContainer = document.getElementById('servicosFormContainer');
const agendamentoForm = document.getElementById('agendamentoForm');
const orcamentoTotalDisplay = document.getElementById('orcamentoTotal');
const backButton1 = document.getElementById('backButton1');
const backButton2 = document.getElementById('backButton2');
const backButton3 = document.getElementById('backButton3');
const confirmationPopup = document.getElementById('confirmation');
const whatsappLink = document.getElementById('whatsappLink');
const progressSteps = document.querySelectorAll('.progress-step');
const datePicker = document.getElementById('datePicker');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');
const telefoneInput = document.getElementById('telefone');
const selectedServicesCount = document.getElementById('selectedServicesCount');

// Dados do Agendamento
let servicosSelecionados = [];
let servicosGlobais = {};
let configGlobais = {};
let formaPagamento = '';

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    updateProgressBar(1);
    setupPhoneMask();
    loadPromocoes();
});

async function loadAllData() {
    await loadConfig();
    loadServices();
}

async function loadConfig() {
    try {
        const configRef = ref(database, 'configuracoes');
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
            configGlobais = snapshot.val();
        } else {
            console.error("Configurações não encontradas no banco de dados.");
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

function loadServices() {
    const servicosRef = ref(database, 'servicos');
    onValue(servicosRef, (snapshot) => {
        servicosContainer.innerHTML = '';
        if (snapshot.exists()) {
            servicosGlobais = snapshot.val();
            for (const key in servicosGlobais) {
                const service = servicosGlobais[key];
                createServiceCard(service, key);
            }
        } else {
            servicosContainer.innerHTML = '<p>Nenhum serviço disponível no momento. Por favor, volte mais tarde.</p>';
        }
    });
}

// ==========================================================================
// 3. ETAPA 1: SELEÇÃO DE SERVIÇOS
// ==========================================================================

function createServiceCard(service, key) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.key = key;

    card.innerHTML = `
        <h3>${service.nome}</h3>
        <p>${service.descricao}</p>
        <button class="btn btn-primary btn-select-service">Adicionar</button>
    `;

    card.querySelector('.btn-select-service').addEventListener('click', () => {
        const selectedService = { 
            ...servicosGlobais[key], 
            key,
            equipamentos: [{}]
        };
        const existingIndex = servicosSelecionados.findIndex(s => s.key === key);
        
        if (existingIndex === -1) {
            servicosSelecionados.push(selectedService);
            card.classList.add('selected');
            card.querySelector('.btn-select-service').textContent = 'Remover';
        } else {
            servicosSelecionados.splice(existingIndex, 1);
            card.classList.remove('selected');
            card.querySelector('.btn-select-service').textContent = 'Adicionar';
        }
        
        updateSelectedServicesCount();
        const nextButton = document.getElementById('nextStep1');
        nextButton.style.display = servicosSelecionados.length > 0 ? 'block' : 'none';
    });

    servicosContainer.appendChild(card);
}

function updateSelectedServicesCount() {
    selectedServicesCount.textContent = servicosSelecionados.length;
}

document.getElementById('nextStep1').addEventListener('click', () => {
    if (servicosSelecionados.length > 0) {
        servicosSection.classList.add('hidden');
        servicosFormSection.classList.remove('hidden');
        renderServiceForms();
        updateProgressBar(2);
    } else {
        alert('Por favor, selecione pelo menos um serviço para continuar.');
    }
});

// ==========================================================================
// 4. ETAPA 2: PREENCHIMENTO DOS CAMPOS (COM CARROSSEL)
// ==========================================================================

function renderServiceForms() {
    servicosFormContainer.innerHTML = '';
    servicosSelecionados.forEach(service => {
        const carouselDiv = document.createElement('div');
        carouselDiv.className = 'service-carousel';
        carouselDiv.dataset.key = service.key;
        
        carouselDiv.innerHTML = `
            <h3>${service.nome}</h3>
            <div class="carousel-container">
                <div class="carousel-slides" data-key="${service.key}">
                    <div class="carousel-slide" data-index="0">
                        ${generateEquipmentFields(service, 0)}
                        <div class="equipment-price">Valor: R$ 0,00</div>
                        <button type="button" class="btn btn-danger remove-equipment-btn" style="display: none;">
                            ❌ Remover Equipamento
                        </button>
                    </div>
                </div>
                <div class="carousel-navigation">
                    <button type="button" class="carousel-btn prev-btn" disabled>← Anterior</button>
                    <span class="carousel-counter">Equipamento 1 de 1</span>
                    <button type="button" class="carousel-btn next-btn" disabled>Próximo →</button>
                </div>
            </div>
            <button type="button" class="btn btn-secondary add-equipment-btn" data-key="${service.key}">
                ➕ Adicionar outro equipamento
            </button>
            <div class="service-total">Total do serviço: R$ 0,00</div>
        `;
        
        servicosFormContainer.appendChild(carouselDiv);
    });

    setupCarouselEvents();
    updateOrcamentoTotal();
}

function generateEquipmentFields(service, index) {
    let fieldsHtml = '';
    if (service.camposAdicionais) {
        fieldsHtml = service.camposAdicionais.map(field => {
            if (field.tipo === 'select' && field.opcoes) {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select" 
                                data-field-name="${field.nome}" 
                                data-key="${service.key}" 
                                data-index="${index}" 
                                required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    </div>
                `;
            } else if (field.tipo === 'text') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <input type="text" class="form-control additional-field-input" 
                               data-field-name="${field.nome}" 
                               data-key="${service.key}" 
                               data-index="${index}" 
                               required>
                    </div>
                `;
            } else if (field.tipo === 'number') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <input type="number" class="form-control additional-field-input" 
                               data-field-name="${field.nome}" 
                               data-key="${service.key}" 
                               data-index="${index}" 
                               step="0.01" 
                               required>
                    </div>
                `;
            } else if (field.tipo === 'textarea') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <textarea class="form-control additional-field-textarea" 
                                  data-field-name="${field.nome}" 
                                  data-key="${service.key}" 
                                  data-index="${index}" 
                                  placeholder="Digite aqui..."></textarea>
                    </div>
                `;
            }
        }).join('');
    }
    return fieldsHtml;
}

function setupCarouselEvents() {
    // Eventos para campos existentes
    document.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-textarea')
        .forEach(field => {
            field.addEventListener('change', updatePrice);
            field.addEventListener('input', updatePrice);
        });

    // Evento para adicionar equipamento
    document.querySelectorAll('.add-equipment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serviceKey = e.target.dataset.key;
            const service = servicosSelecionados.find(s => s.key === serviceKey);
            const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
            const slidesContainer = carousel.querySelector('.carousel-slides');
            
            if (service) {
                const newIndex = slidesContainer.children.length;
                const newSlide = document.createElement('div');
                newSlide.className = 'carousel-slide';
                newSlide.dataset.index = newIndex;
                newSlide.innerHTML = `
                    ${generateEquipmentFields(service, newIndex)}
                    <div class="equipment-price">Valor: R$ 0,00</div>
                    <button type="button" class="btn btn-danger remove-equipment-btn">
                        ❌ Remover Equipamento
                    </button>
                `;
                
                slidesContainer.appendChild(newSlide);
                
                // Adicionar eventos aos novos campos
                newSlide.querySelectorAll('select, input, textarea').forEach(field => {
                    field.addEventListener('change', updatePrice);
                    field.addEventListener('input', updatePrice);
                });
                
                // Adicionar evento ao botão remover
                newSlide.querySelector('.remove-equipment-btn').addEventListener('click', () => {
                    removeEquipment(serviceKey, newIndex);
                });
                
                // Atualizar navegação
                updateCarouselNavigation(serviceKey);
                
                // Mostrar botão remover em todos os slides
                carousel.querySelectorAll('.remove-equipment-btn').forEach(btn => {
                    btn.style.display = 'block';
                });
                
                // Adicionar equipamento ao array do serviço
                if (!service.equipamentos) service.equipamentos = [{}];
                service.equipamentos.push({});
            }
        });
    });
    
    // Eventos para navegação do carrossel
    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serviceKey = e.target.closest('.service-carousel').dataset.key;
            navigateCarousel(serviceKey, -1);
        });
    });
    
    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serviceKey = e.target.closest('.service-carousel').dataset.key;
            navigateCarousel(serviceKey, 1);
        });
    });
}

function navigateCarousel(serviceKey, direction) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const slidesContainer = carousel.querySelector('.carousel-slides');
    const slides = carousel.querySelectorAll('.carousel-slide');
    
    // Encontrar slide atual
    let currentIndex = 0;
    slides.forEach((slide, index) => {
        const transform = slide.style.transform || '';
        if (transform === '' || transform.includes('translateX(0px)')) {
            currentIndex = index;
        }
    });
    
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < slides.length) {
        slidesContainer.style.transform = `translateX(-${newIndex * 100}%)`;
        updateCarouselNavigation(serviceKey);
    }
}

function updateCarouselNavigation(serviceKey) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.prev-btn');
    const nextBtn = carousel.querySelector('.next-btn');
    const counter = carousel.querySelector('.carousel-counter');
    
    // Encontrar slide atual
    let currentIndex = 0;
    slides.forEach((slide, index) => {
        const transform = slide.style.transform || '';
        if (transform === '' || transform.includes('translateX(0px)')) {
            currentIndex = index;
        }
    });
    
    const totalSlides = slides.length;
    
    counter.textContent = `Equipamento ${currentIndex + 1} de ${totalSlides}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === totalSlides - 1;
}

function removeEquipment(serviceKey, index) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const slidesContainer = carousel.querySelector('.carousel-slides');
    const slides = carousel.querySelectorAll('.carousel-slide');
    
    if (slides.length > 1) {
        // Remover o slide
        slides[index].remove();
        
        // Reindexar slides restantes
        carousel.querySelectorAll('.carousel-slide').forEach((slide, newIndex) => {
            slide.dataset.index = newIndex;
            slide.querySelectorAll('select, input, textarea').forEach(field => {
                field.dataset.index = newIndex;
            });
        });
        
        // Reposicionar carrossel se necessário
        if (index === 0 && slides.length > 0) {
            slidesContainer.style.transform = 'translateX(0px)';
        }
        
        // Atualizar navegação
        updateCarouselNavigation(serviceKey);
        
        // Esconder botão remover se só tiver um slide
        if (slides.length === 1) {
            carousel.querySelector('.remove-equipment-btn').style.display = 'none';
        }
        
        // Remover equipamento do array do serviço
        const service = servicosSelecionados.find(s => s.key === serviceKey);
        if (service && service.equipamentos) {
            service.equipamentos.splice(index, 1);
        }
        
        updatePriceForService(serviceKey);
        updateOrcamentoTotal();
    }
}

function updatePrice(e) {
    const key = e.target.dataset.key;
    const index = e.target.dataset.index;
    const service = servicosSelecionados.find(s => s.key === key);
    
    if (!service) return;

    const carousel = document.querySelector(`.service-carousel[data-key="${key}"]`);
    const slide = carousel.querySelector(`.carousel-slide[data-index="${index}"]`);
    const newPrice = calculateEquipmentPrice(service, slide);
    
    // Atualizar preço do equipamento individual
    slide.querySelector('.equipment-price').textContent = `Valor: R$ ${newPrice.toFixed(2)}`;
    
    // Atualizar preço total do serviço
    updatePriceForService(key);
    updateOrcamentoTotal();
}

function calculateEquipmentPrice(serviceData, slide) {
    let preco = serviceData.precoBase || 0;
    const selectElements = slide.querySelectorAll('.additional-field-select');
    const inputElements = slide.querySelectorAll('.additional-field-input');
    
    selectElements.forEach(select => {
        const selectedValue = select.value;
        if (selectedValue) {
            const parts = selectedValue.split(', R$ ');
            if (parts.length === 2) {
                preco += parseFloat(parts[1]);
            }
        }
    });

    inputElements.forEach(input => {
        if (input.type === 'number') {
            const inputValue = parseFloat(input.value);
            if (!isNaN(inputValue)) {
                preco += inputValue;
            }
        }
    });

    return preco;
}

function updatePriceForService(serviceKey) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const service = servicosSelecionados.find(s => s.key === serviceKey);
    let totalServico = 0;
    
    carousel.querySelectorAll('.carousel-slide').forEach(slide => {
        const equipmentPrice = calculateEquipmentPrice(service, slide);
        totalServico += equipmentPrice;
    });
    
    carousel.querySelector('.service-total').textContent = `Total do serviço: R$ ${totalServico.toFixed(2)}`;
}

function updateOrcamentoTotal() {
    let total = 0;
    
    servicosSelecionados.forEach(service => {
        const carousel = document.querySelector(`.service-carousel[data-key="${service.key}"]`);
        if (carousel) {
            carousel.querySelectorAll('.carousel-slide').forEach(slide => {
                total += calculateEquipmentPrice(service, slide);
            });
        }
    });
    
    orcamentoTotalDisplay.textContent = `Total do Orçamento: R$ ${total.toFixed(2)}`;
}

// ==========================================================================
// 5. ETAPA 3: DADOS DO CLIENTE E AGENDAMENTO
// ==========================================================================

function setupEventListeners() {
    backButton1.addEventListener('click', () => {
        servicosFormSection.classList.add('hidden');
        servicosSection.classList.remove('hidden');
        updateProgressBar(1);
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

    document.getElementById('nextStep2').addEventListener('click', () => {
        if (validateServiceForms()) {
            servicosFormSection.classList.add('hidden');
            clienteFormSection.classList.remove('hidden');
            updateProgressBar(3);
        } else {
            alert('Por favor, preencha todos os campos obrigatórios antes de continuar.');
        }
    });

    document.getElementById('nextStep3').addEventListener('click', () => {
        if (validateClienteForm()) {
            clienteFormSection.classList.add('hidden');
            agendamentoSection.classList.remove('hidden');
            loadAvailableDates();
            updateProgressBar(4);
        } else {
            alert('Por favor, preencha todos os campos obrigatórios antes de continuar.');
        }
    });

    agendamentoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitAgendamento();
    });
}

function validateServiceForms() {
    let isValid = true;
    
    document.querySelectorAll('.additional-field-select[required], .additional-field-input[required]').forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });
    
    return isValid;
}

function validateClienteForm() {
    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const email = document.getElementById('email').value.trim();
    
    let isValid = true;
    
    if (!nome) {
        document.getElementById('nome').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('nome').classList.remove('error');
    }
    
    if (!telefone || telefone.length < 14) {
        document.getElementById('telefone').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('telefone').classList.remove('error');
    }
    
    if (!email || !isValidEmail(email)) {
        document.getElementById('email').classList.add('error');
        isValid = false;
    } else {
        document.getElementById('email').classList.remove('error');
    }
    
    return isValid;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setupPhoneMask() {
    telefoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        
        if (value.length > 10) {
            value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (value.length > 6) {
            value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
        } else if (value.length > 0) {
            value = value.replace(/(\d{0,2})/, '($1');
        }
        
        e.target.value = value;
    });
}

// ==========================================================================
// 6. FUNÇÕES DE AGENDAMENTO E DISPONIBILIDADE
// ==========================================================================

async function loadAvailableDates() {
    try {
        const agendamentosRef = ref(database, 'agendamentos');
        const snapshot = await get(agendamentosRef);
        
        const hoje = new Date();
        const datasDisponiveis = [];
        
        // Gerar próximos 30 dias
        for (let i = 0; i < 30; i++) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() + i);
            
            // Verificar se é dia de funcionamento (segunda a sábado)
            if (data.getDay() !== 0) { // 0 = domingo
                datasDisponiveis.push(data.toISOString().split('T')[0]);
            }
        }
        
        datePicker.innerHTML = '';
        datasDisponiveis.forEach(data => {
            const option = document.createElement('option');
            option.value = data;
            option.textContent = formatDate(data);
            datePicker.appendChild(option);
        });
        
        if (datasDisponiveis.length > 0) {
            datePicker.value = datasDisponiveis[0];
            loadTimeSlots(datasDisponiveis[0]);
        }
        
    } catch (error) {
        console.error('Erro ao carregar datas:', error);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

async function loadTimeSlots(selectedDate) {
    try {
        const agendamentosRef = ref(database, 'agendamentos');
        const snapshot = await get(agendamentosRef);
        
        timeSlotsContainer.innerHTML = '';
        
        // Configuração padrão de horários
        const horariosDisponiveis = generateTimeSlots('08:00', '18:00', 60);
        const agendamentosDoDia = [];
        
        if (snapshot.exists()) {
            const agendamentos = snapshot.val();
            for (const key in agendamentos) {
                const agendamento = agendamentos[key];
                if (agendamento.data === selectedDate) {
                    agendamentosDoDia.push(agendamento.hora);
                }
            }
        }
        
        // Filtrar horários disponíveis
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
        
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
    }
}

function generateTimeSlots(start, end, interval) {
    const slots = [];
    let current = parseTime(start);
    const endTime = parseTime(end);
    
    while (current <= endTime) {
        slots.push(formatTime(current));
        current += interval;
    }
    
    return slots;
}

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function selectTimeSlot(hora, button) {
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    document.getElementById('selectedTime').value = hora;
}

datePicker.addEventListener('change', (e) => {
    loadTimeSlots(e.target.value);
});

// ==========================================================================
// 7. ENVIO DO AGENDAMENTO
// ==========================================================================

async function submitAgendamento() {
    const formaPagamentoSelect = document.getElementById('formaPagamento');
    const observacoes = document.getElementById('observacoes').value.trim();
    const selectedTime = document.getElementById('selectedTime').value;
    
    if (!selectedTime) {
        alert('Por favor, selecione um horário para o agendamento.');
        return;
    }
    
    if (!formaPagamentoSelect.value) {
        alert('Por favor, selecione a forma de pagamento.');
        return;
    }
    
    formaPagamento = formaPagamentoSelect.value;
    
    try {
        const agendamentoData = {
            cliente: {
                nome: document.getElementById('nome').value.trim(),
                telefone: document.getElementById('telefone').value.trim(),
                email: document.getElementById('email').value.trim()
            },
            servicos: servicosSelecionados.map(service => ({
                nome: service.nome,
                equipamentos: service.equipamentos.map((equip, index) => {
                    const carousel = document.querySelector(`.service-carousel[data-key="${service.key}"]`);
                    const slide = carousel.querySelector(`.carousel-slide[data-index="${index}"]`);
                    
                    const campos = {};
                    slide.querySelectorAll('[data-field-name]').forEach(field => {
                        const fieldName = field.dataset.fieldName;
                        campos[fieldName] = field.value;
                    });
                    
                    return {
                        campos,
                        preco: calculateEquipmentPrice(service, slide)
                    };
                }),
                total: service.equipamentos.reduce((sum, equip, index) => {
                    const carousel = document.querySelector(`.service-carousel[data-key="${service.key}"]`);
                    const slide = carousel.querySelector(`.carousel-slide[data-index="${index}"]`);
                    return sum + calculateEquipmentPrice(service, slide);
                }, 0)
            })),
            data: datePicker.value,
            hora: selectedTime,
            formaPagamento: formaPagamento,
            observacoes: observacoes,
            status: 'pendente',
            dataCriacao: new Date().toISOString(),
            total: servicosSelecionados.reduce((total, service) => {
                return total + service.equipamentos.reduce((serviceTotal, equip, index) => {
                    const carousel = document.querySelector(`.service-carousel[data-key="${service.key}"]`);
                    const slide = carousel.querySelector(`.carousel-slide[data-index="${index}"]`);
                    return serviceTotal + calculateEquipmentPrice(service, slide);
                }, 0);
            }, 0)
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
    
    document.getElementById('confirmationDetails').innerHTML = `
        <p><strong>Cliente:</strong> ${agendamentoData.cliente.nome}</p>
        <p><strong>Telefone:</strong> ${agendamentoData.cliente.telefone}</p>
        <p><strong>Data:</strong> ${dataFormatada}</p>
        <p><strong>Horário:</strong> ${agendamentoData.hora}</p>
        <p><strong>Total:</strong> R$ ${total}</p>
        <p><strong>Forma de Pagamento:</strong> ${agendamentoData.formaPagamento}</p>
    `;
    
    // Atualizar link do WhatsApp
    const message = `Olá! Gostaria de confirmar meu agendamento:\n\n*Cliente:* ${agendamentoData.cliente.nome}\n*Data:* ${dataFormatada}\n*Horário:* ${agendamentoData.hora}\n*Serviços:* ${agendamentoData.servicos.length}\n*Total:* R$ ${total}\n*ID do Agendamento:* ${agendamentoId}`;
    whatsappLink.href = `https://wa.me/5534999999999?text=${encodeURIComponent(message)}`;
    
    confirmationPopup.classList.remove('hidden');
}

function closeConfirmation() {
    confirmationPopup.classList.add('hidden');
    resetForm();
}

function resetForm() {
    // Resetar todas as seções
    servicosSelecionados = [];
    servicosFormContainer.innerHTML = '';
    document.getElementById('clienteForm').reset();
    agendamentoForm.reset();
    
    // Voltar para o início
    confirmationPopup.classList.add('hidden');
    agendamentoSection.classList.add('hidden');
    clienteFormSection.classList.add('hidden');
    servicosFormSection.classList.add('hidden');
    servicosSection.classList.remove('hidden');
    
    // Resetar seleção de serviços
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
        card.querySelector('.btn-select-service').textContent = 'Adicionar';
    });
    
    document.getElementById('nextStep1').style.display = 'none';
    updateSelectedServicesCount();
    updateProgressBar(1);
}

// ==========================================================================
// 8. BARRA DE PROGRESSO
// ==========================================================================

function updateProgressBar(step) {
    progressSteps.forEach((progressStep, index) => {
        if (index + 1 < step) {
            progressStep.classList.add('completed');
            progressStep.classList.remove('active');
        } else if (index + 1 === step) {
            progressStep.classList.add('active');
            progressStep.classList.remove('completed');
        } else {
            progressStep.classList.remove('active', 'completed');
        }
    });
}

// ==========================================================================
// 9. PROMOÇÕES (FUNÇÃO VAZIA - IMPLEMENTAR CONFORME NECESSÁRIO)
// ==========================================================================

function loadPromocoes() {
    // Implementar carregamento de promoções se necessário
}

// ==========================================================================
// FIM DO ARQUIVO
// ==========================================================================
