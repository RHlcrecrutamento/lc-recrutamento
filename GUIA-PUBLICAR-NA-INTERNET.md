# Atualizar a Triatalent no Render + Supabase — V4

Este guia é para **atualizar a instalação e o banco que você já utiliza**. Não pressupõe compra de domínio, cartão, Linux, túnel nem computador ligado permanentemente.

Leia primeiro **LEIA-ME-SIMPLES-V4.md**. Este arquivo substitui as instruções antigas de publicação que envolviam pipeline manual e pagamento demonstrativo.

## Antes de começar

- Guarde a pasta atual do programa e seu `.env.local` em local seguro.
- Faça backup/exportação do banco conforme as opções disponíveis no Supabase.
- Confirme qual repositório e qual serviço Render já estão conectados. Use os mesmos, para preservar endereço e configurações.
- **Não recrie o banco, não rode `npm run seed` e não clique em reset.** `setup` é o comando de atualização da estrutura.
- Não altere e-mails de acesso, `DATABASE_URL` ou `SESSION_SECRET` só por causa da marca nova.

## 1. Atualizar os arquivos no repositório

1. Extraia o ZIP no computador.
2. Entre na pasta que contém `package.json`, `schema.sql`, `src`, `scripts` e `public`.
3. No GitHub, abra o repositório que o Render utiliza e confirme o ramo selecionado.
4. Envie os arquivos **extraídos**, nos mesmos caminhos existentes. Não envie o ZIP fechado e não crie uma nova pasta externa envolvendo o projeto.
5. Confirme a substituição dos arquivos e registre a atualização com uma mensagem como `Triatalent V4 - revisão simples e Gemini opcional`.
6. Confirme especialmente estes caminhos:
   - `src/lib/ai.ts`
   - `src/lib/triage.ts`
   - `src/components/CandidateReviewForm.tsx`
   - `src/app/(painel)/recrutamento/analise/[id]/page.tsx`
   - `src/app/(painel)/recrutamento/avisos/page.tsx`
   - `src/app/api/triagem/`
   - `schema.sql`
   - `scripts/verificar-atualizacao.js`
   - `public/triatalent-atualizacao.txt`

**Nunca publique** `.env.local`, `node_modules`, `.next`, `data`, arquivos de banco, logs ou resultados de testes.

Se o navegador limitar a quantidade de arquivos por envio, faça vários commits/envios, preservando os caminhos. O build possui verificação para não publicar uma atualização incompleta. Se já usa Git no computador, use seu procedimento habitual de commit e push; não é preciso mudar de ferramenta.

## 2. Conferir o serviço Render existente

Em **Settings**:

```text
Build Command: npm install && npm run build && npm run setup
Start Command: npm start
```

A aplicação já inicia em `0.0.0.0`. O Node 24 é a recomendação para novas publicações; no modelo `render.yaml`, `NODE_VERSION` está definido como `24`. Atualizar o arquivo sozinho não garante que uma configuração manual antiga do serviço seja alterada: confira o painel.

Não adicione `npm run seed` ao build ou start. O `setup` cria/confere tabelas e aplica migrações aditivas, sem limpar o banco.

Em **Environment**, preserve os valores reais existentes:

- `DATABASE_URL`: endereço completo do banco atual. Se precisar recuperar, copie **Connect → Session pooler**, porta 5432, do seu projeto Supabase. Use o host exato mostrado, sem inventar região/nome. A senha precisa estar codificada para URL se contiver caracteres especiais.
- `SESSION_SECRET`: segredo longo atual. Não use o exemplo do arquivo.
- `APP_URL`: URL HTTPS exata do serviço atual, sem barra no final.
- `GEMINI_RECRUITMENT_ENABLED=false`: mantenha assim até cumprir **GUIA-GEMINI-E-PRIVACIDADE-V4.md**.

Mercado Pago e e-mail continuam opcionais para o programa abrir. **Sem Mercado Pago não há checkout funcional nem liberação de contato.** Sem provedor de e-mail não se simula envio de recuperação de senha. WhatsApp não exige token: é manual.

Não preencha campos de IA antigos `AI_API_KEY`, `AI_BASE_URL` ou `AI_MODEL` esperando que ativem Gemini; a V4 usa as variáveis `GEMINI_*` descritas no guia próprio.

## 3. Publicar e conferir

