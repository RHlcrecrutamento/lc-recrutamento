# Triatalent V4 — conferência da entrega

Data: **21/10/2026**. Dados e contas usados nos testes são inteiramente fictícios, em banco PostgreSQL local.

## Resultado

**299 verificações aprovadas**, além de compilação e checagem TypeScript sem erros:

| Grupo | Verificações |
|---|---:|
| Fluxo simples de vagas/candidatos, avisos, revisão humana e decisões | 76 |
| Gemini, dados reduzidos, perguntas, pontuação, limites e fallback com API simulada | 32 |
| Formulário do cliente, BRL, benefícios/VR/VA, currículo público e indicadores | 39 |
| Mercado Pago: validação, assinatura, preço, idempotência, ambiente, reconsulta, estorno e gate do cliente, com API simulada | 34 |
| Candidatura direta, consentimento, retomada e prevenção de duplicidade | 26 |
| Autocadastro de empresas, isolamento e destinos clicáveis das duas filas/administração avançada | 37 |
| Login, permissões, senha, tokens, sessões, limites e falha segura de e-mail | 29 |
| Navegador Chromium: fluxo interativo, desktop e celular de 390 px | 26 |
| **Total** | **299** |

As contagens correspondem à execução final aprovada de cada grupo, não à soma de repetições, tentativas durante desenvolvimento ou testes históricos de versões anteriores.

Também foram executados `npm run setup` no banco local, `npx tsc --noEmit`, verificador de atualização e `npm run build`. A estrutura é aditiva; a entrega não executou comandos no seu banco real.

## Exemplos do que foi conferido

- ADM/recrutadora com duas filas, todos os dados da vaga e revisão de candidato comparada à vaga.
- Sem vinculação manual e sem avanço/publicação pelos endpoints históricos.
- Entrevista direta com consentimento; cinco essenciais fixas; Outro com complemento; requisitos reais; tempo em carteira; confirmação de três empresas.
- Cliques simultâneos não pulam pergunta nem duplicam resposta.
- Parecer de até 20 linhas; cinco respostas e histórico separado; datas/motivos apenas declarados/confirmados.
- Gemini recebe contexto sem notas confidenciais; chave fica no cabeçalho do servidor e não na URL; currículo é reduzido antes das chamadas permitidas.
- Sugestões de experiência só aceitam trechos literais encontrados no currículo; motivo/empresa inventados pelo mock são descartados.
- Sem flags completas ou com erro/429/JSON inválido, não é simulada geração por IA.
- Planos antigos não são enviados ao novo gerador Gemini nem recebem respostas/pontuação inventadas.
- Preferências culturais não mudam a pontuação; o comprimento da resposta não dá pontos.
- Aprovação exige revisão humana e fonte atual. Mudança do currículo exige regenerar o parecer pendente.
- Currículo original, identificação e contatos não aparecem para cliente antes de pagamento; outra empresa não acessa o perfil.
- Avisos são preparados, não enviados. Visualizar/abrir não confirma envio; o registro é declaração do operador, não entrega/leitura.
- Cliente precisa aprovar antes de checkout. Reprovar impede criação de pedido. Primeiro registro é imutável pelo formulário; pedido antigo pendente também impede reprovação concorrente.
- Aprovação do cliente, checkout criado, parâmetro na URL e retorno de sucesso não liberam contatos por si só.
- Pagamento só vale após consulta/validação no servidor; valor, assinatura, moeda, conta, ambiente e estado são conferidos. Eventos repetidos, antigos ou falsos não burlam as regras testadas.
- Contato de teste não vale no ambiente de produção. Estorno confirmado revoga acesso.
- Publicações antigas são preservadas para consulta; a nova fila não reprova/reabre um perfil histórico já apresentado.
- Telas principais sem rolagem horizontal nos testes de 390 px; formulários interativos funcionaram sem erros JavaScript não tratados.
- Link/token de entrevista usa `no-referrer` e `no-store`.

## Como reproduzir — somente desenvolvimento local

Use servidor e banco locais separados dos dados reais. As suítes se recusam a rodar contra um banco remoto. Exigem as contas fictícias do ambiente de teste e alteram dados fictícios.

```text
npm run test:simple
npm run test:gemini
npm run test:client
node scripts/test-direct-application.js
node scripts/test-companies-kpis.js
npm run test:security
```

`test:client` prepara uma fixture nova e executa o teste de Mercado Pago em seguida. Não repita apenas `test-mercadopago.js` sobre uma fixture que já contém os pedidos da execução anterior.

A conferência de navegador é opcional para desenvolvedores: `scripts/test-browser-v4.cjs` exige Playwright e Chromium instalados à parte e uma execução prévia de `test:simple`. Playwright **não é dependência para usar ou hospedar o sistema**. O script recusa banco/servidor remotos e credenciais reais; não abre/enviará mensagens no WhatsApp. Suas imagens locais vão para `test-results/browser-v4/`, não incluído na entrega.

## Limites — o que NÃO foi homologado aqui

- **Não foi utilizada sua chave real Gemini.** A integração REST e os comportamentos foram conferidos com respostas simuladas; modelo, permissões, cota e condições reais da sua conta precisam de homologação.
- **Não houve transação real nem compra sandbox externa do Mercado Pago.** A validação local usou API simulada; a configuração da sua conta precisa ser homologada conforme o guia.
- **Não houve envio real de WhatsApp/e-mail**, nem comprovação de entrega/leitura.
- **Não foi feito deploy no seu Render/Supabase.** A prévia é de desenvolvimento. Configure/publice o pacote seguindo os guias.
- Compilação/testes locais executados em ambiente Linux com Node 20.20.2/PostgreSQL 17. Não foi executado Windows 11 nem runtime Node 24 aqui; o projeto não depende de módulos nativos, Python ou compiladores, mantém compatibilidade de código com o Node usado pelo usuário e recomenda Node 24 em novas publicações.
- A redução automática de identificadores não garante anonimização de texto livre. Revisão humana e avaliação da política/base legal/provedor são indispensáveis.
- Testes não são certificação de segurança, privacidade, conformidade jurídica, qualidade de seleção ou ausência de vieses.
- Auditoria de dependências de produção neste ambiente: **3 avisos moderados, 0 altos e 0 críticos**. Dependências devem continuar sendo acompanhadas; isso não equivale a ausência de vulnerabilidades.
- Planos gratuitos de hospedagem têm limites e podem sofrer suspensão/inatividade; taxas de pagamento e condições/custos de IA são dos provedores.

Os inicializadores não criam dados de exemplo automaticamente; `seed` recusa banco remoto. O atualizador Windows `ATUALIZAR-V4.bat` executa instalação/setup/build/start sem seed/reset, mas não foi executado em Windows aqui.

O ZIP exclui segredos, banco, currículos originais enviados, contas/sessões locais, dependências instaladas, build, logs e capturas de teste. O arquivo `.env.local.exemplo` é somente um modelo sem suas credenciais.
