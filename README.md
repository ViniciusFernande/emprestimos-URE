# Sistema de Gestão de Agendas - Analistas

Sistema moderno em **JavaScript** para gestão de agendas de analistas e acompanhamento de desempenho técnico, com layout dark idêntico ao modelo de referência.

---

## 🚀 Como Iniciar

Basta dar dois cliques no arquivo:
👉 **`iniciar_sistema.bat`** (ou abrir o arquivo **`index.html`** diretamente no seu navegador: Google Chrome, Microsoft Edge, Firefox, etc.).

---

## 📋 Funcionalidades Implementadas

### 1. Tela Principal (Dashboard / Home)
- **Filtro de Período Superior**: Permite alternar entre **Mês Atual** (padrão automático ao entrar), **Dia Atual** e **Total de Tudo**.
- **4 Cards de Métricas**:
  1. **Ordens Concluídas** (com ícone circular de confirmação e contagem dinâmica)
  2. **Ordens de Manutenção / Conectividade** (com ícone de ferramentas)
  3. **Ordens de Inventário** (com ícone de prancheta)
  4. **Ordens Agendadas Hoje** (com ícone de calendário e data atual)
- **Gráfico de Desempenho dos Analistas**:
  - Gráfico de barras com valores destacados no topo de cada coluna (ex: 65, 58, 52, 49, 41...), exibindo as ordens concluídas por analista no período.
- **Painel "Agendas de Hoje"**:
  - Exibe os atendimentos do dia dos analistas com foto/avatar, nome do analista, escola e assunto.
  - Botão de acesso rápido para enviar a agenda no WhatsApp do analista.
- **Gráfico Histórico de Evolução**:
  - Comparativo mês a mês entre **Manutenção / Conectividade** e **Inventário**.
  - Opção para alternar entre **Últimos 5 Meses** e **Todos os Meses (Desde o início)**.

---

### 2. Agenda Analistas (Painel de Cards com Navegação de Datas)
- **Navegador de Datas com Setas (< e >)**: Permite avançar ou retroceder os dias com as setas ou clicar no calendário para escolher qualquer data específica, puxando instantaneamente os agendamentos correspondentes do dia selecionado.
  - Exibe indicador dinâmico: `Hoje (06/10/2026)`, `Amanhã (07/10/2026)`, `Ontem (05/10/2026)` e botão de atalho `Hoje` para retornar à data atual em 1 clique.
- **Visualização Exclusiva por Card**: Cada analista possui seu próprio card com nome, foto/avatar, bairro, WhatsApp e status de atendimento da data selecionada.
- **Informações do Atendimento**: Exibe a data de hoje, nome da escola, CIE, diretor(a), tipo de serviço/assunto e observações.
- **Campo de O.S. Direto no Card**: Campo de texto para preencher ou editar o número da O.S. (não obrigatório).
- **Ações Imediatas**:
  - Botão **Concluir / Concluída** (alterna o status da O.S. em 1 clique).
  - Botão **Precisa Retornar**: Abre janela para definir a data do retorno e **automaticamente já gera e agenda a nova O.S. para o analista no dia do retorno informado**.
  - Botão **WhatsApp**: Envio rápido do card de atendimento formatado.
  - Botão **+ Novo Agendamento**: Para agendar novos atendimentos a qualquer momento.

### 3. Todos Agendamentos
- Tela com a **listagem geral de todas as ordens de serviço cadastradas**, permitindo busca em todo o histórico (passado, presente e futuro) ou filtrar por data específica quando desejado.
- **Cadastro e Edição de O.S.**:
  - Seleção do analista.
  - Data do agendamento.
  - **Auto-complete inteligente**: ao digitar o CIE ou o Nome da escola, os campos **CIE**, **Nome da Escola** e **Nome do Diretor** são preenchidos automaticamente.
  - **Assuntos pré-definidos** (Manutenção Preventiva, Corretiva, Wi-Fi, Racks, Inventário, Laboratório de Informática, etc.) + **opção para digitar um novo assunto personalizado**.
  - Número da O.S. (geração automática e editável).
  - Opção para marcar se foi **Concluída**.
  - Opção **"Irá precisar retornar?"** que habilita o campo para marcar a **Data do Retorno**.
  - Campo de **Observações** para instruções detalhadas do que fazer na escola.
- **Filtros e Ações**:
  - Filtro por analista, data, status (concluídas, pendentes, com retorno) e busca geral.
  - Ações: alternar status concluído rápido, editar, excluir e enviar via WhatsApp.

---

### 3. Integração com WhatsApp do Analista
- **Card Digital da Agenda**:
  - Visualização em formato de voucher/pass técnico estilizado com logo, analista, data, escola, CIE, diretor, assunto e observações.
- **Baixar Imagem**:
  - Gera e baixa a imagem **PNG em alta resolução** da agenda usando `html2canvas`.
- **Abrir WhatsApp Web / App**:
  - Abre a conversa diretamente no número cadastrado do analista com o resumo formatado da O.S.

---

### 4. Gestão de Analistas
- Cadastro completo:
  - Nome completo
  - WhatsApp / Telefone (com máscara automática)
  - Bairro onde mora
  - Data de início
  - Status (**Ativo** ou **Inativo**)
  - Foto / Avatar
- Tabela com ações para **Editar** e **Excluir** analistas.

---

### 5. Cadastro de Escolas
- Cadastro completo:
  - Código CIE
  - Nome da escola
  - Nome do diretor(a)
  - Telefone de contato
  - Bairro / Região
- Busca rápida por CIE ou Nome.
- Ações para **Editar** e **Excluir** escolas.

---

### 6. Relatórios de Produtividade
- Filtros por período:
  - **No Mês Atual**
  - **No Dia Atual**
  - **Na Semana Atual**
  - **No Ano Atual**
  - **No Total de Tudo**
  - **Personalizado (De / Até)**
- Filtro por **Analista específico** ou **Todos os Analistas**.
- Filtro por **Tipo de Serviço** (Manutenção/Conectividade, Inventário ou Todos).
- Métricas consolidadas e tabela detalhada.
- **Salvar em PDF**: Exportação profissional formatada com cabeçalho oficial via `html2pdf`.
- **Imprimir**: Impressão direta formatada.

---

### 7. Configurações e Backup
- **Exportar Backup**: Download de arquivo `.json` com todos os dados.
- **Restaurar Backup**: Carregamento de arquivo `.json`.
- **Restaurar Dados de Demonstração**: Recarrega instantaneamente os 8 analistas da foto e os dados do mês atual.
