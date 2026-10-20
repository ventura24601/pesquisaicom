(function () {
  const { PRODUTOS, PROBLEMAS, NENHUM, P, SEP, caminho, classificar, COLUNAS, rpc, configurado } = window.ICOM;
  const CFG = window.ICOM_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const MODO = params.get("modo") === "entrevista" ? "entrevista" : "qr";
  const EVENTO = params.get("evento") || CFG.EVENTO_PADRAO || "";
  const FILA_KEY = "icom_fila_respostas";
  const AVANCO_MS = 320; // pausa antes de avançar sozinho, para a pessoa ver o que marcou

  const app = document.getElementById("app");
  const barra = document.getElementById("barra");
  const contador = document.getElementById("contador");
  const filaEl = document.getElementById("fila");

  let r = {};
  let tela = -1; // -1 = abertura; depois índice em telas()
  let erros = {};
  let timerAvanco = null;

  // Rótulos curtos na tela; o valor gravado continua o texto completo da diretriz.
  const CURTO_A2 = { "Funciona bem": "Funciona bem", "Funciona, mas com problemas": "Com problemas", "Não funciona": "Não funciona" };

  // ---------- telas: uma pergunta por tela ----------
  const temProblema = (r) => (r.a3 || []).some((p) => p !== NENHUM);
  // Antes de responder A3, conta a A4 no total para o contador não pular de 13 para 14.
  const mostraA4 = (r) => !r.a3 || temProblema(r);
  const produtosMarcados = (r) =>
    (r.produtos || []).map((p) => (p === "Outro" && r.produto_outro ? `Outro: ${r.produto_outro}` : p));
  const pediuContato = (r) => r.a9 === "Sim" || r.b9 === "Sim";

  function telas() {
    const cam = caminho(r.situacao) || "A"; // antes de escolher, estima pelo caminho A
    const T = (secao, ...perguntas) => ({ secao, perguntas });
    const lista = [
      T("Sobre você", { id: "funcao", tipo: "radio", titulo: "Qual é a sua função na clínica?", opcoes: P.funcao, obrig: true, outro: { valor: "Outra", campo: "funcao_outra" } }),
      T("Sobre você", { id: "situacao", tipo: "radio", titulo: "Qual é a sua situação com a ICOM?", opcoes: P.situacao, obrig: true }),
      T("Sobre você", { id: "produtos", tipo: "check", titulo: "Quais produtos você usa ou usava?", ajuda: "Pode marcar mais de um.", opcoes: PRODUTOS, obrig: true, outro: { valor: "Outro", campo: "produto_outro" }, colunas: true }),
    ];
    if (cam === "A") {
      lista.push(
        T("Como está hoje", { id: "a1", tipo: "escala", titulo: "De 0 a 10, quanto você recomendaria a ICOM para um colega?", obrig: true }),
        T("Como está hoje", { id: "a2", tipo: "matriz", titulo: "Como cada produto está funcionando hoje?", linhas: produtosMarcados(r), opcoes: P.a2, obrig: true }),
        T("Problemas", { id: "a3", tipo: "check", titulo: "Quais destes problemas aconteceram com você nos últimos 30 dias?", ajuda: "Pode marcar mais de um.", opcoes: PROBLEMAS.map((p) => p.texto).concat(NENHUM), exclusivo: NENHUM, obrig: true }),
        T("Problemas", { id: "a4", tipo: "radio", titulo: "O problema mais grave que você marcou acontece:", opcoes: P.a4, obrig: true, mostrar: mostraA4 }),
        T("Retorno", { id: "a5", tipo: "radio", titulo: "O retorno que você tem hoje compensa o que você investe na ICOM?", opcoes: P.a5, obrig: true }),
        T("Retorno", { id: "a6", tipo: "radio", titulo: "Nos próximos 3 meses, você pretende:", opcoes: P.a6, obrig: true }),
        T("Retorno", { id: "a7", tipo: "check", titulo: "O que mais faz você continuar com a ICOM?", ajuda: "Escolha até 2.", opcoes: P.a7, max: 2, obrig: true, outro: { valor: "Outro", campo: "a7_outro" } }),
        T("Uma coisa", { id: "a8", tipo: "area", titulo: "Se pudéssemos corrigir UMA coisa nos próximos 30 dias, qual seria?", ajuda: "Opcional. Pode ser bem direto.", placeholder: "Escreva aqui…" }),
        T("Uma coisa", { id: "a9", tipo: "radio", titulo: "Podemos te ligar esta semana para tratar disso?", opcoes: P.simnao, obrig: true, lado: true })
      );
    } else {
      const marcados = produtosMarcados(r);
      lista.push(
        T("Sua saída", { id: "b1", tipo: "radio", titulo: "Quando você cancelou?", opcoes: P.b1, obrig: true }),
        T("Sua saída", { id: "b2", tipo: "radio", titulo: "Qual foi o principal motivo?", ajuda: "Só um.", opcoes: P.b2, obrig: true, outro: { valor: "Outro", campo: "b2_outro" } }),
        T("Sua saída", { id: "b3", tipo: "radio", titulo: "Qual produto pesou mais na decisão?", ajuda: "Só um.", opcoes: marcados.length > 1 ? marcados : PRODUTOS, obrig: true }),
        T("Sua saída", { id: "b4", tipo: "radio", titulo: "Antes de você sair, alguém da ICOM tentou resolver?", opcoes: P.b4, obrig: true }),
        T("O que teria mudado", { id: "b5", tipo: "area", titulo: "O que teria feito você ficar?", ajuda: "Opcional. Pode ser bem direto.", placeholder: "Escreva aqui…" }),
        T("O que teria mudado", { id: "b6", tipo: "radio", titulo: "Hoje você usa o quê no lugar?", opcoes: P.b6, obrig: true, outro: { valor: "Outro", campo: "b6_outro" } }),
        T("O que teria mudado", { id: "b7", tipo: "radio", titulo: "Se esse problema estivesse resolvido, você voltaria?", opcoes: P.b7, obrig: true, lado: true }),
        T("Hoje", { id: "b8", tipo: "escala", titulo: "De 0 a 10, quanto você recomendaria a ICOM hoje para um colega?", obrig: true }),
        T("Hoje", { id: "b9", tipo: "radio", titulo: "Podemos te procurar quando a correção estiver pronta?", opcoes: P.simnao, obrig: true, lado: true })
      );
    }
    lista.push(
      T("Para fechar", { id: "f1", tipo: "check", titulo: "O que a ICOM precisa melhorar primeiro?", ajuda: "Escolha até 2. A ordem de prioridade importa.", opcoes: P.f1, max: 2, obrig: true }),
      T("Para fechar",
        { id: "_contato", tipo: "aviso", texto: "" },
        { id: "clinica", tipo: "texto", titulo: "Nome da clínica", placeholder: "Ex.: Clínica Sorriso", autocomplete: "organization" },
        { id: "whatsapp", tipo: "tel", titulo: "WhatsApp", placeholder: "(11) 90000-0000", autocomplete: "tel" })
    );
    return lista.filter((t) => t.perguntas.some((q) => !q.mostrar || q.mostrar(r)));
  }

  // ---------- render ----------
  function render(anim) {
    clearTimeout(timerAvanco);
    if (tela < 0) return renderAbertura();
    const lista = telas();
    if (tela >= lista.length) tela = lista.length - 1;
    const t = lista[tela];
    const ultima = tela === lista.length - 1;
    progresso(tela + 1, lista.length);

    const visiveis = t.perguntas.filter((q) => !q.mostrar || q.mostrar(r));
    const vazioOpcional = visiveis.length === 1 && visiveis[0].tipo === "area" && !String(r[visiveis[0].id] || "").trim();
    app.innerHTML = `
      <div class="tela${anim ? " entra-" + anim : ""}">
        <div class="secao">${esc(t.secao)}</div>
        ${visiveis.map(renderPergunta).join("")}
      </div>
      <div class="acoes"><div class="in">
        <button class="btn btn-voltar" type="button" data-acao="voltar" aria-label="Voltar">←</button>
        <button class="btn btn-primary" type="button" data-acao="${ultima ? "enviar" : "avancar"}">${ultima ? "Enviar respostas" : vazioOpcional ? "Pular" : "Continuar"}</button>
      </div></div>`;
  }

  function progresso(n, total) {
    barra.style.width = `${Math.round((n / (total + 1)) * 100)}%`;
    contador.textContent = n ? `${n} de ${total}` : "";
  }

  function renderAbertura() {
    progresso(0, 1);
    const total = telas().length;
    app.innerHTML = `
      <div class="abertura tela entra-frente">
        <div class="selo">Pesquisa de qualidade</div>
        <h1>Queremos saber o que precisamos <em>corrigir primeiro.</em></h1>
        <p class="lead">Leva 3 minutos e você pode ser bem direto.</p>
        <ul class="fatos">
          <li><strong>3 min</strong><span>de duração</span></li>
          <li><strong>${total}</strong><span>perguntas rápidas</span></li>
          <li><strong>1 brinde</strong><span>igual para todos</span></li>
        </ul>
        <button class="btn btn-primary btn-grande" type="button" data-acao="comecar">Começar</button>
        <p class="nota-abertura">A maioria das perguntas é de toque único. Você só se identifica no final, se quiser.</p>
      </div>`;
  }

  function renderPergunta(q) {
    const err = erros[q.id];
    const cab = q.titulo ? `<h2 class="titulo" id="t_${q.id}">${esc(q.titulo)}</h2>${q.ajuda ? `<p class="ajuda">${esc(q.ajuda)}</p>` : ""}` : "";
    let corpo = "";
    switch (q.tipo) {
      case "aviso": {
        const pediu = pediuContato(r);
        return `<h2 class="titulo">${pediu ? "Para onde podemos ligar?" : "Quer se identificar?"}</h2>
          <p class="ajuda">${pediu
            ? "Você pediu contato. Deixe o WhatsApp para a equipe te chamar."
            : "Opcional. Sem nome e WhatsApp, sua resposta é anônima."}</p>
          <div class="aviso"><strong>Importante:</strong> se você preencher, a resposta deixa de ser anônima. A equipe da ICOM vai saber quem respondeu, para poder agir no seu caso.</div>`;
      }
      case "texto":
      case "tel": {
        const obrigWhats = q.id === "whatsapp" && pediuContato(r);
        return `<div class="campo${err ? " erro" : ""}" id="q_${q.id}">
          <label for="f_${q.id}">${esc(q.titulo)}${obrigWhats ? "" : ' <span class="opc">opcional</span>'}</label>
          <input id="f_${q.id}" type="${q.tipo}" ${q.tipo === "tel" ? 'inputmode="tel"' : ""} autocomplete="${q.autocomplete || "off"}" data-campo="${q.id}" value="${esc(r[q.id] || "")}" placeholder="${esc(q.placeholder || "")}">
          ${err ? `<div class="msg-erro" role="alert">${esc(err)}</div>` : ""}
        </div>`;
      }
      case "area":
        corpo = `<textarea data-campo="${q.id}" aria-labelledby="t_${q.id}" placeholder="${esc(q.placeholder || "")}" maxlength="1000">${esc(r[q.id] || "")}</textarea>`;
        break;
      case "radio":
      case "check": {
        const multi = q.tipo === "check";
        const sel = multi ? r[q.id] || [] : [r[q.id]];
        const cheio = q.max && sel.length >= q.max;
        corpo =
          `<div class="opcoes${q.colunas ? " colunas" : ""}${q.lado ? " lado" : ""}" role="${multi ? "group" : "radiogroup"}" aria-labelledby="t_${q.id}">` +
          q.opcoes.map((o) => {
            const marcado = sel.includes(o);
            const desab = multi && cheio && !marcado;
            const ordem = multi && q.max && marcado ? `<span class="ordem">${sel.indexOf(o) + 1}º</span>` : "";
            return `<label class="opt${multi ? " multi" : ""}${desab ? " desab" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="${q.id}" value="${esc(o)}" ${marcado ? "checked" : ""} ${desab ? "disabled" : ""}><span class="ind" aria-hidden="true"></span><span class="txt">${esc(o)}</span>${ordem}</label>`;
          }).join("") +
          `</div>`;
        if (q.max) corpo += `<p class="limite">${sel.length} de ${q.max} escolhidas</p>`;
        if (q.outro && sel.includes(q.outro.valor))
          corpo += `<div class="campo"><label for="f_${q.outro.campo}">Qual?</label><input id="f_${q.outro.campo}" type="text" data-campo="${q.outro.campo}" value="${esc(r[q.outro.campo] || "")}" placeholder="Conte rapidinho"></div>`;
        break;
      }
      case "escala":
        corpo =
          `<div class="escala" role="radiogroup" aria-labelledby="t_${q.id}">` +
          Array.from({ length: 11 }, (_, n) => `<label><input type="radio" name="${q.id}" value="${n}" ${String(r[q.id]) === String(n) ? "checked" : ""}><span>${n}</span></label>`).join("") +
          `</div><div class="escala-legenda"><span>0 · Nada provável</span><span>10 · Com certeza</span></div>`;
        break;
      case "matriz":
        corpo =
          `<div class="matriz">` +
          q.linhas.map((linha) => {
            const atual = (r.a2 || {})[linha];
            return `<div class="linha${atual ? " ok" : ""}"><div class="nome">${esc(linha)}</div><div class="seg" role="radiogroup" aria-label="${esc(linha)}">` +
              q.opcoes.map((o, i) => `<label class="s${i}"><input type="radio" name="a2::${esc(linha)}" value="${esc(o)}" ${atual === o ? "checked" : ""}><span>${esc(CURTO_A2[o] || o)}</span></label>`).join("") +
              `</div></div>`;
          }).join("") +
          `</div>`;
        break;
    }
    return `<section class="q${err ? " erro" : ""}" id="q_${q.id}">${cab}${corpo}${err ? `<div class="msg-erro" role="alert">${esc(err)}</div>` : ""}</section>`;
  }

  // ---------- eventos ----------
  app.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!el.dataset.campo) return;
    r[el.dataset.campo] = el.value;
    if (erros[el.dataset.campo]) { delete erros[el.dataset.campo]; el.closest(".erro")?.classList.remove("erro"); }
    // "Pular" vira "Continuar" quando a pessoa começa a escrever.
    const btn = app.querySelector('[data-acao="avancar"]');
    if (btn && el.tagName === "TEXTAREA") btn.textContent = el.value.trim() ? "Continuar" : "Pular";
  });

  app.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target.tagName === "INPUT" && ev.target.type !== "checkbox" && ev.target.type !== "radio") {
      ev.preventDefault();
      app.querySelector('[data-acao="avancar"],[data-acao="enviar"]')?.click();
    }
  });

  app.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el.name) return;
    let q = null;
    if (el.name.startsWith("a2::")) {
      r.a2 = r.a2 || {};
      r.a2[el.name.slice(4)] = el.value;
    } else if (el.type === "checkbox") {
      q = perguntaAtual(el.name);
      let v = r[el.name] || [];
      if (el.checked) {
        if (q && q.exclusivo) v = el.value === q.exclusivo ? [] : v.filter((x) => x !== q.exclusivo);
        v = v.concat(el.value);
      } else v = v.filter((x) => x !== el.value);
      r[el.name] = [...new Set(v)];
    } else if (el.type === "radio") {
      q = perguntaAtual(el.name);
      r[el.name] = el.name === "a1" || el.name === "b8" ? Number(el.value) : el.value;
    }
    delete erros[el.name.split("::")[0]];
    const foco = el.name + "|" + el.value;
    render();
    const alvo = [...app.querySelectorAll("input")].find((i) => i.name + "|" + i.value === foco);
    if (alvo) alvo.focus({ preventScroll: true });

    // Escolha única sem campo "Qual?" → avança sozinho.
    if (q && (q.tipo === "radio" || q.tipo === "escala") && !(q.outro && r[q.id] === q.outro.valor) && telaDeUmaPergunta()) {
      timerAvanco = setTimeout(() => avancar(), AVANCO_MS);
    }
    // Matriz completa → leva o foco ao botão.
    if (el.name.startsWith("a2::")) {
      const t = telas()[tela];
      const m = t && t.perguntas.find((x) => x.tipo === "matriz");
      if (m && m.linhas.every((l) => (r.a2 || {})[l])) app.querySelector('[data-acao="avancar"]')?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  });

  app.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-acao]");
    if (!b) return;
    const acao = b.dataset.acao;
    if (acao === "comecar") { tela = 0; erros = {}; render("frente"); topo(); }
    if (acao === "voltar") { tela--; erros = {}; render("tras"); topo(); }
    if (acao === "avancar") avancar();
    if (acao === "enviar" && validar()) enviar();
    if (acao === "nova") { r = {}; tela = -1; erros = {}; render(); topo(); }
  });

  function avancar() {
    clearTimeout(timerAvanco);
    if (!validar()) return;
    const lista = telas();
    if (tela >= lista.length - 1) return;
    tela++;
    render("frente");
    topo();
  }

  function telaDeUmaPergunta() {
    const t = telas()[tela];
    return t && t.perguntas.filter((q) => (!q.mostrar || q.mostrar(r)) && q.tipo !== "aviso").length === 1;
  }

  function perguntaAtual(id) {
    const t = telas()[tela];
    return t && t.perguntas.find((q) => q.id === id);
  }

  function validar() {
    const t = telas()[tela];
    erros = {};
    for (const q of t.perguntas) {
      if (q.mostrar && !q.mostrar(r)) continue;
      const v = r[q.id];
      if (q.id === "whatsapp" && pediuContato(r)) {
        if (String(v || "").replace(/\D/g, "").length < 10) erros[q.id] = "Você pediu contato: informe o WhatsApp com DDD.";
        continue;
      }
      if (!q.obrig) continue;
      if (q.tipo === "matriz") {
        const faltam = q.linhas.filter((l) => !(r.a2 || {})[l]);
        if (faltam.length) erros[q.id] = `Falta responder: ${faltam.join(", ")}.`;
      } else if (v == null || v === "" || (Array.isArray(v) && !v.length)) {
        erros[q.id] = q.tipo === "check" ? "Marque pelo menos uma opção." : "Escolha uma opção para continuar.";
      }
    }
    if (Object.keys(erros).length) {
      render();
      app.querySelector(".erro")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  function topo() {
    scrollTo({ top: 0 });
    const h = app.querySelector("h1, h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  // ---------- envio ----------
  function montarRegistro() {
    const cam = caminho(r.situacao);
    const reg = {};
    COLUNAS.forEach((c) => (reg[c] = ""));
    Object.assign(reg, {
      id: uuid(),
      criado_em: new Date().toISOString(),
      evento: EVENTO,
      modo: MODO,
      clinica: (r.clinica || "").trim(),
      whatsapp: (r.whatsapp || "").trim(),
      funcao: r.funcao || "",
      funcao_outra: r.funcao === "Outra" ? r.funcao_outra || "" : "",
      situacao: r.situacao,
      caminho: cam,
      produtos: (r.produtos || []).join(SEP),
      produto_outro: (r.produtos || []).includes("Outro") ? r.produto_outro || "" : "",
      f1: (r.f1 || []).join(SEP),
    });
    if (cam === "A") {
      const temP = temProblema(r);
      Object.assign(reg, {
        a1: r.a1,
        a2: produtosMarcados(r).map((p) => `${p}: ${(r.a2 || {})[p] || ""}`).join(SEP),
        a3: (r.a3 || []).join(SEP),
        a4: temP ? r.a4 || "" : "",
        a5: r.a5, a6: r.a6,
        a7: (r.a7 || []).join(SEP),
        a7_outro: (r.a7 || []).includes("Outro") ? r.a7_outro || "" : "",
        a8: (r.a8 || "").trim(), a9: r.a9,
      });
    } else {
      Object.assign(reg, {
        b1: r.b1, b2: r.b2, b2_outro: r.b2 === "Outro" ? r.b2_outro || "" : "",
        b3: r.b3, b4: r.b4, b5: (r.b5 || "").trim(),
        b6: r.b6, b6_outro: r.b6 === "Outro" ? r.b6_outro || "" : "",
        b7: r.b7, b8: r.b8, b9: r.b9,
      });
    }
    const c = classificar(reg);
    reg.cor = c.cor;
    reg.motivo_cor = c.motivo;
    return reg;
  }

  function enviar() {
    const reg = montarRegistro();
    const fila = lerFila();
    fila.push(reg);
    gravar(FILA_KEY, JSON.stringify(fila));
    barra.style.width = "100%";
    contador.textContent = "Concluído";
    const brinde = MODO === "qr"
      ? `<div class="brinde"><strong>Retire o seu brinde</strong><span>Mostre esta tela na mesa da ICOM.</span></div>`
      : "";
    const retorno = pediuContato(r) && reg.whatsapp
      ? `<p class="lead">${reg.caminho === "B" ? "Vamos te procurar quando a correção estiver pronta." : "A equipe vai te chamar no WhatsApp esta semana."}</p>`
      : "";
    app.innerHTML = `
      <div class="fim tela entra-frente">
        <div class="check" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h1 tabindex="-1">Obrigado pela franqueza.</h1>
        <p class="lead">Sua resposta vai direto para a equipe que corrige.</p>
        ${retorno}${brinde}
        <button class="btn ${MODO === "entrevista" ? "btn-primary" : ""}" type="button" data-acao="nova">${MODO === "entrevista" ? "Nova entrevista" : "Outra pessoa vai responder"}</button>
      </div>`;
    topo();
    descarregarFila();
  }

  let enviando = false;
  async function descarregarFila() {
    const ok = configurado();
    let fila = lerFila();
    atualizarAvisoFila(fila.length, !ok);
    if (!ok || enviando || !fila.length) return;
    enviando = true;
    try {
      for (const reg of fila.slice()) {
        const json = await rpc("responder", { resposta: reg });
        if (!json.ok) throw new Error(json.erro || "falha");
        fila = lerFila().filter((x) => x.id !== reg.id);
        gravar(FILA_KEY, JSON.stringify(fila));
        atualizarAvisoFila(fila.length, false);
      }
    } catch (e) {
      console.warn("Envio pendente, nova tentativa em 30 s", e);
    } finally {
      enviando = false;
    }
  }

  function atualizarAvisoFila(n, semConfig) {
    if (!n) { filaEl.hidden = true; return; }
    filaEl.hidden = false;
    filaEl.textContent = semConfig
      ? `${n} resposta(s) guardada(s) só neste aparelho — configure o Supabase em config.js`
      : `${n} resposta(s) aguardando conexão — enviaremos sozinhos`;
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function lerFila() {
    try { return JSON.parse(ler(FILA_KEY) || "[]"); } catch { return []; }
  }
  function ler(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch {} }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  window.addEventListener("online", descarregarFila);
  setInterval(descarregarFila, 30000);
  render();
  descarregarFila();
})();
