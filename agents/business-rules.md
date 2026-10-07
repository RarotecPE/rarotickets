# Especificação Funcional — RaroTickets

## 1. Contexto

O **RaroTickets** é um sistema para gestão e comercialização de inscrições em eventos corporativos, treinamentos, seminários e congressos promovidos pela organização ou por parceiros.

O sistema atende eventos de diversos formatos:
- Gratuitos ou pagos;
- Presenciais ou online;
- Públicos, privados ou restritos a convidados.

Atualmente, o controle de participantes, pagamentos, portaria e certificados é realizado de forma descentralizada por meio de planilhas, formulários avulsos e conferências manuais. O RaroTickets substitui esse processo por uma plataforma unificada que controla todo o ciclo de vida do evento: da publicação e venda de lotes ao credenciamento na portaria e emissão de certificados autenticados.

---

## 2. Objetivo da v1.0

Entregar um sistema funcional e confiável que permita à organização:
- Cadastrar e gerenciar eventos com controle total de ciclo de vida, datas, capacidade e programação.
- Configurar lotes de ingressos com virada automática por data ou esgotamento de vagas.
- Criar formulários de inscrição customizados por evento, garantindo imutabilidade histórica das respostas.
- Controlar vagas em tempo real com reserva temporária (15 minutos) para eliminar risco de superlotação (*overbooking*).
- Gerenciar lista de espera automática quando a capacidade máxima for atingida.
- Integrar pagamentos com o PagBank via checkout externo em popup (modal), sem coletar ou armazenar dados sensíveis de cartão na aplicação.
- Aplicar cupons de desconto (percentual, valor fixo e cortesia).
- Realizar check-in e credenciamento na portaria via leitura de QR Code criptográfico com bloqueio de duplicidade.
- Emitir certificados digitais com código de autenticidade e página pública de validação.
- Disponibilizar a Área do Participante para consulta de inscrições, credenciais e certificados.
- Autenticar operadores e administradores via SSO no RaroNexus com controle granular de perfis.
- Rastrear todas as operações administrativas críticas por meio de trilha de auditoria.

---

## 3. Regras de Negócio por Módulo

### 3.1 Eventos

- Um evento possui duas modalidades:
  - **Presencial**: exige endereço completo (logradouro, número, complemento, bairro, município e UF).
  - **Online**: exige link da transmissão/sala virtual, que fica visível ao participante apenas após a confirmação da inscrição.
- Tipos de cobrança do evento:
  - **Gratuito**: inscrição não gera cobrança nem passa pelo provedor de pagamento.
  - **Pago**: inscrição exige seleção de lote e pagamento via provedor (salvo cupons de 100% ou cortesia administrativa).
- **Campos obrigatórios do evento**: título, descrição detalhada, resumo curto, modalidade, tipo de cobrança, data/hora de início, data/hora de término, capacidade máxima, período de inscrições (data início e fim) e responsável.
- **Validação de datas**: a data de término deve ser posterior à data de início. O período de inscrições deve encerrar antes ou no mesmo momento do término do evento.
- **Fluxo de status do evento** (transições permitidas):
  ```
  rascunho → agendado → inscricoes_abertas → inscricoes_encerradas → em_andamento → finalizado
     ↓          ↓               ↓                     ↓
  cancelado  cancelado      cancelado             cancelado
  ```
- **Regras de transição**:
  - `rascunho`: visível apenas internamente para organizadores. Inscrições públicas são bloqueadas.
  - `agendado`: evento publicado na vitrine, exibindo data futura de abertura das inscrições.
  - `inscricoes_abertas`: inscrições liberadas ao público conforme lotes e vagas.
  - `inscricoes_encerradas`: atingiu a data limite de inscrição ou esgotou vagas sem lista de espera.
  - `em_andamento`: evento em realização (permite operação de check-in).
  - `finalizado`: evento concluído (habilita emissão de certificados para participantes elegíveis).
  - `cancelado`: evento cancelado administrativamente. Bloqueia novas inscrições e exige justificativa formal.
