Quero que você analise, implemente e respeite as regras de negócio descritas neste documento para a construção de um sistema de gerenciamento de eventos.

Este documento trata EXCLUSIVAMENTE das regras de negócio do sistema.

As definições relacionadas a:

- Tecnologias utilizadas
- Arquitetura de software
- Estrutura do projeto
- Banco de dados e padrões técnicos
- Padrões de desenvolvimento
- Interface e identidade visual
- Componentes visuais
- Responsividade
- Experiência do usuário
- Organização das telas

estão definidas em outros documentos do projeto que já foram elaborados.

Esses documentos devem ser considerados em conjunto com este.

Não altere, substitua ou redefina decisões técnicas, arquiteturais ou de interface com base neste documento.

Caso exista qualquer conflito, utilize este documento como referência para as REGRAS DE NEGÓCIO e os demais documentos como referência para arquitetura, tecnologia e interface.

# 1. OBJETIVO DO SISTEMA

O sistema será utilizado para gerenciar eventos promovidos pela empresa.

Os eventos poderão ser:

- Gratuitos
- Pagos
- Presenciais
- Online
- Públicos
- Privados
- Exclusivos para convidados

O sistema deverá controlar todo o ciclo do evento, incluindo:

- Cadastro
- Publicação
- Inscrições
- Participantes
- Formulários de inscrição
- Vagas
- Lotes
- Cupons
- Pagamentos
- Check-in
- Presença
- Certificados
- Comunicações
- Relatórios
- Histórico

# 2. EVENTOS

Cada evento deverá possuir informações suficientes para controlar sua realização e suas inscrições.

Entre as informações do evento deverão existir:

- Título
- Descrição
- Descrição resumida
- Imagem de divulgação
- Data de início
- Data de término
- Horário de início
- Horário de término
- Local
- Endereço
- Município
- Estado
- Indicação se é online
- Link para evento online, quando aplicável
- Capacidade máxima
- Período de inscrições
- Responsável
- Carga horária
- Configuração para emissão de certificado
- Configuração para lista de espera
- Configurações relacionadas aos pagamentos

O evento deverá possuir pelo menos os seguintes tipos:

- GRATUITO
- PAGO

O evento deverá possuir controle de status.

Status mínimos:

- RASCUNHO
- AGENDADO
- INSCRICOES_ABERTAS
- INSCRICOES_ENCERRADAS
- EM_ANDAMENTO
- FINALIZADO
- CANCELADO

Um evento em RASCUNHO não deverá aceitar inscrições públicas.

Um evento CANCELADO não deverá aceitar novas inscrições.

Um evento com inscrições encerradas não deverá permitir novas inscrições, salvo ação administrativa explicitamente autorizada.

# 3. CAPACIDADE E CONTROLE DE VAGAS

Cada evento poderá possuir uma capacidade máxima.

O sistema deverá controlar automaticamente a quantidade de vagas disponíveis.

Inscrições canceladas não deverão ocupar vaga.

Inscrições em lista de espera não deverão ocupar vaga confirmada.

Para eventos pagos, deverá existir uma regra clara para determinar em que momento uma inscrição passa a ocupar definitivamente uma vaga.

O sistema deverá impedir que concorrência entre inscrições permita ultrapassar a capacidade do evento.

Exemplo:

Se existir apenas uma vaga disponível e duas pessoas tentarem confirmar a inscrição simultaneamente, apenas uma inscrição poderá ocupar essa vaga.

# 4. RESERVA TEMPORÁRIA DE VAGA

Eventos pagos poderão possuir reserva temporária de vaga durante o processo de pagamento.

Exemplo:

Uma pessoa inicia a inscrição às 10:00.

A vaga poderá permanecer temporariamente reservada durante 15 minutos.

Caso a inscrição ou o pagamento não seja concluído dentro do prazo configurado, a reserva deverá expirar.

A vaga deverá então ser disponibilizada novamente.

O período de reserva deverá ser configurável.

Uma inscrição pendente não poderá bloquear uma vaga indefinidamente.

# 5. LOTES

Eventos pagos poderão possuir um ou vários lotes.

Exemplo:

1º lote  
R$ 100,00  
até 10/10

2º lote  
R$ 150,00  
até 20/10

3º lote  
R$ 200,00  
até o encerramento das inscrições

Cada lote poderá possuir:

- Nome
- Descrição
- Data de início
- Data de término
- Quantidade máxima
- Valor
- Situação ativo/inativo

O sistema deverá identificar automaticamente o lote vigente considerando:

- Período
- Quantidade disponível
- Situação do lote

Quando um lote terminar por data ou quantidade, o próximo lote elegível deverá passar a ser utilizado.

O valor utilizado na inscrição deverá ficar registrado para preservar o histórico, mesmo que posteriormente o preço do lote seja alterado.

# 6. PARTICIPANTES

O participante deverá possuir cadastro próprio e independente das inscrições.

Uma mesma pessoa poderá participar de vários eventos sem necessidade de duplicar seu cadastro principal.

Dados possíveis do participante:

- Nome
- CPF
- E-mail
- Telefone
- Data de nascimento
- Empresa
- Cargo
- Município
- Estado
- CNPJ

Nem todos esses campos precisam ser obrigatórios em todos os eventos.

A obrigatoriedade deverá depender das regras do formulário de inscrição.

# 7. INSCRIÇÕES

Uma inscrição deverá relacionar:

- Participante
- Evento
- Lote, quando aplicável
- Formulário respondido
- Valor
- Desconto
- Valor final
- Situação
- Pagamento, quando aplicável

Cada inscrição deverá possuir um código único.

Status mínimos da inscrição:

- PENDENTE
- AGUARDANDO_PAGAMENTO
- CONFIRMADA
- CANCELADA
- LISTA_ESPERA

Uma inscrição gratuita poderá ser confirmada automaticamente após o cumprimento das regras de inscrição.

Uma inscrição paga não deverá ser considerada confirmada somente porque o participante iniciou o pagamento.

A confirmação deverá ocorrer após confirmação válida do pagamento, salvo situações administrativas específicas, como:

- Cortesia
- Isenção
- Confirmação manual autorizada

Toda alteração manual relevante deverá ser registrada para auditoria.

# 8. FORMULÁRIO DE INSCRIÇÃO

Cada evento poderá possuir seu próprio formulário.

O formulário não deverá ser fixo para todos os eventos.

O administrador deverá poder configurar quais informações serão solicitadas.

Tipos de informações possíveis:

- Texto
- Texto longo
- Número
- Data
- E-mail
- Telefone
- CPF
- CNPJ
- Seleção
- Escolha única
- Múltipla escolha
- Sim/Não
- Arquivo

Cada campo deverá possuir regras como:

- Nome
- Descrição
- Obrigatoriedade
- Ordem
- Opções de resposta
- Situação ativo/inativo

Exemplo:

Evento sobre Reforma Tributária:

- Nome
- CPF
- E-mail
- Telefone
- Órgão
- Cargo
- Município

Outro evento poderá solicitar informações completamente diferentes.

As respostas deverão permanecer vinculadas à inscrição correspondente.

# 9. ALTERAÇÃO DO FORMULÁRIO

Alterações posteriores no formulário não deverão destruir ou invalidar respostas de inscrições já realizadas.

O sistema deverá preservar o histórico necessário para identificar quais informações foram fornecidas no momento da inscrição.

# 10. EVENTOS GRATUITOS

Para eventos gratuitos:

1. O participante acessa o evento.
2. Preenche o formulário.
3. O sistema valida as informações.
4. O sistema verifica disponibilidade.
5. A inscrição é criada.
6. Caso todas as regras sejam atendidas, a inscrição é confirmada.
7. O participante recebe sua confirmação.

Não deverá existir etapa obrigatória de pagamento.

# 11. EVENTOS PAGOS

Para eventos pagos:

1. O participante acessa o evento.
2. Preenche o formulário.
3. O sistema valida as informações.
4. Verifica disponibilidade.
5. Identifica lote e valor.
6. Aplica eventual desconto.
7. Cria a inscrição pendente.
8. O participante escolhe uma forma de pagamento.
9. O pagamento é criado.
10. O sistema aguarda confirmação válida.
11. Após pagamento aprovado, a inscrição é confirmada.
12. O participante recebe a confirmação.

# 12. INTEGRAÇÃO COM PAGBANK/PAGSEGURO

Os pagamentos dos eventos pagos deverão ser integrados com a API oficial atual do PagBank/PagSeguro.

Inicialmente deverão ser aceitas:

- PIX
- Cartão de crédito
- Boleto

A implementação deverá utilizar as APIs oficiais atuais do PagBank.

