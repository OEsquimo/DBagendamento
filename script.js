/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 11.0 (Sistema de carrossel para múltiplos equipamentos por serviço)
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
            equipamentos: [{}] // Array para armazenar múltiplos equipamentos
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
        if (servicosSelecionados.length > 0) {
            nextButton.style.display = 'block';
        } else {
            nextButton.style.display = 'none';
        }
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
                <div class="carousel-slides">
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
    const currentIndex = Array.from(slides).findIndex(slide => slide.style.transform === 'translateX(0px)');
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
    
    const currentIndex = Array.from(slides).findIndex(slide => slide.style.transform === 'translateX(0px)');
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
        slides[index].remove();
        
        // Reindexar slides restantes
        carousel.querySelectorAll('.carousel-slide').forEach((slide, newIndex) => {
            slide.dataset.index = newIndex;
            slide.querySelectorAll('select, input, textarea').forEach(field => {
                field.dataset.index = newIndex;
            });
        });
        
        // Atualizar navegação
        updateCarouselNavigation(serviceKey);
        
        // Esconder botão remover se só tiver um slide
        if (slides.length === 2) { // 2 porque um já foi removido
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
    
    // Atualizar no array de serviços selecionados
    service.precoCalculado = totalServico;
}

function