- **Programação e Palestrantes**:
  - Um evento pode conter múltiplas atividades programadas (palestras, painéis, workshops).
  - Cada atividade possui: título, descrição, palestrante (nome, minicurrículo e foto), sala/local, data/hora de início e término.

### 3.2 Capacidade, Lotes e Reservas

- **Capacidade do Evento**: todo evento possui uma capacidade máxima definida ($\text{capacidade} > 0$).
- **Fórmula de Vagas Disponíveis**:
  $$\text{vagas\_disponiveis} = \text{capacidade\_maxima} - (\text{inscricoes\_confirmadas} + \text{reservas\_ativas})$$
- **Regra de Concorrência e Bloqueio Atômico**:
  - O sistema nunca pode permitir overbooking: $\text{vagas\_disponiveis} \ge 0$.
  - Se duas ou mais pessoas tentarem se inscrever simultaneamente para a última vaga, apenas uma transação adquire o bloqueio; a outra deve ser rejeitada com aviso de vagas esgotadas ou direcionada para a lista de espera.
- **Reserva Temporária de Vaga (15 minutos)**:
  - Ao submeter o formulário de um evento pago com vaga disponível, o sistema cria uma reserva temporária com validade estrita de **15 minutos** (`reserva_expira_em = now() + 15 minutos`).
  - Durante esse intervalo, a vaga permanece bloqueada para outros interessados enquanto o participante conclui o pagamento no popup.
  - Se o pagamento for aprovado antes da expiração, a vaga torna-se definitivamente ocupada.
  - Se os 15 minutos expirarem sem confirmação financeira, a reserva é cancelada automaticamente e a vaga retorna ao pool de vagas disponíveis (ou promove o próximo da lista de espera).
- **Lotes de Ingressos**:
  - Eventos pagos possuem um ou mais lotes ordenados cronologicamente.
  - Cada lote possui: nome (ex: "1º Lote", "Lote Promocional"), valor em Reais ($\text{valor} > 0$), quantidade máxima de vagas, data de início, data de término e status (ativo/inativo).
  - **Virada Automática de Lote**: o lote vigente é selecionado automaticamente pelo sistema atendendo aos critérios: lote ativo, período vigente (`data_inicio <= now() <= data_termino`) e vagas disponíveis do lote maiores que zero.
  - Quando um lote esgota suas vagas ou atinge sua data limite, o sistema ativa imediatamente o próximo lote elegível da fila.
  - **Imutabilidade do Valor**: o valor cobrado do participante é congelado no momento da criação da inscrição. Alterações posteriores no preço do lote nunca alteram inscrições já realizadas.

### 3.3 Participantes e Formulários de Inscrição

- **Cadastro Único de Participante**:
  - O participante possui cadastro próprio e independente de eventos específicos.
  - Campos do participante: nome completo, CPF (ou passaporte para estrangeiros), e-mail, telefone celular, data de nascimento, empresa e cargo.
  - O cadastro é reutilizável: um participante se inscreve em dezenas de eventos utilizando o mesmo registro de pessoa.
  - **Validação de duplicidade**: o sistema identifica unicidade de participante por CPF e por e-mail.
- **Formulários Dinâmicos por Evento**:
  - Cada evento pode configurar campos adicionais específicos para o seu público (ex: número de matrícula funcional, órgão público, restrições alimentares, necessidades de acessibilidade, envio de comprovante em PDF).
  - Tipos de campos permitidos: texto curto, texto longo, número, data, e-mail, telefone, CPF, CNPJ, seleção única (dropdown), múltipla escolha (checkbox), sim/não e anexo de arquivo (limite de 10 MB).
  - Cada campo possui: rótulo, descrição/ajuda, obrigatoriedade (sim/não), ordem de exibição e opções (quando for seleção).
- **Imutabilidade e Snapshot das Respostas**:
  - No momento em que a inscrição é gerada, todas as respostas do formulário são salvas em formato JSON como um **snapshot imutável** vinculado àquela inscrição.
  - Alterações, adições ou exclusões posteriores de campos no formulário do evento **nunca** corrompem nem apagam as respostas fornecidas nas inscrições já efetuadas.

### 3.4 Inscrições e Ciclo de Vida

