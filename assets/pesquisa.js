// Definição da pesquisa (perguntas, opções) e regra de criticidade.
// Usado pelo formulário e pelo dashboard: mude aqui e os dois acompanham.
(function () {
  const PRODUTOS = [
    "ICOM Black",
    "Tráfego Facebook/Instagram",
    "Google",
    "GMN",
    "Redes Sociais",
    "IA de Agendamento",
    "Discador",
    "WhatsApp Oficial",
    "IA de Vídeo",
    "IA Kit / IA PRO",
    "AppCRC",
    "Outro",
  ];

  // A3: cada problema já aponta para a ação do plano de turnaround.
  const PROBLEMAS = [
    { id: "discador_audio", texto: "Ligação do Discador muda, cortando ou com chiado", acao: "Discador: incidente de voz" },
    { id: "discador_atende", texto: "Paciente não atende o número do Discador", acao: "Discador: número local com o DDD da clínica" },
    { id: "ia_data", texto: "IA falou data, dia da semana ou horário errado", acao: "IA: hotfix de agenda (Clinicorp)" },
    { id: "ia_fechado", texto: "IA ofereceu horário que já estava fechado na agenda", acao: "IA: hotfix de agenda (Clinicorp)" },
    { id: "whatsapp", texto: "WhatsApp caiu ou foi bloqueado", acao: "IA: migração para o WhatsApp Oficial" },
    { id: "ia_atrapalha", texto: "IA atrapalhou quando a equipe estava atendendo o paciente", acao: "IA: modo fora do horário, pausando quando a CRC entra" },
    { id: "leads_regiao", texto: "Leads de fora da minha região", acao: "Black: conferência mensal da região dos leads" },
    { id: "poucos_leads", texto: "Poucos leads, ou leads que não agendam", acao: "Tráfego e Black: revisão mensal de ROI" },
    { id: "sem_relatorio", texto: "Não sei quanto pago por lead / não recebo relatório", acao: "Tráfego: relatório semanal automático" },
    { id: "sem_aprovacao", texto: "Criativo ou vídeo publicado sem a minha aprovação", acao: "Tráfego: aprovação de criativos pelo cliente" },
    { id: "video_ruim", texto: "Vídeo de IA com qualidade ruim (avatar, boca, voz)", acao: "IA de Vídeo: revisão antes da entrega" },
    { id: "consultor", texto: "Troca de consultor, ou reunião e treinamento desmarcados", acao: "Black: carteira máxima e continuidade do consultor" },
    { id: "suporte", texto: "Chamado ou suporte demorou para resolver", acao: "Retenção e CS: alerta de risco com dono e prazo" },
  ];
  const NENHUM = "Nenhum destes";

  const P = {
    funcao: ["Dono(a) ou dentista responsável", "Gestor(a)", "Recepção ou CRC", "Outra"],
    situacao: ["Sou cliente hoje", "Reduzi meu plano e continuo", "Já fui cliente e cancelei"],
    a2: ["Funciona bem", "Funciona, mas com problemas", "Não funciona"],
    a4: ["Toda semana", "Algumas vezes por mês", "Aconteceu uma vez"],
    a5: ["Compensa", "Está no limite", "Não compensa"],
    a6: ["Continuar como está", "Contratar mais produtos", "Reduzir o plano", "Cancelar", "Ainda não sei"],
    a7: ["Meu consultor", "Os resultados", "A ferramenta", "O preço", "O contrato", "Outro"],
    simnao: ["Sim", "Não"],
    b1: ["Nos últimos 3 meses", "Entre 3 e 12 meses", "Há mais de 1 ano"],
    b2: [
      "A ferramenta falhava (ligação, IA, WhatsApp, sistema)",
      "Não trouxe resultado (poucos leads ou leads ruins)",
      "Preço alto para o retorno que eu tinha",
      "Faltou atendimento e acompanhamento",
      "O que foi vendido era diferente do que foi entregue",
      "Fechei, vendi ou mudei a clínica",
      "Fui para outra empresa",
      "Outro",
    ],
    b4: ["Sim, e quase resolveu", "Sim, mas não resolveu", "Ninguém me procurou"],
    b6: ["Outra agência ou ferramenta", "Faço com a minha equipe", "Parei de investir nisso", "Outro"],
    b7: ["Sim", "Talvez", "Não"],
    f1: [
      "Estabilidade das ferramentas (Discador, IA, WhatsApp)",
      "Quantidade e qualidade dos leads",
      "Relatório e transparência do custo por lead",
      "Atendimento e continuidade do consultor",
      "Treinamento da minha equipe para usar as ferramentas",
      "Preço",
    ],
  };

  // Campos de lista são gravados na planilha separados por " | ".
  const SEP = " | ";
  const lista = (v) => (Array.isArray(v) ? v : String(v || "").split(SEP).map((s) => s.trim()).filter(Boolean));

  function caminho(situacao) {
    if (situacao === P.situacao[2]) return "B";
    if (situacao) return "A";
    return "";
  }

  // Regra de criticidade da diretriz. Devolve { cor, motivo, dono_prazo }.
  function classificar(r) {
    const cam = r.caminho || caminho(r.situacao);
    const a1 = r.a1 === "" || r.a1 == null ? null : Number(r.a1);
    const a3 = lista(r.a3).filter((p) => p !== NENHUM);
    const produtos = lista(r.produtos);
    const black = produtos.includes("ICOM Black");

    if (cam === "A") {
      if (r.a6 === "Reduzir o plano" || r.a6 === "Cancelar")
        return vermelho(`Pretende ${r.a6 === "Cancelar" ? "cancelar" : "reduzir o plano"} (A6)`, black);
      if (a1 != null && a1 <= 6 && r.a4 === "Toda semana")
        return vermelho(`Nota ${a1} e problema toda semana (A1 + A4)`, black);
      if (black && r.a5 === "Não compensa")
        return vermelho("Cliente Black e o retorno não compensa (A5)", true);
      if (a1 != null && a1 >= 7 && a1 <= 8 && a3.length)
        return { cor: "amarelo", motivo: `Nota ${a1} com ${a3.length} problema(s) em A3`, dono_prazo: "Contato em 72 h" };
    }
    if (cam === "B" && r.b7 === "Sim" && (r.b1 === P.b1[0] || r.b1 === P.b1[1]))
      return { cor: "amarelo", motivo: "Ex-cliente voltaria e saiu há menos de 12 meses (B7)", dono_prazo: "Contato em 72 h · lista de recuperação" };
    return { cor: "verde", motivo: "", dono_prazo: "Entra só na contagem" };
  }
  function vermelho(motivo, black) {
    return { cor: "vermelho", motivo, dono_prazo: black ? "Contato em 24 h · pela diretoria (Black)" : "Contato em 24 h" };
  }

  // Ordem das colunas na planilha (o Apps Script cria o cabeçalho com elas).
  const COLUNAS = [
    "id", "criado_em", "evento", "modo", "entrevistador",
    "clinica", "whatsapp", "funcao", "funcao_outra", "situacao", "caminho", "produtos", "produto_outro",
    "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a7_outro", "a8", "a9",
    "b1", "b2", "b2_outro", "b3", "b4", "b5", "b6", "b6_outro", "b7", "b8", "b9",
    "f1", "cor", "motivo_cor",
  ];

  window.ICOM = { PRODUTOS, PROBLEMAS, NENHUM, P, SEP, lista, caminho, classificar, COLUNAS };
})();
