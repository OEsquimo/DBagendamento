/*
 * Arquivo: script.js
 * Descrição: Lógica principal para a interface do cliente e agendamento.
 * Versão: 12.1 (Correções no carrossel, quantidade e botões)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ... (Configuração Firebase e Variáveis Globais permanecem as mesmas) ...

// Elementos do DOM (adicionados)
const selectedTimeInput = document.getElementById('selectedTime'); // Necessário para o formulário de agendamento

// ==========================================================================
// 2. FUNÇÕES DE INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    setupEventListeners();
    updateProgressBar(1);
    setupPhoneMask();
    loadPromocoes(); // Mantido, mas funcionalidade de promoções no cliente não implementada aqui
});

// ... (loadAllData, loadConfig, loadServices permanecem as mesmas) ...

// ==========================================================================
// 3. ETAPA 1: SELEÇÃO DE SERVIÇOS
// ==========================================================================

// ... (createServiceCard, updateSelectedServicesCount permanecem as mesmas) ...

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
        // Inicializa equipamentos se não existirem
        if (!service.equipamentos || service.equipamentos.length === 0) {
            service.equipamentos = [{ quantidade: 1, preco: service.precoBase || 0 }]; // Começa com um equipamento
        }

        const carouselDiv = document.createElement('div');
        carouselDiv.className = 'service-carousel';
        carouselDiv.dataset.key = service.key;

        carouselDiv.innerHTML = `
            <h3>${service.nome}</h3>
            <div class="carousel-container">
                <div class="carousel-slides" data-key="${service.key}">
                    ${service.equipamentos.map((equip, index) => `
                        <div class="carousel-slide" data-index="${index}" data-equip-key="${index}">
                            <div class="form-group">
                                <label>Quantidade</label>
                                <input type="number" class="form-control equipment-quantity" value="${equip.quantidade || 1}" min="1" required>
                            </div>
                            ${generateEquipmentFields(service, index)}
                            <div class="equipment-price">Valor: R$ ${calculateEquipmentPrice(service, index).toFixed(2)}</div>
                            <button type="button" class="btn btn-danger remove-equipment-btn" style="${index === 0 ? 'display: none;' : 'display: block;'}">
                                ❌ Remover Equipamento
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="carousel-navigation">
                    <button type="button" class="carousel-btn prev-btn" disabled>← Anterior</button>
                    <span class="carousel-counter">Equipamento 1 de ${service.equipamentos.length}</span>
                    <button type="button" class="carousel-btn next-btn" disabled>Próximo →</button>
                </div>
            </div>
            <button type="button" class="btn btn-secondary add-equipment-btn" data-key="${service.key}">
                ➕ Adicionar outro equipamento
            </button>
            <div class="service-total">Total do serviço: R$ ${service.equipamentos.reduce((sum, equip, idx) => sum + calculateEquipmentPrice(service, idx), 0).toFixed(2)}</div>
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
            // Verifica se o campo é do tipo 'select' e se é para BTUs (ou similar que tem preço)
            const isPriceField = field.tipo === 'select' && field.opcoes && !field.opcoes.every(opt => opt.includes(', R$ 0.00'));

            if (field.tipo === 'select') {
                return `
                    <div class="form-group">
                        <label>${field.nome}</label>
                        <select class="form-control additional-field-select ${isPriceField ? 'price-field' : ''}" 
                                data-field-name="${field.nome}" 
                                data-key="${service.key}" 
                                data-index="${index}" 
                                data-is-price-field="${isPriceField}"
                                required>
                            <option value="">Selecione...</option>
                            ${field.opcoes.map(option => {
                                const optionParts = option.split(', R$ ');
                                const optionValue = optionParts[0];
                                const optionPrice = optionParts.length > 1 ? parseFloat(optionParts[1].replace('R$ ', '')) : 0;
                                return `<option value="${optionValue}" data-price="${optionPrice}">${optionValue}</option>`;
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
    // Remover listeners antigos para evitar duplicação ao re-renderizar
    document.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-textarea, .equipment-quantity, .add-equipment-btn, .remove-equipment-btn, .prev-btn, .next-btn')
        .forEach(el => {
            el.replaceWith(el.cloneNode(true)); // Remove e recria para limpar listeners
        });

    document.querySelectorAll('.additional-field-select, .additional-field-input, .additional-field-textarea')
        .forEach(field => {
            field.addEventListener('change', updatePriceForServiceWrapper);
            field.addEventListener('input', updatePriceForServiceWrapper); // Para inputs numéricos e de texto
        });

    document.querySelectorAll('.equipment-quantity').forEach(input => {
        input.addEventListener('input', updateQuantityWrapper);
    });

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
                newSlide.dataset.equipKey = newIndex; // Nova propriedade para identificar equipamento único
                newSlide.innerHTML = `
                    <div class="form-group">
                        <label>Quantidade</label>
                        <input type="number" class="form-control equipment-quantity" value="1" min="1" required>
                    </div>
                    ${generateEquipmentFields(service, newIndex)}
                    <div class="equipment-price">Valor: R$ 0.00</div>
                    <button type="button" class="btn btn-danger remove-equipment-btn">
                        ❌ Remover Equipamento
                    </button>
                `;

                slidesContainer.appendChild(newSlide);

                // Adicionar eventos aos novos campos
                newSlide.querySelectorAll('select, input, textarea').forEach(field => {
                    field.addEventListener('change', updatePriceForServiceWrapper);
                    field.addEventListener('input', updatePriceForServiceWrapper);
                });
                newSlide.querySelector('.equipment-quantity').addEventListener('input', updateQuantityWrapper);

                // Adicionar evento ao botão remover
                newSlide.querySelector('.remove-equipment-btn').addEventListener('click', () => removeEquipment(serviceKey, newIndex));

                // Atualizar navegação e botões de remover
                updateCarouselNavigation(serviceKey);
                updateAllRemoveButtonsVisibility(serviceKey); // Garante que todos os botões remove sejam visíveis se > 1 slide

                // Adicionar novo equipamento ao array do serviço
                if (!service.equipamentos) service.equipamentos = [];
                service.equipamentos.push({ quantidade: 1, preco: 0 });

                updatePriceForService(serviceKey); // Atualiza o total do serviço
                updateOrcamentoTotal(); // Atualiza o orçamento geral
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

    // Event listener para o botão remover (agora aplicado a todos os botões dinamicamente)
    document.querySelectorAll('.remove-equipment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const serviceKey = e.target.closest('.service-carousel').dataset.key;
            const slideIndex = parseInt(e.target.closest('.carousel-slide').dataset.index);
            removeEquipment(serviceKey, slideIndex);
        });
    });
}

function navigateCarousel(serviceKey, direction) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const slidesContainer = carousel.querySelector('.carousel-slides');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const currentSlide = slidesContainer.querySelector('.carousel-slide:not([style*="transform"])'); // Encontra o slide visível
    let currentIndex = currentSlide ? Array.from(slides).indexOf(currentSlide) : 0;

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

    const currentSlide = carousel.querySelector('.carousel-slides').style.transform.includes('translateX(0px)') ?
                         carousel.querySelector('.carousel-slide[data-index="0"]') :
                         carousel.querySelector(`.carousel-slide[style*="transform"]`); // Tentativa de achar o slide atual

    let currentIndex = 0;
    if (currentSlide) {
        currentIndex = parseInt(currentSlide.dataset.index);
    } else {
         // Se não encontrar transform, assume o primeiro slide como atual
         slides.forEach((slide, index) => {
            if (slide.style.transform === '' || slide.style.transform.includes('translateX(0px)')) {
                currentIndex = index;
            }
        });
    }


    const totalSlides = slides.length;

    counter.textContent = `Equipamento ${currentIndex + 1} de ${totalSlides}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === totalSlides - 1;
}

function updateAllRemoveButtonsVisibility(serviceKey) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const slides = carousel.querySelectorAll('.carousel-slide');
    const removeBtns = carousel.querySelectorAll('.remove-equipment-btn');

    if (slides.length <= 1) {
        removeBtns.forEach(btn => btn.style.display = 'none');
    } else {
        removeBtns.forEach(btn => btn.style.display = 'block');
    }
}

function removeEquipment(serviceKey, index) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const slidesContainer = carousel.querySelector('.carousel-slides');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const service = servicosSelecionados.find(s => s.key === serviceKey);

    if (slides.length > 1) {
        // Remover o slide e o equipamento correspondente
        slides[index].remove();
        if (service && service.equipamentos) {
            service.equipamentos.splice(index, 1);
        }

        // Reindexar os slides restantes
        carousel.querySelectorAll('.carousel-slide').forEach((slide, newIndex) => {
            slide.dataset.index = newIndex;
            slide.dataset.equipKey = newIndex; // Atualiza o identificador único do equipamento
            slide.querySelectorAll('select, input, textarea').forEach(field => {
                field.dataset.index = newIndex;
            });
        });

        // Reposicionar carrossel se o primeiro slide foi removido
        if (index === 0 && slides.length > 0) {
            slidesContainer.style.transform = 'translateX(0px)';
        } else if (slides.length > 0) {
             // Tenta manter a visualização atual
            const currentTransform = slidesContainer.style.transform;
            const currentOffset = currentTransform ? parseFloat(currentTransform.split('translateX(')[1]) : 0;
            slidesContainer.style.transform = `translateX(${currentOffset}px)`;
        }


        // Atualizar navegação e botões de remover
        updateCarouselNavigation(serviceKey);
        updateAllRemoveButtonsVisibility(serviceKey);

        updatePriceForService(serviceKey);
        updateOrcamentoTotal();
    }
}

function updateQuantityWrapper(e) {
    const quantityInput = e.target;
    const slide = quantityInput.closest('.carousel-slide');
    const serviceKey = slide.dataset.key; // Assumindo que serviceKey está em outro nível, ou ajustando o data-key
    const service = servicosSelecionados.find(s => s.key === serviceKey);
    const equipmentIndex = parseInt(slide.dataset.index);

    if (service && service.equipamentos && service.equipamentos[equipmentIndex]) {
        service.equipamentos[equipmentIndex].quantidade = parseInt(quantityInput.value);
        updatePriceForService(serviceKey);
        updateOrcamentoTotal();
    }
}


function updatePriceForServiceWrapper(e) {
    const field = e.target;
    const slide = field.closest('.carousel-slide');
    const serviceKey = slide.dataset.key;
    const service = servicosSelecionados.find(s => s.key === serviceKey);
    const equipmentIndex = parseInt(slide.dataset.index);

    updatePriceForService(serviceKey);
    updateOrcamentoTotal();
}


function updatePriceForService(serviceKey) {
    const carousel = document.querySelector(`.service-carousel[data-key="${serviceKey}"]`);
    const service = servicosSelecionados.find(s => s.key === serviceKey);
    let totalServico = 0;

    if (!service || !service.equipamentos) return;

    service.equipamentos.forEach((equip, index) => {
        const slide = carousel.querySelector(`.carousel-slide[data-index="${index}"]`);
        if (slide) {
            const equipmentPrice = calculateEquipmentPrice(service, index, slide);
            totalServico += equipmentPrice;
            const equipmentPriceDisplay = slide.querySelector('.equipment-price');
            if(equipmentPriceDisplay) {
                 equipmentPriceDisplay.textContent = `Valor: R$ ${equipmentPrice.toFixed(2)}`;
            }
        }
    });

    const serviceTotalDisplay = carousel.querySelector('.service-total');
    if(serviceTotalDisplay) {
        serviceTotalDisplay.textContent = `Total do serviço: R$ ${totalServico.toFixed(2)}`;
    }
}

function calculateEquipmentPrice(serviceData, equipmentIndex, slideElement) {
    let precoEquipamento = serviceData.precoBase || 0;
    let quantidade = 1; // Padrão

    // Encontrar a quantidade do slide atual
    const quantityInput = slideElement.querySelector('.equipment-quantity');
    if (quantityInput) {
        quantidade = parseInt(quantityInput.value) || 1;
    }

    const selectElements = slideElement.querySelectorAll('.additional-field-select');
    const inputElements = slideElement.querySelectorAll('.additional-field-input');

    selectElements.forEach(select => {
        if (select.value && select.dataset.isPriceField === 'true') {
            const selectedOption = select.options[select.selectedIndex];
            const optionPrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;
            precoEquipamento += optionPrice;
        }
    });

    inputElements.forEach(input => {
        if (input.value) {
            if (input.type === 'number') {
                precoEquipamento += parseFloat(input.value);
            } else {
                // Para campos de texto, podemos definir um custo fixo ou tratar de outra forma se necessário.
                // Por enquanto, campos de texto não adicionam preço diretamente.
            }
        }
    });

    // Armazenar o preço calculado no objeto de equipamento para referência posterior
    if (serviceData.equipamentos && serviceData.equipamentos[equipmentIndex]) {
        serviceData.equipamentos[equipmentIndex].preco = precoEquipamento;
    }

    return precoEquipamento * quantidade;
}


function updateOrcamentoTotal() {
    let total = 0;
    servicosSelecionados.forEach(service => {
        if (service.equipamentos) {
            service.equipamentos.forEach((equip, index) => {
                const carousel = document.querySelector(`.service-carousel[data-key="${service.key}"]`);
                if (carousel) {
                     const slide = carousel.querySelector(`.carousel-slide[data-index="${index}"]`);
                     if(slide) {
                        total += calculateEquipmentPrice(service, index, slide);
                     }
                }
            });
        }
    });

    orcamentoTotalDisplay.textContent = `Total do Orçamento: R$ ${total.toFixed(2)}`;
}

// ==========================================================================
// 5. ETAPA 3: DADOS DO CLIENTE E AGENDAMENTO
// ==========================================================================

function setupEventListeners() {
    // ... (backButton1, backButton2, backButton3 listeners permanecem os mesmos) ...

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
    
    // Valida campos required em select e input
    document.querySelectorAll('.service-carousel .form-group [required]').forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

     // Valida também se o total do serviço é maior que zero (para evitar serviços sem custo)
    document.querySelectorAll('.service-carousel').forEach(carousel => {
        const serviceKey = carousel.dataset.key;
        const service = servicosSelecionados.find(s => s.key === serviceKey);
        if (service && service.equipamentos) {
            const totalServico = service.equipamentos.reduce((sum, equip, index) => {
                const slide = carousel.querySelector(`.carousel-slide[data-index="${index}"]`);
                return sum + calculateEquipmentPrice(service, index, slide);
            }, 0);
            if (totalServico === 0) {
                // Considerar como um erro se o serviço não tiver custo após preenchimento
                // A menos que seja intencional para serviços gratuitos.
                // Por segurança, vamos alertar se o total for 0 após preencher campos.
                // isValid = false;
                // carousel.querySelector('.service-total').classList.add('error');
            } else {
                // carousel.querySelector('.service-total').classList.remove('error');
            }
        }
    });

    return isValid;
}

// ... (validateClienteForm, isValidEmail, setupPhoneMask permanecem as mesmas) ...

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
        } else {
             timeSlotsContainer.innerHTML = '<p>Não há datas disponíveis nos próximos 30 dias.</p>';
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
        
        // Obter configurações de horário do Firebase
        const configSnapshot = await get(ref(database, 'configuracoes'));
        const config = configSnapshot.val();
        const dayOfWeek = new Date(selectedDate).getDay(); // 0 for Sunday, 1 for Monday, etc.
        const diaNome = diasDaSemana[dayOfWeek]; // diasDaSemana array deve estar disponível aqui

        let horariosDisponiveis = [];
        if (config && config.horariosPorDia && config.horariosPorDia[diaNome] && config.horariosPorDia[diaNome].ativo) {
            const diaConfig = config.horariosPorDia[diaNome];
            horariosDisponiveis = generateTimeSlots(diaConfig.horarioInicio, diaConfig.horarioFim, diaConfig.duracaoServico);
        } else {
             // Caso a data selecionada seja domingo ou o dia não esteja ativo na config
             timeSlotsContainer.innerHTML = '<p>Não há horários disponíveis para esta data.</p>';
             return;
        }
        
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

// Helper function to get the day name from the global scope
const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];


function generateTimeSlots(start, end, interval) {
    const slots = [];
    let currentMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    const intervalMinutes = parseInt(interval) || 60; // Usa a duração do serviço

    while (currentMinutes <= endMinutes) {
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
    document.querySelectorAll('.time-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    button.classList.add('selected');
    selectedTimeInput.value = hora; // Atualiza o input escondido
}

datePicker.addEventListener('change', (e) => {
    loadTimeSlots(e.target.value);
});

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
    
    formaPagamento = formaPagamentoSelecionada; // Atualiza a variável global se necessário
    
    try {
        const agendamentoData = {
            cliente: {
                nome: document.getElementById('nome').value.trim(),
                telefone: document.getElementById('telefone').value.trim(),
                endereco: document.getElementById('endereco').value.trim(), // Campo adicionado no HTML
                observacoes: observacoes // Observações do cliente
            },
            servicos: servicosSelecionados.map(service => {
                const carousel = document.querySelector(`.service-carousel[data-key="${service.key}"]`);
                let serviceTotal = 0;
                const equipamentosSelecionados = [];

                if (carousel) {
                    carousel.querySelectorAll('.carousel-slide').forEach((slide, index) => {
                        const quantity = parseInt(slide.querySelector('.equipment-quantity').value) || 1;
                        const precoIndividual = calculateEquipmentPrice(service, index, slide);
                        serviceTotal += precoIndividual;
                        
                        const camposSelecionados = {};
                        slide.querySelectorAll('[data-field-name]').forEach(field => {
                            camposSelecionados[field.dataset.fieldName] = field.value;
                        });

                        equipamentosSelecionados.push({
                            quantidade: quantity,
                            precoCalculadoIndividual: precoIndividual, // Preço por unidade + extras
                            precoTotalEquipamento: precoIndividual * quantity, // Preço total para X unidades
                            campos: camposSelecionados
                        });
                    });
                }
                
                return {
                    nome: service.nome,
                    equipamentos: equipamentosSelecionados,
                    precoCalculado: serviceTotal, // Total do serviço com todos os equipamentos e quantidades
                    // Adicionar campos adicionais selecionados explicitamente se necessário
                    // camposAdicionaisSelecionados: service.equipamentos[0] ? service.equipamentos[0].campos : {} 
                };
            }),
            data: datePicker.value,
            hora: selectedTime,
            formaPagamento: formaPagamento,
            observacoes: observacoes, // Mantendo observações gerais também
            status: 'pendente',
            dataCriacao: new Date().toISOString(),
            total: servicosSelecionados.reduce((total, service) => {
                const carousel = document.querySelector(`.service-carousel[data-key="${service.key}"]`);
                if (carousel) {
                    let serviceTotal = 0;
                    carousel.querySelectorAll('.carousel-slide').forEach((slide, index) => {
                         serviceTotal += calculateEquipmentPrice(service, index, slide);
                    });
                    return total + serviceTotal;
                }
                return total;
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
    
    // Obter número do WhatsApp da configuração
    const configRef = ref(database, 'configuracoes/whatsappNumber');
    get(configRef).then(snapshot => {
        const adminWhatsapp = snapshot.val();
        if (adminWhatsapp) {
            // Atualizar link do WhatsApp
            const message = `Olá! Gostaria de confirmar meu agendamento:\n\n*Cliente:* ${agendamentoData.cliente.nome}\n*Data:* ${dataFormatada}\n*Horário:* ${agendamentoData.hora}\n*Serviços:* ${agendamentoData.servicos.length}\n*Total:* R$ ${total}\n*ID do Agendamento:* ${agendamentoId}`;
            whatsappLink.href = `https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(message)}`;
            document.getElementById('confirmationMessage').style.display = 'block'; // Mostrar link se houver número
        } else {
            document.getElementById('confirmationMessage').style.display = 'none'; // Ocultar se não houver config
        }
    }).catch(error => console.error("Erro ao buscar número do WhatsApp:", error));
    
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
    selectedTimeInput.value = ''; // Limpar o input escondido do horário selecionado
    
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

// ... (updateProgressBar permanece a mesma) ...

// ==========================================================================
// 9. PROMOÇÕES (FUNÇÃO VAZIA - IMPLEMENTAR CONFORME NECESSÁRIO)
// ==========================================================================

function loadPromocoes() {
    // Implementar carregamento de promoções no cliente se necessário
    // Por enquanto, apenas um placeholder.
}

// ==========================================================================
// FIM DO ARQUIVO
// ==========================================================================