- Toda inscrição relaciona: Participante, Evento, Lote (quando aplicável), Snapshot de Respostas, Cupom (quando aplicável), Valores Financeiros e Status.
- Toda inscrição recebe um código identificador alfanumérico único e amigável (ex: `INS-2026-X89F2A`).
- **Fluxo de status da inscrição** (transições permitidas):
  ```
  pendente ──────────────────────→ confirmada (evento gratuito ou cortesia)
     │                                  ▲
     │ (abre popup de pagamento)        │ (webhook PagBank: aprovado)
     ▼                                  │
  aguardando_pagamento ─────────────────┘
     │                 ╲
     │ (timeout 15min)   ▼ (cobrança cancelada/expirada)
     ▼                cancelada
  cancelada
  
  lista_espera ──(promocao)──→ pendente
  ```
- **Regras de transição**:
  - `pendente`: formulário submetido. Se o evento for gratuito, transiciona imediatamente para `confirmada`. Se for pago, a reserva de 15 minutos é ativada.
  - `aguardando_pagamento`: sessão de pagamento aberta no PagBank; sistema aguarda o webhook de confirmação.
  - `confirmada`: pagamento confirmado pelo PagBank (ou evento gratuito/cortesia). A vaga é consolidada e a credencial com QR Code é liberada.
  - `cancelada`: inscrição cancelada por expiração da reserva de 15 minutos, recusa definitiva de pagamento, solicitação do participante ou cancelamento administrativo.
  - `lista_espera`: participante aguarda liberação de vaga em evento com capacidade esgotada.
- **Inscrição Única por Evento**: um mesmo CPF não pode possuir mais de uma inscrição ativa (`confirmada`, `pendente` ou `aguardando_pagamento`) no mesmo evento.

### 3.5 Lista de Espera

- Quando $\text{vagas\_disponiveis} = 0$, o evento (se configurado para permitir lista de espera) passa a aceitar inscrições com status `lista_espera`.
- Inscrições em `lista_espera` **não ocupam capacidade** do evento e **não geram cobrança**.
- A ordem na lista de espera segue rigorosamente o critério cronológico de chegada (FIFO: *First-In, First-Out*).
- **Promoção da Lista de Espera**:
  - Quando uma vaga é liberada (por cancelamento voluntário ou expiração de reserva), o primeiro participante da fila é promovido para `pendente`.
  - O sistema envia uma notificação imediata (e-mail e WhatsApp) com um link exclusivo e um prazo limite (ex: 24 horas) para que o participante acesse o sistema e conclua o pagamento.
  - Se o participante não concluir o pagamento dentro do prazo estipulado, sua inscrição é cancelada e o próximo da fila é convocado.

### 3.6 Cupons de Desconto e Cortesias

- O organizador pode cadastrar cupons de desconto vinculados a um evento específico ou globais.
- Atributos do cupom: código (alfanumérico em maiúsculas, ex: `PROMO20`, `PARCEIRO100`), tipo, valor do desconto, quantidade máxima de utilizações, utilizações já consumidas, data de início e término de validade, e status (ativo/inativo).
- Tipos de cupons:
  - `percentual`: desconto percentual aplicado sobre o valor do lote (ex: 20%).
  - `valor_fixo`: desconto monetário em Reais sobre o valor do lote (ex: R$ 50,00).
  - `cortesia`: desconto de 100% sobre o valor da inscrição.
- **Invariante de Preço Final**:
  $$\text{valor\_final} = \max(0, \text{valor\_lote} - \text{valor\_desconto})$$
  O valor final de uma inscrição nunca pode ser negativo.
- **Consumo do Cupom**: o contador de utilização do cupom só é incrementado definitivamente quando a inscrição for `confirmada`.
- **Cortesias Administrativas**:
  - Usuários com perfil autorizado podem conceder cortesia manual para participantes selecionados.
  - Uma inscrição com cortesia gera $\text{valor\_final} = \text{R\$\ 0,00}$, dispensa o provedor de pagamento e é confirmada imediatamente, registrando o responsável e a justificativa na trilha de auditoria.

### 3.7 Pagamentos e Integração PagBank

