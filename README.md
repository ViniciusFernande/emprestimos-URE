# URE SOROCABA - Controle de Empréstimos de Equipamentos

Sistema desenvolvido sob medida para controle de empréstimos, gestão patrimonial e emissão de termos/relatórios para a **URE Sorocaba**, com suporte integral a notebooks **Lenovo** e **Multilaser (Ultra)**.

---

## 🚀 Como Iniciar

1. Dê um duplo clique no arquivo **`iniciar_painel.bat`** ou abra diretamente o arquivo **`index.html`** no seu navegador (Google Chrome, Microsoft Edge, Firefox, etc.).
2. O sistema funciona **100% offline**, salvando todas as informações automaticamente no armazenamento local do navegador (`localStorage`).
3. Já vem pré-carregado com os **54 equipamentos** e dados idênticos ao painel da sua foto (Katia, Kelly, Bruno, Paula, Mara, teste, etc.).

---

## 📋 Funcionalidades Implementadas

### 1. Visão Geral (Dashboard)
- **Cards Superiores**:
  - Total de Equipamentos (54)
  - Disponíveis com porcentagem
  - Emprestados com porcentagem
  - Em atraso com porcentagem
- **Painéis Lado a Lado**:
  - **Lenovo**: com 4 sub-métricas (Total, Disponíveis, Emprestados, Em Atraso), botão `+ Novo Empréstimo` e tabela de empréstimos ativos com ações de devolução e impressão de termo.
  - **Multilaser (Ultra)**: com 4 sub-métricas, botão `+ Novo Empréstimo` e tabela de empréstimos ativos com indicação de data/hora prevista e status ("Hoje", "Atrasado", "Emprestado").
- **Alertas de Devolução**:
  - Destaque automático para empréstimos que vencem hoje ou que já estão atrasados.
- **Gráfico Donut (Status Geral)**:
  - Total centralizado e proporções visuais em tempo real de Disponíveis, Emprestados e Em atraso.

### 2. Cadastro e Edição de Equipamentos
- **Campos**:
  - Marca: `Lenovo` ou `Multilaser (Ultra)`
  - Modelo do Equipamento (ex: *ThinkPad L14 Gen 2*, *Multilaser Ultra 14"*)
  - ID / Patrimônio (ex: *PAT-LNV-1054*)
  - Número de Série (ex: *PF2K9954*)
  - Status inicial (Disponível, Emprestado, Manutenção)
  - Observações adicionais
- Opção para **editar** qualquer equipamento já cadastrado ou **excluir** (com proteção contra exclusão de equipamentos que estão atualmente emprestados).

### 3. Empréstimo Lenovo (Aba e Modal Exclusivos)
- **Campos**:
  - Nome Completo, CPF/RG, E-mail Institucional e Cargo/Função.
  - **Preenchimento Automático**: ao selecionar o equipamento ou digitar o ID/Patrimônio/Série, os dados de Modelo, Série, Patrimônio e Marca são preenchidos instantaneamente na tela!
  - Opção se vai com carregador/fonte ou não (`Com fonte` / `Sem fonte`).
  - Data do empréstimo.
  - **Regime de Devolução**:
    - *Fixo com a pessoa* (sem prazo de retorno - padrão Lenovo).
    - *Definir prazo de retorno* (habilita campo para data prevista).
  - Opção para **gerar o Termo de Responsabilidade** imediatamente para impressão ou PDF.

### 4. Empréstimo Multilaser Ultra (Aba e Modal Exclusivos)
- **Campos**:
  - Nome Completo do Responsável, Setor/Função/Telefone.
  - Data e horário do empréstimo.
  - Data e horário previsto para devolução.
  - **Seleção Múltipla de Equipamentos** (*"às vezes empresta 15 equipamentos para a mesma pessoa"*):
    - Permite selecionar 1, 2, 5, 10, 15 ou mais equipamentos de uma vez só!
    - Atalhos: `+ Selecionar 5`, `+ Selecionar 15`, `Selecionar Todos` ou seleção individual por caixas de seleção.
    - Tags visuais dos equipamentos selecionados com botão de remover.
    - Contador em destaque: *X selecionado(s)*.
  - Alerta automático caso ultrapasse a data/hora prevista.
  - Opção para gerar Comprovante/Termo de Retirada.


### ✏️ Edição de Empréstimos já Salvos
- Em **todas as tabelas** (Lenovo, Multilaser Ultra, Visão Geral, Atrasados e Histórico), há um botão amarelo de edição (`✏️`) ao lado dos botões de devolução e impressão.
- Ao clicar no botão de edição de um empréstimo:
  - Abre o modal com os dados atuais pré-carregados;
  - **Lenovo**: Permite editar o Nome Completo, CPF/RG, E-mail Institucional, Cargo/Função, Regime de Devolução (Fixo vs Com data prevista), Data do Empréstimo, Carregador e Observações;
  - **Multilaser (Ultra)**: Permite editar o Nome Completo, Setor/Função/Telefone, Data/Hora da Retirada, Data/Hora Prevista de Retorno, Carregador e Observações;
  - Mostra a relação dos equipamentos vinculados àquele empréstimo;
  - Ao salvar, se o nome do responsável foi alterado, o sistema atualiza automaticamente o responsável nos equipamentos vinculados e sincroniza todas as tabelas em tempo real!

### 5. Devolução para o Estoque
- Botão rápido de devolução (ícone de checkmark verde).
- Mostra o resumo completo do empréstimo e de todos os equipamentos que estão sendo devolvidos.
- Registra a data e horário exato da devolução e observações sobre o estado do equipamento.
- Libera automaticamente o(s) equipamento(s) para o status **Disponível**.

### 6. Histórico de Empréstimos
- Lista completa com todas as movimentações (empréstimos ativos e devoluções passadas).
- Filtros por:
  - Marca (`Todas`, `Lenovo`, `Multilaser`)
  - Status (`Todos`, `Em Aberto`, `Devolvidos`, `Em Atraso`)
  - Busca rápida por responsável, CPF, patrimônio ou número de série.
- Botão para visualizar e reimprimir o termo a qualquer momento.

### 7. Emissão de Relatórios (Formato A4 Timbrado)
- **Opções de Relatório**:
  1. Todos os Equipamentos Cadastrados (com situação atual).
  2. Apenas os Equipamentos Emprestados no momento.
  3. Apenas os Equipamentos Disponíveis em estoque.
  4. Empréstimos em Atraso.
- **Filtro de Marca**:
  - Ambos os Modelos (Lenovo + Multilaser)
  - Apenas Lenovo
  - Apenas Multilaser (Ultra)
- Layout timbrado para impressão e exportação em PDF via navegador (`Ctrl + P` ou botão de imprimir).

### 8. Termo de Responsabilidade e Comodato
- Layout oficial com brasão/cabeçalho da **Secretaria da Educação / URE Sorocaba**.
- Qualificação completa do colaborador.
- Tabela detalhada dos equipamentos emprestados com patrimônio, série e indicação de fonte.
- Cláusulas de guarda, uso e zelo do patrimônio público.
- Campos para assinatura do colaborador e do responsável da TI/Patrimônio.

### 9. Backup e Segurança de Dados
- **Exportar Backup**: baixa arquivo `.json` com todos os dados.
- **Importar Backup**: permite restaurar ou transferir dados para outro computador.
- **Restaurar Dados Originais**: restaura com 1 clique a base inicial idêntica à da foto.