1. Execute **Manual Deploy → Deploy latest commit**, se a publicação automática não começou.
2. Aguarde o serviço terminar. Nos logs de build devem aparecer os marcadores V2/V3 preservados e:

```text
TRIATALENT_SIMPLES_GEMINI_V4 — TRIAGEM, ENTREVISTA OBJETIVA E GEMINI CONFERIDOS.
```

3. Confira que `setup` terminou e o serviço iniciou.
4. Abra `https://ENDERECO-REAL-DO-SERVICO/triatalent-atualizacao.txt`. A primeira linha deve ser `TRIATALENT_SIMPLES_GEMINI_V4`.
5. Atualize o navegador com `Ctrl + F5` e entre novamente.
6. ADM/recrutadora devem ver duas filas e **WhatsApp — envio manual**.
7. Confira dados antigos antes de convidar participantes reais.

Se o build acusar atualização incompleta, envie os arquivos faltantes nos caminhos indicados. **Não tente corrigir isso apagando o banco ou executando seed.**

## 4. Teste manual sem expor contatos reais

Use perfis e currículos totalmente fictícios:

1. Empresa cria uma vaga.
2. Equipe abre todos os campos, edita se necessário e aprova.
3. Candidato escolhe a vaga → cadastro/login → entrevista imediata.
4. Confirma as opções e os campos de histórico.
5. Equipe compara com a vaga, confere original e versão pública e aprova ou reprova.
6. Confira a fila de WhatsApp. **Não envie mensagens fictícias a números de terceiros.**
7. Cliente vê apenas perfil anonimizado, parecer, cinco respostas e histórico revisados.
8. Cliente aprova ou reprova. Reprovado não pode iniciar pagamento; aprovado ainda não vê contato.
9. Homologue pagamento com contas/dados de teste do Mercado Pago seguindo **GUIA-MERCADO-PAGO-V3.md**, cujo fluxo do cliente foi atualizado. Não teste como se um PIX real fosse gratuito.

Testes automatizados incluídos são **somente locais** e se recusam a operar no banco remoto. Não execute `npm run test:*` contra Render/Supabase de produção.

## 5. Sobre gratuidade e acesso por link

- Pode continuar no hostname gratuito que o Render lhe atribuiu. Não há compra de domínio nesta atualização.
- Não renomeie o serviço só para trocar `lc-recrutamento` na URL: isso pode quebrar links e configurações. O nome visual do site é Triatalent; o endereço técnico existente é preservado.
- Seu PC não precisa ficar ligado depois da publicação. Render acessa o banco Supabase diretamente.
- Planos gratuitos têm limites, suspensão por inatividade, partidas mais lentas e condições que podem mudar. Não há promessa de serviço ilimitado ou sem interrupções.
- O software e os botões manuais de WhatsApp não exigem licença paga. Transações do Mercado Pago podem ter tarifas. Para currículos reais, Gemini depende das condições de tratamento descritas no guia de privacidade; não é prometido uso gratuito com dados pessoais.
- O site solicita não indexação aos buscadores; não faz divulgação automática. Compartilhe links apenas com quem desejar. URLs públicas ainda podem ser acessadas por quem as conhecer; páginas internas e empresas continuam protegidas por login/isolamento.
- O link individual de entrevista contém um token confidencial. Não o publique em grupos abertos.

## Se algo não aparecer

| Sintoma | O que conferir |
|---|---|
| Ainda aparece a tela antiga | Marcador V4, ramo/commit do Render, caminhos enviados e novo build; depois Ctrl+F5 |
| Tabela/campo inexistente | Se `npm run setup` faz parte do build e se o serviço aponta para o banco correto |
| Gemini continua estruturado | Chave/modelo/flags, política de dados, público adulto, disponibilidade/cota; não exponha a chave para pedir ajuda |
| Botão de pagamento não aparece | A empresa precisa aprovar o candidato primeiro |
| Pagamento indisponível | Credenciais e ambiente/webhook do Mercado Pago; não existe fallback que libere contatos |
| Aviso de WhatsApp não enviou sozinho | Esperado: abrir conversa, conferir e enviar manualmente; só depois registrar envio |
| Currículo original mudou | Regere parecer pendente e faça nova revisão; não aprove versão antiga |

**Esta entrega não realizou deploy, não acessou sua conta Google, não enviou WhatsApp e não processou cobrança real.**
