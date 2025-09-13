// admin.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Painel de Administração carregado.");

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Função para exibir a aba ativa
    function showTab(tabId) {
        console.log(`Exibindo aba: ${tabId}`);
        // Esconde todas as abas de conteúdo
        tabPanes.forEach(pane => {
            pane.classList.add('hidden');
        });

        // Remove a classe 'active' de todos os botões de aba
        tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Mostra a aba de conteúdo selecionada
        const activePane = document.getElementById(tabId);
        if (activePane) {
            activePane.classList.remove('hidden');
        }

        // Marca o botão de aba correspondente como ativo
        const activeTabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (activeTabButton) {
            activeTabButton.classList.add('active');
        }
    }

    // Adiciona listeners para os botões de aba
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTab(tabId);
        });
    });

    // Exibe a primeira aba por padrão ao carregar a página
    const firstTabId = tabButtons[0].getAttribute('data-tab');
    showTab(firstTabId);

    // --- Simulação de Funções Administrativas ---

    // Exemplo: Adicionar um novo serviço (simulado)
    const addServiceForm = document.getElementById('addServiceForm'); // Assumindo que exista um formulário no HTML
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const serviceName = document.getElementById('newServiceName').value;
            const servicePrice = document.getElementById('newServicePrice').value;
            console.log(`Tentando adicionar novo serviço: ${serviceName} (R$ ${servicePrice})`);
            // Aqui iria a lógica para adicionar o serviço (salvar em um mock ou BD)
            alert(`Serviço "${serviceName}" adicionado (simulado).`);
            addServiceForm.reset(); // Limpa o formulário
        });
    }

    // Exemplo: Listar agendamentos (simulado)
    function listAppointments() {
        console.log("Listando agendamentos...");
        // Mock de dados de agendamentos
        const appointments = [
            { id: 1, cliente: "Maria Silva", servico: "Instalação Ar Condicionado", data: "2023-10-26", status: "concluído" },
            { id: 2, cliente: "João Pereira", servico: "Limpeza Ar Condicionado", data: "2023-10-27", status: "pendente" },
            { id: 3, cliente: "Ana Souza", servico: "Conserto Ar Condicionado", data: "2023-10-28", status: "cancelado" }
        ];

        const appointmentsListDiv = document.getElementById('appointmentsList'); // Assumindo que exista um div para a lista
        if (appointmentsListDiv) {
            appointmentsListDiv.innerHTML = ''; // Limpa lista anterior
            appointments.forEach(appt => {
                const apptCard = document.createElement('div');
                apptCard.className = `card booking-card booking-${appt.status}`;
                apptCard.innerHTML = `
                    <div class="card-body">
                        <h5 class="card-title">${appt.servico}</h5>
                        <p class="card-text">Cliente: ${appt.cliente}</p>
                        <p class="card-text">Data: ${appt.data}</p>
                        <span class="badge badge-${appt.status}">${appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}</span>
                        <div style="margin-top: 10px;">
                            <button class="btn btn-warning btn-sm">Editar</button>
                            <button class="btn btn-danger btn-sm">Cancelar</button>
                        </div>
                    </div>
                `;
                appointmentsListDiv.appendChild(apptCard);
            });
            console.log(`Listados ${appointments.length} agendamentos.`);
        }
    }
    
    // Chamada para listar agendamentos ao carregar a página de admin (ou a aba específica)
    // listAppointments(); // Descomente se quiser que a lista apareça automaticamente
});
