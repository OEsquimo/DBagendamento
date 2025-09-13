// carousel.js

export class ServiceCarousel {
    constructor(containerId, serviceDataArray) {
        this.containerId = containerId;
        // Assumimos que serviceDataArray contém um único objeto de serviço para este carrossel
        this.serviceData = serviceDataArray[0]; 
        this.carouselElement = document.getElementById(containerId);
        this.track = null; // Será selecionado após a inicialização do HTML
        this.prevBtn = null;
        this.nextBtn = null;
        this.slideCounter = null;

        this.slidesElements = []; // Array para guardar os elementos DOM dos slides
        this.currentIndex = 0; // Índice do slide atual visível
        this.totalBudget = 0; // Orçamento total deste carrossel específico
        this.slideCount = 0; // Contador para os slides individuais dentro deste carrossel
    }

    init() {
        if (!this.carouselElement) {
            console.error(`Elemento contêiner não encontrado para o ID: ${this.containerId}`);
            return;
        }
        this.carouselElement.innerHTML = this.generateCarouselHTML(); // Gera o HTML inicial do carrossel
        
        // Re-seleciona os elementos após a renderização do HTML
        this.track = this.carouselElement.querySelector('.carousel-track');
        this.prevBtn = this.carouselElement.querySelector('.nav-btn.prev');
        this.nextBtn = this.carouselElement.querySelector('.nav-btn.next');
        this.slideCounter = this.carouselElement.querySelector('.carousel-navigation #slideCounter');

        this.addSlideForService(); // Adiciona o primeiro slide (equipamento/detalhe)
        this.addEventListeners();
        this.updateCarouselDisplay();
        this.updateTotalBudget(); // Calcula o orçamento inicial
        console.log(`Carrossel para o serviço "${this.serviceData.nome}" inicializado.`);
    }

    generateCarouselHTML() {
        // HTML base para um carrossel de serviço específico
        return `
            <h3>${this.serviceData.nome}</h3>
            <div class="carousel-track">
                </div>
            <div class="carousel-navigation">
                <button class="nav-btn prev" disabled>&lt;</button>
                <span id="slideCounter"></span>
                <button class="nav-btn next" disabled>&gt;</button>
            </div>
            ${this.serviceData.temEquipamentos ? `
                <div class="add-equipment-container">
                    <button class="btn btn-success add-equipment-btn">Adicionar Outro Equipamento/Item</button>
                </div>
            ` : ''}
        `;
    }

    addSlideForService(slideData = null) {
        this.slideCount++;
        const slideIndex = this.slideCount;
        const isFirstSlide = this.slideCount === 1;
        const slideHTML = this.generateSlideHTML(slideIndex, isFirstSlide, slideData);
        this.track.insertAdjacentHTML('beforeend', slideHTML);
        
        this.updateSlidesArray(); // Atualiza o array de elementos dos slides
        this.addSlideEventListeners(slideIndex); // Adiciona listeners para os novos campos deste slide
        this.updateCarouselDisplay(); // Atualiza botões de navegação e contador
        this.updateTotalBudget(); // Recalcula o total após adicionar um slide
        console.log(`Slide ${slideIndex} adicionado para o serviço "${this.serviceData.nome}".`);
    }