- **Provedor Exclusivo de Pagamento**: o sistema utiliza o **PagBank** (PagSeguro) para todo o processamento financeiro.
- **Modelo de Checkout Desacoplado (Popup / Modal Externo)**:
  - O pagamento é executado **exclusivamente através do popup/modal oficial do PagBank** (Lightbox / Checkout PagBank) ou janela segura externa oficial.
  - O sistema RaroTickets **não coleta, valida ou armazena números de cartão de crédito, códigos de segurança (CVV) ou senhas bancárias**. O participante interage diretamente com o ambiente certificado PCI-DSS do PagBank.
  - O papel do RaroTickets limita-se a:
    1. Criar a ordem/cobrança no PagBank informando itens, valor e identificador interno de referência;
    2. Abrir o popup do PagBank para o participante;
    3. Receber as notificações assíncronas (webhooks) de alteração de status financeiro;
    4. Atualizar o status da inscrição conforme a confirmação recebida.
- **Métodos de Pagamento Oferecidos pelo PagBank**:
  - **PIX**: QR Code dinâmico e código copia-e-cola gerados diretamente pelo PagBank com tempo limite de expiração.
  - **Cartão de Crédito**: parcelamento configurável com análise de fraude assumida integralmente pelo PagBank.
  - **Boleto Bancário**: emissão e código de barras gerados e gerenciados pelo PagBank.
- **Identificador de Referência Unívoca**:
  - Toda ordem criada no PagBank recebe obrigatoriamente no campo de referência externa o identificador da inscrição:
    $$\text{reference\_id} = \text{inscricao.id}$$
  - O sistema nunca depende apenas de IDs internos do PagBank para localizar a inscrição correspondente.
- **Prevenção de Cobranças Duplicadas**: se o participante fechar o popup e tentar pagar novamente antes da expiração dos 15 minutos, o sistema reutiliza a ordem de pagamento já gerada, impedindo cobranças em duplicidade.
- **Tabela De-Para de Status PagBank para Domínio Interno**:

| Status Oficial PagBank | Status Interno do Pagamento | Status da Inscrição | Efeito na Vaga |
| :--- | :--- | :--- | :--- |
| `WAITING_PAYMENT`, `IN_ANALYSIS`, `AUTHORIZED` | `aguardando` | Permanece `aguardando_pagamento` | Mantém reserva de 15 min |
| `PAID`, `AUTHORIZED_AND_CAPTURED` | `pago` | Transiciona para `confirmada` | Vaga definitiva confirmada |
| `DECLINED`, `REJECTED` | `recusado` | Permanece `aguardando_pagamento` | Permite nova tentativa no prazo |
| `CANCELED` | `cancelado` | Transiciona para `cancelada` | Vaga liberada |
| `EXPIRED` | `expirado` | Transiciona para `cancelada` | Vaga liberada |
| `REFUNDED` | `estornado` | Inscrição cancelada | Vaga liberada se antes do evento |

- **Idempotência Estrita no Webhook**:
  - A API receptora de notificações do PagBank deve ser estritamente idempotente.
  - Receber múltiplas notificações idênticas do mesmo evento de pagamento não pode criar registros duplicados, confirmar inscrições mais de uma vez ou disparar e-mails repetidos.
- **Tratamento de Pagamento Tardio**:
  - Se um webhook de pagamento aprovado chegar após a expiração dos 15 minutos de reserva:
    - Se o evento ainda possuir vagas livres: a inscrição é confirmada normalmente e a vaga é alocada.
    - Se o evento já estiver esgotado: o sistema registra o pagamento com a flag `estorno_necessario`, notifica a equipe financeira para executar o reembolso manual via painel do PagBank e posiciona a inscrição como cancelada ou em lista de espera.
- **Estorno e Cancelamento Financeiro**:
  - Cancelamento de inscrição e cancelamento financeiro são operações desacopladas.
  - Nenhum registro de pagamento é excluído do banco de dados. Estornos registram valor estornado, motivo, data/hora e operador responsável.

### 3.8 Credenciamento, Check-in e Presença

