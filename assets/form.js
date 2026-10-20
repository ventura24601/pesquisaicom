(function () {
  const { PRODUTOS, PROBLEMAS, NENHUM, P, SEP, caminho, classificar, COLUNAS } = window.ICOM;
  const CFG = window.ICOM_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const MODO = params.get("modo") === "entrevista" ? "entrevista" : "qr";
  const EVENTO = params.get("evento") || CFG.EVENTO_PADRAO || "";
  const FILA_KEY = "icom_fila_respostas";

  const app = document.getElementById("app");
  const barra = document.getElementById("barra");
  const filaEl = document.getElementById("fila");

  let r = novaResposta();
  let passo = 0;
  let erros = {};

  function novaResposta() {
    return {};
  }

  // ---------- definição das etapas ----------
  const temProblema = (r) => (r.a3 || []).some((p) => p !== NENHUM);
  const produtosMarcados = (r) =>
    (r.produtos || []).map((p) => (p === "Outro" && r.produto_outro ? `Outro: ${r.produto_outro}` : p));

  function etapas() {
    const cam = caminho(r.situacao);
    const lista = [
      {
        id: "inicio",
        render: renderInicio,
      },
      {
        id: "comum",
        etapa: "Sobre você",
        perguntas: [
          { id: "clinica", tipo: "texto", titulo: "Nome da clínica", ajuda: "Opcional", placeholder: "Ex.: Clínica Sorriso" },
          { id: "whatsapp", tipo: "tel", titulo: "Seu WhatsApp", ajuda: "Opcional", placeholder: "(11) 90000-0000" },
          { id: "_aviso_contato", tipo: "aviso", texto: "Nome e WhatsApp são opcionais. Se você preencher, a resposta deixa de ser anônima: a equipe da ICOM vai saber quem respondeu, para poder agir no seu caso. Sem eles, a resposta é anônima." },
          { id: "funcao", tipo: "radio", titulo: "Qual é a sua função na clínica?", opcoes: P.funcao, obrig: true, outro: { valor: "Outra", campo: "funcao_outra" } },
          { id: "situacao", tipo: "radio", titulo: "Qual é a sua situação com a ICOM?", opcoes: P.situacao, obrig: true },
          { id: "produtos", tipo: "check", titulo: "Quais produtos você usa ou usava?", ajuda: "Pode marcar mais de um", opcoes: PRODUTOS, obrig: true, outro: { valor: "Outro", campo: "produto_outro" } },
        ],
      },
    ];

    if (cam === "A") {
      lista.push(
        {
          id: "a1",
          etapa: "Como está hoje",
          perguntas: [
            { id: "a1", tipo: "escala", titulo: "De 0 a 10, quanto você recomendaria a ICOM para um colega?", obrig: true },
            { id: "a2", tipo: "matriz", titulo: "Como cada produto está funcionando hoje?", linhas: produtosMarcados(r), opcoes: P.a2, obrig: true },
          ],
        },
        {
          id: "a3",
          etapa: "Problemas",
          perguntas: [
            { id: "a3", tipo: "check", titulo: "Quais destes problemas aconteceram com você nos últimos 30 dias?", ajuda: "Pode marcar mais de um", opcoes: PROBLEMAS.map((p) => p.texto).concat(NENHUM), exclusivo: NENHUM, obrig: true },
            { id: "a4", tipo: "radio", titulo: "O problema mais grave que você marcou acontece:", opcoes: P.a4, obrig: true, mostrar: temProblema },
          ],
        },
        {
          id: "a5",
          etapa: "Retorno e intenção",
          perguntas: [
            { id: "a5", tipo: "radio", titulo: "O retorno que você tem hoje compensa o que você investe na ICOM?", opcoes: P.a5, obrig: true },
            { id: "a6", tipo: "radio", titulo: "Nos próximos 3 meses, você pretende:", opcoes: P.a6, obrig: true },
            { id: "a7", tipo: "check", titulo: "O que mais faz você continuar com a ICOM?", ajuda: "Escolha até 2", opcoes: P.a7, max: 2, obrig: true, outro: { valor: "Outro", campo: "a7_outro" } },
          ],
        },
        {
          id: "a8",
          etapa: "Uma coisa",
          perguntas: [
            { id: "a8", tipo: "area", titulo: "Se pudéssemos corrigir UMA coisa nos próximos 30 dias, qual seria?", placeholder: "Pode ser bem direto" },
            { id: "a9", tipo: "radio", titulo: "Podemos te ligar esta semana para tratar disso?", opcoes: P.simnao, obrig: true },
            { id: "whatsapp", tipo: "tel", titulo: "Qual WhatsApp devemos chamar?", placeholder: "(11) 90000-0000", mostrar: (r) => r.a9 === "Sim" && !r._tinhaWhats },
            { id: "clinica", tipo: "texto", titulo: "E o nome da clínica?", mostrar: (r) => r.a9 === "Sim" && !r._tinhaClinica },
          ],
        }
      );
    } else if (cam === "B") {
      const marcados = produtosMarcados(r);
      lista.push(
        {
          id: "b1",
          etapa: "Sua saída",
          perguntas: [
            { id: "b1", tipo: "radio", titulo: "Quando você cancelou?", opcoes: P.b1, obrig: true },
            { id: "b2", tipo: "radio", titulo: "Qual foi o principal motivo?", ajuda: "Só um", opcoes: P.b2, obrig: true, outro: { valor: "Outro", campo: "b2_outro" } },
            { id: "b3", tipo: "radio", titulo: "Qual produto pesou mais na decisão?", ajuda: "Só um", opcoes: marcados.length > 1 ? marcados : PRODUTOS, obrig: true },
            { id: "b4", tipo: "radio", titulo: "Antes de você sair, alguém da ICOM tentou resolver?", opcoes: P.b4, obrig: true },
          ],
        },
        {
          id: "b5",
          etapa: "O que teria mudado",
          perguntas: [
            { id: "b5", tipo: "area", titulo: "O que teria feito você ficar?", placeholder: "Pode ser bem direto" },
            { id: "b6", tipo: "radio", titulo: "Hoje você usa o quê no lugar?", opcoes: P.b6, obrig: true, outro: { valor: "Outro", campo: "b6_outro" } },
            { id: "b7", tipo: "radio", titulo: "Se esse problema estivesse resolvido, você voltaria?", opcoes: P.b7, obrig: true },
          ],
        },
        {
          id: "b8",
          etapa: "Hoje",
          perguntas: [
            { id: "b8", tipo: "escala", titulo: "De 0 a 10, quanto você recomendaria a ICOM hoje para um colega?", obrig: true },
            { id: "b9", tipo: "radio", titulo: "Podemos te procurar quando a correção estiver pronta?", opcoes: P.simnao, obrig: true },
            { id: "whatsapp", tipo: "tel", titulo: "Qual WhatsApp devemos chamar?", placeholder: "(11) 90000-0000", mostrar: (r) => r.b9 === "Sim" && !r._tinhaWhats },
            { id: "clinica", tipo: "texto", titulo: "E o nome da clínica?", mostrar: (r) => r.b9 === "Sim" && !r._tinhaClinica },
          ],
        }
      );
    }

    if (cam) {
      lista.push({
        id: "f1",
        etapa: "Para fechar",
        perguntas: [
          { id: "f1", tipo: "check", titulo: "O que a ICOM precisa melhorar primeiro?", ajuda: "Escolha até 2", opcoes: P.f1, max: 2, obrig: true },
        ],
      });
    }
    return lista;
  }

  // ---------- render ----------
  function render() {
    const lista = etapas();
    if (passo >= lista.length) passo = lista.length - 1;
    const e = lista[passo];
    const total = caminho(r.situacao) ? lista.length : 6;
    barra.style.width = `${Math.round((passo / total) * 100)}%`;

    if (e.render) {
      app.innerHTML = e.render();
    } else {
      app.innerHTML =
        `<div class="etapa">${esc(e.etapa)}</div>` +
        e.perguntas.filter((q) => !q.mostrar || q.mostrar(r)).map(renderPergunta).join("");
    }
    const ultimo = passo === lista.length - 1 && !!caminho(r.situacao);
    app.insertAdjacentHTML(
      "beforeend",
      `<div class="acoes"><div class="in">
        ${passo > 0 ? `<button class="btn" type="button" data-acao="voltar">Voltar</button>` : ""}
        <button class="btn btn-primary" type="button" data-acao="${ultimo ? "enviar" : "avancar"}">${passo === 0 ? "Começar" : ultimo ? "Enviar respostas" : "Continuar"}</button>
      </div></div>`
    );
  }

  function renderInicio() {
    return `
      <h1>Queremos saber o que precisamos corrigir primeiro.</h1>
      <p class="lead">Leva 3 minutos e você pode ser bem direto.</p>
      <div class="aviso">São perguntas rápidas sobre as ferramentas, os resultados e o atendimento. Todo mundo recebe o mesmo brinde ao final, seja qual for a resposta.</div>`;
  }

  function renderPergunta(q) {
    const err = erros[q.id];
    const cab = q.titulo ? `<p class="titulo">${esc(q.titulo)}</p>${q.ajuda ? `<p class="ajuda">${esc(q.ajuda)}</p>` : ""}` : "";
    let corpo = "";
    switch (q.tipo) {
      case "aviso":
        return `<div class="aviso">${esc(q.texto)}</div>`;
      case "texto":
      case "tel":
        corpo = `<input type="${q.tipo === "tel" ? "tel" : "text"}" ${q.tipo === "tel" ? 'inputmode="tel" autocomplete="tel"' : ""} data-campo="${q.id}" value="${esc(r[q.id] || "")}" placeholder="${esc(q.placeholder || "")}">`;
        break;
      case "area":
        corpo = `<textarea data-campo="${q.id}" placeholder="${esc(q.placeholder || "")}">${esc(r[q.id] || "")}</textarea>`;
        break;
      case "radio":
      case "check": {
        const sel = q.tipo === "check" ? r[q.id] || [] : [r[q.id]];
        const cheio = q.max && sel.length >= q.max;
        corpo =
          `<div class="opcoes" role="${q.tipo === "radio" ? "radiogroup" : "group"}">` +
          q.opcoes
            .map((o) => {
              const marcado = sel.includes(o);
              const desab = q.tipo === "check" && cheio && !marcado;
              return `<label class="opt${desab ? " desab" : ""}"><input type="${q.tipo === "radio" ? "radio" : "checkbox"}" name="${q.id}" value="${esc(o)}" ${marcado ? "checked" : ""} ${desab ? "disabled" : ""}><span>${esc(o)}</span></label>`;
            })
            .join("") +
          `</div>`;
        if (q.outro && sel.includes(q.outro.valor))
          corpo += `<div class="campo"><label for="f_${q.outro.campo}">Qual?</label><input id="f_${q.outro.campo}" type="text" data-campo="${q.outro.campo}" value="${esc(r[q.outro.campo] || "")}"></div>`;
        break;
      }
      case "escala":
        corpo =
          `<div class="escala" role="radiogroup">` +
          Array.from({ length: 11 }, (_, n) => `<label><input type="radio" name="${q.id}" value="${n}" ${String(r[q.id]) === String(n) ? "checked" : ""}>${n}</label>`).join("") +
          `</div><div class="escala-legenda"><span>0 · não recomendaria</span><span>10 · com certeza</span></div>`;
        break;
      case "matriz":
        corpo =
          `<div class="matriz">` +
          q.linhas
            .map((linha) => {
              const atual = (r.a2 || {})[linha];
              return `<div class="linha"><div class="nome">${esc(linha)}</div><div class="chips">` +
                q.opcoes.map((o) => `<label class="chip"><input type="radio" name="a2::${esc(linha)}" value="${esc(o)}" ${atual === o ? "checked" : ""}>${esc(o)}</label>`).join("") +
                `</div></div>`;
            })
            .join("") +
          `</div>`;
        break;
    }
    return `<section class="q${err ? " erro" : ""}" id="q_${q.id}">${cab}${corpo}${err ? `<div class="msg-erro">${esc(err)}</div>` : ""}</section>`;
  }

  // ---------- eventos ----------
  app.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.dataset.campo) {
      r[el.dataset.campo] = el.value;
    }
  });

  app.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el.name) return;
    if (el.name.startsWith("a2::")) {
      r.a2 = r.a2 || {};
      r.a2[el.name.slice(4)] = el.value;
    } else if (el.type === "checkbox") {
      const q = perguntaAtual(el.name);
      let v = r[el.name] || [];
      if (el.checked) {
        if (q && q.exclusivo) v = el.value === q.exclusivo ? [q.exclusivo] : v.filter((x) => x !== q.exclusivo);
        v = v.concat(el.value);
      } else v = v.filter((x) => x !== el.value);
      r[el.name] = [...new Set(v)];
    } else if (el.type === "radio") {
      r[el.name] = el.name === "a1" || el.name === "b8" ? Number(el.value) : el.value;
    }
    delete erros[el.name.split("::")[0]];
    const foco = el.name + "|" + el.value;
    render();
    const alvo = [...app.querySelectorAll("input")].find((i) => i.name + "|" + i.value === foco);
    if (alvo) alvo.focus({ preventScroll: true });
  });

  app.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-acao]");
    if (!b) return;
    const acao = b.dataset.acao;
    if (acao === "voltar") { passo--; erros = {}; render(); scrollTo(0, 0); }
    if (acao === "avancar" || acao === "enviar") {
      if (!validar()) return;
      if (etapas()[passo].id === "comum") { r._tinhaWhats = !!(r.whatsapp || "").trim(); r._tinhaClinica = !!(r.clinica || "").trim(); }
      if (acao === "enviar") return enviar();
      passo++; render(); scrollTo(0, 0);
    }
    if (acao === "nova") { r = novaResposta(); passo = 0; erros = {}; render(); scrollTo(0, 0); }
  });

  function perguntaAtual(id) {
    const e = etapas()[passo];
    return (e.perguntas || []).find((q) => q.id === id);
  }

  function validar() {
    const e = etapas()[passo];
    erros = {};
    for (const q of e.perguntas || []) {
      if (!q.obrig || (q.mostrar && !q.mostrar(r))) continue;
      const v = r[q.id];
      if (q.tipo === "matriz") {
        const faltam = q.linhas.filter((l) => !(r.a2 || {})[l]);
        if (faltam.length) erros[q.id] = `Falta responder: ${faltam.join(", ")}`;
      } else if (v == null || v === "" || (Array.isArray(v) && !v.length)) {
        erros[q.id] = "Responda esta pergunta para continuar.";
      }
    }
    if (Object.keys(erros).length) {
      render();
      const primeiro = app.querySelector(".q.erro");
      if (primeiro) primeiro.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  // ---------- envio ----------
  function montarRegistro() {
    const cam = caminho(r.situacao);
    const reg = {};
    COLUNAS.forEach((c) => (reg[c] = ""));
    Object.assign(reg, {
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random().toString(16).slice(2),
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
    const brinde = MODO === "qr" ? `<div class="aviso">Mostre esta tela na mesa da ICOM para retirar o seu brinde.</div>` : "";
    const ex = reg.caminho === "B" && reg.b9 === "Sim" ? "<p>Vamos te procurar quando a correção estiver pronta.</p>" : "";
    app.innerHTML = `
      <div class="fim">
        <div class="check" aria-hidden="true">✓</div>
        <h1>Obrigado pela franqueza.</h1>
        <p class="lead">Sua resposta vai direto para a equipe que corrige.</p>
        ${ex}${brinde}
        <p><button class="btn btn-primary" type="button" data-acao="nova">${MODO === "entrevista" ? "Nova entrevista" : "Responder de novo (outra pessoa)"}</button></p>
      </div>`;
    scrollTo(0, 0);
    descarregarFila();
  }

  let enviando = false;
  async function descarregarFila() {
    const url = CFG.APPS_SCRIPT_URL;
    let fila = lerFila();
    atualizarAvisoFila(fila.length, !url);
    if (!url || enviando || !fila.length) return;
    enviando = true;
    try {
      for (const reg of fila.slice()) {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ acao: "responder", resposta: reg }),
        });
        const json = await resp.json();
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

  function atualizarAvisoFila(n, semUrl) {
    if (!n) { filaEl.hidden = true; return; }
    filaEl.hidden = false;
    filaEl.textContent = semUrl
      ? `${n} resposta(s) guardada(s) só neste aparelho — configure o APPS_SCRIPT_URL`
      : `${n} resposta(s) aguardando envio — sem conexão, tentando de novo`;
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
