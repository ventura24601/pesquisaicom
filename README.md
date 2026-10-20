# Pesquisa de qualidade ICOM — encontro com clientes

Formulário de 3 minutos para o encontro com clientes e um painel para acompanhar as respostas em tempo real, seguindo a diretriz *"Pesquisa de qualidade ICOM — encontro com clientes"*.

| Página | Para quê |
|---|---|
| `index.html` | Formulário no celular (QR code nas mesas). Bloco comum → Caminho A (clientes atuais) ou B (ex-clientes) → pergunta final F1. |
| `index.html?modo=entrevista` | Mesmo formulário para os tablets dos entrevistadores; pede o nome de quem entrevista e lembra as regras (não entrevistar a própria carteira, não vender de volta para ex-cliente). |
| `dashboard.html` | Painel: fila de contato vermelho/amarelo com responsável e status, fila de ajuste rápido (A3 × A4 → ação do plano), saúde dos produtos, A5/A6/A7, motivos de saída, F1 atual × ex-cliente, textos livres, exportação CSV. |

Sem nenhuma configuração o painel abre em **modo demonstração** com dados fictícios, e o formulário guarda as respostas só no aparelho.

## Como funciona

```
Celular / tablet ──POST──▶ Google Apps Script ──▶ Planilha Google (aba "Respostas")
                                     ▲
dashboard.html ──GET + chave─────────┘
```

- **Coleta**: cada resposta recebe um `id` e vai para uma fila no aparelho antes de ser enviada. Se a internet do evento cair, o formulário continua funcionando e reenvia sozinho (a cada 30 s e quando a conexão volta). O Apps Script ignora reenvios do mesmo `id`.
- **Privacidade**: nome da clínica e WhatsApp são opcionais, e o formulário avisa que preenchê-los tira o anonimato. O painel só lê os dados com a chave `DASHBOARD_KEY`, que não fica no repositório.
- **Criticidade**: a regra da diretriz está em `assets/pesquisa.js` (`classificar`). O painel recalcula a cor de toda resposta com a regra atual; a coluna `cor` da planilha é só para quem lê a planilha direto.

| Cor | Quando | Prazo |
|---|---|---|
| Vermelho | A6 = Reduzir ou Cancelar; ou A1 de 0 a 6 com A4 = Toda semana; ou Black com A5 = Não compensa | 24 h (Black pela diretoria) |
| Amarelo | A1 de 7 a 8 com algum problema em A3; ou ex-cliente com B7 = Sim e saída há menos de 12 meses | 72 h |
| Verde | Demais | Só contagem |

## Colocar no ar (≈10 minutos)

### 1. Planilha + Apps Script
1. Crie uma Planilha Google (ex.: *Pesquisa ICOM — respostas*).
2. **Extensões → Apps Script**, apague o conteúdo e cole `apps-script/Code.gs`. Salve.
3. No editor, selecione a função `configurar` e clique em **Executar**. Autorize. Ela cria a aba `Respostas` e gera a `DASHBOARD_KEY` — copie a chave do **Registro de execução** (ou defina a sua em *Configurações do projeto → Propriedades do script*).
4. **Implantar → Nova implantação → App da Web**: *Executar como*: **Eu**; *Quem pode acessar*: **Qualquer pessoa**. Copie a URL que termina em `/exec`.

> Ao alterar o `Code.gs`, use **Implantar → Gerenciar implantações → Editar → Nova versão** para manter a mesma URL.

### 2. Site (GitHub Pages)
1. Em `config.js`, cole a URL em `APPS_SCRIPT_URL` e faça commit.
2. No GitHub: **Settings → Pages → Deploy from a branch → `main` / root**.
3. O formulário fica em `https://ventura24601.github.io/pesquisaicom/` e o painel em `.../dashboard.html` (pede a chave no primeiro acesso).

### 3. Antes do evento
- Gere o QR code apontando para a URL do formulário. Para separar eventos, use `?evento=nome-do-evento`.
- Nos tablets, abra `...?modo=entrevista` (o nome do entrevistador fica salvo no aparelho).
- Faça uma resposta de teste e confira se ela aparece no painel e na planilha; depois apague a linha de teste da planilha.
- Peça aos consultores a lista de ex-clientes confirmados (eles são abordados pessoalmente, nunca só por QR).

### No fim do dia
Abra o painel → **Fila de contato → Vermelhos**, preencha *Responsável* em cada linha (grava na planilha, colunas `responsavel` e `status_contato`) e use a **Fila de ajuste rápido**: o problema mais marcado por quem tem problema toda semana é o primeiro da fila.

## Rodar localmente

```bash
npx serve .
```

Abra `http://localhost:3000/dashboard.html` (demonstração) ou `http://localhost:3000/?modo=entrevista`. `dashboard.html?demo=1` força a demonstração mesmo com a URL configurada.

## Estrutura

```
index.html            formulário
dashboard.html        painel
config.js             URL do Apps Script e evento padrão
assets/pesquisa.js    perguntas, opções, mapa problema → ação e regra de criticidade (fonte única)
assets/form.js        lógica do formulário e fila offline
assets/dashboard.js   painel
assets/demo.js        dados fictícios do modo demonstração
apps-script/Code.gs   backend (Planilha Google)
```

Para mudar uma opção de resposta, edite `assets/pesquisa.js`: formulário e painel acompanham. Respostas antigas com o texto anterior deixam de ser contadas na opção nova.
