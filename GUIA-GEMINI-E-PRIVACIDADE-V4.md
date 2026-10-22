# Google Gemini na Triatalent V4 — configuração e cuidado com dados

## Leia isto primeiro

A integração usa a API REST oficial do Google Gemini, no servidor. **Não usa OpenAI, não precisa de SDK pago e não pede sua chave neste chat.** Instalar o código não ativa cobrança nem modifica sua conta Google.

Entretanto, ter uma API key não significa que o uso com currículos reais seja gratuito ou adequado aos termos aplicáveis.

Na consulta de 21/10/2026, a documentação oficial informa:

- A faixa gratuita tem acesso limitado a determinados modelos, cotas e uso de conteúdo para melhoria de produtos.
- Os termos dos serviços não pagos dizem **não enviar informações pessoais, confidenciais ou sensíveis**. Pessoas podem revisar entradas e saídas para melhoria dos serviços.
- Os serviços pagos têm condições de processamento diferentes. Isso não significa ausência de retenção para segurança nem elimina obrigações legais.
- Os termos também restringem serviços voltados a pessoas com menos de 18 anos.

Fontes oficiais, que devem ser conferidas novamente antes da ativação:

- Preços e condições: https://ai.google.dev/gemini-api/docs/pricing
- Termos, serviços não pagos/pagos e idade: https://ai.google.dev/gemini-api/terms
- Modelos: https://ai.google.dev/gemini-api/docs/models
- Limites: https://ai.google.dev/gemini-api/docs/rate-limits
- Chaves: https://aistudio.google.com/apikey

**A redução automática de nomes, contatos, documentos, endereços e links não garante que o currículo esteja realmente anônimo.** Histórico profissional, texto livre e respostas podem identificar uma pessoa. Consentimento sozinho também não torna permitido um uso que os termos do provedor não admitem.

### Se a prioridade é não contratar serviços pagos

Mantenha `GEMINI_RECRUITMENT_ENABLED=false`. O programa funciona gratuitamente com perguntas objetivas da vaga, cinco perguntas essenciais, confirmação de experiência e parecer estruturado editável. Não finge que esse parecer veio de IA.

Use apenas dados inteiramente fictícios em experimentos com serviços não pagos. Não cole currículos reais no AI Studio como tentativa de contornar essa restrição.

### Se sua API já tem condições adequadas para dados reais

Antes de ativar, o responsável precisa conferir:

1. O projeto/conta usados estão sob as condições apropriadas de serviços pagos do provedor, e não apenas cota não paga. O programa não consegue verificar isso pela aparência da chave.
2. Custos, limites e controles de uso estão compreendidos. Não é exigido que você compre nada para usar o modo estruturado.
3. A plataforma não é direcionada ou destinada a menores de 18 anos, de acordo com os termos aplicáveis. Se você atende jovens aprendizes/menores, **não ative Gemini nesta configuração**; mantenha a entrevista estruturada e avalie uma solução compatível.
4. Há base legal e transparência sobre finalidade, compartilhamento internacional, provedor, direitos, canal de atendimento e retenção. Os textos de privacidade/termos precisam corresponder à operação real e ser revisados pelo responsável.
5. O conteúdo enviado é necessário para a finalidade; currículos e respostas não devem conter informações sensíveis desnecessárias.

As confirmações abaixo são **declarações do responsável**, não uma certificação automática da conta nem parecer jurídico. Não as marque apenas para fazer o botão funcionar.

## Configurar no computador

Edite seu `.env.local` original. Não o publique, não envie prints e não cole a chave em conversa.

Depois de cumprir as condições acima, use:

```dotenv
GEMINI_API_KEY=cole_aqui_sua_chave_privada
GEMINI_MODEL=nome_exato_do_modelo_que_sua_conta_pode_usar
GEMINI_RECRUITMENT_ENABLED=true
GEMINI_DATA_POLICY=paid-reviewed
GEMINI_ADULTS_ONLY=true
```

Não use os valores de exemplo da chave/modelo literalmente. Escolha o **identificador técnico** de um modelo com `generateContent` e saída JSON disponíveis na sua conta. Não cole a URL do AI Studio nem `models/` antes do nome. O sistema não escolhe o modelo automaticamente, não aciona ferramentas de busca e não instala faturamento.

Se qualquer parâmetro obrigatório estiver ausente, a integração fica inativa. Na dúvida, deixe:

```dotenv
GEMINI_RECRUITMENT_ENABLED=false
```

Após alterar variáveis, pare e reinicie o servidor. Se mudou arquivos do programa, execute `npm run build` antes de `npm start`.

## Configurar no Render

1. Abra seu serviço atual → **Environment**.
2. Adicione as mesmas variáveis acima, somente após revisar as condições.
3. Salve e reinicie/republique o serviço.
4. Não coloque a chave no GitHub, nos formulários de cliente ou em variáveis `NEXT_PUBLIC_`.
5. Entre como ADM → **Revisão e aprovação** → **Administração e histórico avançado** → **Configurações**.
6. A tela informa parâmetros preenchidos ou integração inativa. Isso não prova que o Google aceitou uma chamada nem que a conta tem cota.
7. Homologue com uma candidatura fictícia, confira as perguntas, conclua a entrevista e abra a análise. O parecer deve indicar **Google Gemini** quando a geração realmente tiver sido usada; em falhas, indicará modo estruturado.

Não foi usada sua chave nesta entrega. O funcionamento com a sua conta real precisa ser homologado por você no ambiente configurado.

## Em quais momentos o Gemini é chamado

Com integração autorizada e ativa:

1. **Montagem das perguntas:** recebe contexto profissional da vaga e requisitos, sem o currículo nem contato do candidato. As cinco essenciais são fixas; o modelo não as substitui. Não são enviadas notas confidenciais internas da vaga.
2. **Após o aceite da entrevista:** pode sugerir campos das três experiências a partir do currículo reduzido. Só são aceitos trechos encontrados literalmente no texto; o candidato precisa confirmar cada experiência e preencher lacunas. O sistema não infere motivo de saída.
3. **Conclusão da entrevista:** recebe currículo reduzido, perguntas/respostas reduzidas e índice autodeclarado, para redigir o parecer. Respostas essenciais e histórico ficam em seções separadas.

Uma entrevista pode, portanto, fazer até três chamadas normais, além de uma nova chamada a cada regeneração manual do parecer. Não há garantia de cota ilimitada ou custo zero. O servidor aguarda até 25 segundos por chamada; erros, bloqueios, indisponibilidade, falta de cota e JSON inválido usam fallback estruturado.

## Como tratar um parecer ruim

- Corrija o texto na tela de análise, comparando com currículo e respostas originais.
- Remova afirmações sem evidência. Não invente formação, empresas, datas, experiências ou motivos.
- Não inclua nome, e-mail, telefone, documento, endereço ou links pessoais no texto público.
- Respeite o limite de 20 linhas e confira separadamente as cinco respostas e três vínculos.
- Se o currículo mudou após a geração, o servidor impede a aprovação da versão antiga. Gere novamente e revise a nova versão.
- Não há aprovação automática de candidatos por Gemini.

Entrevistas de planos antigos não são enviadas ao Gemini pelo novo gerador, pois o aviso e o questionário eram diferentes; usam modo estruturado sem inventar as cinco respostas. Históricos já apresentados não são regenerados/reabertos por esta tela. A chave fica no servidor; falhas não imprimem seu conteúdo nos logs.
