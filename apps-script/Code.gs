/**
 * Backend da Pesquisa de qualidade ICOM.
 * Grava cada resposta em uma linha da aba "Respostas" e entrega os dados ao dashboard.
 *
 * Instalação (detalhes no README):
 * 1. Crie uma Planilha Google > Extensões > Apps Script > cole este arquivo.
 * 2. Configurações do projeto > Propriedades do script: DASHBOARD_KEY = <senha do painel>.
 *    A senha fica só aqui, nunca no repositório (ele é público).
 * 3. Implantar > Nova implantação > App da Web: executar como "Eu", acesso "Qualquer pessoa".
 * 4. Cole a URL /exec em config.js (APPS_SCRIPT_URL).
 */

const ABA = 'Respostas';

// Mesma ordem de assets/pesquisa.js (COLUNAS) + recebido_em, que o servidor preenche.
const COLUNAS = [
  'id', 'criado_em', 'recebido_em', 'evento', 'modo', 'entrevistador',
  'clinica', 'whatsapp', 'funcao', 'funcao_outra', 'situacao', 'caminho', 'produtos', 'produto_outro',
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a7_outro', 'a8', 'a9',
  'b1', 'b2', 'b2_outro', 'b3', 'b4', 'b5', 'b6', 'b6_outro', 'b7', 'b8', 'b9',
  'f1', 'cor', 'motivo_cor',
  // Colunas de acompanhamento, preenchidas pela equipe na planilha ou pelo dashboard.
  'responsavel', 'status_contato',
];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.acao === 'responder') return json_(salvarResposta_(body.resposta));
    if (body.acao === 'atribuir') return json_(atribuir_(body));
    return json_({ ok: false, erro: 'ação desconhecida' });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === 'ping') return json_({ ok: true });
  if (!chaveValida_(p.key)) return json_({ ok: false, erro: 'chave inválida' });
  return json_({ ok: true, respostas: lerRespostas_() });
}

function salvarResposta_(r) {
  if (!r || !r.id) return { ok: false, erro: 'resposta sem id' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = aba_();
    // Evita duplicar quando o aparelho reenvia a fila.
    const ultima = sh.getLastRow();
    if (ultima > 1) {
      const ids = sh.getRange(2, 1, ultima - 1, 1).getValues().flat();
      if (ids.indexOf(r.id) !== -1) return { ok: true, duplicada: true };
    }
    r.recebido_em = new Date().toISOString();
    const linha = COLUNAS.map(function (c) {
      const v = r[c] == null ? '' : r[c];
      // Impede que textos começando com = + - @ virem fórmula na planilha.
      return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
    });
    sh.appendRow(linha);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function atribuir_(body) {
  if (!chaveValida_(body.key)) return { ok: false, erro: 'chave inválida' };
  const sh = aba_();
  const ultima = sh.getLastRow();
  if (ultima < 2) return { ok: false, erro: 'sem respostas' };
  const ids = sh.getRange(2, 1, ultima - 1, 1).getValues().flat();
  const i = ids.indexOf(body.id);
  if (i === -1) return { ok: false, erro: 'id não encontrado' };
  const row = i + 2;
  if (body.responsavel != null) sh.getRange(row, COLUNAS.indexOf('responsavel') + 1).setValue(String(body.responsavel));
  if (body.status_contato != null) sh.getRange(row, COLUNAS.indexOf('status_contato') + 1).setValue(String(body.status_contato));
  return { ok: true };
}

function lerRespostas_() {
  const sh = aba_();
  const valores = sh.getDataRange().getValues();
  const cab = valores.shift();
  return valores.map(function (linha) {
    const o = {};
    cab.forEach(function (c, i) {
      const v = linha[i];
      o[c] = v instanceof Date ? v.toISOString() : v;
    });
    return o;
  });
}

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) sh = ss.insertSheet(ABA);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUNAS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
  }
  return sh;
}

// Depois de 10 senhas erradas em 15 minutos o painel fica bloqueado por 15 minutos,
// para que ninguém descubra a senha tentando todas as combinações.
const MAX_ERROS = 10;
const JANELA_S = 15 * 60;

function chaveValida_(key) {
  const certa = PropertiesService.getScriptProperties().getProperty('DASHBOARD_KEY');
  if (!certa) return false;
  const cache = CacheService.getScriptCache();
  const erros = Number(cache.get('erros_senha') || 0);
  if (erros >= MAX_ERROS) return false;
  if (key === certa) return true;
  cache.put('erros_senha', String(erros + 1), JANELA_S);
  return false;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Rode uma vez pelo editor para criar a aba e autorizar o script. */
function configurar() {
  aba_();
  if (!PropertiesService.getScriptProperties().getProperty('DASHBOARD_KEY')) {
    Logger.log('Falta a senha do painel: Configurações do projeto > Propriedades do script > DASHBOARD_KEY.');
  }
}
