# Pesquisa de qualidade ICOM — encontro com clientes

Formulário de 3 minutos para o encontro com clientes e um painel para acompanhar as respostas em tempo real, seguindo a diretriz *"Pesquisa de qualidade ICOM — encontro com clientes"*.

| Página | Para quê |
|---|---|
| `index.html` | Formulário no celular (QR code nas mesas). Bloco comum → Caminho A (clientes atuais) ou B (ex-clientes) → pergunta final F1. |
| `index.html?modo=entrevista` | Mesmo formulário para os tablets dos entrevistadores; marca a resposta como entrevista e troca o botão final por "Nova entrevista". |
| `dashboard.html` | Painel: fila de contato vermelho/amarelo com responsável e status, fila de ajuste rápido (A3 × A4 → ação do plano), saúde dos produtos, A5/A6/A7, motivos de saída, F1 atual × ex-cliente, textos livres, exportação CSV. |


## Como funciona

```
Celular / tablet ──rpc responder()──────────▶ Supabase (tabela respostas)
dashboard.html ──rpc listar_respostas(senha)──┘   atribuir(senha, ...)
```

- **Banco**: projeto Supabase `pesquisaicom` (São Paulo). O schema está em `supabase/migrations/`.
- **Segurança**: o site usa só a chave publicável do Supabase (`config.js`). As tabelas têm RLS ligado e nenhum acesso direto; o navegador só chama três funções. `responder` grava uma resposta (qualquer pessoa); `listar_respostas` e `atribuir` exigem a senha do painel, guardada no banco como hash bcrypt. Depois de 10 senhas erradas em 15 minutos, o painel bloqueia por 15 minutos.
- **Coleta**: cada resposta recebe um `id` e vai para uma fila no aparelho antes de ser enviada. Se a internet do evento cair, o formulário continua funcionando e reenvia sozinho (a cada 30 s e quando a conexão volta). Reenvios do mesmo `id` são ignorados.
- **Privacidade**: nome da clínica e WhatsApp são opcionais, e o formulário avisa que preenchê-los tira o anonimato.
- **Criticidade**: a regra da diretriz está em `assets/pesquisa.js` (`classificar`). O painel recalcula a cor de toda resposta com a regra atual.

| Cor | Quando | Prazo |
|---|---|---|
| Vermelho | A6 = Reduzir ou Cancelar; ou A1 de 0 a 6 com A4 = Toda semana; ou Black com A5 = Não compensa | 24 h (Black pela diretoria) |
| Amarelo | A1 de 7 a 8 com algum problema em A3; ou ex-cliente com B7 = Sim e saída há menos de 12 meses | 72 h |
| Verde | Demais | Só contagem |

## No ar

- Formulário: https://pesquisaicom.netlify.app (`?modo=entrevista` nos tablets, `?evento=nome` para separar eventos)
- Painel: https://pesquisaicom.netlify.app/dashboard.html (`?demo=1` mostra dados fictícios)
- Publicar mudanças: `netlify deploy --prod --dir .`

**Trocar a senha do painel** — no SQL Editor do Supabase:

```sql
select public.definir_senha('nova-senha');
```

**Ver as respostas em planilha** — botão *Exportar CSV* no painel, ou *Table Editor → respostas* no Supabase.

### Antes do evento
- Gere o QR code apontando para a URL do formulário.
- Faça uma resposta de teste com `?evento=teste`, confira no painel e apague depois (`delete from respostas where evento = 'teste';`).
- Peça aos consultores a lista de ex-clientes confirmados (eles são abordados pessoalmente, nunca só por QR).

### No fim do dia
Abra o painel → **Fila de contato → Vermelhos**, preencha *Responsável* em cada linha e use a **Fila de ajuste rápido**: o problema mais marcado por quem tem problema toda semana é o primeiro da fila.

## Rodar localmente

```bash
npx serve .
```

Abra `http://localhost:3000/dashboard.html` (demonstração) ou `http://localhost:3000/?modo=entrevista`. `dashboard.html?demo=1` força a demonstração mesmo com a URL configurada.

## Estrutura

```
index.html            formulário
dashboard.html        painel
config.js             URL e chave publicável do Supabase, evento padrão
assets/pesquisa.js    perguntas, opções, mapa problema → ação e regra de criticidade (fonte única)
assets/form.js        lógica do formulário e fila offline
assets/dashboard.js   painel
assets/demo.js        dados fictícios do modo demonstração
supabase/migrations/  tabela, funções e regras de acesso
```

Para mudar uma opção de resposta, edite `assets/pesquisa.js`: formulário e painel acompanham. Respostas antigas com o texto anterior deixam de ser contadas na opção nova.
