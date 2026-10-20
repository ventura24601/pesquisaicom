-- Pesquisa de qualidade ICOM.
-- O navegador usa só a chave pública (anon) e nunca acessa as tabelas direto:
--   responder(resposta)            grava uma resposta (qualquer pessoa)
--   listar_respostas(senha)        lê tudo (painel, exige senha)
--   atribuir(senha, id, ...)       responsável/status do contato (painel, exige senha)
-- A senha fica só no banco, como hash bcrypt (veja definir_senha no fim).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.respostas (
  id uuid primary key,
  criado_em timestamptz,
  recebido_em timestamptz not null default now(),
  evento text, modo text, entrevistador text,
  clinica text, whatsapp text, funcao text, funcao_outra text,
  situacao text, caminho text, produtos text, produto_outro text,
  a1 smallint, a2 text, a3 text, a4 text, a5 text, a6 text, a7 text, a7_outro text, a8 text, a9 text,
  b1 text, b2 text, b2_outro text, b3 text, b4 text, b5 text, b6 text, b6_outro text, b7 text, b8 smallint, b9 text,
  f1 text, cor text, motivo_cor text,
  responsavel text, status_contato text
);

create table if not exists public.config_painel (
  id boolean primary key default true check (id),
  senha_hash text not null
);

create table if not exists public.tentativas_senha (
  em timestamptz not null default now()
);

alter table public.respostas enable row level security;
alter table public.config_painel enable row level security;
alter table public.tentativas_senha enable row level security;
-- Sem policies: anon/authenticated não leem nem escrevem as tabelas diretamente.
revoke all on public.respostas, public.config_painel, public.tentativas_senha from anon, authenticated;

-- Depois de 10 senhas erradas em 15 minutos, bloqueia por 15 minutos.
create or replace function public._senha_ok(senha text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  erros int;
  ok boolean;
begin
  delete from tentativas_senha where em < now() - interval '15 minutes';
  select count(*) into erros from tentativas_senha;
  if erros >= 10 then return false; end if;
  select senha_hash = crypt(coalesce(senha, ''), senha_hash) into ok from config_painel where id;
  if coalesce(ok, false) then return true; end if;
  insert into tentativas_senha default values;
  return false;
end $$;

create or replace function public.responder(resposta jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.respostas;
begin
  if resposta->>'id' is null then
    return jsonb_build_object('ok', false, 'erro', 'resposta sem id');
  end if;
  -- recebido_em, responsavel e status_contato não vêm do formulário.
  r := jsonb_populate_record(null::public.respostas,
         resposta - 'recebido_em' - 'responsavel' - 'status_contato'
         || jsonb_build_object(
              'a1', nullif(resposta->>'a1', ''),
              'b8', nullif(resposta->>'b8', '')));
  r.recebido_em := now();
  insert into respostas values (r.*) on conflict (id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.listar_respostas(senha text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not _senha_ok(senha) then
    return jsonb_build_object('ok', false, 'erro', 'senha inválida');
  end if;
  return jsonb_build_object('ok', true, 'respostas',
    coalesce((select jsonb_agg(to_jsonb(x) order by x.recebido_em) from respostas x), '[]'::jsonb));
end $$;

create or replace function public.atribuir(senha text, resposta_id uuid, responsavel text default null, status_contato text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not _senha_ok(senha) then
    return jsonb_build_object('ok', false, 'erro', 'senha inválida');
  end if;
  update respostas set
    responsavel = coalesce(atribuir.responsavel, respostas.responsavel),
    status_contato = coalesce(atribuir.status_contato, respostas.status_contato)
  where id = resposta_id;
  if not found then return jsonb_build_object('ok', false, 'erro', 'id não encontrado'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Troca a senha do painel. Só roda pelo SQL Editor / service role.
create or replace function public.definir_senha(nova text) returns void
language sql security definer set search_path = public, extensions as $$
  insert into config_painel (id, senha_hash) values (true, crypt(nova, gen_salt('bf')))
  on conflict (id) do update set senha_hash = excluded.senha_hash;
  delete from tentativas_senha;
$$;

revoke all on function public._senha_ok(text), public.definir_senha(text) from public, anon, authenticated;
revoke all on function public.responder(jsonb), public.listar_respostas(text), public.atribuir(text, uuid, text, text) from public;
grant execute on function public.responder(jsonb), public.listar_respostas(text), public.atribuir(text, uuid, text, text) to anon, authenticated;