- **Credencial e QR Code**:
  - Somente inscrições com status `confirmada` têm direito à credencial de acesso.
  - A credencial contém um **QR Code único, criptografado e não-sequencial** (token seguro assinado com HMAC ou UUIDv4). É proibido expor IDs sequenciais do banco de dados no QR Code.
  - A credencial fica disponível na Área do Participante e é enviada por e-mail e WhatsApp após a confirmação do pagamento.
- **Operação de Check-in na Portaria**:
  - Realizado pelos operadores do evento no dia da realização por meio da leitura do QR Code (câmera de smartphone, tablet ou leitor ótico).
  - **Validações obrigatórias para aceitar o check-in**:
    1. A inscrição deve estar com status `confirmada`.
    2. O evento deve estar no status `em_andamento` ou no mesmo dia de sua realização.
    3. **Bloqueio de Duplicidade**: não pode existir check-in anterior para aquela inscrição.
- **Rejeição de Check-in Duplicado**:
  - Se um QR Code for lido pela segunda vez, o sistema deve rejeitar o acesso com alerta sonoro e visual de erro: *"Check-in já realizado em DD/MM/AAAA às HH:MM pelo operador [Nome]"*.
  - **Reentrada**: liberações de reentrada são ações restritas a supervisores autorizados e devem gerar registro justificado na auditoria.
- **Log de Presença**: todo check-in realizado registra: inscrição, participante, evento, data/hora exata da leitura e identificação do usuário operador que fez a leitura.

### 3.9 Certificados

- **Configuração do Certificado por Evento**:
  - O organizador define se o evento emite certificado, qual a carga horária em horas inteiras, o template/texto descritivo e as assinaturas digitais dos responsáveis.
- **Regras de Elegibilidade**:
  - Um participante só é elegível a receber o certificado se cumprir cumulativamente:
    1. Inscrição confirmada;
    2. Presença registrada via check-in válido na portaria;
    3. Evento no status `finalizado`.
- **Código de Autenticação e Consulta Pública**:
  - Todo certificado emitido recebe um **código autenticador alfanumérico único** e imutável (ex: `CERT-2026-9A8B7C6D`).
  - O sistema disponibiliza uma **página pública de consulta e verificação de autenticidade** (acessível por qualquer pessoa sem necessidade de login, via digitação do código ou leitura do QR Code impresso no certificado).
  - A página exibe: nome do participante, título do evento, data de realização, carga horária, data de emissão e confirmação de validade do documento.
- **Imutabilidade**: uma vez emitido, o certificado não pode ser modificado.

### 3.10 Usuários, Permissões e RaroNexus

- **Autenticação Centralizada via SSO**:
  - O sistema **não** possui tela de login própria com e-mail/senha local nem armazena senhas em seu banco de dados.
  - A autenticação é realizada exclusivamente via **SSO com o RaroNexus**, com sessão persistida em cookie `HttpOnly` seguro.
- **Mapeamento de Perfis de Acesso**:
  - Os papéis recebidos na sessão do RaroNexus são mapeados para os seguintes perfis locais de autorização:
    - **Administrador**: acesso total a todos os módulos, eventos, relatórios globais, cancelamentos forçados e estornos.
    - **Gerente de Evento**: pode criar, editar, publicar e gerenciar seus próprios eventos, lotes, formulários, palestrantes e listas de espera.
    - **Financeiro**: acesso a relatórios de faturamento, conciliação de pagamentos, conferência de lotes e autorização de estornos.
    - **Atendimento**: consulta cadastro de participantes, histórico de inscrições, reenvio de comprovantes e concessão de cortesias autorizadas.
    - **Check-in (Operador de Portaria)**: acesso estrito à tela de leitura de QR Code e confirmação de presença no dia do evento. Não acessa dados financeiros nem configurações.
    - **Consulta**: acesso somente-leitura a métricas, listas de presença e relatórios operacionais.

### 3.11 Área do Participante e Relatórios

- **Área do Participante**:
  - Espaço de autoatendimento onde o participante consulta seu histórico completo de participações:
    - Inscrições ativas e passadas;
    - Status de pagamento e link para reabertura do popup do PagBank (se a reserva estiver ativa);
    - Links de transmissão para eventos online confirmados;
    - Credenciais com QR Code para download e visualização;
    - Certificados emitidos em PDF.