    generateSlideHTML(slideIndex, isFirstSlide, slideData = null) {
        // Gera o HTML para um único slide (equipamento/detalhe)
        let nomeEquipamento = '';
        let valorEquipamento = 0;
        let quantidade = 1;
        let observacoes = '';

        if (slideData) {
            // Dados pré-existentes (útil se reestruturarmos o sistema para carregar dados salvos)
            nomeEquipamento = slideData.nomeEquipamento || '';
            valorEquipamento = slideData.valorEquipamento || 0;
            quantidade = slideData.quantidade || 1;
            observacoes = slideData.observacoes || '';
        } else if (isFirstSlide && this.serviceData.temEquipamentos && this.serviceData.equipamentos && this.serviceData.equipamentos.length > 0) {
            // Preencher com o primeiro equipamento se for o primeiro slide e tiver equipamentos pré-definidos
            nomeEquipamento = this.serviceData.equipamentos[0].nome;
            valorEquipamento = this.serviceData.equipamentos[0].valor;
        } else if (isFirstSlide && !this.serviceData.temEquipamentos) {
             // Para serviços sem equipamentos, usa o preço base como valor unitário inicial
            valorEquipamento = this.serviceData.precoBase;
        }

        // Formata o valor do equipamento para exibição (se aplicável)
        const formattedValorEquipamento = valorEquipamento > 0 ? `(R$ ${valorEquipamento.toFixed(2)})` : '';

        return `
            <div class="carousel-item" data-slide-index="${slideIndex}">
                ${this.slideCount > 1 ? `<button class="btn btn-danger btn-sm remove-equipment-btn">Remover</button>` : ''}
                <h4>${this.serviceData.temEquipamentos ? `Item ${slideIndex}` : 'Detalhes do Serviço'}</h4>
                
                ${this.serviceData.temEquipamentos ? `
                    <div class="form-group">
                        <label for="equipment-name-${slideIndex}">Equipamento:</label>
                        <select id="equipment-name-${slideIndex}" class="form-control equipment-name-select" data-slide-index="${slideIndex}">
                            ${this.serviceData.equipamentos.map(eq => 
                                `<option value="${eq.nome}" data-price="${eq.valor}" ${nomeEquipamento === eq.nome ? 'selected' : ''}>
                                    ${eq.nome} ${eq.valor !== undefined ? `(R$ ${eq.valor.toFixed(2)})` : ''}
                                </option>`).join('')}
                        </select>
                    </div>
                ` : `
                    <div class="form-group">
                        <label for="service-base-price-${slideIndex}">Preço Base:</label>
                        <input type="text" id="service-base-price-${slideIndex}" class="form-control base-price-input" value="R$ ${valorEquipamento.toFixed(2)}" readonly data-slide-index="${slideIndex}">
                    </div>
                `}

                <div class="form-group">
                    <label for="quantity-${slideIndex}">Quantidade:</label>
                    <div class="quantity-control">
                        <button class="btn btn-sm quantity-btn" data-action="decrease" type="button">-</button>
                        <input type="number" id="quantity-${slideIndex}" class="form-control quantity-input" value="${quantidade}" min="1" data-slide-index="${slideIndex}" aria-label="Quantidade do item">
                        <button class="btn btn-sm quantity-btn" data-action="increase" type="button">+</button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="observations-${slideIndex}">Observações:</label>
                    <textarea id="observations-${slideIndex}" class="form-control observations-input" rows="2" data-slide-index="${slideIndex}" aria-label="Observações sobre o item">${observacoes}</textarea>
                </div>
                <div class="slide-price-info">
                    Preço Total do Item: <span class="slide-total-price">R$ ${(valorEquipamento * quantidade).toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    addEventListeners() {
        // Listener para o botão "Adicionar Outro Equipamento"
        const addBtn = this.carouselElement.querySelector('.add-equipment-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addSlideForService());
        }

        // Listeners para navegação do carrossel
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.navigate('prev'));
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.navigate('next'));

        // O listener para remoção de slides é adicionado dinamicamente em addSlideEventListeners
        // caso o slide seja removido e precisemos re-adicionar o botão.
    }

    addSlideEventListeners(slideIndex) {
        const slideElement = this.carouselElement.querySelector(`.carousel-item[data-slide-index="${slideIndex}"]`);
        if (!slideElement) return;

        // Listeners para seleção de equipamento
        const equipmentSelect = slideElement.querySelector('.equipment-name-select');
        if (equipmentSelect) {
            equipmentSelect.addEventListener('change', (e) => this.handleSlideUpdate(e, slideIndex));
        }

        // Listeners para quantidade (input e botões)
        const quantityInput = slideElement.querySelector(`.quantity-input[data-slide-index="${slideIndex}"]`);
        if (quantityInput) {
            quantityInput.addEventListener('input', (e) => this.handleSlideUpdate(e, slideIndex));
        }
        const quantityBtns = slideElement.querySelectorAll('.quantity-btn');
        quantityBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuantityButtonClick(e, slideIndex));
        });

        // Listener para observações
        const observationsTextarea = slideElement.querySelector('.observations-input');
        if (observationsTextarea) {
            observationsTextarea.addEventListener('input', (e) => this.handleSlideUpdate(e, slideIndex));
        }
        
        // Listener para o botão de remover (adicionado se houver mais de um slide)
        const removeBtn = slideElement.querySelector('.remove-equipment-btn');
        if(removeBtn) {
            removeBtn.addEventListener('click', (e) => this.removeSlide(e.target.closest('.carousel-item')));
        }
    }
    
    handleQuantityButtonClick(event, slideIndex) {
        const btn = event.target;
        const quantityControl = btn.closest('.quantity-control');
        const input = quantityControl.querySelector('.quantity-input');
        let currentValue = parseInt(input.value, 10);

        if (btn.dataset.action === 'increase') {
            currentValue++;
        } else if (btn.dataset.action === 'decrease' && currentValue > 1) {
            currentValue--;
        }
        input.value = currentValue;
        this.handleSlideUpdate(event, slideIndex); // Chama a atualização após mudar a quantidade
    }

    handleSlideUpdate(event, slideIndex) {
        const slideElement = this.carouselElement.querySelector(`.carousel-item[data-slide-index="${slideIndex}"]`);
        if (!slideElement) return;

        const equipmentSelect = slideElement.querySelector(`.equipment-name-select[data-slide-index="${slideIndex}"]`);
        const quantityInput = slideElement.querySelector(`.quantity-input[data-slide-index="${slideIndex}"]`);
        const observationsTextarea = slideElement.querySelector(`.observations-input[data-slide-index="${slideIndex}"]`);
        const slideTotalPriceSpan = slideElement.querySelector('.slide-total-price');

        let selectedEquipmentName = '';
        let valorUnitario = 0;

        if (equipmentSelect) {
            const selectedOption = equipmentSelect.options[equipmentSelect.selectedIndex];
            selectedEquipmentName = selectedOption.value;
            valorUnitario = parseFloat(selectedOption.dataset.price) || 0; // Garante que seja um número
        } else {
            // Para serviços sem equipamentos, usa o preço base
            const basePriceInput = slideElement.querySelector('.base-price-input');
            if(basePriceInput) {
                valorUnitario = parseFloat(basePriceInput.value.replace('R$ ', '').replace(',', '.'));
            }
        }

        const quantidade = parseInt(quantityInput.value, 10) || 1; // Garante que seja um número, default 1
        const observacoes = observationsTextarea ? observationsTextarea.value : '';

        const totalPrice = valorUnitario * quantidade;
        slideTotalPriceSpan.textContent = `R$ ${totalPrice.toFixed(2)}`;

        this.updateTotalBudget(); // Atualiza o orçamento deste carrossel
    }

    navigate(direction) {
        const totalItems = this.slidesElements.length;
        if (direction === 'prev') {
            this.currentIndex = Math.max(0, this.currentIndex - 1);
        } else {
            this.currentIndex = Math.min(totalItems - 1, this.currentIndex + 1);
        }
        this.updateCarouselDisplay();
        console.log(`Navegação do carrossel "${this.serviceData.nome}" para o índice: ${this.currentIndex}`);
    }

    updateCarouselDisplay() {
        const totalItems = this.slidesElements.length;

        // Atualiza o contador de slides
        if (this.slideCounter) {
            this.slideCounter.textContent = `${this.currentIndex + 1} / ${totalItems}`;
        }

        // Atualiza visibilidade dos botões de navegação
        if (this.prevBtn) this.prevBtn.disabled = this.currentIndex === 0;
        if (this.nextBtn) this.nextBtn.disabled = this.currentIndex === totalItems - 1;
        
        // Atualiza a posição do carrossel
        const offset = -this.currentIndex * 100; // Move 100% da largura do container
        if (this.track) {
            this.track.style.transform = `translateX(${offset}%)`;
        }
    }
    
    removeSlide(slideElementToRemove) {
        slideElementToRemove.remove(); // Remove do DOM
        console.log(`Slide removido do carrossel "${this.serviceData.nome}".`);

        // Re-indexa os slides e listeners após a remoção
        this.updateSlidesArray();
        this.recalculateIndexesAndListeners();
        this.updateCarouselDisplay();
        this.updateTotalBudget();
    }

    recalculateIndexesAndListeners() {
        const items = Array.from(this.track.children);
        this.slideCount = 0; // Reinicia a contagem para reindexar corretamente

        items.forEach((item, index) => {
            this.slideCount++;
            item.dataset.slideIndex = this.slideCount;
            
            // Atualiza IDs dos elementos internos para manter a consistência
            item.querySelector('.equipment-name-select')?.setAttribute('id', `equipment-name-${this.slideCount}`);
            item.querySelector('.quantity-input')?.setAttribute('id', `quantity-${this.slideCount}`);
            item.querySelector('.observations-input')?.setAttribute('id', `observations-${this.slideCount}`);
            
            // Atualiza os data-slide-index em todos os elementos do slide
            item.querySelectorAll('[data-slide-index]').forEach(el => el.dataset.slideIndex = this.slideCount);

            // Re-adiciona listeners para os elementos atualizados deste slide
            this.addSlideEventListeners(this.slideCount);
        });
        
        // Atualiza botões de remover, se necessário (se restar apenas 1 slide, o botão de remover deve sumir)
        this.carouselElement.querySelectorAll('.remove-equipment-btn').forEach(btn => {
            if (this.slideCount === 1) { // Se restou apenas um slide
                btn.remove(); // Remove o botão de remover deste slide
            }
        });
    }

    updateSlidesArray() {
        this.slidesElements = Array.from(this.track.children);
        this.currentIndex = 0; // Reseta o índice para o início após atualizações de slides
        console.log(`Array de slides atualizado. Total: ${this.slidesElements.length}`);
    }

    // Coleta os dados detalhados de todos os slides neste carrossel
    getDetailedServices() {
        const detailedItems = [];
        const items = Array.from(this.track.children);
        
        items.forEach(item => {
            const slideIndex = parseInt(item.dataset.slideIndex, 10);
            const equipmentSelect = item.querySelector(`.equipment-name-select[data-slide-index="${slideIndex}"]`);
            const quantityInput = item.querySelector(`.quantity-input[data-slide-index="${slideIndex}"]`);
            const observationsTextarea = item.querySelector(`.observations-input[data-slide-index="${slideIndex}"]`);
            const slideTotalPriceSpan = item.querySelector('.slide-total-price');

            let nomeItem = this.serviceData.nome; // Padrão: nome do serviço
            let valorUnitario = 0;
            let precoTotalItem = 0;

            if (equipmentSelect) {
                const selectedOption = equipmentSelect.options[equipmentSelect.selectedIndex];
                nomeItem = selectedOption.value; // Nome específico do equipamento
                valorUnitario = parseFloat(selectedOption.dataset.price) || 0;
            } else {
                // Para serviços sem equipamentos, usa o preço base
                const basePriceInput = item.querySelector('.base-price-input');
                if(basePriceInput) {
                    valorUnitario = parseFloat(basePriceInput.value.replace('R$ ', '').replace(',', '.'));
                }
            }

            const quantidade = parseInt(quantityInput.value, 10) || 1; // Garante quantidade válida
            const observacoes = observationsTextarea ? observationsTextarea.value.trim() : '';

            precoTotalItem = valorUnitario * quantidade;

            detailedItems.push({
                serviceKey: this.serviceData.key, // Chave do serviço principal
                nomeServico: this.serviceData.nome, // Nome do serviço principal
                nomeItem: nomeItem, // Nome específico do item/equipamento, ou nome do serviço se não houver item específico
                quantidade: quantidade,
                valorUnitario: valorUnitario,
                precoTotalItem: precoTotalItem,
                observacoes: observacoes
            });
        });
        return detailedItems;
    }

    // Valida os campos deste carrossel
    validateFields() {
        let isValid = true;
        const items = Array.from(this.track.children);
        
        items.forEach(item => {
            const slideIndex = parseInt(item.dataset.slideIndex, 10);
            const equipmentSelect = item.querySelector(`.equipment-name-select[data-slide-index="${slideIndex}"]`);
            const quantityInput = item.querySelector(`.quantity-input[data-slide-index="${slideIndex}"]`);
            
            // Remover classes de erro antigas para re-validar
            item.classList.remove('error');
            if (equipmentSelect) equipmentSelect.classList.remove('error');
            if (quantityInput) quantityInput.classList.remove('error');

            let slideIsValid = true;

            // Validação para equipamentos (se aplicável)
            if (this.serviceData.temEquipamentos && equipmentSelect && !equipmentSelect.value) {
                slideIsValid = false;
                equipmentSelect.classList.add('error');
                console.warn(`Validação falhou: Selecione um equipamento no slide ${slideIndex} do serviço "${this.serviceData.nome}".`);
            }

            // Validação para quantidade
            const quantidade = parseInt(quantityInput.value, 10);
            if (isNaN(quantidade) || quantidade < 1) {
                slideIsValid = false;
                quantityInput.classList.add('error');
                console.warn(`Validação falhou: Quantidade inválida no slide ${slideIndex} do serviço "${this.serviceData.nome}".`);
            }

            if (!slideIsValid) {
                isValid = false;
                item.classList.add('error'); // Marca o slide inteiro como tendo erro
            }
        });
        return isValid;
    }

    updateTotalBudget() {
        this.totalBudget = 0;
        const items = Array.from(this.track.children);
        items.forEach(item => {
            const slideTotalPriceSpan = item.querySelector('.slide-total-price');
            if (slideTotalPriceSpan) {
                const price = parseFloat(slideTotalPriceSpan.textContent.replace('R$ ', '').replace(',', '.'));
                if (!isNaN(price)) {
                    this.totalBudget += price;
                }
            }
        });
        // Chama a função global para atualizar o display geral do orçamento
        if (typeof updateTotalBudget === 'function') {
             updateTotalBudget(); 
        }
        // console.log(`Orçamento do carrossel "${this.serviceData.nome}" atualizado: R$ ${this.totalBudget.toFixed(2)}`);
    }
}
