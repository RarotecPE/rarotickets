# AGENTS.md — Instruções para Agentes de IA

## ⚠️ OBRIGATÓRIO: Leia Antes de Qualquer Ação

Você é um agente de IA trabalhando em um ecossistema de sistemas web full-stack isomórficos. **Antes de escrever, modificar ou sugerir qualquer linha de código**, você DEVE consultar e seguir rigorosamente TODOS os documentos localizados na pasta `agents/` deste projeto.

## 📂 Documentos de Referência

| Arquivo                                            | Conteúdo                                                 | Quando Consultar                                                                            |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [agents/ARCHITECTURE.md](agents/ARCHITECTURE.md)   | Arquitetura completa: camadas, regras, padrões, exemplos | **SEMPRE** — antes de qualquer tarefa                                                       |
| [agents/design-system.md](agents/design-system.md) | Layout, componentes, design tokens e padrões de UI       | Antes de tarefas de interface; leitura obrigatória junto aos demais documentos de `agents/` |
| [agents/business-rules.md](agents/business-rules.md) | Regras de negócio do sistema de gerenciamento de eventos | Antes de implementar ou alterar funcionalidades e regras de negócio |
| [agents/authentication.md](agents/authentication.md) | Integração com RaroNexus: SSO, sessões, cookies e autorização | Antes de tarefas relacionadas a autenticação, usuários, sessões e permissões |

> **Nota:** A pasta `agents/` pode receber novos documentos no futuro
> (ex: `agents/testing.md`, `agents/deployment.md`, `agents/api-contracts.md`).
> Sempre verifique o conteúdo completo da pasta antes de iniciar uma tarefa.

## 🚨 Regras Inegociáveis

1. **Nunca** escreva código que viole as regras definidas em `agents/ARCHITECTURE.md`.
2. **Nunca** importe camadas na direção errada (client → server, domain → infra, etc.).
3. **Nunca** crie lógica de negócio fora da camada de domínio.
4. **Nunca** crie código no domínio que dependa de runtime específico (Node, Browser, etc.).
5. **Sempre** siga o padrão de pastas e nomenclatura definido.
6. **Sempre** utilize o Result Pattern ao invés de lançar exceptions para erros de domínio.
7. **Sempre** reutilize Value Objects do domínio nas validações do client.
8. **Sempre** consulte este arquivo e a pasta `agents/` no início de cada nova sessão.
9. **Sempre** siga as regras de negócio documentadas em `agents/business-rules.md`; decisões de arquitetura e interface seguem os respectivos documentos.
10. **Sempre** integre autenticação via SSO com o RaroNexus conforme documentado em `agents/authentication.md` (nunca crie login local independente ou armazene senhas no banco da aplicação).

## 🔄 Fluxo de Trabalho do Agente

1. Receber tarefa
2. Ler `AGENTS.md` (este arquivo)
3. Verificar todos os documentos de `agents/` e lê-los na íntegra, incluindo [ARCHITECTURE.md](agents/ARCHITECTURE.md), [design-system.md](agents/design-system.md), [business-rules.md](agents/business-rules.md) e [authentication.md](agents/authentication.md)
4. Identificar em qual camada/módulo a tarefa se encaixa
5. Verificar regras de importação para aquela camada
6. Implementar seguindo os padrões e exemplos
7. Revisar contra a lista de Anti-Patterns

## 📌 Sobre o Projeto

- **Tipo:** Ecossistema de sistemas web full-stack interligados
- **Arquitetura:** Clean Architecture + DDD + Isomórfica
- **Princípios:** SOLID, Design Patterns, Clean Code
- **Domínio:** Isomórfico (compartilhado entre client e server)
- **Stack:** Agnóstica (cada sistema define sua stack, mas a arquitetura é fixa)
