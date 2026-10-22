# Triatalent — Talentos que fazem a diferença

## V4: revisão simples, Gemini opcional e WhatsApp manual

**Comece por [LEIA-ME-SIMPLES-V4.md](LEIA-ME-SIMPLES-V4.md).** Este é o código para atualizar a instalação existente sem apagar seus dados.

- ADM/recrutadora: duas filas, revisão completa de vagas e comparação de candidato com vaga; aprovar/reprovar.
- Candidato: escolhe a vaga, se cadastra e faz a entrevista imediatamente. Sem vinculação manual pela equipe.
- Entrevista: cinco essenciais fixas de múltipla escolha, perguntas dos requisitos reais, tempo de experiência em carteira e confirmação objetiva de histórico.
- Parecer: até 20 linhas; respostas essenciais e três empresas com entrada/saída/motivo em quadros separados. Currículo original apenas interno; versão pública revisada por humano.
- Cliente: aprova antes de pagar ou reprova. Não precisa informar resultado de contratação.
- Contatos: somente após confirmação válida do pagamento no servidor. Sem credenciais não existe pagamento simulado em produção.
- WhatsApp: mensagens preparadas e envio manual. Abrir o link não envia nem comprova entrega.
- Marca Triatalent, preservando contas, e-mails e endereços técnicos existentes.

## Atualizar no Windows

Depois de copiar a atualização para a pasta atual e preservar seu `.env.local`, você pode dar dois cliques em **ATUALIZAR-V4.bat**. Ou, na pasta que contém `package.json`, rode:

```bat
npm install
npm run setup
npm run build
npm start
```

Abra `http://localhost:3000`. Pode manter o Node 24 já instalado; não precisa de Python/compiladores. Recomendação de runtime para novas publicações: Node 24. O código admite Node 20.9–24, mas versões antigas fora de suporte não são recomendadas para produção.

**Antes: faça backup dos arquivos e do banco. Não rode `npm run seed` em produção, não resete nem substitua o banco.** Seed apaga dados e cria contas fictícias. Os testes também são somente locais e alteram dados fictícios.

## Guias

- [Uso, atualização e fluxo V4](LEIA-ME-SIMPLES-V4.md)
- [Publicação no mesmo Render/Supabase](GUIA-PUBLICAR-NA-INTERNET.md)
- [Gemini, dados pessoais, condições de ativação e limites](GUIA-GEMINI-E-PRIVACIDADE-V4.md)
- [Mercado Pago e homologação](GUIA-MERCADO-PAGO-V3.md) — nome histórico do arquivo; conteúdo atualizado para a decisão do cliente na V4.
- [Resultados e limites dos testes](RESULTADOS-TESTES-V4.md)

## Integrações e gratuidade

Gemini usa `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_RECRUITMENT_ENABLED`, `GEMINI_DATA_POLICY` e `GEMINI_ADULTS_ONLY`, com valores e condições explicados no guia. **Fica desativado por padrão.** A faixa não paga do provedor não deve receber dados pessoais/confidenciais; uma chave não é autorização automática para enviar currículos. O modo estruturado continua disponível sem contratação de IA.

Sem integração autorizada, erro/cota/JSON inválido resultam em fallback estruturado claramente identificado, não IA simulada. Decisões continuam humanas.

WhatsApp manual não usa API paga. Software não exige licença paga nem domínio comprado. Render/Supabase gratuitos têm limites; Mercado Pago cobra conforme as tarifas da conta. Não são prometidos gratuidade ilimitada, disponibilidade contínua ou pagamentos homologados sem configuração.

O site pede não indexação a buscadores e pode ser compartilhado por link. Isso não é uma barreira de acesso a páginas públicas. O link individual de entrevista é confidencial; páginas internas exigem login e respeitam papéis/empresa.

## Testes (desenvolvimento local com banco fictício)

```text
npm run test:simple
npm run test:gemini
npm run test:client
node scripts/test-direct-application.js
node scripts/test-companies-kpis.js
npm run test:security
```

`test:client` executa a preparação da fixture de cliente e depois os testes de Mercado Pago simulado; não execute a segunda parte isoladamente reutilizando pedidos de uma execução anterior. `test:flow` é um alias de compatibilidade para o fluxo simples V4.

Não publique `.env.local`, `.next`, `node_modules`, `data`, logs, banco local ou resultados de testes. A entrega não realizou deploy no seu serviço e não usou sua chave Gemini, WhatsApp nem dinheiro real.
