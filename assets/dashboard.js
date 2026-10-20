(function () {
  const { PRODUTOS, PROBLEMAS, NENHUM, P, lista, classificar, COLUNAS, rpc, configurado } = window.ICOM;
  const CFG = window.ICOM_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const DEMO = !configurado() || params.get("demo") === "1";
  const KEY_STORE = "icom_dash_key";
  const LOCAL_STORE = "icom_dash_acompanhamento"; // responsável/status em modo demo
  const STATUS = ["A contatar", "Em contato", "Resolvido", "Sem retorno"];

  const $ = (id) => document.getElementById(id);
  const painel = $("painel");
  const tip = $("tip");
  let todas = [];
  let abaCasos = "vermelho";
  let atualizadoEm = null;

  // ---------- tema ----------
  const temaSalvo = ler("icom_tema");
  if (temaSalvo) document.documentElement.dataset.theme = temaSalvo;
  $("btnTema").onclick = () => {
    const escuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = escuro ? "light" : "dark";
    gravar("icom_tema", document.documentElement.dataset.theme);
  };

  // ---------- dados ----------
  async function carregar() {
    if (DEMO) {
      todas = window.ICOM_DEMO.map((r) => ({ ...r, ...(lerLocal()[r.id] || {}) }));
      return finalizarCarga();
    }
    const key = ler(KEY_STORE);
    if (!key) return pedirChave();
    try {
      $("status").textContent = "Atualizando…";
      const json = await rpc("listar_respostas", { senha: key });
      if (!json.ok) {
        if (/senha/.test(json.erro || "")) { remover(KEY_STORE); return pedirChave(true); }
        throw new Error(json.erro);
      }
      todas = json.respostas;
      finalizarCarga();
    } catch (e) {
      $("status").textContent = `Erro ao carregar: ${e.message}. Tentando de novo em 60 s.`;
    }
  }

  function finalizarCarga() {
    // A cor é sempre recalculada com a regra atual, não confiamos no valor gravado.
    todas.forEach((r) => Object.assign(r, { _c: classificar(r), _a1: num(r.a1), _b8: num(r.b8) }));
    atualizadoEm = new Date();
    preencherFiltros();
    desenhar();
  }

  function pedirChave(erro) {
    $("chave").hidden = false;
    $("erroChave").hidden = !erro;
    $("inChave").focus();
  }
  $("formChave").onsubmit = (ev) => {
    ev.preventDefault();
    gravar(KEY_STORE, $("inChave").value.trim());
    $("chave").hidden = true;
    carregar();
  };

  // ---------- filtros ----------
  function preencherFiltros() {
    opcoesSelect($("fEvento"), [...new Set(todas.map((r) => r.evento).filter(Boolean))]);
    opcoesSelect($("fFuncao"), P.funcao);
    opcoesSelect($("fProduto"), PRODUTOS);
  }
  function opcoesSelect(sel, valores) {
    const atual = sel.value;
    const primeira = sel.options[0].outerHTML;
    sel.innerHTML = primeira + valores.map((v) => `<option>${esc(v)}</option>`).join("");
    sel.value = valores.includes(atual) ? atual : "";
  }
  ["fEvento", "fCaminho", "fFuncao", "fProduto"].forEach((id) => ($(id).onchange = desenhar));

  function filtradas() {
    const ev = $("fEvento").value, ca = $("fCaminho").value, fu = $("fFuncao").value, pr = $("fProduto").value;
    return todas.filter((r) =>
      (!ev || r.evento === ev) && (!ca || r.caminho === ca) && (!fu || r.funcao === fu) && (!pr || lista(r.produtos).includes(pr))
    );
  }

  // ---------- desenho ----------
  function desenhar() {
    const rs = filtradas();
    const A = rs.filter((r) => r.caminho === "A");
    const B = rs.filter((r) => r.caminho === "B");
    $("status").innerHTML =
      (DEMO ? `<span class="demo">Demonstração · dados fictícios</span> · ` : "") +
      `${rs.length} respostas` +
      (atualizadoEm ? ` · atualizado às ${hora(atualizadoEm)}` : "") +
      (DEMO ? "" : " · atualiza sozinho a cada minuto");

    painel.innerHTML =
      kpis(rs, A, B) +
      cardCasos(rs) +
      `<div class="secao">Ajuste rápido</div>` +
      cardAjuste(A) +
      cardNps(A, B) +
      `<div class="secao">Clientes atuais · caminho A (${A.length})</div>` +
      cardProdutos(A) +
      cardBarrasSimples("s6", "Intenção para os próximos 3 meses (A6)", "Reduzir ou cancelar = vermelho na regra de criticidade.", A, "a6", P.a6) +
      cardBarrasSimples("s6", "O retorno compensa o investimento? (A5)", "Black com “Não compensa” = vermelho.", A, "a5", P.a5) +
      cardTese(A) +
      `<div class="secao">Ex-clientes · caminho B (${B.length})</div>` +
      cardBarrasSimples("s6", "Principal motivo da saída (B2)", "Só uma resposta por pessoa.", B, "b2", P.b2) +
      cardBarrasSimples("s6", "Produto que mais pesou na decisão (B3)", "", B, "b3", PRODUTOS, true) +
      cardBarrasSimples("s4", "Alguém tentou resolver antes da saída? (B4)", "Avalia a fila de retenção.", B, "b4", P.b4) +
      cardBarrasSimples("s4", "O que usa no lugar (B6)", "", B, "b6", P.b6) +
      cardVoltaria(B) +
      `<div class="secao">Prioridade · todos</div>` +
      cardF1(A, B) +
      cardBarrasSimples("s4", "Função de quem respondeu", "Recepção opera IA e Discador; o dono julga o retorno.", rs, "funcao", P.funcao) +
      `<div class="secao">Em palavras do cliente</div>` +
      cardTextos("Se pudéssemos corrigir UMA coisa (A8)", A, "a8") +
      cardTextos("O que teria feito você ficar (B5)", B, "b5");
  }

  function kpis(rs, A, B) {
    const verm = rs.filter((r) => r._c.cor === "vermelho").length;
    const amar = rs.filter((r) => r._c.cor === "amarelo").length;
    const saindo = A.filter((r) => r.a6 === "Reduzir o plano" || r.a6 === "Cancelar").length;
    const npsA = nps(A.map((r) => r._a1)), npsB = nps(B.map((r) => r._b8));
    const tile = (rot, val, det) => `<div class="kpi"><div class="rot">${rot}</div><div class="val">${val}</div><div class="det">${det}</div></div>`;
    return `<div class="kpis">
      ${tile("Respostas", rs.length, `${A.length} clientes atuais · ${B.length} ex-clientes`)}
      ${tile(`<span class="badge vermelho">Vermelho</span>`, verm, "contato em 24 h")}
      ${tile(`<span class="badge amarelo">Amarelo</span>`, amar, "contato em 72 h")}
      ${tile("NPS clientes atuais", npsA.n ? sinal(npsA.v) : "—", npsA.n ? `${npsA.n} notas · ${npsA.det}% detratores` : "sem notas")}
      ${tile("NPS ex-clientes", npsB.n ? sinal(npsB.v) : "—", npsB.n ? `${npsB.n} notas · ${npsB.det}% detratores` : "sem notas")}
      ${tile("Pretendem reduzir ou cancelar", A.length ? pct(saindo, A.length) + "%" : "—", `${saindo} de ${A.length} clientes atuais`)}
    </div>`;
  }

  // ----- casos vermelho/amarelo -----
  function cardCasos(rs) {
    const ordem = { vermelho: 0, amarelo: 1, verde: 2 };
    const cont = { vermelho: 0, amarelo: 0 };
    rs.forEach((r) => cont[r._c.cor] != null && cont[r._c.cor]++);
    const casos = rs
      .filter((r) => (abaCasos === "todos" ? r._c.cor !== "verde" : r._c.cor === abaCasos))
      .sort((a, b) => ordem[a._c.cor] - ordem[b._c.cor] || /diretoria/.test(b._c.dono_prazo) - /diretoria/.test(a._c.dono_prazo) || String(a.criado_em).localeCompare(String(b.criado_em)));
    const aba = (id, rot) => `<button type="button" data-aba="${id}" aria-pressed="${abaCasos === id}">${rot}</button>`;
    const linhas = casos.map((r) => {
      const st = r.status_contato || "A contatar";
      const contato = r.whatsapp
        ? `<a href="https://wa.me/55${String(r.whatsapp).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "")}" target="_blank" rel="noopener">${esc(r.whatsapp)}</a>`
        : `<span class="muted">sem contato (anônimo)</span>`;
      return `<tr class="${st === "Resolvido" ? "feito" : ""}">
        <td><span class="badge ${r._c.cor}">${r._c.cor === "vermelho" ? "Vermelho" : "Amarelo"}</span></td>
        <td><strong>${esc(r.clinica || "—")}</strong><br>${contato}</td>
        <td>${esc(r.funcao)}<br><span class="muted">${esc(r.situacao)}</span></td>
        <td>${esc(r._c.motivo)}${r.a8 || r.b5 ? `<br><span class="muted">“${esc(r.a8 || r.b5)}”</span>` : ""}</td>
        <td>${esc(r._c.dono_prazo)}<br><span class="muted">resp. ${hora(new Date(r.criado_em))}${r.entrevistador ? " · " + esc(r.entrevistador) : ""}</span></td>
        <td><input type="text" data-id="${esc(r.id)}" data-campo="responsavel" value="${esc(r.responsavel || "")}" placeholder="Quem liga?" aria-label="Responsável"></td>
        <td><select data-id="${esc(r.id)}" data-campo="status_contato" aria-label="Status do contato">${STATUS.map((s) => `<option ${s === st ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      </tr>`;
    }).join("");
    return `<section class="card s12">
      <h2>Fila de contato</h2>
      <p class="nota">Leia os vermelhos no fim do dia e saia do evento com um responsável em cada linha. Vermelho entra na sala de guerra de retenção no dia seguinte.</p>
      <div class="abas">${aba("vermelho", `Vermelhos (${cont.vermelho})`)}${aba("amarelo", `Amarelos (${cont.amarelo})`)}${aba("todos", "Todos")}</div>
      ${casos.length ? `<div class="tabela-wrap"><table class="casos">
        <thead><tr><th>Cor</th><th>Clínica / contato</th><th>Função / situação</th><th>Por quê</th><th>Prazo</th><th>Responsável</th><th>Status</th></tr></thead>
        <tbody>${linhas}</tbody></table></div>` : `<p class="vazio">Nenhum caso nesta cor com os filtros atuais.</p>`}
    </section>`;
  }

  painel.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-aba]");
    if (b) { abaCasos = b.dataset.aba; desenhar(); }
  });
  painel.addEventListener("change", async (ev) => {
    const el = ev.target;
    if (!el.dataset.id) return;
    const r = todas.find((x) => String(x.id) === el.dataset.id);
    if (!r) return;
    r[el.dataset.campo] = el.value;
    if (el.dataset.campo === "status_contato") el.closest("tr").classList.toggle("feito", el.value === "Resolvido");
    if (DEMO) {
      const loc = lerLocal();
      loc[r.id] = { ...(loc[r.id] || {}), [el.dataset.campo]: el.value };
      return gravar(LOCAL_STORE, JSON.stringify(loc));
    }
    try {
      const json = await rpc("atribuir", { senha: ler(KEY_STORE), resposta_id: r.id, [el.dataset.campo]: el.value });
      if (!json.ok) throw new Error(json.erro);
    } catch (e) {
      alert("Não foi possível salvar: " + e.message);
    }
  });

  // ----- ajuste rápido (A3 x A4) -----
  function cardAjuste(A) {
    const linhas = PROBLEMAS.map((p) => {
      const marcaram = A.filter((r) => lista(r.a3).includes(p.texto));
      const semana = marcaram.filter((r) => r.a4 === "Toda semana").length;
      return { ...p, total: marcaram.length, semana, outras: marcaram.length - semana };
    }).sort((a, b) => b.semana - a.semana || b.total - a.total);
    const max = Math.max(1, ...linhas.map((l) => l.total));
    const nenhum = A.filter((r) => lista(r.a3).includes(NENHUM)).length;
    const corpo = linhas.map((l, i) => `<tr class="${i < 3 && l.total ? "top" : ""}">
        <td class="pos">${i + 1}</td>
        <td>${esc(l.texto)}</td>
        <td style="width:28%"><div class="trilho">
          ${l.semana ? `<div class="seg" style="width:${(l.semana / max) * 100}%;background:var(--series-1)" data-tip="${esc(l.texto)}: ${l.semana} marcaram com problema toda semana"></div>` : ""}
          ${l.outras ? `<div class="seg" style="width:${(l.outras / max) * 100}%;background:var(--series-2)" data-tip="${esc(l.texto)}: ${l.outras} marcaram, frequência menor"></div>` : ""}
        </div></td>
        <td class="n"><strong>${l.semana}</strong> / ${l.total}</td>
        <td class="acao col-acao">${esc(l.acao)}</td>
      </tr>`).join("");
    return `<section class="card s8">
      <h2>Fila de ajuste rápido (A3)</h2>
      <p class="nota">Ordenado pelo problema mais marcado por quem diz que o problema grave acontece toda semana (A4). O 1º da lista é o primeiro da fila. ${nenhum} cliente(s) marcaram “${NENHUM}”.</p>
      <div class="legenda"><span><i style="background:var(--series-1)"></i>Toda semana</span><span><i style="background:var(--series-2)"></i>Algumas vezes por mês ou uma vez</span></div>
      <div class="tabela-wrap"><table class="ajuste">
        <thead><tr><th>#</th><th>Problema</th><th></th><th class="n">semana / total</th><th class="col-acao">Ação do plano</th></tr></thead>
        <tbody>${corpo}</tbody></table></div>
    </section>`;
  }

  function cardNps(A, B) {
    const hist = (vals) => {
      const c = Array(11).fill(0);
      vals.forEach((v) => v != null && c[v]++);
      const m = Math.max(1, ...c);
      return `<div class="hist">${c.map((n, i) => `<div style="height:${(n / m) * 100}%" data-tip="Nota ${i}: ${n} resposta(s)"></div>`).join("")}</div>
        <div class="hist-x">${c.map((_, i) => `<span>${i}</span>`).join("")}</div>`;
    };
    const na = nps(A.map((r) => r._a1)), nb = nps(B.map((r) => r._b8));
    return `<section class="card s4">
      <h2>Notas de 0 a 10</h2>
      <p class="nota">Clientes atuais (A1) · NPS ${na.n ? sinal(na.v) : "—"}</p>
      ${hist(A.map((r) => r._a1))}
      <p class="nota" style="margin-top:18px">Ex-clientes (B8) · NPS ${nb.n ? sinal(nb.v) : "—"}</p>
      ${hist(B.map((r) => r._b8))}
    </section>`;
  }

  // ----- A2 saúde dos produtos -----
  function cardProdutos(A) {
    const cont = {};
    A.forEach((r) =>
      lista(r.a2).forEach((item) => {
        const i = item.lastIndexOf(": ");
        if (i < 0) return;
        let prod = item.slice(0, i);
        if (prod.startsWith("Outro")) prod = "Outro";
        const st = item.slice(i + 2);
        cont[prod] = cont[prod] || { [P.a2[0]]: 0, [P.a2[1]]: 0, [P.a2[2]]: 0 };
        if (st in cont[prod]) cont[prod][st]++;
      })
    );
    const cores = ["var(--good)", "var(--warning)", "var(--critical)"];
    const itens = PRODUTOS.filter((p) => cont[p])
      .map((p) => {
        const c = cont[p], tot = P.a2.reduce((s, k) => s + c[k], 0);
        return { p, c, tot, ruim: (c[P.a2[1]] + c[P.a2[2]]) / tot };
      })
      .sort((a, b) => b.ruim - a.ruim);
    const corpo = itens.map(({ p, c, tot }) => `<div class="barra">
        <div class="nome">${esc(p)}</div>
        <div class="trilho">${P.a2.map((k, i) => (c[k] ? `<div class="seg" style="width:${(c[k] / tot) * 100}%;background:${cores[i]}" data-tip="${esc(p)} · ${k}: ${c[k]} (${pct(c[k], tot)}%)"></div>` : "")).join("")}</div>
        <div class="num">${pct(c[P.a2[2]], tot)}% não funciona · n=${tot}</div>
      </div>`).join("");
    return `<section class="card s6">
      <h2>Como cada produto está funcionando (A2)</h2>
      <p class="nota">Ordenado pela parcela com problema. 100% = quem usa o produto.</p>
      <div class="legenda">${P.a2.map((k, i) => `<span><i style="background:${cores[i]}"></i>${k}</span>`).join("")}</div>
      ${itens.length ? `<div class="barras">${corpo}</div>` : `<p class="vazio">Sem respostas.</p>`}
    </section>`;
  }

  // ----- A7 tese -----
  function cardTese(A) {
    const c = contar(A, "a7", P.a7, true);
    const ordem = P.a7.filter((o) => o !== "Outro").sort((a, b) => c[b] - c[a]);
    let tese = "Sem respostas suficientes para testar a tese.";
    if (A.length >= 5) {
      const lider = ordem[0], ultimo = ordem[ordem.length - 1];
      tese = lider === "Meu consultor" && ultimo === "A ferramenta"
        ? "<strong>Tese confirmada:</strong> “Meu consultor” lidera e “A ferramenta” fica em último. A ICOM segura pelas pessoas e perde pelas ferramentas."
        : `<strong>Tese não confirmada (ainda):</strong> lidera “${esc(lider)}”, último é “${esc(ultimo)}”.`;
    }
    return cardBarrasSimples("s6", "O que mais faz continuar com a ICOM (A7)", "Até 2 por pessoa. % sobre clientes atuais.", A, "a7", P.a7, false, true, `<div class="tese">${tese}</div>`);
  }

  // ----- B7 x B1 -----
  function cardVoltaria(B) {
    const linhas = P.b1.map((b1) => {
      const g = B.filter((r) => r.b1 === b1);
      return `<tr><td>${esc(b1)}</td>${P.b7.map((v) => `<td class="n">${g.filter((r) => r.b7 === v).length}</td>`).join("")}</tr>`;
    }).join("");
    return `<section class="card s4">
      <h2>Voltaria se resolvesse? (B7)</h2>
      <p class="nota">Por tempo desde o cancelamento (B1). “Sim” com menos de 12 meses entra na lista de recuperação.</p>
      <table class="mini"><thead><tr><th>Cancelou</th>${P.b7.map((v) => `<th class="n" style="text-align:right">${v}</th>`).join("")}</tr></thead><tbody>${linhas}</tbody></table>
    </section>`;
  }

  // ----- F1 atual x ex -----
  function cardF1(A, B) {
    const ca = contar(A, "f1", P.f1, true), cb = contar(B, "f1", P.f1, true);
    const max = Math.max(1, ...P.f1.map((o) => Math.max(pct(ca[o], A.length), pct(cb[o], B.length))));
    const corpo = P.f1.map((o) => {
      const pa = pct(ca[o], A.length), pb = pct(cb[o], B.length);
      return `<div class="barra" style="align-items:start">
        <div class="nome">${esc(o)}</div>
        <div style="display:grid;gap:3px">
          <div class="trilho"><div class="seg" style="width:${(pa / max) * 100}%;background:var(--series-1)" data-tip="Clientes atuais: ${ca[o]} de ${A.length} (${pa}%)"></div></div>
          <div class="trilho"><div class="seg" style="width:${(pb / max) * 100}%;background:var(--series-2)" data-tip="Ex-clientes: ${cb[o]} de ${B.length} (${pb}%)"></div></div>
        </div>
        <div class="num">${pa}% · ${pb}%</div>
      </div>`;
    }).join("");
    return `<section class="card s8">
      <h2>O que a ICOM precisa melhorar primeiro (F1)</h2>
      <p class="nota">Até 2 por pessoa. % de cada grupo. Mostra se quem saiu queria a mesma coisa de quem ficou.</p>
      <div class="legenda"><span><i style="background:var(--series-1)"></i>Clientes atuais (${A.length})</span><span><i style="background:var(--series-2)"></i>Ex-clientes (${B.length})</span></div>
      <div class="barras">${corpo}</div>
    </section>`;
  }

  function cardTextos(titulo, rs, campo) {
    const itens = rs.filter((r) => String(r[campo] || "").trim()).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    return `<section class="card s6">
      <h2>${esc(titulo)}</h2>
      <p class="nota">${itens.length} resposta(s) com texto.</p>
      ${itens.length ? `<ul class="textos">${itens.map((r) => `<li>${esc(r[campo])}<div class="quem"><span class="badge ${r._c.cor}">${r._c.cor}</span>${esc(r.clinica || "anônimo")} · ${esc(r.funcao)}</div></li>`).join("")}</ul>` : `<p class="vazio">Nada ainda.</p>`}
    </section>`;
  }

  // ----- genérico -----
  function cardBarrasSimples(span, titulo, nota, rs, campo, opcoes, ordenar, multi, extra) {
    const c = contar(rs, campo, opcoes, multi);
    let itens = opcoes.map((o) => ({ o, n: c[o] }));
    if (ordenar) itens = itens.filter((i) => i.n).sort((a, b) => b.n - a.n);
    const max = Math.max(1, ...itens.map((i) => i.n));
    const corpo = itens.map(({ o, n }) => `<div class="barra${n ? "" : " vazia"}">
        <div class="nome">${esc(o)}</div>
        <div class="trilho">${n ? `<div class="seg" style="width:${(n / max) * 100}%;background:var(--series-1)" data-tip="${esc(o)}: ${n} (${pct(n, rs.length)}%)"></div>` : ""}</div>
        <div class="num">${n} · ${pct(n, rs.length)}%</div>
      </div>`).join("");
    return `<section class="card ${span}">
      <h2>${esc(titulo)}</h2>
      ${nota ? `<p class="nota">${esc(nota)}</p>` : ""}
      ${rs.length ? `<div class="barras">${corpo}</div>` : `<p class="vazio">Sem respostas.</p>`}
      ${extra || ""}
    </section>`;
  }

  function contar(rs, campo, opcoes, multi) {
    const c = Object.fromEntries(opcoes.map((o) => [o, 0]));
    rs.forEach((r) => (multi ? lista(r[campo]) : [r[campo]]).forEach((v) => {
      if (typeof v === "string" && v.startsWith("Outro:")) v = "Outro";
      if (v in c) c[v]++;
    }));
    return c;
  }

  // ---------- tooltip ----------
  document.addEventListener("mousemove", (ev) => {
    const el = ev.target.closest && ev.target.closest("[data-tip]");
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + 14, y = ev.clientY - h - 10;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y < 8) y = ev.clientY + 16;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  });

  // ---------- CSV ----------
  $("btnCsv").onclick = () => {
    const cols = COLUNAS.concat(["responsavel", "status_contato"]);
    const linhas = [cols.join(";")].concat(
      filtradas().map((r) => cols.map((c) => {
        const v = c === "cor" ? r._c.cor : c === "motivo_cor" ? r._c.motivo : r[c];
        return `"${String(v ?? "").replace(/"/g, '""')}"`;
      }).join(";"))
    );
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pesquisa-icom-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("btnAtualizar").onclick = carregar;

  // ---------- util ----------
  function nps(vals) {
    const v = vals.filter((x) => x != null);
    if (!v.length) return { n: 0 };
    const pro = v.filter((x) => x >= 9).length, det = v.filter((x) => x <= 6).length;
    return { n: v.length, v: Math.round(((pro - det) / v.length) * 100), det: pct(det, v.length) };
  }
  function num(v) { return v === "" || v == null || isNaN(Number(v)) ? null : Number(v); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function sinal(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n); }
  function hora(d) { return isNaN(d) ? "" : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function lerLocal() { try { return JSON.parse(ler(LOCAL_STORE) || "{}"); } catch { return {}; } }
  function ler(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch {} }
  function remover(k) { try { localStorage.removeItem(k); } catch {} }

  carregar();
  if (!DEMO) setInterval(() => {
    // não recarrega enquanto alguém digita na fila de contato
    if (!painel.contains(document.activeElement)) carregar();
  }, 60000);
})();
