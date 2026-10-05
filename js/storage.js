/**
 * URE SOROCABA - Controle de Empréstimos de Equipamentos
 * Módulo de Armazenamento e Persistência Local
 */

const STORAGE_KEYS = {
  EQUIPMENT: 'ure_equipamentos_v2',
  LOANS: 'ure_emprestimos_v2',
  CONFIG: 'ure_config_v2'
};

const StorageService = {
  init() {
    // Limpeza de versoes anteriores com dados de demonstracao (zera o sistema)
    if (localStorage.getItem('ure_equipamentos_v1') || localStorage.getItem('ure_emprestimos_v1')) {
      localStorage.removeItem('ure_equipamentos_v1');
      localStorage.removeItem('ure_emprestimos_v1');
      localStorage.removeItem('ure_config_v1');
      localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.EQUIPMENT)) {
      this.saveEquipmentList([]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOANS)) {
      this.saveLoanList([]);
    }
    this.cleanStoredDates();
    this.removeTestRecord();
  },

  clearAllData() {
    this.saveEquipmentList([]);
    this.saveLoanList([]);
    localStorage.removeItem('ure_equipamentos_v1');
    localStorage.removeItem('ure_emprestimos_v1');
    localStorage.removeItem('ure_config_v1');
  },

  cleanStoredDates() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOANS);
      if (!data) return;
      const loans = JSON.parse(data);
      let modified = false;
      loans.forEach(loan => {
        if (loan.expectedReturnDate) {
          const corruptMatch = String(loan.expectedReturnDate).match(/^(\d{1,2})\s+(\d{1,2}:\d{2})\/(\d{1,2})\/(\d{4})$/);
          if (corruptMatch) {
            loan.expectedReturnDate = `${corruptMatch[1].padStart(2, '0')}/${corruptMatch[3].padStart(2, '0')}/${corruptMatch[4]} ${corruptMatch[2]}`;
            modified = true;
          }
        }
      });
      if (modified) {
        localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
      }
    } catch (e) {}
  },

  getEquipmentList() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erro ao ler equipamentos:', e);
      return [];
    }
  },

  saveEquipmentList(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Erro ao salvar equipamentos:', e);
      return false;
    }
  },

  getEquipmentById(id) {
    const list = this.getEquipmentList();
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    return list.find(e => 
      (e.id && String(e.id).toLowerCase() === cleanId) || 
      (e.patrimony && String(e.patrimony).toLowerCase() === cleanId) || 
      (e.serialNumber && String(e.serialNumber).toLowerCase() === cleanId)
    );
  },

  getEquipmentBySerial(serial, excludeId = null) {
    if (!serial) return null;
    const clean = String(serial).trim().toLowerCase();
    const cleanExclude = excludeId ? String(excludeId).trim().toLowerCase() : null;
    const list = this.getEquipmentList();
    return list.find(e => {
      if (cleanExclude && e.id && String(e.id).trim().toLowerCase() === cleanExclude) {
        return false;
      }
      return e.serialNumber && String(e.serialNumber).trim().toLowerCase() === clean;
    }) || null;
  },

  getActiveLoanForEquipment(eqOrId) {
    if (!eqOrId) return null;
    const loans = this.getLoanList();
    const eq = typeof eqOrId === 'object' ? eqOrId : this.getEquipmentById(eqOrId);

    const searchId = eq ? (eq.id || '') : String(eqOrId);
    const searchPat = eq ? (eq.patrimony || '') : String(eqOrId);
    const searchSerial = eq ? (eq.serialNumber || '') : '';

    const cleanId = searchId.trim().toLowerCase();
    const cleanPat = searchPat.trim().toLowerCase();
    const cleanSerial = searchSerial.trim().toLowerCase();

    // 1. Tenta por currentLoanId direto se for valido e ativo
    if (eq && eq.currentLoanId) {
      const directLoan = loans.find(l => l.id === eq.currentLoanId);
      if (directLoan && directLoan.status !== 'devolvido') return directLoan;
    }

    // 2. Procura entre emprestimos ativos / nao devolvidos
    return loans.find(l => {
      if (l.status === 'devolvido') return false;

      // Verifica lista de IDs
      if (Array.isArray(l.equipmentIds)) {
        const foundId = l.equipmentIds.some(id => {
          if (!id) return false;
          const s = String(id).trim().toLowerCase();
          return (cleanId && s === cleanId) || (cleanPat && s === cleanPat);
        });
        if (foundId) return true;
      }

      // Verifica detalhes dos equipamentos
      if (Array.isArray(l.equipmentDetails)) {
        const foundDetail = l.equipmentDetails.some(ed => {
          if (!ed) return false;
          const edId = ed.id ? String(ed.id).trim().toLowerCase() : '';
          const edPat = ed.patrimony ? String(ed.patrimony).trim().toLowerCase() : '';
          const edSerial = ed.serialNumber ? String(ed.serialNumber).trim().toLowerCase() : '';
          return (cleanId && (edId === cleanId || edPat === cleanId)) ||
                 (cleanPat && (edPat === cleanPat || edId === cleanPat)) ||
                 (cleanSerial && edSerial === cleanSerial);
        });
        if (foundDetail) return true;
      }

      return false;
    }) || null;
  },

  ensureActiveLoanForEquipment(eq) {
    if (!eq || eq.status !== 'emprestado') return null;
    let loan = this.getActiveLoanForEquipment(eq);
    if (loan) {
      if (eq.currentLoanId !== loan.id || (loan.borrowerName && eq.currentBorrower !== loan.borrowerName)) {
        eq.currentLoanId = loan.id;
        if (loan.borrowerName) eq.currentBorrower = loan.borrowerName;
      }
      return loan;
    }

    // Se o equipamento esta marcado como emprestado, mas nao ha emprestimo no historico,
    // reconstroi o emprestimo ativo correspondente para habilitar acoes e termo
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dStr = dd + '/' + mm + '/' + yyyy;
    const borrower = (eq.currentBorrower && eq.currentBorrower.trim()) ? eq.currentBorrower.trim() : 'Servidor Responsavel';
    const isLenovo = eq.brand && eq.brand.toLowerCase().includes('lenovo');

    const newLoan = this.createLoan({
      type: isLenovo ? 'lenovo' : 'multilaser',
      borrowerName: borrower,
      borrowerDoc: '',
      borrowerEmail: '',
      borrowerRole: 'Equipe URE',
      equipmentIds: [eq.id],
      equipmentDetails: [{
        id: eq.id,
        brand: eq.brand,
        model: eq.model,
        patrimony: eq.patrimony,
        serialNumber: eq.serialNumber
      }],
      hasCharger: true,
      loanDate: dStr,
      isFixed: true,
      expectedReturnDate: null,
      notes: 'Emprestimo registrado'
    });

    eq.currentLoanId = newLoan.id;
    eq.currentBorrower = borrower;
    return newLoan;
  },

  syncEquipmentBorrowers() {
    try {
      const equipList = this.getEquipmentList();
      let changed = false;

      equipList.forEach(eq => {
        if (eq.status === 'emprestado') {
          const loan = this.getActiveLoanForEquipment(eq) || this.ensureActiveLoanForEquipment(eq);
          if (loan) {
            if (eq.currentLoanId !== loan.id) {
              eq.currentLoanId = loan.id;
              changed = true;
            }
            if (loan.borrowerName && eq.currentBorrower !== loan.borrowerName) {
              eq.currentBorrower = loan.borrowerName;
              changed = true;
            }
          }
        } else if (eq.status === 'disponivel') {
          if (eq.currentLoanId || eq.currentBorrower) {
            delete eq.currentLoanId;
            delete eq.currentBorrower;
            changed = true;
          }
        }
      });

      if (changed) {
        this.saveEquipmentList(equipList);
      }
    } catch (e) {
      console.error('Erro ao sincronizar responsaveis dos equipamentos:', e);
    }
  },

  saveEquipment(item) {
    const list = this.getEquipmentList();
    const index = list.findIndex(e => e.id === item.id);
    if (index >= 0) {
      const existing = list[index];
      const cleanItem = {};
      Object.keys(item).forEach(key => {
        if (item[key] !== undefined) {
          cleanItem[key] = item[key];
        }
      });

      const updated = { ...existing, ...cleanItem };

      // Garante que o responsavel e o ID do emprestimo nunca se percam se estiver emprestado
      if (updated.status === 'emprestado') {
        if (!updated.currentLoanId || !updated.currentBorrower) {
          const activeLoan = this.getActiveLoanForEquipment(updated);
          if (activeLoan) {
            if (!updated.currentLoanId) updated.currentLoanId = activeLoan.id;
            if (!updated.currentBorrower && activeLoan.borrowerName) updated.currentBorrower = activeLoan.borrowerName;
          }
        }
      }

      list[index] = updated;

      // Sincroniza dados nos empréstimos ativos vinculados
      try {
        const loans = this.getLoanList();
        let loansChanged = false;
        loans.forEach(loan => {
          if (loan.equipmentDetails && Array.isArray(loan.equipmentDetails)) {
            loan.equipmentDetails.forEach(ed => {
              if (ed.id === updated.id) {
                ed.brand = updated.brand;
                ed.model = updated.model;
                ed.patrimony = updated.patrimony;
                ed.serialNumber = updated.serialNumber;
                loansChanged = true;
              }
            });
          }
        });
        if (loansChanged) {
          this.saveLoanList(loans);
        }
      } catch (err) {
        console.error('Erro ao sincronizar empréstimos vinculados:', err);
      }
    } else {
      if (!item.id) {
        item.id = 'EQ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase();
      }
      if (!item.status) {
        item.status = 'disponivel';
      }
      list.push(item);
    }
    this.saveEquipmentList(list);
    return list[index] || item;
  },

  deleteEquipment(id) {
    let list = this.getEquipmentList();
    list = list.filter(e => e.id !== id);
    this.saveEquipmentList(list);
  },

  deleteLoan(id) {
    let list = this.getLoanList();
    const loan = list.find(l => l.id === id);
    if (!loan) return;

    // Se o empréstimo não foi devolvido, libera os equipamentos associados
    if (loan.status !== 'devolvido' && Array.isArray(loan.equipmentIds)) {
      const equipList = this.getEquipmentList();
      loan.equipmentIds.forEach(eqId => {
        const eq = equipList.find(e => e.id === eqId || e.patrimony === eqId);
        if (eq && (eq.currentLoanId === id || eq.currentBorrower === loan.borrowerName)) {
          eq.status = 'disponivel';
          delete eq.currentBorrower;
          delete eq.currentLoanId;
        }
      });
      this.saveEquipmentList(equipList);
    }

    list = list.filter(l => l.id !== id);
    this.saveLoanList(list);
  },

  removeTestRecord() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOANS);
      if (!data) return;
      const loans = JSON.parse(data);
      const testLoans = loans.filter(l => (l.borrowerName || '').trim().toLowerCase() === 'teste');
      if (testLoans.length > 0) {
        testLoans.forEach(tl => this.deleteLoan(tl.id));
      }

      // Garantir que nenhum equipamento permaneça com vínculo ao empréstimo de teste
      const equips = this.getEquipmentList();
      let equipUpdated = false;
      equips.forEach(eq => {
        if (eq.currentBorrower && eq.currentBorrower.trim().toLowerCase() === 'teste') {
          delete eq.currentBorrower;
          delete eq.currentLoanId;
          if (eq.status === 'emprestado') {
            eq.status = 'disponivel';
          }
          equipUpdated = true;
        }
      });
      if (equipUpdated) {
        this.saveEquipmentList(equips);
      }
    } catch (e) {
      console.error('Erro ao remover registro de teste:', e);
    }
  },

  getLoanList() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOANS);
      const loans = data ? JSON.parse(data) : [];
      return loans.map(loan => this.updateLoanCalculatedStatus(loan));
    } catch (e) {
      console.error('Erro ao ler empréstimos:', e);
      return [];
    }
  },

  saveLoanList(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Erro ao salvar empréstimos:', e);
      return false;
    }
  },

  getLoanById(id) {
    const list = this.getLoanList();
    return list.find(l => l.id === id);
  },

  createLoan(loanData) {
    const loans = this.getLoanList();
    const equipList = this.getEquipmentList();

    const newLoan = {
      id: 'EMP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase(),
      createdAt: new Date().toISOString(),
      status: 'ativo',
      ...loanData
    };

    if (Array.isArray(newLoan.equipmentIds)) {
      newLoan.equipmentIds.forEach(eqId => {
        const eq = equipList.find(e => e.id === eqId || e.patrimony === eqId);
        if (eq) {
          eq.status = 'emprestado';
          eq.currentBorrower = newLoan.borrowerName;
          eq.currentLoanId = newLoan.id;
        }
      });
    }
    if (Array.isArray(newLoan.equipmentDetails)) {
      newLoan.equipmentDetails.forEach(ed => {
        const eq = equipList.find(e => e.id === ed.id || e.patrimony === ed.patrimony || (ed.serialNumber && e.serialNumber === ed.serialNumber));
        if (eq) {
          eq.status = 'emprestado';
          eq.currentBorrower = newLoan.borrowerName;
          eq.currentLoanId = newLoan.id;
        }
      });
    }

    loans.unshift(newLoan);
    this.saveEquipmentList(equipList);
    this.saveLoanList(loans);
    return newLoan;
  },

  returnLoan(loanId, returnDate = null, returnNotes = '') {
    const loans = this.getLoanList();
    const equipList = this.getEquipmentList();

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return null;

    const today = new Date();
    const dStr = String(today.getDate()).padStart(2, '0') + '/' + 
                 String(today.getMonth() + 1).padStart(2, '0') + '/' + 
                 today.getFullYear() + ' ' + 
                 String(today.getHours()).padStart(2, '0') + ':' + 
                 String(today.getMinutes()).padStart(2, '0');

    loan.status = 'devolvido';
    loan.returnDate = returnDate || dStr;
    loan.returnNotes = returnNotes;

    if (Array.isArray(loan.equipmentIds)) {
      loan.equipmentIds.forEach(eqId => {
        const eq = equipList.find(e => e.id === eqId || e.patrimony === eqId);
        if (eq) {
          eq.status = 'disponivel';
          delete eq.currentBorrower;
          delete eq.currentLoanId;
        }
      });
    }
    if (Array.isArray(loan.equipmentDetails)) {
      loan.equipmentDetails.forEach(ed => {
        const eq = equipList.find(e => e.id === ed.id || e.patrimony === ed.patrimony || (ed.serialNumber && e.serialNumber === ed.serialNumber));
        if (eq) {
          eq.status = 'disponivel';
          delete eq.currentBorrower;
          delete eq.currentLoanId;
        }
      });
    }

    this.saveEquipmentList(equipList);
    this.saveLoanList(loans);
    return loan;
  },

  updateLoan(loanId, updatedData) {
    const loans = this.getLoanList();
    const equipList = this.getEquipmentList();

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return null;

    const oldName = loan.borrowerName;
    const newName = updatedData.borrowerName ? updatedData.borrowerName.trim() : oldName;

    Object.assign(loan, updatedData);

    if (loan.status !== 'devolvido') {
      const updateEq = (eq) => {
        if (eq) {
          eq.status = 'emprestado';
          eq.currentBorrower = newName;
          eq.currentLoanId = loan.id;
        }
      };
      if (Array.isArray(loan.equipmentIds)) {
        loan.equipmentIds.forEach(eqId => {
          const eq = equipList.find(e => e.id === eqId || e.patrimony === eqId);
          updateEq(eq);
        });
      }
      if (Array.isArray(loan.equipmentDetails)) {
        loan.equipmentDetails.forEach(ed => {
          const eq = equipList.find(e => e.id === ed.id || e.patrimony === ed.patrimony || (ed.serialNumber && e.serialNumber === ed.serialNumber));
          updateEq(eq);
        });
      }
      this.saveEquipmentList(equipList);
    }

    this.saveLoanList(loans);
    return loan;
  },

  updateLoanCalculatedStatus(loan) {
    if (loan.status === 'devolvido') {
      return loan;
    }
    if (!loan.isFixed && loan.expectedReturnDate) {
      const now = new Date();
      let expDate = null;
      let str = String(loan.expectedReturnDate).trim();

      // Corrige se salvo corrompido
      const corruptMatch = str.match(/^(\d{1,2})\s+(\d{1,2}:\d{2})\/(\d{1,2})\/(\d{4})$/);
      if (corruptMatch) {
        str = `${corruptMatch[4]}-${corruptMatch[3].padStart(2, '0')}-${corruptMatch[1].padStart(2, '0')}T${corruptMatch[2]}:00`;
      }

      if (str.includes('/')) {
        const parts = str.split(' ');
        const dateParts = parts[0].split('/');
        const timePart = parts[1] ? (parts[1].length === 5 ? parts[1] + ':00' : parts[1]) : '23:59:59';
        expDate = new Date(`${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}T${timePart}`);
      } else if (str.includes('T')) {
        expDate = new Date(str);
      } else {
        const parts = str.split(' ');
        const datePart = parts[0];
        const timePart = parts[1] ? (parts[1].length === 5 ? parts[1] + ':00' : parts[1]) : '23:59:59';
        expDate = new Date(`${datePart}T${timePart}`);
      }

      if (expDate && !isNaN(expDate.getTime())) {
        if (now > expDate) {
          loan.status = 'atrasado';
        } else {
          const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const expZero = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
          if (todayZero.getTime() === expZero.getTime()) {
            loan.isDueToday = true;
          } else {
            loan.isDueToday = false;
          }
          loan.status = 'ativo';
        }
      }
    } else {
      loan.status = 'ativo';
      loan.isDueToday = false;
    }
    return loan;
  },

  getMetrics() {
    const equipments = this.getEquipmentList();
    const allLoans = this.getLoanList();
    const activeLoans = allLoans.filter(l => l.status !== 'devolvido');

    const totalEquip = equipments.length;
    const emprestadosEquip = equipments.filter(e => e.status === 'emprestado').length;
    const disponiveisEquip = equipments.filter(e => e.status === 'disponivel').length;
    
    const atrasadosLoans = activeLoans.filter(l => l.status === 'atrasado');

    // Lenovo
    const lenovoEquips = equipments.filter(e => e.brand && e.brand.toLowerCase().includes('lenovo'));
    const lenovoEmprestados = lenovoEquips.filter(e => e.status === 'emprestado').length;
    const lenovoDisponiveis = lenovoEquips.filter(e => e.status === 'disponivel').length;
    const lenovoAtrasados = atrasadosLoans.filter(l => l.type === 'lenovo').length;

    // Multilaser (Ultra)
    const multiEquips = equipments.filter(e => e.brand && (e.brand.toLowerCase().includes('multi') || e.brand.toLowerCase().includes('ultra')));
    const multiEmprestados = multiEquips.filter(e => e.status === 'emprestado').length;
    const multiDisponiveis = multiEquips.filter(e => e.status === 'disponivel').length;
    const multiAtrasados = atrasadosLoans.filter(l => l.type === 'multilaser').length;

    return {
      total: totalEquip,
      disponiveis: disponiveisEquip,
      disponiveisPct: totalEquip ? ((disponiveisEquip / totalEquip) * 100).toFixed(1) : '0,0',
      emprestados: emprestadosEquip,
      emprestadosPct: totalEquip ? ((emprestadosEquip / totalEquip) * 100).toFixed(1) : '0,0',
      atrasados: atrasadosLoans.length,
      atrasadosPct: totalEquip ? ((atrasadosLoans.length / totalEquip) * 100).toFixed(1) : '0,0',
      lenovo: {
        total: lenovoEquips.length,
        disponiveis: lenovoDisponiveis,
        disponiveisPct: lenovoEquips.length ? Math.round((lenovoDisponiveis / lenovoEquips.length) * 100) : 0,
        emprestados: lenovoEmprestados,
        emprestadosPct: lenovoEquips.length ? Math.round((lenovoEmprestados / lenovoEquips.length) * 100) : 0,
        atrasados: lenovoAtrasados,
        atrasadosPct: lenovoEquips.length ? Math.round((lenovoAtrasados / lenovoEquips.length) * 100) : 0
      },
      multilaser: {
        total: multiEquips.length,
        disponiveis: multiDisponiveis,
        disponiveisPct: multiEquips.length ? Math.round((multiDisponiveis / multiEquips.length) * 100) : 0,
        emprestados: multiEmprestados,
        emprestadosPct: multiEquips.length ? Math.round((multiEmprestados / multiEquips.length) * 100) : 0,
        atrasados: multiAtrasados,
        atrasadosPct: multiEquips.length ? Math.round((multiAtrasados / multiEquips.length) * 100) : 0
      }
    };
  },

  exportData() {
    return JSON.stringify({
      appName: 'URE SOROCABA - Controle de Emprestimos',
      exportDate: new Date().toISOString(),
      equipments: this.getEquipmentList(),
      loans: this.getLoanList()
    }, null, 2);
  },

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.equipments) && Array.isArray(data.loans)) {
        this.saveEquipmentList(data.equipments);
        this.saveLoanList(data.loans);
        return { success: true, countEquip: data.equipments.length, countLoans: data.loans.length };
      }
      return { success: false, error: 'Formato de arquivo incompatível.' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  seedDefaultData() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayBR = `${dd}/${mm}/${yyyy}`;
    const todayISO = `${yyyy}-${mm}-${dd}`;

    const equipments = [];
    const loans = [];

    const lenovoBorrowers = [
      { name: 'Katia Martins Rodrigues', role: 'Supervisora de Ensino', doc: '32.145.890-1', email: 'katia.rodrigues@educacao.sp.gov.br' },
      { name: 'Kelly Cristina Martin Morgani', role: 'Diretora de Núcleo', doc: '28.765.432-0', email: 'kelly.morgani@educacao.sp.gov.br' },
      { name: 'Bruno Takami Fugiwara', role: 'Professor Especialista', doc: '41.980.234-5', email: 'bruno.fugiwara@educacao.sp.gov.br' },
      { name: 'Paula Santos Silveira', role: 'Oficial Administrativo', doc: '35.678.912-3', email: 'paula.silveira@educacao.sp.gov.br' },
      { name: 'Mara Regina Borges Ferro', role: 'Supervisora Pedagógica', doc: '19.876.543-2', email: 'mara.ferro@educacao.sp.gov.br' }
    ];

    // Criar 53 Lenovos (51 emprestados, 2 disponíveis)
    for (let i = 1; i <= 53; i++) {
      const patNumber = 1000 + i;
      const serialNumber = 'PF2K' + (9000 + i);
      const isEmprestado = i <= 51;
      const eqId = `EQ-LEN-${i}`;

      const eq = {
        id: eqId,
        brand: 'Lenovo',
        model: 'ThinkPad L14 Gen 2',
        patrimony: `PAT-LNV-${patNumber}`,
        serialNumber: serialNumber,
        status: isEmprestado ? 'emprestado' : 'disponivel',
        notes: 'Equipamento corporativo padrão'
      };

      equipments.push(eq);

      if (i <= 5) {
        const borrower = lenovoBorrowers[i - 1];
        const loanId = `EMP-LNV-${i}`;
        eq.currentBorrower = borrower.name;
        eq.currentLoanId = loanId;

        loans.push({
          id: loanId,
          type: 'lenovo',
          borrowerName: borrower.name,
          borrowerDoc: borrower.doc,
          borrowerEmail: borrower.email,
          borrowerRole: borrower.role,
          equipmentIds: [eqId],
          equipmentDetails: [{
            id: eqId,
            brand: eq.brand,
            model: eq.model,
            patrimony: eq.patrimony,
            serialNumber: eq.serialNumber
          }],
          hasCharger: true,
          loanDate: todayBR,
          isFixed: true,
          expectedReturnDate: null,
          status: 'ativo',
          returnDate: null,
          notes: 'Empréstimo sem prazo de devolução / fixo com a pessoa'
        });
      } else if (i <= 51) {
        const loanId = `EMP-LNV-${i}`;
        const name = `Colaborador Lenovo ${i}`;
        eq.currentBorrower = name;
        eq.currentLoanId = loanId;

        loans.push({
          id: loanId,
          type: 'lenovo',
          borrowerName: name,
          borrowerDoc: `00.${100 + i}.000-0`,
          borrowerEmail: `servidor${i}@educacao.sp.gov.br`,
          borrowerRole: 'Equipe URE',
          equipmentIds: [eqId],
          equipmentDetails: [{
            id: eqId,
            brand: eq.brand,
            model: eq.model,
            patrimony: eq.patrimony,
            serialNumber: eq.serialNumber
          }],
          hasCharger: true,
          loanDate: todayBR,
          isFixed: true,
          expectedReturnDate: null,
          status: 'ativo',
          returnDate: null,
          notes: 'Fixo com a pessoa'
        });
      }
    }

    // Criar 1 Multilaser Ultra emprestado para teste + 19 disponíveis para teste de empréstimos em massa
    for (let m = 1; m <= 20; m++) {
      const eqId = `EQ-MLT-${m}`;
      const patNumber = 3000 + m;
      const serialNumber = 'MLT' + (8000 + m);
      const isEmprestado = m === 1;

      const eq = {
        id: eqId,
        brand: 'Multilaser (Ultra)',
        model: 'Multilaser Ultra 14"',
        patrimony: `PAT-MLT-${patNumber}`,
        serialNumber: serialNumber,
        status: isEmprestado ? 'emprestado' : 'disponivel',
        notes: 'Notebook educacional para aplicação de avaliações'
      };

      equipments.push(eq);

      if (m === 1) {
        const loanId = 'EMP-MLT-1';
        eq.currentBorrower = 'teste';
        eq.currentLoanId = loanId;

        loans.push({
          id: loanId,
          type: 'multilaser',
          borrowerName: 'teste',
          borrowerDoc: '11.222.333-4',
          borrowerEmail: 'teste@exemplo.com',
          borrowerRole: 'Aplicador de Prova',
          equipmentIds: [eqId],
          equipmentDetails: [{
            id: eqId,
            brand: eq.brand,
            model: eq.model,
            patrimony: eq.patrimony,
            serialNumber: eq.serialNumber
          }],
          hasCharger: true,
          loanDate: `${todayBR} 13:43`,
          isFixed: false,
          expectedReturnDate: todayISO, // Vence hoje
          isDueToday: true,
          status: 'ativo',
          returnDate: null,
          notes: 'Devolução no mesmo dia'
        });
      }
    }

    this.saveEquipmentList(equipments);
    this.saveLoanList(loans);
  }
};

StorageService.init();
