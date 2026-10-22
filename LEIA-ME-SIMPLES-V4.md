# Triatalent V4 — revisão simples de vagas e candidatos

**Talentos que fazem a diferença**

Este pacote atualiza a instalação que já está funcionando. Não troca seu banco nem suas contas. Comece por este arquivo; instruções históricas de versões anteriores não descrevem mais as decisões atuais.

## 1. O que mudou

- ADM e recrutadora passam a trabalhar com **duas filas**: vagas para revisar e candidatos para analisar.
- Ao abrir uma vaga, a equipe vê todos os campos, pode editar as informações e aprovar ou reprovar.
- **Ninguém da equipe coloca candidatos nas vagas.** Cada candidato escolhe, se cadastra e entra diretamente na entrevista.
- Após a entrevista, a equipe compara candidato e vaga, confere currículo original, respostas, histórico e parecer e aprova a apresentação ou reprova a candidatura.
- O parecer principal tem **até 20 linhas de texto**, com respostas essenciais e três experiências em seções separadas. A quebra visual das linhas pode variar entre celular e computador.
- As cinco perguntas essenciais de múltipla escolha são fixas. As perguntas de requisitos usam a vaga, incluindo escolaridade, cursos, competências e exigências informadas. Preferências pessoais não recebem uma resposta universalmente certa ou errada.
- A entrevista pergunta tempo de experiência na função **com registro em carteira**. Não pede que o candidato repita relatos longos de atividades em empresas anteriores.
- Com Gemini autorizado, dados encontrados literalmente no currículo podem preencher sugestões das três experiências. O candidato confere e completa o que falta. Sem essa extração, confirma os campos objetivos manualmente. Não se inventam datas nem motivos.
- **WhatsApp manual**, com mensagens prontas e botão para abrir a conversa. Nenhuma mensagem é enviada sozinha.
- O cliente **aprova para seguir ao pagamento ou reprova o perfil**. Aprovar não paga nem libera contatos. Não há formulário obrigatório de entrevista posterior ou contratação.
- Marca visível Triatalent. Domínios, e-mails de acesso e contas técnicas antigos não são renomeados automaticamente.

## 2. Antes de atualizar

1. Pare o sistema no computador: feche a janela que iniciou o site ou pressione `Ctrl + C` nela.
2. Guarde uma cópia da pasta atual do programa.
3. Preserve seu **`.env.local`**. Ele contém o acesso ao banco e os segredos. Este pacote não contém o seu arquivo.
4. Faça uma cópia/exportação do banco pelo Supabase conforme as opções da sua conta. Copiar a pasta do computador **não** copia o banco na nuvem.
5. **NÃO execute `npm run seed`, não resete o banco e não recrie o projeto Supabase.** Seed é destrutivo e usa contas fictícias de teste. A atualização usa somente `setup`.

## 3. Atualizar no Windows 11

Você pode continuar usando seu Node.js 24 instalado. Não precisa instalar Python nem compiladores.

1. Extraia o ZIP em uma pasta separada.
2. Abra a pasta extraída que contém `package.json`, `schema.sql`, `src` e `scripts`.
3. Copie o conteúdo para a pasta do programa atual e confirme a substituição dos arquivos.
4. **Não copie a pasta externa inteira para dentro de outra `src`**. `package.json` e `src` precisam continuar no mesmo nível. Uma pasta externa a mais na extração não é um problema: entre até encontrar `package.json`.
5. Verifique se o `.env.local` original continua na pasta do programa. Não substitua por `.env.local.exemplo`.
6. **Opção mais simples:** depois de copiar os arquivos para a pasta atual, dê dois cliques em **ATUALIZAR-V4.bat** e confirme que parou o servidor e fez backup. Ele executa os quatro comandos abaixo e inicia o site.
7. Se preferir fazer manualmente, dentro da pasta correta clique na barra de endereço do Explorador, digite `cmd` e pressione Enter.
8. Execute **um comando de cada vez**, aguardando terminar:

```bat
npm install
npm run setup
npm run build
npm start
```

9. Abra `http://localhost:3000`.
10. O build deve mostrar **`TRIATALENT_SIMPLES_GEMINI_V4 — TRIAGEM, ENTREVISTA OBJETIVA E GEMINI CONFERIDOS.`**
11. Entre com suas contas atuais. Se você ainda usa as senhas de demonstração originais, altere-as antes de liberar acesso a pessoas reais.

`setup` acrescenta campos/tabela de revisão e avisos, confere a estrutura e ajusta nomes antigos de demonstração. Não apaga candidaturas, pagamentos ou currículos. `build` recompila o programa; apenas extrair arquivos sem recompilar pode deixar a versão antiga aparecendo.

## 4. Atualizar o site publicado

Siga **GUIA-PUBLICAR-NA-INTERNET.md**, agora atualizado para V4.

- Atualize o **mesmo repositório** conectado ao **mesmo serviço Render**.
- Mantenha o mesmo `DATABASE_URL` e `SESSION_SECRET`. Não envie `.env.local` ao GitHub.
- Build: `npm install && npm run build && npm run setup`.
- Início: `npm start`.
- Confira o marcador em `https://ENDERECO-REAL-DO-SEU-SITE/triatalent-atualizacao.txt`.

Este pacote **não foi publicado automaticamente** no seu Render e não altera sua conta na nuvem. A prévia de desenvolvimento não substitui a publicação permanente.

## 5. Como trabalhar no dia a dia

### ADM ou recrutadora