- **Relatórios Operacionais e Indicadores**:
  - Painel com acompanhamento em tempo real:
    - Total de inscritos (confirmados, aguardando pagamento, cancelados e lista de espera);
    - Vagas restantes em tempo real por evento e por lote;
    - Receita total prevista vs. receita efetivamente liquidada no PagBank;
    - Taxa de comparecimento ($\text{taxa} = \text{participantes\_presentes} / \text{inscricoes\_confirmadas} \times 100$);
    - Relatórios exportáveis por município, órgão público/empresa, cargo e respostas dos formulários customizados.

---

## 4. Integrações com Serviços Externos

Todas as integrações externas são coordenadas exclusivamente pela camada de backend. O frontend da aplicação nunca se comunica diretamente com serviços de terceiros sem a mediação do backend.

### 4.1 PagBank (Checkout via Popup / Lightbox)

- **Finalidade**: geração de ordens de pagamento, abertura de checkout seguro em popup e recepção de confirmações financeiras de PIX, Cartão e Boleto.
- **Fluxo Operacional**:
  1. O backend do RaroTickets gera a ordem de pagamento na API v4 do PagBank enviando valor, dados básicos do participante e o identificador de referência (`reference_id = inscricao.id`).
  2. O backend retorna o identificador da sessão/ordem ao frontend.
  3. O frontend abre o popup/lightbox seguro oficial fornecido pelo PagBank.
  4. O participante efetua o pagamento no ambiente seguro do PagBank.
  5. Ao concluir ou fechar, o popup envia o retorno de interface e o PagBank dispara uma notificação HTTP assíncrona (Webhook) para o backend do RaroTickets.
  6. O backend valida a assinatura do webhook, converte o status oficial do PagBank para o status interno e atualiza a inscrição.
- **Preparação e Requisitos Técnicos para o Agente de Desenvolvimento**:
  - Para quando as credenciais reais forem fornecidas, o sistema deve prever as variáveis de ambiente:
    - `PAGBANK_ENV`: `sandbox` ou `production`.
    - `PAGBANK_BASE_URL`: `https://sandbox.api.pagseguro.com` ou `https://api.pagseguro.com`.
    - `PAGBANK_TOKEN`: Token de autenticação Bearer da API oficial v4.
    - `PAGBANK_PUBLIC_KEY`: Chave pública para utilização do SDK de checkout/popup no frontend.
    - `PAGBANK_WEBHOOK_SECRET`: Chave/token para validação de autenticidade dos webhooks recebidos.
  - **Diretriz de Construção para o Agente**: o desenvolvedor deve criar uma porta agnóstica de pagamento (`PaymentGateway`) e fornecer um adaptador simulado funcional (`MockPagBankGateway`) para desenvolvimento e testes locais. Toda a lógica de inscrição, vagas e eventos deve funcionar perfeitamente com o adaptador simulado enquanto as credenciais reais de produção do PagBank não forem preenchidas.

### 4.2 RaroNexus (SSO e Autenticação)

- **Finalidade**: autenticação única de organizadores e operadores, gerenciamento de sessões seguras em cookies `HttpOnly` e fornecimento de papéis de autorização.
- **Fluxo**: conforme especificado em [authentication.md](authentication.md).
- O backend inicia o fluxo de autorização, valida o `state`, troca o código recebido por token no endpoint `/api/v1/sso/token` do RaroNexus e grava a sessão no cookie da aplicação.

### 4.3 E-mail Transacional

- **Finalidade**: envio de confirmação de inscrição, instruções de pagamento, credencial com QR Code e link de certificado emitido.
- **Configuração**: integração via SMTP ou provedor de e-mail transacional (ex: Resend, SendGrid, Amazon SES).
- **Processamento Assíncrono**: o envio de e-mails deve ser enfileirado para não bloquear requisições HTTP da API.
- **Templates**: e-mails formatados em HTML responsivo com variáveis dinâmicas (nome do participante, título do evento, data/hora, código da inscrição e botão para acessar a credencial).
- **Log**: todo envio registra status (sucesso/falha), destinatário, assunto e data/hora.

