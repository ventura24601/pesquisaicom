// Respostas fictícias para ver o dashboard antes de configurar o Supabase.
// Só são usadas quando o Supabase não está configurado ou com ?demo=1 na URL.
(function () {
  const { PRODUTOS, PROBLEMAS, NENHUM, P, SEP, classificar, COLUNAS } = window.ICOM;
  let s = 42;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const um = (arr, pesos) => {
    if (!pesos) return arr[Math.floor(rnd() * arr.length)];
    const t = pesos.reduce((a, b) => a + b, 0);
    let x = rnd() * t;
    for (let i = 0; i < arr.length; i++) if ((x -= pesos[i]) < 0) return arr[i];
    return arr[arr.length - 1];
  };
  const varios = (arr, n) => arr.slice().sort(() => rnd() - 0.5).slice(0, n);
  const clinicas = ["Sorriso Pleno", "OdontoVida", "Clínica Dr. Ramos", "Dental Prime", "Oral Center", "Sorrir Mais", "Odonto Fácil", "Instituto Bucal", "Clínica Bem-Estar", "DentalCare Sul", "Odonto Família", "Clínica Lumière"];
  const textosA = [
    "Discador cortando a ligação no meio, paciente acha que desliguei.",
    "A IA marcou paciente em horário que já estava fechado.",
    "Quero saber quanto estou pagando por lead, todo mês.",
    "Parar de trocar meu consultor.",
    "WhatsApp foi bloqueado duas vezes este mês.",
    "Leads de outra cidade, não servem.",
    "Relatório semanal simples.",
    "",
    "",
  ];
  const textosB = [
    "Se o discador funcionasse eu teria ficado.",
    "Alguém ter me ligado antes de eu cancelar.",
    "Preço compatível com o retorno.",
    "Entregar o que foi vendido.",
    "",
  ];

  const lista = [];
  const agora = Date.now();
  for (let i = 0; i < 74; i++) {
    const situacao = um(P.situacao, [62, 10, 28]);
    const cam = situacao === P.situacao[2] ? "B" : "A";
    const produtos = varios(PRODUTOS.slice(0, 11), 1 + Math.floor(rnd() * 4));
    if (rnd() < 0.35 && !produtos.includes("ICOM Black")) produtos.unshift("ICOM Black");
    const r = {};
    COLUNAS.forEach((c) => (r[c] = ""));
    Object.assign(r, {
      id: "demo-" + i,
      criado_em: new Date(agora - (74 - i) * 6 * 60000).toISOString(),
      evento: "encontro-clientes-2026",
      modo: rnd() < 0.7 ? "qr" : "entrevista",
      entrevistador: "",
      clinica: rnd() < 0.7 ? um(clinicas) : "",
      funcao: um(P.funcao, [45, 20, 30, 5]),
      situacao, caminho: cam,
      produtos: produtos.join(SEP),
      f1: varios(P.f1, 1 + (rnd() < 0.8 ? 1 : 0)).join(SEP),
    });
    if (r.clinica) r.whatsapp = `(11) 9${Math.floor(1000 + rnd() * 8999)}-${Math.floor(1000 + rnd() * 8999)}`;
    if (r.modo === "entrevista") r.entrevistador = um(["Ana", "Bruno"]);
    if (cam === "A") {
      const a1 = Math.max(0, Math.min(10, Math.round(7 + (rnd() - 0.55) * 7)));
      const pesosProb = PROBLEMAS.map((p) => ({ discador_audio: 9, discador_atende: 7, ia_data: 6, ia_fechado: 6, whatsapp: 5, poucos_leads: 8, sem_relatorio: 6, consultor: 4 }[p.id] || 2));
      const nProb = a1 >= 9 ? (rnd() < 0.6 ? 0 : 1) : 1 + Math.floor(rnd() * 3);
      const a3 = [];
      for (let k = 0; k < nProb; k++) a3.push(um(PROBLEMAS, pesosProb).texto);
      Object.assign(r, {
        a1,
        a2: produtos.map((p) => `${p}: ${um(P.a2, ["Discador", "WhatsApp Oficial", "IA de Vídeo", "IA Kit / IA PRO"].includes(p) ? [3, 4, 3] : [6, 3, 1])}`).join(SEP),
        a3: (a3.length ? [...new Set(a3)] : [NENHUM]).join(SEP),
        a4: a3.length ? um(P.a4, [4, 4, 2]) : "",
        a5: um(P.a5, a1 >= 8 ? [7, 3, 0.5] : [2, 4, 4]),
        a6: um(P.a6, a1 >= 8 ? [7, 2, 0.5, 0.2, 1] : [3, 0.5, 2, 1.5, 3]),
        a7: varios(P.a7.slice(0, 5), 1 + (rnd() < 0.6 ? 1 : 0)).sort((x, y) => (x === "Meu consultor" ? -1 : y === "Meu consultor" ? 1 : 0)).slice(0, 2).join(SEP),
        a8: um(textosA),
        a9: rnd() < 0.55 ? "Sim" : "Não",
      });
    } else {
      Object.assign(r, {
        b1: um(P.b1, [3, 4, 2]),
        b2: um(P.b2, [8, 6, 4, 4, 3, 1, 2, 1]),
        b3: um(produtos),
        b4: um(P.b4, [1, 3, 6]),
        b5: um(textosB),
        b6: um(P.b6),
        b7: um(P.b7, [3, 4, 3]),
        b8: Math.max(0, Math.min(10, Math.round(4 + (rnd() - 0.5) * 7))),
        b9: rnd() < 0.5 ? "Sim" : "Não",
      });
    }
    const c = classificar(r);
    r.cor = c.cor;
    r.motivo_cor = c.motivo;
    lista.push(r);
  }
  window.ICOM_DEMO = lista;
})();
