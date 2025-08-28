function selecionarServico(servicoId, elemento) {
    const servico = servicosDisponiveis.find(s => s.id === servicoId);
    const index = appState.servicosSelecionados.findIndex(s => s.id === servicoId);

    if (index === -1) {
        // Adicionar serviço
        appState.servicosSelecionados.push({
            ...servico,
            quantidade: 1,
            equipamentos: [{
                tipoEquipamento: "",
                capacidadeBtus: "",
                parteEletricaPronta: "Não",
                observacoes: ""
            }]
        });

        elemento.classList.add('selected');
        
        // Rola a página para o botão "Próximo"
        elementos.btnNextToEquipamentos.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
    } else {
        // Remover serviço
        appState.servicosSelecionados.splice(index, 1);
        elemento.classList.remove('selected');
    }

    // Se há serviços selecionados, habilitar próximo passo
    elementos.btnNextToEquipamentos.disabled = appState.servicosSelecionados.length === 0;

    // Se voltando da tela de equipamentos, renderizar novamente
    if (appState.passoAtual === 2) {
        renderizarEquipamentos();
    }
}