### 4.4 WhatsApp

- **Finalidade**: envio de notificações rápidas, lembrete de início do evento (24h antes) e link direto da credencial/QR Code no dia da portaria.
- **Integração**: via API oficial (Meta Cloud API) ou provedor BSP homologado (ex: Twilio, Z-API).
- **Envio Assíncrono e Fallback**: o envio deve ser enfileirado. Se o envio por WhatsApp falhar, o sistema deve garantir que o e-mail correspondente foi entregue como fallback.

### 4.5 Storage de Arquivos

- **Finalidade**: armazenamento de imagens de divulgação dos eventos (banners), anexos submetidos pelos participantes nos formulários customizados e arquivos PDF de certificados gerados.
- **Segurança**:
  - Banners de eventos são públicos.
  - Anexos de participantes contendo documentos pessoais são estritamente privados e acessíveis apenas por organizadores autorizados via URLs assinadas temporárias.
- **Validação**: o backend valida tamanho máximo (10 MB por arquivo) e tipos MIME permitidos (PDF, PNG, JPG) antes de efetuar o upload.

---

## 5. Regras Transversais

- **Isolamento de Dados e Integridade**: nenhuma inscrição pode existir sem evento e participante vinculados.
- **LGPD (Lei Geral de Proteção de Dados)**:
  - O formulário de inscrição deve solicitar consentimento explícito aos Termos de Uso e à Política de Privacidade do evento.
  - O consentimento para envio de comunicações de marketing/promocionais deve ser opt-in independente e **nunca pode ser obrigatório** para a conclusão da inscrição.
  - Suporte a rotinas de anonimização e exportação de dados do participante mediante solicitação formal.
- **Soft Delete**: entidades principais (Eventos, Participantes, Inscrições) nunca são excluídas fisicamente do banco de dados. Utilizar campo `deleted_at` para exclusão lógica.
- **Auditoria de Ações Sensíveis**:
  - Toda operação administrativa de impacto (criação/alteração de evento, cancelamento de evento, cancelamento de inscrição, concessão de cortesia, confirmação manual, estorno financeiro, alteração de presença e emissão forçada de certificado) deve gerar registro de log com: usuário responsável, ação realizada, entidade afetada, ID do registro, data/hora em UTC e dados alterados (snapshot do antes e depois).
- **Campos de Controle**: todas as tabelas de negócio devem possuir `created_at` e `updated_at`.
- **Fuso Horário e Datas**: todas as datas e horários devem ser armazenados no banco de dados em formato UTC (ISO 8601) e convertidos para o fuso horário local do evento na exibição.
- **Tratamento de Falhas com Result Pattern**: erros previsíveis de domínio (ex: vagas esgotadas, cupom expirado, lote inativo, check-in duplicado) devem retornar objetos de falha descritivos (*Result Pattern*), evitando lançamento desnecessário de exceções genéricas.

---

## 6. Escopo Negativo (NÃO entra na v1.0)

As seguintes funcionalidades estão **explicitamente fora do escopo da v1.0** e não devem ser desenvolvidas, embora a modelagem de dados deva prever sua adição futura:

- Captura direta de dados de cartão de crédito no frontend do RaroTickets (Checkout Transparente nativo com campos de cartão próprios). Toda a cobrança na v1.0 é delegada ao popup oficial do PagBank.
- Emissão automatizada de Notas Fiscais Eletrônicas de Serviço (NFS-e) integradas à prefeitura.
- Split financeiro de pagamentos entre múltiplos recebedores ou organizadores terceiros na v1.0.
- Aplicativo mobile nativo para iOS ou Android (a v1.0 é 100% Web responsiva e compatível com navegadores mobile).
- Venda física de ingressos via maquininhas POS de cartão no local do evento.
- Transmissão de vídeo nativa dentro do sistema (o evento online apenas armazena e exibe o link seguro para salas externas como Zoom, Teams, Google Meet ou YouTube).

---

## 7. Modelo de Dados Conceitual

