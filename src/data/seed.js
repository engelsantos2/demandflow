// Dados iniciais do DemandFlow. Gerados na primeira execução e persistidos no localStorage.

export function buildSeed() {
  const allModules = [
    'dashboard',
    'demandas',
    'clientes',
    'financeiro',
    'desafios',
    'propostas',
    'servicos',
    'relatorios',
    'configuracoes',
  ]

  const users = [
    {
      id: 'u1',
      name: 'Engel Santos',
      email: 'engel@demandflow.app',
      position: 'Diretor / Founder',
      password: 'admin',
      isAdmin: true,
      permissions: allModules,
      createdAt: '2026-01-04T09:00:00Z',
    },
    {
      id: 'u2',
      name: 'Marina Costa',
      email: 'marina@demandflow.app',
      position: 'Designer Sênior',
      password: 'demandflow',
      isAdmin: false,
      permissions: ['dashboard', 'demandas', 'clientes', 'desafios', 'propostas', 'servicos', 'relatorios'],
      createdAt: '2026-02-12T09:00:00Z',
    },
    {
      id: 'u3',
      name: 'Rafael Lima',
      email: 'rafael@demandflow.app',
      position: 'Desenvolvedor',
      password: 'demandflow',
      isAdmin: false,
      permissions: ['dashboard', 'demandas', 'clientes', 'desafios', 'servicos'],
      createdAt: '2026-03-01T09:00:00Z',
    },
  ]

  const bankAccounts = [
    {
      id: 'ba1',
      name: 'Conta principal',
      bank: 'Banco DemandFlow',
      agency: '0001',
      accountNumber: '12345-6',
      type: 'corrente',
      initialBalance: 5000,
      color: '#00FF85',
      includeInTotal: true,
      notes: 'Conta operacional usada no dia-a-dia.',
      createdAt: '2026-01-01T09:00:00Z',
    },
    {
      id: 'ba2',
      name: 'Reserva (Poupança)',
      bank: 'Banco DemandFlow',
      agency: '0001',
      accountNumber: '12345-7',
      type: 'poupanca',
      initialBalance: 12000,
      color: '#38BDF8',
      includeInTotal: false,
      notes: 'Reserva financeira — não entra no saldo previsto operacional.',
      createdAt: '2026-01-01T09:00:00Z',
    },
    {
      id: 'ba3',
      name: 'Caixa / Dinheiro',
      bank: '—',
      agency: '—',
      accountNumber: '—',
      type: 'caixa',
      initialBalance: 200,
      color: '#FACC15',
      includeInTotal: true,
      notes: '',
      createdAt: '2026-01-01T09:00:00Z',
    },
  ]

  const clients = [
    {
      id: 'c1', name: 'Studio Aurora', responsibleName: 'Camila Aurora',
      email: 'contato@studioaurora.com', phone: '(91) 3221-4500', whatsapp: '(91) 98811-2233',
      document: '32.114.500/0001-09', address: 'Av. Nazaré, 1200', city: 'Belém', state: 'PA',
      notes: 'Cliente recorrente, fecha projetos rápido.', status: 'ativo', createdAt: '2026-01-15T10:00:00Z',
    },
    {
      id: 'c2', name: 'Padaria Pão Quente', responsibleName: 'José Mendes',
      email: 'jose@paoquente.com', phone: '(91) 3344-1010', whatsapp: '(91) 99122-3344',
      document: '12.808.221/0001-55', address: 'Rua das Flores, 88', city: 'Ananindeua', state: 'PA',
      notes: 'Precisa de acompanhamento próximo nas aprovações.', status: 'ativo', createdAt: '2026-02-02T11:30:00Z',
    },
    {
      id: 'c3', name: 'Dra. Helena Nutrição', responsibleName: 'Helena Vasconcelos',
      email: 'helena@nutrihelena.com', phone: '(11) 4002-8922', whatsapp: '(11) 98444-7788',
      document: '455.221.908-30', address: 'Alameda Santos, 455', city: 'São Paulo', state: 'SP',
      notes: 'Foco em presença digital e captação de pacientes.', status: 'ativo', createdAt: '2026-02-20T14:00:00Z',
    },
    {
      id: 'c4', name: 'TechNova Solutions', responsibleName: 'Bruno Carvalho',
      email: 'bruno@technova.io', phone: '(21) 3030-7000', whatsapp: '(21) 99777-1212',
      document: '40.221.118/0001-72', address: 'Rua da Inovação, 300', city: 'Rio de Janeiro', state: 'RJ',
      notes: 'Empresa de SaaS, exige padrão alto de entrega.', status: 'ativo', createdAt: '2026-03-05T09:15:00Z',
    },
    {
      id: 'c5', name: 'Boutique Vivá', responsibleName: 'Patrícia Nunes',
      email: 'patricia@boutiquevia.com', phone: '(85) 3210-4400', whatsapp: '(85) 98123-9090',
      document: '28.991.700/0001-18', address: 'Av. Beira-Mar, 2100', city: 'Fortaleza', state: 'CE',
      notes: 'Interessada em loja virtual completa.', status: 'lead', createdAt: '2026-04-10T16:40:00Z',
    },
    {
      id: 'c6', name: 'Construtora Marcos Lima', responsibleName: 'Marcos Lima',
      email: 'marcos@construtoraml.com', phone: '(91) 3098-2200', whatsapp: '(91) 99655-4433',
      document: '19.554.882/0001-44', address: 'Rod. BR-316, km 8', city: 'Marituba', state: 'PA',
      notes: 'Projeto institucional pausado no início do ano.', status: 'inativo', createdAt: '2025-11-22T08:00:00Z',
    },
  ]

  const services = [
    { id: 's1', name: 'Landing Page', description: 'Página única de alta conversão.', category: 'Web', defaultPrice: 2500, averageDeliveryDays: 10, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
    { id: 's2', name: 'Site institucional', description: 'Site multipágina para apresentar a empresa.', category: 'Web', defaultPrice: 4800, averageDeliveryDays: 21, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
    { id: 's3', name: 'Loja virtual', description: 'E-commerce completo com checkout.', category: 'Web', defaultPrice: 8900, averageDeliveryDays: 35, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
    { id: 's4', name: 'Identidade visual', description: 'Logo, paleta, tipografia e manual de marca.', category: 'Design', defaultPrice: 3200, averageDeliveryDays: 14, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
    { id: 's5', name: 'Design de embalagem', description: 'Projeto gráfico de embalagem de produto.', category: 'Design', defaultPrice: 1900, averageDeliveryDays: 12, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
    { id: 's6', name: 'Consultoria', description: 'Sessão estratégica de marca e digital.', category: 'Estratégia', defaultPrice: 900, averageDeliveryDays: 3, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
    { id: 's7', name: 'Gestão de tráfego', description: 'Gestão mensal de campanhas pagas.', category: 'Marketing', defaultPrice: 1500, averageDeliveryDays: 30, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
    { id: 's8', name: 'Manutenção mensal', description: 'Suporte e atualizações recorrentes.', category: 'Web', defaultPrice: 600, averageDeliveryDays: 30, status: 'ativo', createdAt: '2026-01-05T09:00:00Z' },
  ]

  const mkChecklist = (items) =>
    items.map((it, i) => ({ id: `t${i}_${Math.random().toString(36).slice(2, 6)}`, title: it[0], completed: it[1] }))

  const mkHistory = (events) =>
    events.map((e, i) => ({ id: `h${i}_${Math.random().toString(36).slice(2, 6)}`, date: e[0], text: e[1] }))

  const demands = [
    {
      id: 'd1', clientId: 'c5', title: 'Loja virtual — coleção inverno', description: 'E-commerce completo com catálogo, carrinho e integração de pagamento.',
      serviceId: 's3', value: 8900, startDate: '2026-05-18', dueDate: '2026-06-20', priority: 'media', status: 'entrada',
      responsible: 'u3', tags: ['e-commerce', 'novo cliente'], projectLink: '', notes: 'Aguardando confirmação de escopo final.',
      checklist: mkChecklist([['Levantar requisitos', false], ['Definir plataforma', false], ['Mapear catálogo', false]]),
      comments: [{ id: 'cm1', author: 'Engel Santos', text: 'Cliente quer lançar antes de junho.', date: '2026-05-19T13:20:00Z' }],
      files: [], history: mkHistory([['2026-05-18T10:00:00Z', 'Demanda criada na coluna Entrada']]),
      createdAt: '2026-05-18T10:00:00Z',
    },
    {
      id: 'd2', clientId: 'c2', title: 'Identidade visual — rebranding', description: 'Atualização completa da marca da padaria.',
      serviceId: 's4', value: 3200, startDate: '2026-05-12', dueDate: '2026-05-26', priority: 'alta', status: 'briefing',
      responsible: 'u2', tags: ['branding'], projectLink: '', notes: '',
      checklist: mkChecklist([['Enviar formulário de briefing', true], ['Reunião de alinhamento', false], ['Coletar referências', false]]),
      comments: [{ id: 'cm2', author: 'Marina Costa', text: 'Briefing enviado, aguardando retorno do cliente.', date: '2026-05-14T09:00:00Z' }],
      files: [], history: mkHistory([['2026-05-12T09:00:00Z', 'Demanda criada'], ['2026-05-13T15:00:00Z', 'Movida para Aguardando briefing']]),
      createdAt: '2026-05-12T09:00:00Z',
    },
    {
      id: 'd3', clientId: 'c3', title: 'Landing Page — captação de pacientes', description: 'Página de alta conversão para campanha de tráfego pago.',
      serviceId: 's1', value: 2500, startDate: '2026-05-05', dueDate: '2026-05-24', priority: 'urgente', status: 'producao',
      responsible: 'u3', tags: ['landing', 'tráfego'], projectLink: 'https://preview.demandflow.app/helena', notes: 'Campanha começa dia 25.',
      checklist: mkChecklist([['Wireframe aprovado', true], ['Copywriting', true], ['Desenvolvimento', false], ['Integração de formulário', false]]),
      comments: [{ id: 'cm3', author: 'Rafael Lima', text: 'Estrutura pronta, faltam ajustes de responsividade.', date: '2026-05-20T17:30:00Z' }],
      files: [{ id: 'f1', name: 'wireframe-v2.pdf', size: '1.2 MB' }],
      history: mkHistory([['2026-05-05T09:00:00Z', 'Demanda criada'], ['2026-05-10T11:00:00Z', 'Movida para Em produção']]),
      createdAt: '2026-05-05T09:00:00Z',
    },
    {
      id: 'd4', clientId: 'c1', title: 'Design de embalagem — linha gourmet', description: 'Embalagem para nova linha de produtos premium.',
      serviceId: 's5', value: 1900, startDate: '2026-05-08', dueDate: '2026-05-23', priority: 'alta', status: 'producao',
      responsible: 'u2', tags: ['embalagem'], projectLink: '', notes: '',
      checklist: mkChecklist([['Definir conceito', true], ['Criar mockups', true], ['Aplicar em 3 SKUs', false]]),
      comments: [], files: [],
      history: mkHistory([['2026-05-08T10:00:00Z', 'Demanda criada'], ['2026-05-15T14:00:00Z', 'Movida para Em produção']]),
      createdAt: '2026-05-08T10:00:00Z',
    },
    {
      id: 'd5', clientId: 'c4', title: 'Site institucional — relançamento', description: 'Novo site multipágina com blog e área de carreiras.',
      serviceId: 's2', value: 4800, startDate: '2026-04-20', dueDate: '2026-05-28', priority: 'media', status: 'revisao',
      responsible: 'u3', tags: ['site', 'institucional'], projectLink: 'https://staging.technova.io', notes: 'Revisão de conteúdo com o cliente.',
      checklist: mkChecklist([['Páginas internas', true], ['Blog', true], ['SEO básico', true], ['Revisão final', false]]),
      comments: [{ id: 'cm4', author: 'Engel Santos', text: 'Enviado para revisão do Bruno.', date: '2026-05-19T10:00:00Z' }],
      files: [], history: mkHistory([['2026-04-20T09:00:00Z', 'Demanda criada'], ['2026-05-18T16:00:00Z', 'Movida para Em revisão']]),
      createdAt: '2026-04-20T09:00:00Z',
    },
    {
      id: 'd6', clientId: 'c2', title: 'Cardápio digital', description: 'Cardápio responsivo com QR Code.',
      serviceId: 's1', value: 1400, startDate: '2026-05-02', dueDate: '2026-05-21', priority: 'media', status: 'aprovacao',
      responsible: 'u2', tags: ['landing'], projectLink: '', notes: 'Aguardando aprovação do José.',
      checklist: mkChecklist([['Layout', true], ['Conteúdo', true], ['Publicação', false]]),
      comments: [], files: [],
      history: mkHistory([['2026-05-02T09:00:00Z', 'Demanda criada'], ['2026-05-17T12:00:00Z', 'Movida para Aguardando aprovação']]),
      createdAt: '2026-05-02T09:00:00Z',
    },
    {
      id: 'd7', clientId: 'c1', title: 'Consultoria de marca', description: 'Sessão estratégica de posicionamento.',
      serviceId: 's6', value: 900, startDate: '2026-05-06', dueDate: '2026-05-09', priority: 'baixa', status: 'concluido',
      responsible: 'u1', tags: ['estratégia'], projectLink: '', notes: '',
      checklist: mkChecklist([['Preparar material', true], ['Realizar sessão', true], ['Enviar relatório', true]]),
      comments: [], files: [{ id: 'f2', name: 'relatorio-consultoria.pdf', size: '780 KB' }],
      history: mkHistory([['2026-05-06T09:00:00Z', 'Demanda criada'], ['2026-05-09T18:00:00Z', 'Concluída']]),
      createdAt: '2026-05-06T09:00:00Z',
    },
    {
      id: 'd8', clientId: 'c3', title: 'Gestão de tráfego — maio', description: 'Campanhas de captação no Meta e Google.',
      serviceId: 's7', value: 1500, startDate: '2026-05-01', dueDate: '2026-05-15', priority: 'media', status: 'concluido',
      responsible: 'u1', tags: ['tráfego'], projectLink: '', notes: '',
      checklist: mkChecklist([['Configurar campanhas', true], ['Otimizar', true], ['Relatório mensal', true]]),
      comments: [], files: [],
      history: mkHistory([['2026-05-01T09:00:00Z', 'Demanda criada'], ['2026-05-15T17:00:00Z', 'Concluída']]),
      createdAt: '2026-05-01T09:00:00Z',
    },
    {
      id: 'd9', clientId: 'c4', title: 'Landing Page — webinar', description: 'Página de inscrição para evento online.',
      serviceId: 's1', value: 2200, startDate: '2026-04-10', dueDate: '2026-04-22', priority: 'alta', status: 'concluido',
      responsible: 'u3', tags: ['landing', 'evento'], projectLink: '', notes: '',
      checklist: mkChecklist([['Layout', true], ['Integração', true], ['Publicação', true]]),
      comments: [], files: [],
      history: mkHistory([['2026-04-10T09:00:00Z', 'Demanda criada'], ['2026-04-22T16:00:00Z', 'Concluída']]),
      createdAt: '2026-04-10T09:00:00Z',
    },
    {
      id: 'd10', clientId: 'c6', title: 'Site institucional — construtora', description: 'Projeto pausado pelo cliente.',
      serviceId: 's2', value: 4800, startDate: '2026-02-01', dueDate: '2026-03-15', priority: 'baixa', status: 'cancelado',
      responsible: 'u3', tags: ['site'], projectLink: '', notes: 'Cliente adiou o investimento.',
      checklist: mkChecklist([['Briefing', true], ['Wireframe', false]]),
      comments: [], files: [],
      history: mkHistory([['2026-02-01T09:00:00Z', 'Demanda criada'], ['2026-03-20T10:00:00Z', 'Cancelada']]),
      createdAt: '2026-02-01T09:00:00Z',
    },
    {
      id: 'd11', clientId: 'c1', title: 'Manutenção mensal do site', description: 'Atualizações e backup do site institucional.',
      serviceId: 's8', value: 600, startDate: '2026-05-01', dueDate: '2026-05-31', priority: 'baixa', status: 'producao',
      responsible: 'u3', tags: ['manutenção'], projectLink: '', notes: '',
      checklist: mkChecklist([['Backup', true], ['Atualizar plugins', false]]),
      comments: [], files: [],
      history: mkHistory([['2026-05-01T09:00:00Z', 'Demanda criada']]),
      createdAt: '2026-05-01T09:00:00Z',
    },
    {
      id: 'd12', clientId: 'c2', title: 'Posts para redes sociais', description: 'Pacote de 12 artes para o feed.',
      serviceId: 's5', value: 1200, startDate: '2026-05-19', dueDate: '2026-05-30', priority: 'media', status: 'entrada',
      responsible: 'u2', tags: ['social'], projectLink: '', notes: '',
      checklist: mkChecklist([['Definir linha editorial', false]]),
      comments: [], files: [],
      history: mkHistory([['2026-05-19T09:00:00Z', 'Demanda criada']]),
      createdAt: '2026-05-19T09:00:00Z',
    },
  ]

  const proposals = [
    {
      id: 'p1', number: 1, clientId: 'c5', title: 'Loja virtual completa', description: 'Proposta para e-commerce da coleção inverno.',
      scope: 'Desenvolvimento de loja virtual responsiva.', includedItems: 'Catálogo, carrinho, checkout, integração de pagamento.',
      excludedItems: 'Produção de fotos, redação de descrições.', deliveryTime: '35 dias úteis', totalValue: 8900,
      paymentTerms: '50% na aprovação, 50% na entrega', installments: 2, expirationDate: '2026-06-05',
      status: 'enviada', publicToken: 'pf_5a91c2', createdAt: '2026-05-15T10:00:00Z',
    },
    {
      id: 'p2', number: 2, clientId: 'c3', title: 'Landing Page de captação', description: 'Página para campanha de tráfego pago.',
      scope: 'Landing page de alta conversão.', includedItems: 'Layout, copy, desenvolvimento, integração.',
      excludedItems: 'Gestão de tráfego.', deliveryTime: '10 dias úteis', totalValue: 2500,
      paymentTerms: 'À vista no PIX', installments: 1, expirationDate: '2026-05-01',
      status: 'aprovada', publicToken: 'pf_2b73e1', createdAt: '2026-04-18T09:00:00Z',
    },
  ]

  const proposalItems = [
    { id: 'pi1', proposalId: 'p1', name: 'Desenvolvimento da loja', description: 'Plataforma e-commerce completa', quantity: 1, unitPrice: 7400, totalPrice: 7400 },
    { id: 'pi2', proposalId: 'p1', name: 'Configuração de pagamento', description: 'Integração com gateway', quantity: 1, unitPrice: 1500, totalPrice: 1500 },
    { id: 'pi3', proposalId: 'p2', name: 'Landing Page', description: 'Página única de conversão', quantity: 1, unitPrice: 2500, totalPrice: 2500 },
  ]

  const financialEntries = [
    { id: 'fe1', clientId: 'c3', demandId: 'd3', proposalId: 'p2', type: 'receita', description: 'Landing Page — captação de pacientes', category: 'Serviços prestados', value: 2500, dueDate: '2026-05-25', paymentDate: '', status: 'pendente', paymentMethod: 'PIX', isRecurring: false, notes: '', createdAt: '2026-04-20T09:00:00Z' },
    { id: 'fe2', clientId: 'c1', demandId: 'd7', proposalId: '', type: 'receita', description: 'Consultoria de marca', category: 'Serviços prestados', value: 900, dueDate: '2026-05-09', paymentDate: '2026-05-09', status: 'recebido', paymentMethod: 'PIX', isRecurring: false, notes: '', createdAt: '2026-05-06T09:00:00Z' },
    { id: 'fe3', clientId: 'c3', demandId: 'd8', proposalId: '', type: 'receita', description: 'Gestão de tráfego — maio', category: 'Serviços prestados', value: 1500, dueDate: '2026-05-10', paymentDate: '', status: 'pendente', paymentMethod: 'Boleto', isRecurring: true, recurrenceGroupId: 'rg_traf_helena', notes: 'Recebimento mensal.', createdAt: '2026-05-01T09:00:00Z' },
    { id: 'fe4', clientId: 'c2', demandId: 'd2', proposalId: '', type: 'receita', description: 'Identidade visual — entrada', category: 'Serviços prestados', value: 1600, dueDate: '2026-05-15', paymentDate: '2026-05-14', status: 'recebido', paymentMethod: 'PIX', isRecurring: false, notes: '', createdAt: '2026-05-12T09:00:00Z' },
    { id: 'fe5', clientId: 'c4', demandId: 'd9', proposalId: '', type: 'receita', description: 'Landing Page — webinar', category: 'Serviços prestados', value: 2200, dueDate: '2026-04-22', paymentDate: '2026-04-23', status: 'recebido', paymentMethod: 'Transferência', isRecurring: false, notes: '', createdAt: '2026-04-10T09:00:00Z' },
    { id: 'fe6', clientId: 'c4', demandId: 'd5', proposalId: '', type: 'receita', description: 'Site institucional — 1ª parcela', category: 'Serviços prestados', value: 2400, dueDate: '2026-05-28', paymentDate: '', status: 'pendente', paymentMethod: 'Boleto', isRecurring: false, notes: '', createdAt: '2026-04-20T09:00:00Z' },
    { id: 'fe7', clientId: '', demandId: '', proposalId: '', type: 'despesa', description: 'Assinatura Adobe Creative Cloud', category: 'Assinaturas', value: 320, dueDate: '2026-05-10', paymentDate: '2026-05-09', status: 'pago', paymentMethod: 'Cartão de crédito', isRecurring: true, recurrenceGroupId: 'rg_adobe', notes: '', createdAt: '2026-05-01T09:00:00Z' },
    { id: 'fe8', clientId: '', demandId: '', proposalId: '', type: 'despesa', description: 'Hospedagem e domínios', category: 'Ferramentas', value: 180, dueDate: '2026-05-12', paymentDate: '2026-05-12', status: 'pago', paymentMethod: 'Cartão de crédito', isRecurring: true, recurrenceGroupId: 'rg_host', notes: '', createdAt: '2026-05-01T09:00:00Z' },
    { id: 'fe9', clientId: '', demandId: 'd3', proposalId: '', type: 'despesa', description: 'Verba de tráfego pago — campanha Helena', category: 'Tráfego pago', value: 800, dueDate: '2026-05-20', paymentDate: '', status: 'pendente', paymentMethod: 'Cartão de crédito', isRecurring: false, notes: '', createdAt: '2026-05-05T09:00:00Z' },
    { id: 'fe10', clientId: '', demandId: 'd1', proposalId: '', type: 'despesa', description: 'Freelancer — desenvolvimento loja', category: 'Freelancer', value: 1800, dueDate: '2026-05-30', paymentDate: '', status: 'pendente', paymentMethod: 'PIX', isRecurring: false, notes: '', createdAt: '2026-05-18T09:00:00Z' },
    { id: 'fe11', clientId: '', demandId: '', proposalId: '', type: 'despesa', description: 'Impostos — Simples Nacional', category: 'Impostos', value: 640, dueDate: '2026-05-20', paymentDate: '', status: 'pendente', paymentMethod: 'Boleto', isRecurring: true, recurrenceGroupId: 'rg_impostos', notes: '', createdAt: '2026-05-05T09:00:00Z' },
    { id: 'fe12', clientId: '', demandId: '', proposalId: '', type: 'despesa', description: 'Notebook — equipamento novo', category: 'Equipamentos', value: 4200, dueDate: '2026-04-15', paymentDate: '2026-04-15', status: 'pago', paymentMethod: 'Cartão de crédito', isRecurring: false, notes: '', createdAt: '2026-04-15T09:00:00Z' },
    { id: 'fe13', clientId: 'c1', demandId: 'd4', proposalId: '', type: 'receita', description: 'Design de embalagem — linha gourmet', category: 'Serviços prestados', value: 1900, dueDate: '2026-06-05', paymentDate: '', status: 'pendente', paymentMethod: 'PIX', isRecurring: false, notes: '', createdAt: '2026-05-08T09:00:00Z' },
    { id: 'fe14', clientId: 'c1', demandId: 'd9', proposalId: '', type: 'receita', description: 'Landing Page — abril', category: 'Serviços prestados', value: 2100, dueDate: '2026-04-05', paymentDate: '2026-04-06', status: 'recebido', paymentMethod: 'PIX', isRecurring: false, notes: '', createdAt: '2026-03-20T09:00:00Z' },
    { id: 'fe15', clientId: '', demandId: '', proposalId: '', type: 'despesa', description: 'Assinatura de ferramentas — abril', category: 'Assinaturas', value: 290, dueDate: '2026-04-10', paymentDate: '2026-04-10', status: 'pago', paymentMethod: 'Cartão de crédito', isRecurring: true, notes: '', createdAt: '2026-04-01T09:00:00Z' },
    { id: 'fe16', clientId: '', demandId: '', proposalId: '', type: 'transferencia', description: 'Transferência para reserva', category: 'Transferência', value: 1500, dueDate: '2026-05-15', paymentDate: '2026-05-15', status: 'pago', paymentMethod: 'PIX', isRecurring: false, accountId: 'ba1', destAccountId: 'ba2', notes: 'Reforço da reserva mensal.', createdAt: '2026-05-15T09:00:00Z' },
  ].map((e) => ({ accountId: 'ba1', ...e }))

  const settings = {
    id: 'set1',
    companyName: 'DemandFlow Studio',
    companyLogo: '',
    companyEmail: 'contato@demandflow.app',
    companyPhone: '(91) 99999-0000',
    companyDocument: '00.000.000/0001-00',
    companyAddress: 'Belém, PA',
    bankInfo: 'Banco DemandFlow • Ag. 0001 • CC 12345-6 • PIX: contato@demandflow.app',
    defaultTerms: 'Esta proposta é válida pelo prazo indicado. Os valores incluem apenas os itens descritos no escopo. Alterações fora do escopo serão orçadas à parte.',
    primaryColor: '#00FF85',
    monthlyGoal: 15000,
    createdAt: '2026-01-01T09:00:00Z',
  }

  // === Categorias financeiras (gerenciáveis pelo usuário) ===
  // scope: 'receita' | 'despesa' | 'ambos' (ambos aparece nos dois formulários).
  const financialCategories = [
    // RECEITA
    { id: 'fc1', name: 'Serviços prestados', scope: 'receita', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc2', name: 'Landing Page', scope: 'receita', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc3', name: 'Site institucional', scope: 'receita', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc4', name: 'Manutenção mensal', scope: 'receita', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc5', name: 'Consultoria', scope: 'receita', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc6', name: 'Venda de produto', scope: 'receita', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc7', name: 'Comissão', scope: 'receita', active: true, createdAt: '2026-01-01T09:00:00Z' },
    // DESPESA
    { id: 'fc8', name: 'Assinaturas', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc9', name: 'Ferramentas', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc10', name: 'Tráfego pago', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc11', name: 'Freelancer', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc12', name: 'Impostos', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc13', name: 'Hospedagem/domínio', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc14', name: 'Software', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc15', name: 'Alimentação', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc16', name: 'Transporte', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    { id: 'fc17', name: 'Equipamentos', scope: 'despesa', active: true, createdAt: '2026-01-01T09:00:00Z' },
    // AMBOS
    { id: 'fc18', name: 'Outros', scope: 'ambos', active: true, createdAt: '2026-01-01T09:00:00Z' },
  ]

  // === Contratos de Receita Fixa / Despesa Recorrente ===
  // Geram automaticamente lançamentos mensais em processRecurring()
  // e são usados em Relatórios para projetar meses futuros.
  const recurringContracts = [
    {
      id: 'rc1',
      type: 'receita',
      clientId: 'c3',
      description: 'Gestão de tráfego — Dra. Helena',
      category: 'Serviços prestados',
      value: 1500,
      dayOfMonth: 10,
      startDate: '2026-03-10',
      endDate: '',
      status: 'ativo',
      paymentMethod: 'Boleto',
      accountId: 'ba1',
      notes: 'Mensalidade fixa de gestão de campanhas pagas.',
      createdAt: '2026-03-01T09:00:00Z',
    },
    {
      id: 'rc2',
      type: 'receita',
      clientId: 'c2',
      description: 'Manutenção mensal — Padaria Pão Quente',
      category: 'Serviços prestados',
      value: 600,
      dayOfMonth: 5,
      startDate: '2026-04-05',
      endDate: '',
      status: 'ativo',
      paymentMethod: 'PIX',
      accountId: 'ba1',
      notes: 'Manutenção do site e atualizações mensais.',
      createdAt: '2026-04-01T09:00:00Z',
    },
    {
      id: 'rc3',
      type: 'despesa',
      clientId: '',
      description: 'Assinatura Adobe Creative Cloud',
      category: 'Assinaturas',
      value: 320,
      dayOfMonth: 10,
      startDate: '2026-01-10',
      endDate: '',
      status: 'ativo',
      paymentMethod: 'Cartão de crédito',
      accountId: 'ba1',
      notes: 'Suíte completa.',
      createdAt: '2026-01-01T09:00:00Z',
    },
    {
      id: 'rc4',
      type: 'despesa',
      clientId: '',
      description: 'Hospedagem e domínios',
      category: 'Ferramentas',
      value: 180,
      dayOfMonth: 12,
      startDate: '2026-01-12',
      endDate: '',
      status: 'ativo',
      paymentMethod: 'Cartão de crédito',
      accountId: 'ba1',
      notes: 'Servidores e renovações de domínio.',
      createdAt: '2026-01-01T09:00:00Z',
    },
  ]

  const financialChallenges = []

  return {
    version: 5,
    users,
    clients,
    services,
    demands,
    proposals,
    proposalItems,
    financialEntries,
    bankAccounts,
    financialChallenges,
    recurringContracts,
    financialCategories,
    settings,
  }
}

// Lista padrão de categorias usada na migração v4→v5 (mesma do buildSeed).
// Mantida como helper exportado para que store.js possa popular sem chamar buildSeed inteiro.
export function defaultFinancialCategories() {
  const now = new Date().toISOString()
  return [
    { id: 'fc1', name: 'Serviços prestados', scope: 'receita', active: true, createdAt: now },
    { id: 'fc2', name: 'Landing Page', scope: 'receita', active: true, createdAt: now },
    { id: 'fc3', name: 'Site institucional', scope: 'receita', active: true, createdAt: now },
    { id: 'fc4', name: 'Manutenção mensal', scope: 'receita', active: true, createdAt: now },
    { id: 'fc5', name: 'Consultoria', scope: 'receita', active: true, createdAt: now },
    { id: 'fc6', name: 'Venda de produto', scope: 'receita', active: true, createdAt: now },
    { id: 'fc7', name: 'Comissão', scope: 'receita', active: true, createdAt: now },
    { id: 'fc8', name: 'Assinaturas', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc9', name: 'Ferramentas', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc10', name: 'Tráfego pago', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc11', name: 'Freelancer', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc12', name: 'Impostos', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc13', name: 'Hospedagem/domínio', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc14', name: 'Software', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc15', name: 'Alimentação', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc16', name: 'Transporte', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc17', name: 'Equipamentos', scope: 'despesa', active: true, createdAt: now },
    { id: 'fc18', name: 'Outros', scope: 'ambos', active: true, createdAt: now },
  ]
}