Não utilizar APIs legadas quando existir solução oficial atual equivalente.

As regras técnicas específicas da integração deverão seguir a documentação oficial do PagBank e os documentos técnicos do projeto.

# 13. REFERÊNCIA DO PAGAMENTO

Toda cobrança deverá possuir uma referência interna que permita identificar claramente sua origem.

Exemplo:

EVENTO-120-INSCRICAO-4589

A relação entre:

- Evento
- Inscrição
- Pagamento interno
- Transação do PagBank

deverá ser preservada.

O sistema não deverá depender exclusivamente de um identificador externo do PagBank para identificar uma inscrição.

# 14. STATUS DOS PAGAMENTOS

O sistema deverá possuir status internos próprios de pagamento.

Status mínimos:

- PENDENTE
- AGUARDANDO
- PAGO
- RECUSADO
- CANCELADO
- EXPIRADO
- ESTORNADO

Os status recebidos do PagBank deverão ser convertidos para os status internos do sistema.

As demais regras do sistema deverão depender dos status internos, e não diretamente da nomenclatura utilizada pelo PagBank.

# 15. PAGAMENTO VIA PIX

Quando o participante selecionar PIX:

1. O sistema deverá gerar a cobrança correspondente.
2. Deverá relacioná-la à inscrição.
3. O participante deverá receber as informações necessárias para pagamento.
4. A inscrição permanecerá aguardando pagamento.
5. Quando houver confirmação válida, o pagamento será marcado como PAGO.
6. A inscrição será confirmada.

O sistema deverá considerar a expiração da cobrança PIX.

Caso o PIX expire sem pagamento, o sistema deverá atualizar a situação correspondente e aplicar as regras de liberação da vaga.

# 16. PAGAMENTO VIA BOLETO

Quando o participante selecionar boleto:

1. O sistema deverá gerar a cobrança.
2. Relacionar o boleto à inscrição.
3. Registrar vencimento.
4. Aguardar confirmação bancária.

A emissão do boleto não representa pagamento.

A inscrição somente deverá ser confirmada quando existir confirmação válida do pagamento, salvo regra administrativa específica.

Boletos vencidos poderão provocar expiração da inscrição ou necessidade de nova cobrança, de acordo com a situação do evento e disponibilidade de vagas.

# 17. CARTÃO DE CRÉDITO

O participante poderá pagar com cartão de crédito.

O sistema poderá permitir parcelamento.

A quantidade máxima de parcelas poderá ser configurada conforme as regras do evento.

Não deverão ser armazenados dados sensíveis do cartão, como:

- Número completo
- CVV

Poderão ser mantidas informações não sensíveis necessárias ao histórico, quando permitido, como:

- Bandeira
- Últimos quatro dígitos
- Quantidade de parcelas

A inscrição deverá ser confirmada apenas após aprovação válida da transação.

# 18. DUPLICIDADE DE PAGAMENTO

O sistema deverá impedir que ações repetidas do participante gerem cobranças desnecessariamente duplicadas.

Exemplo:

Se o usuário clicar duas vezes no botão de pagamento, isso não deverá necessariamente gerar duas cobranças distintas.

Antes de criar uma nova cobrança, o sistema deverá verificar se existe tentativa válida de pagamento em andamento para a inscrição.

# 19. CONFIRMAÇÃO DE PAGAMENTO

A confirmação financeira não deverá depender apenas do retorno do participante para o sistema após o pagamento.

O sistema deverá receber e processar as notificações fornecidas pelo PagBank.

Quando um pagamento for confirmado:

Pagamento = PAGO

Inscrição = CONFIRMADA

As ações posteriores relacionadas à confirmação deverão então ser executadas.

# 20. NOTIFICAÇÕES DO PAGBANK

As notificações recebidas do PagBank deverão ser processadas de maneira idempotente.

Isso significa que a mesma notificação poderá ser recebida várias vezes sem executar várias vezes a mesma operação de negócio.

Exemplo:

Se uma confirmação de pagamento for recebida cinco vezes, a inscrição deverá continuar existindo apenas uma vez e nenhuma ação financeira deverá ser duplicada.

As notificações deverão possuir histórico para permitir auditoria e análise de falhas.

# 21. RECONCILIAÇÃO FINANCEIRA

O sistema não deverá depender exclusivamente das notificações automáticas.

Deverá existir processo de reconciliação capaz de consultar pagamentos que permaneçam em situações como:

- PENDENTE
- AGUARDANDO

Isso será utilizado para identificar situações em que:

- Uma notificação não chegou
- Uma notificação falhou
- Houve indisponibilidade temporária
- É necessária conferência administrativa

# 22. CANCELAMENTO DE PAGAMENTO

Quando permitido pelas regras do PagBank e pela situação da cobrança, deverá existir possibilidade de cancelamento.

O sistema deverá registrar:

- Pagamento
- Valor
- Data
- Motivo
- Responsável
- Resultado da operação

O cancelamento financeiro deverá refletir corretamente na inscrição conforme sua situação.

# 23. ESTORNO

Pagamentos poderão ser estornados quando permitido.

Deverão ser registrados:

- Valor original
- Valor estornado
- Data
- Motivo
- Responsável
- Identificação da operação

O sistema deverá preservar o histórico financeiro.

Não apagar pagamentos estornados.

# 24. CORTESIAS

O sistema deverá permitir inscrições sem cobrança em eventos normalmente pagos.

Uma cortesia poderá resultar em:

Valor final = R$ 0,00

A inscrição poderá ser confirmada sem pagamento.

A concessão da cortesia deverá permanecer registrada.

# 25. CUPONS

Eventos pagos poderão aceitar cupons.

Tipos mínimos:

- PERCENTUAL
- VALOR_FIXO
- CORTESIA

Cada cupom poderá possuir:

- Código
- Evento
- Tipo
- Valor
- Quantidade máxima de utilizações
- Quantidade utilizada
- Data inicial
- Data final
- Situação

Um cupom não poderá ser utilizado fora de suas condições de validade.

O valor final da inscrição nunca poderá ficar negativo.

# 26. LISTA DE ESPERA

Quando a capacidade do evento for atingida, poderá ser disponibilizada lista de espera.

Participantes em lista de espera deverão possuir status:

LISTA_ESPERA

Eles não deverão ocupar uma vaga confirmada.

Caso uma vaga seja liberada, a pessoa poderá ser promovida conforme as regras definidas para o evento.

Inicialmente esse processo poderá ser realizado manualmente.

O sistema deverá estar preparado para futura automatização.

# 27. CANCELAMENTO DE INSCRIÇÃO

Uma inscrição poderá ser cancelada conforme regras do evento.

Quando uma inscrição confirmada for cancelada:

- A vaga deverá ser liberada quando aplicável.
- A situação financeira deverá ser avaliada.
- Poderá ser necessário realizar estorno.
- O histórico deverá ser preservado.
- A lista de espera poderá ser utilizada.

Cancelamento de inscrição e cancelamento financeiro são operações relacionadas, mas não deverão ser tratadas como a mesma ação.

# 28. QR CODE DO PARTICIPANTE

Após a confirmação da inscrição, o participante poderá receber um QR Code único para identificação.

O QR Code deverá representar uma credencial segura e única.

Não deverá expor simplesmente um número sequencial interno.

O QR Code será utilizado principalmente no processo de check-in.

# 29. CHECK-IN

Somente inscrições válidas deverão poder realizar check-in.

No momento do check-in, o sistema deverá verificar:

- Participante
- Evento
- Situação da inscrição
- Validade da credencial
- Existência de check-in anterior

O sistema deverá impedir check-in duplicado, salvo operação administrativa específica e registrada.

Deverão ser registrados pelo menos:

- Inscrição
- Data
- Hora
- Responsável pelo check-in

# 30. CERTIFICADOS

Um evento poderá ou não emitir certificado.

Quando emitir, poderá possuir:

- Carga horária
- Texto específico
- Modelo
- Regras de elegibilidade

Por padrão, poderá ser exigido que o participante tenha presença confirmada.

O certificado deverá possuir código único de validação.

Também poderá possuir QR Code para validação.

O sistema deverá permitir consultar a autenticidade de um certificado.

# 31. PALESTRANTES E PROGRAMAÇÃO

Um evento poderá possuir um ou vários palestrantes.

Também poderá possuir programação composta por diferentes atividades.

Uma programação poderá possuir informações como:

- Horário
- Título
- Descrição
- Palestrante
- Local/sala

Essas informações deverão permanecer associadas ao evento.

# 32. ÁREA DO PARTICIPANTE

O participante deverá conseguir consultar seu histórico relacionado aos eventos.

Informações mínimas:

- Eventos nos quais se inscreveu
- Situação das inscrições
- Pagamentos
- Credenciais/QR Codes
- Certificados disponíveis

Uma pessoa poderá possuir várias inscrições em eventos distintos dentro do mesmo histórico.

# 33. RELATÓRIOS

O sistema deverá permitir obter informações como:

- Inscritos por evento
- Inscrições confirmadas
- Inscrições pendentes
- Lista de espera
- Pagamentos recebidos
- Pagamentos pendentes
- Receita por evento
- Participantes presentes
- Participantes ausentes
- Inscrições por município
- Inscrições por empresa
- Inscrições por cargo
- Taxa de comparecimento
- Histórico do participante

Os relatórios deverão respeitar as informações efetivamente coletadas pelo formulário de cada evento.

# 34. INDICADORES

O sistema deverá disponibilizar dados que permitam acompanhar pelo menos:

- Quantidade de eventos
- Próximos eventos
- Total de inscritos
- Inscrições confirmadas
- Vagas restantes
- Pagamentos pendentes
- Receita prevista
- Receita recebida
- Quantidade de presentes
- Taxa de comparecimento

As regras visuais de apresentação desses indicadores estão definidas nos documentos específicos de interface.

# 35. USUÁRIOS E PERMISSÕES

O sistema deverá diferenciar usuários internos conforme suas responsabilidades.

Perfis inicialmente previstos:

- ADMINISTRADOR
- GERENTE_EVENTO
- FINANCEIRO
- ATENDIMENTO
- CHECKIN
- CONSULTA

As permissões deverão permitir restringir ações específicas.

Exemplos:

- Criar evento
- Editar evento
- Cancelar evento
- Visualizar participante
- Alterar participante
- Visualizar pagamento
- Realizar estorno
- Realizar check-in
- Consultar relatórios

Usuários não deverão possuir acesso a funcionalidades além de suas permissões.

# 36. AUDITORIA

Operações administrativas importantes deverão possuir histórico.

Exemplos:

- Criação e alteração de evento
- Cancelamento de evento
- Cancelamento de inscrição
- Alteração manual de inscrição
- Alteração manual de pagamento
- Cortesia
- Cancelamento financeiro
- Estorno
- Check-in
- Alteração de presença
- Emissão de certificado
- Alteração de permissões

O histórico deverá permitir identificar:

- Quem realizou
- Quando realizou
- Qual operação foi realizada
- Registro afetado
- Valores anteriores e posteriores, quando aplicável

# 37. LGPD E CONSENTIMENTOS

O tratamento de dados pessoais deverá observar os princípios aplicáveis da LGPD.

Os consentimentos deverão ser armazenados de maneira separada e identificável.

Exemplos:

- Termos de uso
- Política de privacidade
- Comunicação de marketing

O aceite de marketing não deverá ser condição obrigatória para inscrição em um evento quando não houver justificativa legal para isso.

Deverá ser possível identificar:

- Tipo do consentimento
- Versão apresentada
- Se foi aceito
- Data e hora do aceite

O sistema deverá estar preparado para processos relacionados a:

- Consulta de dados
- Exportação
- Correção
- Anonimização
- Exclusão, quando aplicável

# 38. COMUNICAÇÕES

O sistema deverá permitir comunicações relacionadas ao ciclo do evento.

Situações que poderão gerar comunicação:

- Inscrição realizada
- Pagamento pendente
- Pagamento confirmado
- Pagamento recusado
- Inscrição confirmada
- Alteração importante no evento
- Evento próximo
- Evento cancelado
- Certificado disponível

Os canais poderão incluir:

- E-mail
- WhatsApp

As definições técnicas das integrações de comunicação estão fora do escopo deste documento.

# 39. EXPIRAÇÕES AUTOMÁTICAS

O sistema deverá tratar automaticamente situações que possuem prazo.

Exemplos:

- Reserva de vaga expirada
- PIX expirado
- Boleto vencido
- Prazo de inscrição encerrado
- Lote encerrado
- Inscrição pendente além do tempo permitido

Essas alterações deverão obedecer às regras do evento e não poderão causar inconsistência na quantidade de vagas.

# 40. HISTÓRICO FINANCEIRO

Nenhuma operação financeira relevante deverá simplesmente substituir o histórico anterior.

Deverá ser possível compreender a sequência:

