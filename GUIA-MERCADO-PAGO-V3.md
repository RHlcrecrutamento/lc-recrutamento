# Mercado Pago — configuração segura, atualizada para Triatalent V4

Este guia configura **Checkout Pro por redirecionamento**: o cliente escolhe o candidato no Triatalent e paga na página do Mercado Pago. PIX e demais meios aparecem conforme a disponibilidade e as configurações da conta no Mercado Pago. Não é necessário colocar dados de cartão no Triatalent.

**Estado da entrega:** código implementado e testado localmente com API simulada. Sua conta ainda precisa ser configurada e homologada. Nenhum pagamento real foi efetuado por este assistente.

## A. Regras antes de começar

- Não mande chaves, senhas ou telas mostrando credenciais pelo chat.
- Nunca coloque Access Token ou assinatura secreta no código, GitHub, arquivos públicos ou variáveis com prefixo NEXT_PUBLIC_.
- Render é o servidor que guarda os segredos. O navegador recebe apenas a URL pública do checkout e o resultado autorizado da consulta.
- Os testes devem usar dados e perfis FICTÍCIOS. Se já há candidatos reais, prepare um serviço de teste no Render com banco de teste separado; não aponte esse serviço ao banco real. Verifique a disponibilidade/limites do seu plano gratuito antes de criar recursos. Não é necessário mudar a tecnologia do projeto.
- O modo de teste permite aprovações simuladas e por isso não deve ser usado para apresentar candidatos reais. Os acessos de teste são separados dos acessos de produção pelo sistema.
- A integração não exige mensalidade adicional do software, mas o Mercado Pago cobra pelo processamento conforme suas condições. Confira as tarifas vigentes na sua conta antes de operar. [2](https://www.mercadopago.com.br/ferramentas-para-vender/check-out)

## B. Criar a aplicação e obter as credenciais de TESTE

1. Entre diretamente em **Mercado Pago Developers**: https://www.mercadopago.com.br/developers/pt
2. Acesse **Suas integrações** e crie/selecione a aplicação do Triatalent para pagamentos on-line com **Checkout Pro**.
3. Abra **Testes → Credenciais de teste**. Copie o valor do campo **Access Token** para o ambiente de teste do servidor. Não escolha uma credencial apenas pelo prefixo: use a aba e o campo corretos no painel. A documentação atual orienta usar credenciais de teste durante a validação e só depois credenciais produtivas. [3](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-content/credentials?scope=prod)
4. Esta integração por link não precisa de MP_PUBLIC_KEY no navegador. Precisa do **Access Token**, da **assinatura secreta do webhook**, do **ambiente** e da **URL do site**.

## C. Cadastrar o webhook

Webhook é o aviso que o Mercado Pago envia ao Triatalent quando um pagamento muda de situação.

1. Na aplicação, abra **Webhooks → Configurar notificações**.
2. Cadastre o endereço HTTPS do serviço de teste, terminando em:

```text
/api/pagamentos/webhook
```

Exemplo de formato, NÃO um endereço para copiar literalmente:

```text
https://ENDERECO-REAL-DO-SEU-SERVICO-DE-TESTE.onrender.com/api/pagamentos/webhook
```

3. Se o painel separar URLs de teste e de produção, confira que está configurando a URL do ambiente correspondente. Selecione o evento **Pagamentos** e salve.
4. Revele e copie a **assinatura secreta** gerada pelo painel e coloque-a somente na variável MP_WEBHOOK_SECRET do servidor correspondente. Ela não é o Access Token e não deve ser inventada.
5. O código verifica `x-signature` com `data.id` da URL, `x-request-id` do cabeçalho e timestamp. Depois consulta o pagamento na API. É o padrão de validação das notificações documentado pelo Mercado Pago. [1](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/notifications/webhooks)

Use HTTPS público do Render, não localhost, link de painel, /cliente/pagamentos ou a tela de sucesso. Não coloque token/assinatura na URL do webhook.

## D. Variáveis no Render — ambiente de teste

Abra o serviço de TESTE no Render → **Environment → Add Environment Variable**.

| Nome exato | Valor que você informa diretamente no Render |
| --- | --- |
| APP_URL | A origem HTTPS real do serviço de teste, por exemplo https://seu-servico-de-teste.onrender.com, sem /cliente ou outro caminho |
| MP_ACCESS_TOKEN | O Access Token da aba de TESTE da aplicação |
| MP_WEBHOOK_SECRET | A assinatura secreta do webhook da aplicação/ambiente configurado |
| MP_ENVIRONMENT | `test` — exatamente assim, em minúsculas |

Mantenha DATABASE_URL apontando ao banco DE TESTE e SESSION_SECRET com o segredo desse ambiente. Salve e aguarde o novo deploy/reinício ficar Live.

**Não configure ALLOW_DEMO_PAYMENTS no Render.** A demonstração antiga não libera dados em produção, mesmo que a opção antiga demo_payments esteja marcada no painel administrativo. O modo de teste do Mercado Pago não é a antiga página /pagamento/demo.

Se qualquer credencial obrigatória faltar ou o gateway falhar, não há fallback para demonstração e nenhum contato é liberado por essa falha.

## E. Testar sem cobrar dinheiro real

### Preparação

1. No ambiente de teste do Triatalent, use uma empresa e um candidato fictícios, sem informações de pessoas reais.
2. Crie uma vaga, cole um currículo fictício, conclua a entrevista, revise o currículo anonimizado, valide o relatório e libere o candidato.
3. Confira o preço do desbloqueio definido em Administração/empresa. O navegador não define o preço.
4. A aplicação do Mercado Pago oferece uma conta de **comprador de teste** em **Contas de teste**; use-a separadamente da conta do vendedor. Consulte o passo a passo atual. [5](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/introduction)

### Compra com cartão de teste

1. Em janela anônima, entre na empresa fictícia no serviço de teste do Triatalent.
2. Abra o currículo apresentado e clique em **Aprovar candidato e seguir para pagamento**. A aprovação não cobra nem libera contatos. Se reprovar o perfil, o checkout fica bloqueado. Não há obrigação de registrar entrevista/contratação posterior.
3. Você deve ir ao checkout de teste do Mercado Pago. Use o comprador de teste e um **cartão de teste da documentação**, nunca seu cartão real.
4. Para a simulação de aprovação, a documentação indica o titular `APRO`. Para pendência, `CONT`; para recusa geral, `OTHE`. Consulte os cartões/dados e instruções atuais na página oficial. [4](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases)
5. Depois da aprovação, o webhook deve confirmar o pagamento no servidor. Ao retornar, a tela **Confirmação de pagamento** também consulta o servidor para recuperar uma notificação atrasada.
6. Confira: no ambiente de teste, só a empresa correspondente passa a ver os contatos do candidato fictício. A mesma empresa em produção não herda esse desbloqueio de teste.

### PIX de teste: atenção

Na documentação de Checkout Pro, o teste de meio offline, como PIX/boleto, pode terminar corretamente em **pendente**, sem simular a liquidação. Isso não comprova um PIX real pago e não deve liberar contatos. Use o cenário de cartão aprovado para homologar a aprovação automática e os cenários offline para conferir que a pendência NÃO libera. Não faça uma transferência bancária para “pagar” um PIX fictício de teste. [4](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases)

### Testes de segurança necessários

- Pendente: contatos continuam protegidos.
- Recusado: contatos continuam protegidos; é possível tentar outro meio no checkout.
- Aprovado pela API: contatos liberados para a empresa correta, sem decisão manual do cliente.
- Outra empresa ou sessão sem login: não acessa currículo/pedido/contatos da empresa dona.
- Mudar a URL para status=ok ou collection_status=approved: não libera nada.
- Repetir a notificação: não cria dois desbloqueios.
- Simular uma notificação com Data ID inventado: não aprova pagamento. O identificador precisa corresponder a um pagamento real DE TESTE que o token possa consultar e a um pedido do Triatalent.
- Alterar o currículo original: a versão antiga revisada deixa de ser apresentada até nova revisão.

Não é necessário nem desejável repetir cobranças para testar idempotência: o mesmo evento deve ser reprocessado com segurança.

## F. Ativar cobranças reais, somente depois da homologação

1. Confirme que o ambiente de teste passou nos cenários acima e que a conta Mercado Pago está apta a receber pagamentos, com os meios desejados habilitados. Consulte as tarifas da sua conta.
2. No ambiente REAL, use o banco real e a URL pública real. Não copie o banco de teste por cima dos seus dados.
3. Na aplicação correta do Mercado Pago, ative/obtenha **Produção → Credenciais de produção**.
4. Cadastre em Webhooks o evento **Pagamentos** com a URL real. Para o endereço atual conhecido do projeto, se continuar sendo ele:

```text
https://lc-recrutamento.onrender.com/api/pagamentos/webhook
```

5. No Render do serviço real, configure:
   - APP_URL = `https://lc-recrutamento.onrender.com` (ou a origem pública efetiva, se diferente).
   - MP_ACCESS_TOKEN = o token REAL de produção, colocado diretamente no Render.
   - MP_WEBHOOK_SECRET = a assinatura do webhook da aplicação/ambiente real, diretamente no Render.
   - MP_ENVIRONMENT = `production`.
6. Salve, faça deploy/reinicie e aguarde Live. Não use test, sandbox ou credenciais de comprador no serviço real.
7. A conferência de uma compra real deve ser feita apenas por decisão sua e com titular autorizado. Ela envolve dinheiro e pode ter tarifas. Este guia não realizou essa compra nem garante reembolso das tarifas.

## G. Operação e problemas comuns

| Situação | O que conferir |
| --- | --- |
| Pagamento ainda não configurado | As quatro variáveis, nomes sem erro, ambiente test/production e deploy após salvar |
| Mercado Pago retorna falha 401/403 no log | Token da aplicação e ambiente corretos, ativo, sem espaços; não envie o token no chat |
| Não aparece PIX | Disponibilidade/configurações da conta e do ambiente no Mercado Pago; o Triatalent não força um meio indisponível |
| Pagou, mas ainda aguarda | Situação no Mercado Pago, logs do webhook, URL/assinatura, serviço Live; use Verificar pagamento novamente, sem pagar outra vez |
| Webhook 401 | Assinatura/ambiente corretos, data.id da URL, cabeçalho x-request-id e timestamp válido; o sistema recusa assinatura ausente/inválida/expirada |
| Webhook 409 | Pagamento pode ser de ambiente/recebedor diferente, valor/moeda/referência incompatível ou pedido já encerrado por estorno; confira o pedido, não force aprovação |
| Simulador usa ID inventado | Não é uma aprovação válida. Use o pagamento de teste associado a um pedido real do ambiente de teste |
| Site grátis estava inativo | A retomada do Render pode atrasar o processamento. Webhook/reconsulta só liberam após confirmação efetiva, sem garantia de tempo instantâneo |
| Acesso demonstrativo antigo sumiu | Esperado: demonstração não conta como pagamento real em produção |

A tela consulta automaticamente por até 10 minutos, a cada 15 segundos; depois há o botão manual. O servidor limita reconsultas do mesmo pedido. Mesmo com a tela fechada, o webhook continua sendo o caminho automático de confirmação quando o serviço está disponível.

Estornos/contestações confirmados pela API revogam o acesso no sistema. Um reembolso administrativo de pedido real é solicitado ao Mercado Pago e só é tratado como confirmado após verificação na API; não é apenas uma mudança visual no banco. Dados que a empresa já copiou fora do sistema não podem ser apagados remotamente pelo Triatalent.

**Não envie comprovante, screenshot de retorno ou texto “approved” para liberar manualmente por esta integração. O servidor precisa consultar o pagamento do gateway e validar pedido, valor exato, moeda, recebedor, ambiente e situação.**