1. Abra **Revisão e aprovação**.
2. Clique em **Vagas para revisar** → abra a vaga → confira todos os dados.
3. Se precisar, abra **Editar todas as informações da vaga**, salve e confira a versão atualizada.
4. Clique em **Aprovar vaga** ou **Reprovar vaga**.
5. Os candidatos escolhem suas próprias vagas e fazem a entrevista.
6. Em **Candidatos para analisar**, abra o candidato, compare a vaga com o currículo original e todas as respostas.
7. Revise o currículo anonimizado, o parecer de até 20 linhas, as respostas essenciais e as três experiências. Remova identificadores e fatos sem sustentação. A redução automática não substitui sua revisão.
8. Confirme a revisão humana e clique em **Aprovar para apresentar à empresa**, ou reprove para aquela vaga.
9. Abra **WhatsApp — envio manual** para enviar os avisos preparados.

Não é necessário mover ninguém por um pipeline de 15 etapas. Etapas técnicas antigas permanecem no banco apenas para histórico, auditoria e pagamentos. Os endpoints antigos de vinculação, edição livre de parecer e publicação em duas etapas não podem substituir a nova revisão.

### WhatsApp

1. Confira o destinatário e o telefone. Se estiver faltando, complete na tela.
2. Clique em **Abrir WhatsApp com mensagem pronta**.
3. No WhatsApp, confira novamente a conversa e **envie a mensagem**.
4. Volte ao sistema e clique em **Marcar como enviado manualmente**.

**Abrir o WhatsApp não envia nem marca a mensagem.** A confirmação é uma declaração do operador; não é comprovação de entrega ou leitura. Não são usadas APIs pagas de WhatsApp. O aviso ao cliente não inclui nome nem contatos do candidato.

São preparados avisos para: vaga aprovada/reprovada ao cliente; candidatura aprovada/reprovada pela equipe ao candidato; novo candidato apresentado ao cliente. A decisão posterior do cliente fica registrada no perfil/histórico; não é um resultado de contratação.

### Cliente

1. Analise o currículo anonimizado, o parecer, as respostas e o histórico disponibilizados pela equipe.
2. Clique em **Aprovar candidato e seguir para pagamento** ou **Reprovar candidato**.
3. Se aprovado, o botão de pagamento aparece. A primeira decisão fica registrada e não pode ser alternada pelo mesmo formulário; isso evita contradições com um checkout em andamento. Em caso de engano, procure a equipe.
4. Contatos só aparecem após confirmação válida do pagamento no servidor. Retornar pela página de sucesso não serve como confirmação.
5. Não há obrigação de informar entrevista, contratação ou resultado posterior.

## 6. Gemini: pronto para configurar, não ativado com dados reais

Leia **GUIA-GEMINI-E-PRIVACIDADE-V4.md** antes de inserir variáveis.

- A chave não é solicitada no chat, não vai para o navegador e não está neste ZIP.
- Modelo precisa ser escolhido explicitamente conforme sua conta; não se presume um modelo gratuito disponível.
- A cota não paga do Gemini não deve receber dados pessoais/confidenciais. Remover nome e telefone não garante anonimização de um currículo.
- A ativação exige confirmação das condições apropriadas de tratamento e público adulto. Os termos do provedor não são uma garantia de gratuidade ilimitada.
- Sem configuração autorizada, com erro, limite de cota ou resposta inválida, a entrevista e o parecer usam o **modo estruturado**, identificando que o parecer não foi gerado por IA.
- Na análise de um candidato ainda não apresentado, **Gerar novamente o parecer do currículo e respostas** atualiza o rascunho. Sempre revise antes de aprovar. Não use isso para reabrir apresentações/pagamentos históricos.

## 7. Porcentagem de aderência

O índice usa **respostas autodeclaradas a requisitos**, não tamanho do texto nem escolha cultural:

- Atendo totalmente: 100% do peso do requisito.
- Parcialmente: 50%.
- Não atendo / não sei: 0%.
- Obrigatórios: 70%; desejáveis: 30%, quando os dois grupos existem. Um grupo único recebe 100%.
- Sem critérios objetivos suficientes: 0% significa **não avaliado**, não reprovação automática.

A porcentagem não é probabilidade de sucesso, avaliação psicológica nem conferência documental. A decisão continua humana.

## 8. O que foi preservado

Formulário da empresa com remoção de somente três campos; salários em reais; benefícios opcionais e validação de VR/VA; três indicadores clicáveis do cliente; autocadastro público de empresas; isolamento entre empresas e perfis; currículo original restrito à equipe; versão anonimizada revisada; Mercado Pago com validação no servidor, assinatura e reconsulta; proteção de contatos; entrevistas históricas e registros de pagamento.

Entrevistas antigas não recebem respostas inventadas: quando as cinco perguntas ou o histórico estruturado não existiam, isso aparece claramente. Apresentações antigas permanecem para consulta, sem serem reprovadas pela nova fila.

O site continua sem indexação solicitada aos buscadores. Compartilhe links diretamente; isso **não torna URLs públicas equivalentes a um ambiente privado**. Páginas protegidas continuam exigindo login; o link individual da entrevista é confidencial.

## 9. Conferência e limites

Veja **RESULTADOS-TESTES-V4.md** para verificações e limitações da entrega. Nenhuma cobrança real, envio de WhatsApp ou chamada com chave real do Gemini é realizada pelos testes.

Mercado Pago sem configuração deixa o pagamento indisponível e não libera contatos. As tarifas das transações são do provedor. Render/Supabase gratuitos têm limites e podem suspender/inativar recursos conforme suas regras. Não é necessário comprar domínio, usar túnel nem manter seu PC ligado para o site publicado funcionar.
