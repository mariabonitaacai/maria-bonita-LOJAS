export interface ChecklistGroupTask {
  id: string;
  text: string;
}

export interface ChecklistGroup {
  id: string;
  title: string;
  points: number;
  tasks: ChecklistGroupTask[];
}

export interface ChecklistSection {
  id: string;
  title: string;
  description: string;
  totalPoints: number;
  groups: ChecklistGroup[];
}

export const CHECKLIST_TEMPLATE: ChecklistSection[] = [
  {
    id: 'abertura',
    title: '1. Abertura (Horário: 16h)',
    description: 'O foco aqui é causar uma ótima primeira impressão e garantir que os produtos estejam no ponto perfeito para o início das vendas.',
    totalPoints: 20,
    groups: [
      {
        id: 'pontualidade',
        title: 'Pontualidade e Salão',
        points: 10,
        tasks: [
          { id: 'abrir_pontual', text: 'Abrir as portas pontualmente às 16h.' },
          { id: 'mesas_fora', text: 'Colocar as mesas e cadeiras para fora de forma alinhada.' },
          { id: 'pano_mesas', text: 'Passar um pano úmido em todas as mesas e balcões antes do primeiro cliente entrar.' }
        ]
      },
      {
        id: 'padrao_buffet',
        title: 'Padrão do Buffet e Freezers',
        points: 10,
        tasks: [
          { id: 'limpar_vidros', text: 'Limpar os vidros e as tampas dos freezers (remover marcas de dedo do dia anterior).' },
          { id: 'alinhar_cubas', text: 'Destampar e alinhar todas as cubas de acompanhamentos.' },
          { id: 'temp_freezers', text: 'Verificar a temperatura dos freezers. O açaí deve estar na textura padrão da marca (areado/grosseiro) e os sorvetes na consistência correta, nunca derretidos ou lisos demais.' }
        ]
      }
    ]
  },
  {
    id: 'manutencao',
    title: '2. Manutenção e Atendimento (Durante o Expediente)',
    description: 'O foco aqui é o revezamento da dupla para que o self-service nunca fique sujo ou vazio enquanto a loja está aberta.',
    totalPoints: 30,
    groups: [
      {
        id: 'monitoramento',
        title: 'Monitoramento do Self-Service (A cada 1 hora)',
        points: 15,
        tasks: [
          { id: 'revisar_frutas', text: 'Um colaborador deve revisar as frutas frescas (cortar mais se necessário) e os acompanhamentos secos. Nunca deixar uma cuba chegar ao fim.' },
          { id: 'repor_caldas', text: 'Repor caldas e leite condensado nas bisnagas.' },
          { id: 'limpar_respingos', text: 'Limpar imediatamente qualquer pingo de açaí, sorvete ou calda que cair na bancada do buffet.' }
        ]
      },
      {
        id: 'higiene',
        title: 'Higiene de Mesas e Utensílios',
        points: 15,
        tasks: [
          { id: 'limpar_mesa_rapido', text: 'Assim que um cliente levantar, limpar a mesa imediatamente.' },
          { id: 'lavar_pegadores', text: 'Recolher, lavar e secar constantemente os pegadores, conchas e potes de uso coletivo.' },
          { id: 'esvaziar_lixos', text: 'Esvaziar os lixos do salão caso fiquem cheios durante o turno.' }
        ]
      }
    ]
  },
  {
    id: 'fechamento',
    title: '3. Fechamento e Prevenção (30 min antes de fechar)',
    description: 'Esta é a etapa mais importante para a operação. O fechamento de hoje é a abertura de amanhã.',
    totalPoints: 40,
    groups: [
      {
        id: 'abastecimento_preventivo',
        title: 'Abastecimento Preventivo (A Regra de Ouro)',
        points: 20,
        tasks: [
          { id: 'iniciar_reposicao', text: 'Faltando 30 minutos para o encerramento, iniciar a reposição total da loja.' },
          { id: 'trocar_caixas', text: 'Trocar ou completar as caixas de açaí e sorvetes nos freezers.' },
          { id: 'encher_cubas', text: 'Encher todas as cubas de acompanhamentos secos e deixar caldas/frutas preparadas e armazenadas corretamente. A loja deve ficar abastecida como se fosse abrir no minuto seguinte.' }
        ]
      },
      {
        id: 'fechamento_caixa',
        title: 'Fechamento de Caixa',
        points: 10,
        tasks: [
          { id: 'contar_dinheiro', text: 'Contar o dinheiro, fechar o sistema e separar rigorosamente o saldo inicial (troco) padronizado para a abertura do dia seguinte.' }
        ]
      },
      {
        id: 'limpeza_final',
        title: 'Limpeza Final e Desligamento',
        points: 10,
        tasks: [
          { id: 'recolher_mesas', text: 'Recolher todas as cadeiras e mesas para dentro.' },
          { id: 'higienizar_chao', text: 'Higienizar a bancada do caixa e o chão.' },
          { id: 'conferir_freezers', text: 'Conferir se as tampas de todos os freezers estão completamente fechadas para não perder temperatura na madrugada.' },
          { id: 'apagar_luzes', text: 'Apagar luzes, desligar equipamentos não essenciais e trancar as portas (às 22h30 de segunda a quinta, ou às 23h nos finais de semana).' }
        ]
      }
    ]
  },
  {
    id: 'conduta',
    title: '4. Engajamento e Postura Profissional (Bônus)',
    description: 'Postura, uniforme adequado e excelência no tratamento com o cliente.',
    totalPoints: 10,
    groups: [
      {
        id: 'padrao_equipe',
        title: 'Padrão da Equipe',
        points: 10,
        tasks: [
          { id: 'uniforme_completo', text: 'Uso completo e correto do uniforme e EPIs (touca, avental).' },
          { id: 'simpatia_cliente', text: 'Abordagem simpática, prestativa e cordialidade com todos os clientes.' }
        ]
      }
    ]
  }
];

// Helper para calcular a pontuação final de um checklist preenchido.
export function calculateChecklistScore(items: Record<string, boolean>): number {
  let score = 0;

  for (const section of CHECKLIST_TEMPLATE) {
    for (const group of section.groups) {
      if (group.tasks.length === 0) continue;
      
      let checkedCount = 0;
      for (const task of group.tasks) {
        if (items[task.id]) {
          checkedCount++;
        }
      }
      
      // Pontuação proporcional ao número de tarefas concluídas no grupo
      const pointsPerTask = group.points / group.tasks.length;
      score += (checkedCount * pointsPerTask);
    }
  }

  return Math.round(score);
}