### 7.1 Relacionamentos entre Entidades

```
Evento (1) ──────── (N) Lote
  │
  ├──────────────── (N) AtividadeProgramacao
  │
  ├──────────────── (N) CampoFormulario
  │
  ├──────────────── (N) Cupom
  │
  └──────────────── (N) Inscricao ──────── (1) Participante
                            │
                            ├── (1) Pagamento
                            │
                            ├── (1) CheckIn
                            │
                            └── (1) Certificado
```

### 7.2 Atributos Chave por Entidade

- **Evento**: `id`, `titulo`, `descricao`, `resumo`, `imagem_url`, `tipo` ('gratuito' | 'pago'), `modalidade` ('presencial' | 'online'), `status` ('rascunho' | 'agendado' | 'inscricoes_abertas' | 'inscricoes_encerradas' | 'em_andamento' | 'finalizado' | 'cancelado'), `data_inicio`, `data_fim`, `endereco_completo`, `municipio`, `uf`, `link_online`, `capacidade_maxima`, `permite_lista_espera`, `carga_horaria`, `responsavel_nome`, `responsavel_email`, `created_at`, `updated_at`, `deleted_at`.
- **Lote**: `id`, `evento_id`, `nome`, `valor`, `quantidade_maxima`, `data_inicio`, `data_fim`, `ativo`, `ordem`, `created_at`, `updated_at`.
- **CampoFormulario**: `id`, `evento_id`, `rotulo`, `tipo` ('texto' | 'texto_longo' | 'numero' | 'data' | 'email' | 'telefone' | 'cpf' | 'cnpj' | 'select' | 'checkbox' | 'boolean' | 'arquivo'), `obrigatorio`, `opcoes` (JSON array), `ordem`, `ativo`, `created_at`, `updated_at`.
- **Participante**: `id`, `nome`, `cpf`, `email`, `telefone`, `data_nascimento`, `empresa`, `cargo`, `consentimento_termos`, `consentimento_marketing`, `created_at`, `updated_at`, `deleted_at`.
- **Inscricao**: `id`, `codigo` (ex: 'INS-2026-X89F2A'), `evento_id`, `participante_id`, `lote_id` (nullable), `cupom_id` (nullable), `respostas_formulario` (JSON snapshot), `valor_original`, `valor_desconto`, `valor_final`, `status` ('pendente' | 'aguardando_pagamento' | 'confirmada' | 'cancelada' | 'lista_espera'), `reserva_expira_em` (timestamp UTC), `created_at`, `updated_at`, `deleted_at`.
- **Pagamento**: `id`, `inscricao_id`, `reference_id`, `provedor` (default: 'pagbank'), `status` ('aguardando' | 'pago' | 'recusado' | 'cancelado' | 'expirado' | 'estornado'), `metodo` ('pix' | 'cartao_credito' | 'boleto'), `valor`, `transacao_externa_id`, `payload_notificacao` (JSON), `pago_em`, `created_at`, `updated_at`.
- **Cupom**: `id`, `evento_id` (nullable se for global), `codigo`, `tipo` ('percentual' | 'valor_fixo' | 'cortesia'), `valor_desconto`, `quantidade_maxima`, `quantidade_utilizada`, `data_inicio`, `data_fim`, `ativo`, `created_at`, `updated_at`.
- **CheckIn**: `id`, `inscricao_id`, `evento_id`, `operador_usuario_id`, `realizado_em`, `tipo` ('normal' | 'reentrada_autorizada'), `justificativa`, `created_at`.
- **Certificado**: `id`, `inscricao_id`, `evento_id`, `participante_id`, `codigo_autenticacao`, `carga_horaria`, `emitido_em`, `created_at`.
- **AtividadeProgramacao**: `id`, `evento_id`, `titulo`, `descricao`, `palestrante_nome`, `palestrante_bio`, `sala_local`, `data_hora_inicio`, `data_hora_fim`, `created_at`, `updated_at`.
- **RegistroAuditoria**: `id`, `usuario_id`, `acao`, `entidade`, `registro_id`, `dados_anteriores` (JSON), `dados_novos` (JSON), `ip`, `created_at`.