Cobrança criada  
↓  
Pagamento pendente  
↓  
Pagamento aprovado  
↓  
Eventual cancelamento  
↓  
Eventual estorno

O histórico deverá permanecer disponível para conferência.

# 41. HISTÓRICO DO PARTICIPANTE

Deverá ser possível visualizar a relação histórica de um participante com os eventos.

Exemplo:

Participante: João da Silva

- Reforma Tributária 2026 — presente
- Treinamento eSocial 2026 — presente
- Congresso Municipal 2027 — inscrito
- Seminário Contábil 2027 — cancelado

Esse histórico não deverá depender da duplicação dos dados do participante.

# 42. EXEMPLO DE FLUXO COMPLETO

Considere o seguinte cenário como referência de funcionamento.

Evento:

Seminário sobre Reforma Tributária 2026

Data:

20/11/2026

Capacidade:

200 participantes

Lotes:

1º lote — R$ 150,00

2º lote — R$ 200,00

Formas de pagamento:

- PIX
- Cartão
- Boleto

O participante acessa o evento.

Preenche o formulário.

O sistema:

1. Valida os dados.
2. Verifica disponibilidade.
3. Identifica o lote vigente.
4. Calcula o valor.
5. Cria a inscrição.
6. Aguarda escolha do pagamento.

O participante seleciona PIX.

O sistema cria a cobrança no PagBank.

A inscrição permanece:

AGUARDANDO_PAGAMENTO

Após o PagBank confirmar o pagamento:

Pagamento = PAGO

Inscrição = CONFIRMADA

O participante passa a ter sua credencial/QR Code disponível.

No dia do evento:

O QR Code é utilizado no check-in.

O sistema registra a presença.

Após o evento:

Caso cumpra as regras definidas, o certificado é disponibilizado.

# 43. REGRAS DE CONSISTÊNCIA

Durante toda a implementação, preservar as seguintes regras:

- Uma inscrição não deverá existir sem evento.
- Uma inscrição deverá estar relacionada a um participante.
- Uma inscrição paga não deverá ser confirmada sem pagamento válido, cortesia ou ação administrativa autorizada.
- Não ultrapassar capacidade do evento.
- Não duplicar check-in.
- Não processar duas vezes a mesma confirmação financeira.
- Não perder histórico financeiro.
- Não perder respostas antigas após alteração do formulário.
- Não armazenar informações sensíveis de cartão indevidamente.
- Não permitir utilização inválida de cupom.
- Não permitir lote encerrado em nova inscrição.
- Não permitir inscrição pública fora do período definido.
- Não permitir certificado quando as regras de elegibilidade não forem atendidas.
- Toda alteração administrativa sensível deverá possuir rastreabilidade.

# 44. ORIENTAÇÃO PARA IMPLEMENTAÇÃO

Ao implementar uma funcionalidade, primeiro identifique quais regras deste documento se aplicam.

Não crie regras novas simplesmente para facilitar a implementação.

Quando uma decisão não estiver definida neste documento:

1. Verifique os demais documentos do projeto.
2. Verifique se a decisão é técnica, visual ou de negócio.
3. Se for técnica, siga a documentação técnica.
4. Se for visual, siga a documentação de interface.
5. Se for uma nova regra de negócio relevante e não documentada, sinalize explicitamente a necessidade de definição antes de assumir um comportamento definitivo.

As regras deste documento deverão ser tratadas como referência funcional do sistema.

# 45. PAGBANK

Sempre que uma funcionalidade depender do comportamento externo do PagBank/PagSeguro, consulte a documentação oficial atual.

Não presuma que endpoints, status, campos, autenticação, regras de PIX, boleto, cartão, cancelamento, estorno ou notificações permanecem iguais a versões anteriores da API.

A documentação oficial deverá definir COMO a integração é realizada.

Este documento define COMO o sistema deverá se comportar do ponto de vista das regras de negócio.

# 46. PRINCÍPIO GERAL

O sistema deverá preservar a rastreabilidade completa do ciclo:

EVENTO  
↓  
PARTICIPANTE  
↓  
INSCRIÇÃO  
↓  
PAGAMENTO, quando aplicável  
↓  
CONFIRMAÇÃO  
↓  
CHECK-IN  
↓  
PRESENÇA  
↓  
CERTIFICADO

Cada etapa deverá manter seu próprio histórico e relacionamento com as demais, permitindo acompanhar todo o ciclo de participação de uma pessoa em um evento.