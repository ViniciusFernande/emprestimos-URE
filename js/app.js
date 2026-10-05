/**
 * URE SOROCABA - Controle de Empréstimos de Equipamentos
 * Lógica Principal da Aplicação (SPA Controller)
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {

  // Sincroniza o picker nativo com o texto no formato DD/MM/AAAA ou YYYY-MM-DD
  syncDatePickerFromText(targetInputId, pickerInputId) {
    const target = document.getElementById(targetInputId);
    const picker = document.getElementById(pickerInputId);
    if (!target || !picker) return;

    const val = target.value.trim();
    const mBR = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mBR) {
      const dd = mBR[1].padStart(2, '0');
      const mm = mBR[2].padStart(2, '0');
      const yyyy = mBR[3];
      picker.value = `${yyyy}-${mm}-${dd}`;
      return;
    }
    const mISO = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (mISO) {
      const yyyy = mISO[1];
      const mm = mISO[2].padStart(2, '0');
      const dd = mISO[3].padStart(2, '0');
      picker.value = `${yyyy}-${mm}-${dd}`;
      return;
    }
  },

  // Seleciona data pelo mini calendário e preserva/ajusta o horário
  onCalendarDateSelected(targetInputId, dateValue) {
    if (!dateValue) return;
    const parts = dateValue.split('-');
    if (parts.length !== 3) return;
    const [yyyy, mm, dd] = parts;
    const formattedDate = `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;

    const target = document.getElementById(targetInputId);
    if (!target) return;

    const currentVal = target.value.trim();
    const timeMatch = currentVal.match(/\b(\d{1,2}:\d{2})\b/);

    if (timeMatch) {
      target.value = `${formattedDate} ${timeMatch[1]}`;
    } else if (targetInputId === 'multiExpectedDate' || targetInputId === 'editLoanMultiExpectedDate') {
      target.value = `${formattedDate} 18:00`;
    } else if (targetInputId === 'multiLoanDate' || targetInputId === 'lenovoLoanDate' || targetInputId === 'editLoanDate' || targetInputId === 'returnDateInput') {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      target.value = `${formattedDate} ${hh}:${min}`;
    } else {
      target.value = formattedDate;
    }

    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  },
  activeView: 'dashboard',
  selectedMultiEquipIds: new Set(),

  // ==========================================
  // AUTENTICAÇÃO E CONTROLE DE ACESSO (RBAC)
  // ==========================================
  currentUser: null,

  initAuth() {
    if (typeof fbAuth === 'undefined' || !fbAuth) {
      console.warn('Firebase Auth não inicializado.');
      return;
    }

    fbAuth.onAuthStateChanged(user => {
      const loginOverlay = document.getElementById('loginOverlay');
      const userProfile = document.getElementById('headerUserProfile');
      const userNameEl = document.getElementById('headerUserName');
      const userBadgeEl = document.getElementById('headerUserBadge');
      const userAvatarEl = document.getElementById('headerUserAvatar');

      if (user && user.email) {
        this.currentUser = this.getUserRole(user.email);

        if (loginOverlay) loginOverlay.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (userNameEl) userNameEl.textContent = this.currentUser.name;
        if (userBadgeEl) {
          userBadgeEl.textContent = this.currentUser.title;
          userBadgeEl.className = 'user-badge ' + this.currentUser.badgeClass;
        }
        if (userAvatarEl) {
          userAvatarEl.innerHTML = `<i class="${this.currentUser.avatarIcon}"></i>`;
        }

        // Inicia sincronização do Firestore
        StorageService.initFirestoreSync(() => {
          this.refreshAll();
        });

        this.applyRolePermissions();
        this.refreshAll();
      } else {
        this.currentUser = null;
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
        StorageService.stopFirestoreSync();
      }
    });
  },

  resolveEmail(usernameOrEmail) {
    const cleaned = (usernameOrEmail || '').trim().toLowerCase();
    if (cleaned.includes('@')) {
      return cleaned;
    }
    if (cleaned === 'vinicius') {
      return 'vinicius@ure.local';
    }
    if (cleaned === 'setec') {
      return 'setec@ure.local';
    }
    if (cleaned === 'ure sorocaba' || cleaned === 'uresorocaba' || cleaned === 'ure') {
      return 'ure.sorocaba@ure.local';
    }
    return cleaned + '@ure.local';
  },

  getUserRole(email) {
    const e = (email || '').toLowerCase().trim();
    if (e.includes('vinicius')) {
      return {
        role: 'superadmin',
        title: 'Administrador Total',
        name: 'Vinicius',
        email: email,
        badgeClass: 'role-superadmin',
        avatarIcon: 'fa-solid fa-crown',
        canManageEquipments: true,
        canLoanAndReturn: true,
        canPrint: true,
        canEditLoan: true,
        canDeleteHistory: true
      };
    }
    if (e.includes('setec')) {
      return {
        role: 'setec',
        title: 'Administrador (Setec)',
        name: 'Setec',
        email: email,
        badgeClass: 'role-setec',
        avatarIcon: 'fa-solid fa-user-gear',
        canManageEquipments: true,
        canLoanAndReturn: true,
        canPrint: true,
        canEditLoan: true,
        canDeleteHistory: false // Bloqueado de excluir histórico!
      };
    }
    // URE Sorocaba / Operador de Atendimento
    return {
      role: 'operator',
      title: 'Atendimento URE',
      name: 'URE Sorocaba',
      email: email,
      badgeClass: 'role-operator',
      avatarIcon: 'fa-solid fa-user-check',
      canManageEquipments: false, // Bloqueado de cadastrar/editar/excluir equipamentos
      canLoanAndReturn: true,     // Liberado apenas para novos empréstimos e devoluções
      canPrint: true,             // Liberado para imprimir termos e relatórios
      canEditLoan: false,         // Bloqueado de editar empréstimo
      canDeleteHistory: false     // Bloqueado de excluir histórico
    };
  },

  currentUserCan(permission) {
    if (!this.currentUser) return false;
    return Boolean(this.currentUser[permission]);
  },

  async handleLogin(event) {
    event.preventDefault();
    const userInput = document.getElementById('loginUsername');
    const pwdInput = document.getElementById('loginPassword');
    const errorMsg = document.getElementById('loginErrorMsg');
    const errorText = document.getElementById('loginErrorText');
    const btnText = document.getElementById('btnLoginText');
    const btnSpinner = document.getElementById('btnLoginSpinner');
    const btnSubmit = document.getElementById('btnLoginSubmit');

    if (!userInput || !pwdInput) return;
    const userVal = userInput.value.trim();
    const pwdVal = pwdInput.value;

    if (!userVal || !pwdVal) {
      if (errorMsg) {
        errorText.textContent = 'Por favor, preencha o usuário e a senha.';
        errorMsg.style.display = 'flex';
      }
      return;
    }

    if (errorMsg) errorMsg.style.display = 'none';
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    if (btnSubmit) btnSubmit.disabled = true;

    try {
      const email = this.resolveEmail(userVal);
      await fbAuth.signInWithEmailAndPassword(email, pwdVal);
      // Login com sucesso, onAuthStateChanged cuidará do redirecionamento
      userInput.value = '';
      pwdInput.value = '';
    } catch (err) {
      console.error('Erro de autenticação:', err);
      let msg = 'Usuário ou senha incorretos.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Usuário ou senha incorretos. Verifique suas credenciais.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Falha de conexão com o Firebase. Verifique sua internet.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas sem sucesso. Aguarde alguns instantes.';
      }
      if (errorMsg) {
        errorText.textContent = msg;
        errorMsg.style.display = 'flex';
      }
    } finally {
      if (btnText) btnText.style.display = 'inline-block';
      if (btnSpinner) btnSpinner.style.display = 'none';
      if (btnSubmit) btnSubmit.disabled = false;
    }
  },

  async logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
      try {
        await fbAuth.signOut();
        this.showToast('Você saiu do sistema.', 'info');
      } catch (err) {
        console.error('Erro ao sair:', err);
      }
    }
  },

  togglePasswordVisibility() {
    const pwdInput = document.getElementById('loginPassword');
    const icon = document.getElementById('iconTogglePwd');
    if (!pwdInput || !icon) return;

    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      icon.className = 'fa-regular fa-eye-slash';
    } else {
      pwdInput.type = 'password';
      icon.className = 'fa-regular fa-eye';
    }
  },

  applyRolePermissions() {
    const btnCad = document.getElementById('btnCadastrarEquipamento');
    if (btnCad) {
      btnCad.style.display = this.currentUserCan('canManageEquipments') ? 'inline-flex' : 'none';
    }
  },

  init() {
    this.initAuth();
    StorageService.syncEquipmentBorrowers();
    this.setupClock();
    this.setupNavigation();
    this.setupEventListeners();
    this.refreshAll();
  },

  setupClock() {
    const updateTime = () => {
      const now = new Date();
      const el = document.getElementById('systemClock');
      if (el) {
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        el.innerHTML = `<i class="fa-regular fa-clock"></i> ${d}/${m}/${y} ${h}:${min}`;
      }
    };
    updateTime();
    setInterval(updateTime, 30000);
  },

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        this.navigateTo(view);
      });
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('appSidebar');
        sidebar.classList.toggle('collapsed');
      });
    }

    document.querySelectorAll('.stat-card[role="button"]').forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  },

  navigateTo(viewName) {
    this.activeView = viewName;
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSec = document.getElementById(`view-${viewName}`);
    if (targetSec) {
      targetSec.classList.add('active');
    }

    if (viewName === 'dashboard') {
      this.renderDashboard();
    } else if (viewName === 'all-equipment') {
      this.renderEquipmentsTable();
    } else if (viewName === 'lenovo') {
      this.renderLenovoTab();
    } else if (viewName === 'multilaser') {
      this.renderMultilaserTab();
    } else if (viewName === 'delayed') {
      this.renderDelayedTab();
    } else if (viewName === 'history') {
      this.renderHistoryTab();
    } else if (viewName === 'reports') {
      // Nada a renderizar na tela
    }
  },

  openEquipmentsFiltered(status = 'all', brand = 'all') {
    this.navigateTo('all-equipment');
    const statusSelect = document.getElementById('equipStatusFilter');
    if (statusSelect) statusSelect.value = status;
    const brandSelect = document.getElementById('equipBrandFilter');
    if (brandSelect) brandSelect.value = brand;
    const searchInput = document.getElementById('equipSearchInput');
    if (searchInput) searchInput.value = '';
    this.renderEquipmentsTable();
  },

  refreshAll() {
    StorageService.syncEquipmentBorrowers();
    this.updateMetrics();
    if (this.activeView === 'dashboard') {
      this.renderDashboard();
    } else if (this.activeView === 'all-equipment') {
      this.renderEquipmentsTable();
    } else if (this.activeView === 'lenovo') {
      this.renderLenovoTab();
    } else if (this.activeView === 'multilaser') {
      this.renderMultilaserTab();
    } else if (this.activeView === 'delayed') {
      this.renderDelayedTab();
    } else if (this.activeView === 'history') {
      this.renderHistoryTab();
    }
  },

  updateMetrics() {
    const m = StorageService.getMetrics();

    // Top 4 Cards
    const elTot = document.getElementById('statTotalNum');
    if (elTot) elTot.textContent = m.total;
    
    const elDisp = document.getElementById('statDisponiveisNum');
    if (elDisp) elDisp.textContent = m.disponiveis;
    const elDispPct = document.getElementById('statDisponiveisPct');
    if (elDispPct) elDispPct.textContent = `(${m.disponiveisPct}%)`;
    
    const elEmp = document.getElementById('statEmprestadosNum');
    if (elEmp) elEmp.textContent = m.emprestados;
    const elEmpPct = document.getElementById('statEmprestadosPct');
    if (elEmpPct) elEmpPct.textContent = `(${m.emprestadosPct}%)`;
    
    const elAtr = document.getElementById('statAtrasadosNum');
    if (elAtr) elAtr.textContent = m.atrasados;
    const elAtrPct = document.getElementById('statAtrasadosPct');
    if (elAtrPct) elAtrPct.textContent = `(${m.atrasadosPct}%)`;

    // Sub-metrics Lenovo (somente quantidade, sem porcentagem)
    const lTot = document.getElementById('lenovoTotal');
    if (lTot) lTot.textContent = m.lenovo.total;
    const lDisp = document.getElementById('lenovoDisp');
    if (lDisp) lDisp.textContent = m.lenovo.disponiveis;
    const lEmp = document.getElementById('lenovoEmp');
    if (lEmp) lEmp.textContent = m.lenovo.emprestados;
    const lAtr = document.getElementById('lenovoAtr');
    if (lAtr) lAtr.textContent = m.lenovo.atrasados;

    // Sub-metrics Multilaser (somente quantidade, sem porcentagem)
    const mTot = document.getElementById('multiTotal');
    if (mTot) mTot.textContent = m.multilaser.total;
    const mDisp = document.getElementById('multiDisp');
    if (mDisp) mDisp.textContent = m.multilaser.disponiveis;
    const mEmp = document.getElementById('multiEmp');
    if (mEmp) mEmp.textContent = m.multilaser.emprestados;
    const mAtr = document.getElementById('multiAtr');
    if (mAtr) mAtr.textContent = m.multilaser.atrasados;

    this.drawDonutChart(m);
  },

  drawDonutChart(m) {
    const canvas = document.getElementById('donutCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 68;
    const thickness = 22;

    ctx.clearRect(0, 0, width, height);

    const total = m.total || 1;
    const dispVal = m.disponiveis;
    const empVal = m.emprestados;
    const atrVal = m.atrasados;

    const slices = [
      { value: dispVal, color: '#10b981' },
      { value: empVal, color: '#0284c7' },
      { value: atrVal, color: '#ef4444' }
    ];

    let startAngle = -0.5 * Math.PI;

    if (m.total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = thickness;
      ctx.stroke();
    } else {
      slices.forEach(slice => {
        if (slice.value <= 0) return;
        const sliceAngle = (slice.value / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.strokeStyle = slice.color;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'butt';
        ctx.stroke();
        startAngle += sliceAngle;
      });
    }

    const centerNum = document.getElementById('chartCenterTotal');
    if (centerNum) centerNum.textContent = m.total;
  },

  renderDashboard() {
    this.updateMetrics();
    this.renderDashboardLenovoTable();
    this.renderDashboardMultilaserTable();
    this.renderDashboardAlerts();
  },

  renderDashboardLenovoTable() {
    const tbody = document.getElementById('dashLenovoTbody');
    if (!tbody) return;

    const loans = StorageService.getLoanList()
      .filter(l => l.type === 'lenovo' && l.status !== 'devolvido')
      .slice(0, 5);

    if (loans.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum empréstimo ativo no momento.</td></tr>`;
      return;
    }

    tbody.innerHTML = loans.map(l => {
      const eq = l.equipmentDetails && l.equipmentDetails[0] ? l.equipmentDetails[0] : { model: 'ThinkPad L14 Gen 2' };
      const fonteBadge = l.hasCharger 
        ? `<span class="badge-pill with-charger">Com fonte</span>` 
        : `<span class="badge-pill without-charger">Sem fonte</span>`;
      
      const statusBadge = `<span class="badge-pill status-emprestado">Emprestado</span>`;

      return `
        <tr>
          <td style="font-weight: 600;">${this.escapeHtml(l.borrowerName)}</td>
          <td>${this.escapeHtml(eq.model || 'ThinkPad L14 Gen 2')}</td>
          <td class="text-center">${fonteBadge}</td>
          <td class="text-center">${l.loanDate}</td>
          <td class="text-center">${statusBadge}</td>
          <td style="text-align: center;">
            <div class="action-buttons-cell">
              <button class="btn-action-icon return-btn" title="Devolver ao estoque" onclick="App.openReturnModal('${l.id}')">
                <i class="fa-solid fa-check"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderDashboardMultilaserTable() {
    const tbody = document.getElementById('dashMultiTbody');
    if (!tbody) return;

    const loans = StorageService.getLoanList()
      .filter(l => l.type === 'multilaser' && l.status !== 'devolvido')
      .slice(0, 5);

    if (loans.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum empréstimo ativo no momento.</td></tr>`;
      return;
    }

    tbody.innerHTML = loans.map(l => {
      let eqName = 'Multilaser Ultra';
      if (l.equipmentDetails && l.equipmentDetails.length > 1) {
        eqName = `${l.equipmentDetails.length}x Equipamentos Ultra`;
      } else if (l.equipmentDetails && l.equipmentDetails[0]) {
        eqName = l.equipmentDetails[0].model || 'Multilaser Ultra';
      }

      const fonteBadge = l.hasCharger 
        ? `<span class="badge-pill with-charger">Com fonte</span>` 
        : `<span class="badge-pill without-charger">Sem fonte</span>`;

      let statusBadge = `<span class="badge-pill status-emprestado">Emprestado</span>`;
      if (l.status === 'atrasado') {
        statusBadge = `<span class="badge-pill status-atrasado">Atrasado</span>`;
      } else if (l.isDueToday) {
        statusBadge = `<span class="badge-pill status-hoje">Hoje</span>`;
      }

      const prevDev = l.expectedReturnDate ? this.formatDateBR(l.expectedReturnDate) : 'Sem prazo';

      return `
        <tr>
          <td style="font-weight: 600;">${this.escapeHtml(l.borrowerName)}</td>
          <td>${this.escapeHtml(eqName)}</td>
          <td class="text-center">${fonteBadge}</td>
          <td class="text-center">${l.loanDate}</td>
          <td class="text-center">${prevDev}</td>
          <td class="text-center">${statusBadge}</td>
          <td style="text-align: center;">
            <div class="action-buttons-cell">
              <button class="btn-action-icon return-btn" title="Devolver ao estoque" onclick="App.openReturnModal('${l.id}')">
                <i class="fa-solid fa-check"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderDashboardAlerts() {
    const container = document.getElementById('dashAlertsList');
    if (!container) return;

    const allLoans = StorageService.getLoanList().filter(l => l.status !== 'devolvido');
    const alertLoans = allLoans.filter(l => l.status === 'atrasado' || l.isDueToday);

    if (alertLoans.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; background-color: #f8fafc; border-radius: 8px; text-align: center; color: var(--text-muted); font-size: 13px;">
          <i class="fa-regular fa-circle-check" style="color: var(--color-green); font-size: 20px; display: block; margin-bottom: 6px;"></i>
          Nenhum equipamento com devolução pendente ou em atraso.
        </div>
      `;
      return;
    }

    container.innerHTML = alertLoans.slice(0, 4).map(l => {
      const isOverdue = l.status === 'atrasado';
      const badgeClass = isOverdue ? 'status-atrasado' : 'status-hoje';
      const badgeText = isOverdue ? 'Atrasado' : 'Vence hoje';
      
      let equipText = '';
      if (l.equipmentDetails && l.equipmentDetails.length > 1) {
        equipText = `${l.equipmentDetails.length} aparelhos (${l.equipmentDetails.map(e => e.patrimony).join(', ')})`;
      } else if (l.equipmentDetails && l.equipmentDetails[0]) {
        equipText = `${l.equipmentDetails[0].model} (${l.equipmentDetails[0].patrimony})`;
      }

      return `
        <div class="alert-item-box ${isOverdue ? 'overdue' : ''}">
          <div class="alert-item-info">
            <div class="alert-item-name">${this.escapeHtml(l.borrowerName)}</div>
            <div class="alert-item-equip">${equipText || 'Equipamento'} • Prev: ${this.formatDateBR(l.expectedReturnDate)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge-pill ${badgeClass}">${badgeText}</span>
            <button class="btn-action-icon return-btn" title="Devolver agora" onclick="App.openReturnModal('${l.id}')">
              <i class="fa-solid fa-check"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // View: Todos os Equipamentos
  renderEquipmentsTable() {
    const tbody = document.getElementById('allEquipmentsTbody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('equipSearchInput')?.value || '').trim().toLowerCase();
    const brandFilter = document.getElementById('equipBrandFilter')?.value || 'all';
    const statusFilter = document.getElementById('equipStatusFilter')?.value || 'all';

    let list = StorageService.getEquipmentList();

    if (brandFilter !== 'all') {
      list = list.filter(e => e.brand.toLowerCase().includes(brandFilter));
    }
    if (statusFilter !== 'all') {
      list = list.filter(e => e.status === statusFilter);
    }
    if (searchTerm) {
      list = list.filter(e => 
        (e.patrimony && e.patrimony.toLowerCase().includes(searchTerm)) ||
        (e.serialNumber && e.serialNumber.toLowerCase().includes(searchTerm)) ||
        (e.model && e.model.toLowerCase().includes(searchTerm)) ||
        (e.id && e.id.toLowerCase().includes(searchTerm)) ||
        (e.currentBorrower && e.currentBorrower.toLowerCase().includes(searchTerm))
      );
    }

    const countEl = document.getElementById('equipTableCount');
    if (countEl) countEl.textContent = `${list.length} equipamento(s) encontrado(s)`;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum equipamento cadastrado ou localizado com os filtros atuais.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(e => {
      const isLenovo = e.brand.toLowerCase().includes('lenovo');
      const brandBadge = isLenovo 
        ? `<span class="badge-brand lenovo">Lenovo</span>` 
        : `<span class="badge-brand multi">Multilaser</span>`;

      let statusBadge = `<span class="badge-pill status-disponivel">Disponível</span>`;
      if (e.status === 'emprestado') {
        statusBadge = `<span class="badge-pill status-emprestado">Emprestado</span>`;
      } else if (e.status === 'manutencao') {
        statusBadge = `<span class="badge-pill status-atrasado">Manutenção</span>`;
      }

      let borrowerCell = '<span style="color:#94a3b8;">-</span>';
      if (e.currentBorrower) {
        borrowerCell = `<strong>${this.escapeHtml(e.currentBorrower)}</strong>`;
      } else if (e.status === 'emprestado') {
        const al = StorageService.getActiveLoanForEquipment(e);
        if (al && al.borrowerName) {
          borrowerCell = `<strong>${this.escapeHtml(al.borrowerName)}</strong>`;
        }
      }

      return `
        <tr>
          <td><strong style="color: #0f172a;">${this.escapeHtml(e.patrimony || '-')}</strong></td>
          <td>${brandBadge}</td>
          <td>${this.escapeHtml(e.model)}</td>
          <td><code>${this.escapeHtml(e.serialNumber || '-')}</code></td>
          <td class="text-center">${statusBadge}</td>
          <td>${borrowerCell}</td>
          <td style="text-align: center;">
            <div class="action-buttons-cell">
              ${this.currentUserCan('canManageEquipments') ? `
                <button class="btn-action-icon" title="Editar equipamento" onclick="App.openEditEquipModal('${e.id}')">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-action-icon delete-btn" title="Excluir equipamento" onclick="App.confirmDeleteEquip('${e.id}')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : `<span style="color: var(--text-muted); font-size: 13px;">-</span>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // View: Lenovo Exclusiva
  renderLenovoTab() {
    const equipsTbody = document.getElementById('lenovoTabEquipsTbody');
    if (!equipsTbody) return;

    const allEquips = StorageService.getEquipmentList()
      .filter(e => e.brand && e.brand.toLowerCase().includes('lenovo'));

    const search = (document.getElementById('lenovoEquipListSearch')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('lenovoEquipListStatusFilter')?.value || 'all';

    let list = allEquips;
    if (statusFilter !== 'all') {
      list = list.filter(e => e.status === statusFilter);
    }
    if (search) {
      list = list.filter(e => 
        (e.patrimony && e.patrimony.toLowerCase().includes(search)) ||
        (e.serialNumber && e.serialNumber.toLowerCase().includes(search)) ||
        (e.model && e.model.toLowerCase().includes(search)) ||
        (e.currentBorrower && e.currentBorrower.toLowerCase().includes(search))
      );
    }

    if (list.length === 0) {
      equipsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum equipamento Lenovo cadastrado ou encontrado com os filtros atuais.</td></tr>`;
      return;
    }

    equipsTbody.innerHTML = list.map(e => {
      let statusBadge = `<span class="badge-pill status-disponivel">Disponível</span>`;
      if (e.status === 'emprestado') {
        statusBadge = `<span class="badge-pill status-emprestado">Emprestado</span>`;
      } else if (e.status === 'manutencao') {
        statusBadge = `<span class="badge-pill status-atrasado">Manutenção</span>`;
      }

      let actionButtons = '';
      let borrowerDisplay = '<span style="color:#94a3b8;">-</span>';

      if (e.status === 'emprestado') {
        let loan = null;
        if (e.currentLoanId) {
          loan = StorageService.getLoanById(e.currentLoanId);
        }
        if (!loan) {
          loan = StorageService.getActiveLoanForEquipment(e) || StorageService.ensureActiveLoanForEquipment(e);
        }

        const loanId = loan ? loan.id : e.currentLoanId;
        const bName = (loan && loan.borrowerName) ? loan.borrowerName : (e.currentBorrower || '');

        if (bName) {
          borrowerDisplay = `<strong>${this.escapeHtml(bName)}</strong>`;
        }

        if (loanId) {
          actionButtons = `
            ${this.currentUserCan('canEditLoan') ? `
              <button class="btn-action-icon edit-loan-btn" title="Editar dados do empréstimo" onclick="App.openEditLoanModal('${loanId}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>` : ''}
            <button class="btn-action-icon return-btn" title="Devolver ao estoque" onclick="App.openReturnModal('${loanId}')">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-action-icon print-btn" title="Imprimir Termo" onclick="App.openTermModal('${loanId}')">
              <i class="fa-solid fa-print"></i>
            </button>
          `;
        } else {
          actionButtons = `<span style="color: var(--text-muted); font-size: 13px;">-</span>`;
        }
      } else {
        actionButtons = `<span style="color: var(--text-muted); font-size: 13px;">-</span>`;
      }

      return `
        <tr>
          <td><strong style="color: #0f172a;">${this.escapeHtml(e.patrimony || '-')}</strong></td>
          <td>${this.escapeHtml(e.model)}</td>
          <td><code>${this.escapeHtml(e.serialNumber || '-')}</code></td>
          <td class="text-center">${statusBadge}</td>
          <td>${borrowerDisplay}</td>
          <td style="text-align: center;">
            <div class="action-buttons-cell">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // View: Multilaser Exclusiva
  renderMultilaserTab() {
    const equipsTbody = document.getElementById('multiTabEquipsTbody');
    if (!equipsTbody) return;

    const allMultiEquips = StorageService.getEquipmentList()
      .filter(e => e.brand && (e.brand.toLowerCase().includes('multi') || e.brand.toLowerCase().includes('ultra')));

    const search = (document.getElementById('multiEquipListSearch')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('multiEquipListStatusFilter')?.value || 'all';

    let list = allMultiEquips;
    if (statusFilter !== 'all') {
      list = list.filter(e => 
        e.status === statusFilter
      );
    }
    if (search) {
      list = list.filter(e => 
        (e.patrimony && e.patrimony.toLowerCase().includes(search)) ||
        (e.serialNumber && e.serialNumber.toLowerCase().includes(search)) ||
        (e.model && e.model.toLowerCase().includes(search)) ||
        (e.currentBorrower && e.currentBorrower.toLowerCase().includes(search))
      );
    }

    if (list.length === 0) {
      equipsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum equipamento Multilaser cadastrado ou encontrado com os filtros atuais.</td></tr>`;
      return;
    }

    equipsTbody.innerHTML = list.map(e => {
      let statusBadge = `<span class="badge-pill status-disponivel">Disponível</span>`;
      if (e.status === 'emprestado') {
        statusBadge = `<span class="badge-pill status-emprestado">Emprestado</span>`;
      } else if (e.status === 'manutencao') {
        statusBadge = `<span class="badge-pill status-atrasado">Manutenção</span>`;
      }

      let actionButtons = '';
      let borrowerDisplay = '<span style="color:#94a3b8;">-</span>';

      if (e.status === 'emprestado') {
        let loan = null;
        if (e.currentLoanId) {
          loan = StorageService.getLoanById(e.currentLoanId);
        }
        if (!loan) {
          loan = StorageService.getActiveLoanForEquipment(e) || StorageService.ensureActiveLoanForEquipment(e);
        }

        const loanId = loan ? loan.id : e.currentLoanId;
        const bName = (loan && loan.borrowerName) ? loan.borrowerName : (e.currentBorrower || '');

        if (bName) {
          borrowerDisplay = `<strong>${this.escapeHtml(bName)}</strong>`;
        }

        if (loanId) {
          actionButtons = `
            ${this.currentUserCan('canEditLoan') ? `
              <button class="btn-action-icon edit-loan-btn" title="Editar dados do empréstimo" onclick="App.openEditLoanModal('${loanId}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>` : ''}
            <button class="btn-action-icon return-btn" title="Devolver ao estoque" onclick="App.openReturnModal('${loanId}')">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-action-icon print-btn" title="Imprimir Comprovante" onclick="App.openTermModal('${loanId}')">
              <i class="fa-solid fa-print"></i>
            </button>
          `;
        } else {
          actionButtons = `<span style="color: var(--text-muted); font-size: 13px;">-</span>`;
        }
      } else {
        actionButtons = `<span style="color: var(--text-muted); font-size: 13px;">-</span>`;
      }

      return `
        <tr>
          <td><strong style="color: #0f172a;">${this.escapeHtml(e.patrimony || '-')}</strong></td>
          <td>${this.escapeHtml(e.model)}</td>
          <td><code>${this.escapeHtml(e.serialNumber || '-')}</code></td>
          <td class="text-center">${statusBadge}</td>
          <td>${borrowerDisplay}</td>
          <td style="text-align: center;">
            <div class="action-buttons-cell">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // View: Empréstimos Atrasados
  renderDelayedTab() {
    const tbody = document.getElementById('delayedTbody');
    if (!tbody) return;

    const list = StorageService.getLoanList().filter(l => l.status === 'atrasado');

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--color-green);">
        <i class="fa-solid fa-check-circle" style="font-size: 28px; display:block; margin-bottom: 8px;"></i>
        Nenhum empréstimo em atraso no momento!
      </td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(l => {
      let items = l.equipmentDetails ? l.equipmentDetails.map(e => `${e.patrimony} (${e.brand})`).join(', ') : 'Equipamento';
      return `
        <tr>
          <td><strong style="color: #b91c1c;">${this.escapeHtml(l.borrowerName)}</strong><br><small>${l.borrowerEmail || l.borrowerPhone || ''}</small></td>
          <td>${items}</td>
          <td class="text-center">${l.loanDate}</td>
          <td class="text-center"><strong style="color: #b91c1c;">${this.formatDateBR(l.expectedReturnDate)}</strong></td>
          <td class="text-center"><span class="badge-pill status-atrasado">Prazo Vencido</span></td>
          <td style="text-align: center;">
            <div class="action-buttons-cell">
              ${this.currentUserCan('canEditLoan') ? `
                <button class="btn-action-icon edit-loan-btn" title="Editar dados do empréstimo" onclick="App.openEditLoanModal('${l.id}')">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>` : ''}
              <button class="btn-action-icon return-btn" title="Devolver ao estoque" onclick="App.openReturnModal('${l.id}')">
                <i class="fa-solid fa-check"></i>
              </button>
              <button class="btn-action-icon print-btn" title="Ver Detalhes" onclick="App.openTermModal('${l.id}')">
                <i class="fa-solid fa-print"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // View: Histórico
  renderHistoryTab() {
    const tbody = document.getElementById('historyTbody');
    if (!tbody) return;

    const search = (document.getElementById('historySearchInput')?.value || '').trim().toLowerCase();
    const typeFilter = document.getElementById('historyTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('historyStatusFilter')?.value || 'all';

    let list = StorageService.getLoanList();

    if (typeFilter !== 'all') {
      list = list.filter(l => l.type === typeFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter(l => l.status === statusFilter);
    }
    if (search) {
      list = list.filter(l => 
        l.borrowerName.toLowerCase().includes(search) ||
        (l.borrowerDoc && l.borrowerDoc.toLowerCase().includes(search)) ||
        (l.id && l.id.toLowerCase().includes(search)) ||
        (l.equipmentDetails && l.equipmentDetails.some(e => 
          (e.patrimony && e.patrimony.toLowerCase().includes(search)) ||
          (e.serialNumber && e.serialNumber.toLowerCase().includes(search))
        ))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">Nenhum registro encontrado no histórico.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(l => {
      const isReturned = l.status === 'devolvido';
      const statusBadge = isReturned
        ? `<span class="badge-pill status-devolvido">Devolvido</span>`
        : (l.status === 'atrasado' 
            ? `<span class="badge-pill status-atrasado">Atrasado</span>` 
            : `<span class="badge-pill status-emprestado">Emprestado</span>`);

      const brandBadge = l.type === 'lenovo' 
        ? `<span class="badge-brand lenovo">Lenovo</span>` 
        : `<span class="badge-brand multi">Multilaser</span>`;

      let itemsStr = l.equipmentDetails ? l.equipmentDetails.map(e => e.patrimony).join(', ') : '-';

      return `
        <tr>
          <td>${brandBadge}</td>
          <td><strong>${this.escapeHtml(l.borrowerName)}</strong></td>
          <td>${itemsStr}</td>
          <td class="text-center">${l.loanDate}</td>
          <td class="text-center">${isReturned ? `<strong>${l.returnDate}</strong>` : (l.expectedReturnDate ? this.formatDateBR(l.expectedReturnDate) : 'Fixo')}</td>
          <td class="text-center">${statusBadge}</td>
          <td style="text-align: center;">
            <div class="action-buttons-cell">
              <button class="btn-action-icon print-btn" title="Visualizar Termo / Comprovante" onclick="App.openTermModal('${l.id}')">
                <i class="fa-solid fa-file-lines"></i>
              </button>
              ${this.currentUserCan('canDeleteHistory') ? `
                <button class="btn-action-icon delete-btn" title="Excluir empréstimo" onclick="App.confirmDeleteLoan('${l.id}')">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // Relatórios de Impressão e PDF
  printReport() {
    this.generateReportContent();
    document.body.classList.remove('printing-modal');
    document.body.classList.add('printing-report');
    setTimeout(() => {
      window.print();
    }, 150);
  },

  generateReportContent() {
    const reportType = document.getElementById('reportTypeSelect')?.value || 'all';
    const brandFilter = document.getElementById('reportBrandSelect')?.value || 'all';
    const container = document.getElementById('reportPrintArea');
    if (!container) return;

    let equipments = StorageService.getEquipmentList();
    let loans = StorageService.getLoanList();

    // Filtro por Marca
    if (brandFilter === 'lenovo') {
      equipments = equipments.filter(e => e.brand && e.brand.toLowerCase().includes('lenovo'));
      loans = loans.filter(l => l.type === 'lenovo');
    } else if (brandFilter === 'multilaser') {
      equipments = equipments.filter(e => e.brand && (e.brand.toLowerCase().includes('multi') || e.brand.toLowerCase().includes('ultra')));
      loans = loans.filter(l => l.type === 'multilaser');
    }

    let title = 'RELATÓRIO GERAL DE EQUIPAMENTOS';
    let tableHtml = '';

    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} às ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    if (reportType === 'all') {
      title = 'RELATÓRIO DE TODOS OS EQUIPAMENTOS CADASTRADOS';
      tableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Patrimônio</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Nº de Série</th>
              <th>Status Atual</th>
              <th>Responsável Atual</th>
            </tr>
          </thead>
          <tbody>
            ${equipments.map(e => `
              <tr>
                <td><strong>${e.patrimony}</strong></td>
                <td>${e.brand}</td>
                <td>${e.model}</td>
                <td>${e.serialNumber || '-'}</td>
                <td>${e.status === 'emprestado' ? 'EMPRESTADO' : 'DISPONÍVEL'}</td>
                <td>${e.currentBorrower || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'borrowed') {
      title = 'RELATÓRIO DE EQUIPAMENTOS EMPRESTADOS NO MOMENTO';
      const borrowed = equipments.filter(e => e.status === 'emprestado');
      tableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Patrimônio</th>
              <th>Marca / Modelo</th>
              <th>Nº de Série</th>
              <th>Responsável</th>
              <th>Data Empréstimo</th>
              <th>Previsão Devolução</th>
            </tr>
          </thead>
          <tbody>
            ${borrowed.map(e => {
              const loan = loans.find(l => l.id === e.currentLoanId);
              return `
                <tr>
                  <td><strong>${e.patrimony}</strong></td>
                  <td>${e.brand} ${e.model}</td>
                  <td>${e.serialNumber || '-'}</td>
                  <td><strong>${e.currentBorrower || '-'}</strong></td>
                  <td>${loan ? loan.loanDate : '-'}</td>
                  <td>${loan ? (loan.isFixed ? 'Fixo com a pessoa' : (loan.expectedReturnDate ? this.formatDateBR(loan.expectedReturnDate) : 'Sem prazo')) : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'available') {
      title = 'RELATÓRIO DE EQUIPAMENTOS DISPONÍVEIS EM ESTOQUE';
      const available = equipments.filter(e => e.status === 'disponivel');
      tableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Patrimônio</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Nº de Série</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${available.map(e => `
              <tr>
                <td><strong>${e.patrimony}</strong></td>
                <td>${e.brand}</td>
                <td>${e.model}</td>
                <td>${e.serialNumber || '-'}</td>
                <td>Pronto para Empréstimo</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'overdue') {
      title = 'RELATÓRIO DE EMPRÉSTIMOS EM ATRASO';
      const overdueLoans = loans.filter(l => l.status === 'atrasado');
      tableHtml = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Responsável</th>
              <th>Equipamento(s)</th>
              <th>Data Empréstimo</th>
              <th>Previsão de Retorno</th>
              <th>Contato</th>
            </tr>
          </thead>
          <tbody>
            ${overdueLoans.map(l => `
              <tr>
                <td><strong>${l.borrowerName}</strong></td>
                <td>${l.equipmentDetails ? l.equipmentDetails.map(e => e.patrimony).join(', ') : '-'}</td>
                <td>${l.loanDate}</td>
                <td><strong style="color:#b91c1c;">${this.formatDateBR(l.expectedReturnDate)}</strong></td>
                <td>${l.borrowerEmail || l.borrowerPhone || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    container.innerHTML = `
      <div class="report-print-container">
        <div class="report-header">
          <div>
            <div style="font-size: 11pt; font-weight: bold; color: #1e3a8a;">GOVERNO DO ESTADO DE SÃO PAULO - SECRETARIA DA EDUCAÇÃO</div>
            <div class="report-header-title">URE SOROCABA - CONTROLE PATRIMONIAL DE EQUIPAMENTOS</div>
            <div style="font-size: 12pt; font-weight: bold; margin-top: 4px;">${title}</div>
          </div>
          <div class="report-meta" style="text-align: right;">
            <div><strong>Emissão:</strong> ${dStr}</div>
            <div><strong>Filtro:</strong> ${brandFilter.toUpperCase()}</div>
          </div>
        </div>
        ${tableHtml}
      </div>
    `;
  },

  // Modais e Operações
  openNewLenovoModal() {
    const form = document.getElementById('formLoanLenovo');
    if (form) form.reset();
    
    // Define data de hoje
    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const dateInput = document.getElementById('lenovoLoanDate');
    if (dateInput) dateInput.value = dStr;
    this.syncDatePickerFromText('lenovoLoanDate', 'picker-lenovoLoanDate');

    const expGroup = document.getElementById('lenovoExpectedDateGroup');
    if (expGroup) expGroup.style.display = 'none';

    // Carregar equipamentos disponíveis Lenovo
    const available = StorageService.getEquipmentList()
      .filter(e => e.brand.toLowerCase().includes('lenovo') && e.status === 'disponivel');

    const select = document.getElementById('lenovoEquipSelect');
    if (select) {
      select.innerHTML = `<option value="">-- Selecione ou digite o ID/Patrimônio --</option>` + 
        available.map(e => `<option value="${e.id}">${e.patrimony} - ${e.model} (Série: ${e.serialNumber || '-'})</option>`).join('');
    }

    this.resetLenovoAutoFill();
    this.openModal('modalLoanLenovo');
  },

  handleLenovoEquipSelect(equipIdOrSearch) {
    if (!equipIdOrSearch) {
      this.resetLenovoAutoFill();
      return;
    }
    const eq = StorageService.getEquipmentById(equipIdOrSearch);
    if (eq) {
      document.getElementById('lenovoAutoPatrimony').textContent = eq.patrimony || '-';
      document.getElementById('lenovoAutoModel').textContent = eq.model || '-';
      document.getElementById('lenovoAutoSerial').textContent = eq.serialNumber || '-';
      document.getElementById('lenovoAutoBrand').textContent = eq.brand || 'Lenovo';
      document.getElementById('lenovoSelectedEquipId').value = eq.id;
    } else {
      this.resetLenovoAutoFill();
    }
  },

  resetLenovoAutoFill() {
    const p = document.getElementById('lenovoAutoPatrimony');
    if (p) p.textContent = '-';
    const m = document.getElementById('lenovoAutoModel');
    if (m) m.textContent = '-';
    const s = document.getElementById('lenovoAutoSerial');
    if (s) s.textContent = '-';
    const b = document.getElementById('lenovoAutoBrand');
    if (b) b.textContent = '-';
    const id = document.getElementById('lenovoSelectedEquipId');
    if (id) id.value = '';
  },

  submitLoanLenovo(e) {
    e.preventDefault();
    const equipId = document.getElementById('lenovoSelectedEquipId').value || document.getElementById('lenovoEquipSelect').value;
    if (!equipId) {
      this.showToast('Por favor, selecione um equipamento válido disponível.', 'error');
      return;
    }

    const eq = StorageService.getEquipmentById(equipId);
    if (!eq) {
      this.showToast('Equipamento não encontrado!', 'error');
      return;
    }

    const borrowerName = document.getElementById('lenovoBorrowerName').value.trim();
    const borrowerDoc = document.getElementById('lenovoBorrowerDoc').value.trim();
    const borrowerEmail = document.getElementById('lenovoBorrowerEmail').value.trim();
    const borrowerRole = document.getElementById('lenovoBorrowerRole').value.trim();
    const hasCharger = document.getElementById('lenovoHasCharger').checked;
    const loanDate = document.getElementById('lenovoLoanDate').value;
    const isFixed = document.getElementById('lenovoReturnFixed').checked;
    const expectedReturnDate = isFixed ? null : document.getElementById('lenovoExpectedDate').value;
    const notes = document.getElementById('lenovoNotes').value.trim();
    const generateTerm = document.getElementById('lenovoGenerateTerm').checked;

    const loanData = {
      type: 'lenovo',
      borrowerName,
      borrowerDoc,
      borrowerEmail,
      borrowerRole,
      equipmentIds: [eq.id],
      equipmentDetails: [{
        id: eq.id,
        brand: eq.brand,
        model: eq.model,
        patrimony: eq.patrimony,
        serialNumber: eq.serialNumber
      }],
      hasCharger,
      loanDate,
      isFixed,
      expectedReturnDate,
      notes
    };

    const newLoan = StorageService.createLoan(loanData);
    this.closeModal('modalLoanLenovo');
    this.refreshAll();
    this.showToast(`Empréstimo registrado com sucesso para ${borrowerName}!`, 'success');

    if (generateTerm) {
      this.openTermModal(newLoan.id);
    }
  },

  // Modal Novo Empréstimo Multilaser (Ultra)
  openNewMultilaserModal() {
    const form = document.getElementById('formLoanMulti');
    if (form) form.reset();
    this.selectedMultiEquipIds.clear();

    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    const dateInput = document.getElementById('multiLoanDate');
    if (dateInput) dateInput.value = dStr;

    // Prev de devolução padrão hoje no fim do expediente
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const expInput = document.getElementById('multiExpectedDate');
    if (expInput) expInput.value = `${dd}/${mm}/${yyyy} 18:00`;
    this.syncDatePickerFromText('multiLoanDate', 'picker-multiLoanDate');
    this.syncDatePickerFromText('multiExpectedDate', 'picker-multiExpectedDate');

    this.renderMultiEquipSelectorList();
    this.updateMultiSelectedTags();
    this.openModal('modalLoanMulti');
  },

  renderMultiEquipSelectorList(search = '') {
    const container = document.getElementById('multiEquipAvailableList');
    if (!container) return;

    const available = StorageService.getEquipmentList()
      .filter(e => (e.brand.toLowerCase().includes('multi') || e.brand.toLowerCase().includes('ultra')) && e.status === 'disponivel');

    const filtered = search 
      ? available.filter(e => 
          (e.patrimony && e.patrimony.toLowerCase().includes(search.toLowerCase())) ||
          (e.serialNumber && e.serialNumber.toLowerCase().includes(search.toLowerCase())) ||
          (e.model && e.model.toLowerCase().includes(search.toLowerCase()))
        )
      : available;

    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">Nenhum equipamento Multilaser disponível no momento.</div>`;
      return;
    }

    container.innerHTML = filtered.map(e => {
      const isChecked = this.selectedMultiEquipIds.has(e.id);
      return `
        <label class="multi-equip-row">
          <input type="checkbox" value="${e.id}" ${isChecked ? 'checked' : ''} onchange="App.toggleMultiEquipSelection('${e.id}', this.checked)">
          <div style="font-size: 13px;">
            <strong>${e.patrimony}</strong> - ${e.model} 
            <span style="color: #64748b; font-size: 12px;">(Nº: ${e.serialNumber || '-'})</span>
          </div>
        </label>
      `;
    }).join('');
  },

  toggleMultiEquipSelection(id, isSelected) {
    if (isSelected) {
      this.selectedMultiEquipIds.add(id);
    } else {
      this.selectedMultiEquipIds.delete(id);
    }
    this.updateMultiSelectedTags();
  },

  selectAllAvailableMulti(count = 999) {
    const available = StorageService.getEquipmentList()
      .filter(e => (e.brand.toLowerCase().includes('multi') || e.brand.toLowerCase().includes('ultra')) && e.status === 'disponivel');
    
    available.slice(0, count).forEach(e => {
      this.selectedMultiEquipIds.add(e.id);
    });

    this.renderMultiEquipSelectorList();
    this.updateMultiSelectedTags();
  },

  clearAllSelectedMulti() {
    this.selectedMultiEquipIds.clear();
    this.renderMultiEquipSelectorList();
    this.updateMultiSelectedTags();
  },

  updateMultiSelectedTags() {
    const wrap = document.getElementById('multiSelectedTags');
    const badgeCount = document.getElementById('multiSelectedCountBadge');
    if (!wrap) return;

    const count = this.selectedMultiEquipIds.size;
    if (badgeCount) badgeCount.textContent = `${count} selecionado(s)`;

    if (count === 0) {
      wrap.innerHTML = `<span style="color: var(--text-light); font-size: 12px;">Nenhum equipamento selecionado ainda. Marque na lista abaixo ou pesquise pelo ID.</span>`;
      return;
    }

    const list = StorageService.getEquipmentList();
    wrap.innerHTML = Array.from(this.selectedMultiEquipIds).map(id => {
      const eq = list.find(e => e.id === id);
      const name = eq ? eq.patrimony : id;
      return `
        <span class="item-chip">
          ${name}
          <span class="item-chip-remove" onclick="App.toggleMultiEquipSelection('${id}', false); App.renderMultiEquipSelectorList();">&times;</span>
        </span>
      `;
    }).join('');
  },

  submitLoanMultilaser(e) {
    e.preventDefault();
    if (this.selectedMultiEquipIds.size === 0) {
      this.showToast('Por favor, selecione pelo menos 1 equipamento Multilaser para o empréstimo.', 'error');
      return;
    }

    const borrowerName = document.getElementById('multiBorrowerName').value.trim();
    const borrowerRole = document.getElementById('multiBorrowerRole').value.trim();
    const loanDate = document.getElementById('multiLoanDate').value;
    const expectedReturnDate = document.getElementById('multiExpectedDate').value;
    const hasCharger = document.getElementById('multiHasCharger').checked;
    const notes = document.getElementById('multiNotes').value.trim();
    const generateTerm = document.getElementById('multiGenerateTerm').checked;

    const list = StorageService.getEquipmentList();
    const equipIds = Array.from(this.selectedMultiEquipIds);
    const equipDetails = equipIds.map(id => {
      const eq = list.find(e => e.id === id);
      return {
        id: eq.id,
        brand: eq.brand,
        model: eq.model,
        patrimony: eq.patrimony,
        serialNumber: eq.serialNumber
      };
    });

    const loanData = {
      type: 'multilaser',
      borrowerName,
      borrowerRole,
      equipmentIds: equipIds,
      equipmentDetails: equipDetails,
      hasCharger,
      loanDate,
      isFixed: false,
      expectedReturnDate,
      notes
    };

    const newLoan = StorageService.createLoan(loanData);
    this.closeModal('modalLoanMulti');
    this.refreshAll();
    this.showToast(`Empréstimo de ${equipIds.length} equipamentos para ${borrowerName} registrado com sucesso!`, 'success');

    if (generateTerm) {
      this.openTermModal(newLoan.id);
    }
  },

  // Modal Editar Empréstimo
  openEditLoanModal(loanId) {
    const loan = StorageService.getLoanById(loanId) || StorageService.getActiveLoanForEquipment(loanId);
    if (!loan) return;

    const isLenovo = loan.type === 'lenovo';

    document.getElementById('editLoanId').value = loan.id;
    document.getElementById('editLoanType').value = loan.type;
    document.getElementById('editLoanBorrowerName').value = loan.borrowerName || '';
    document.getElementById('editLoanDate').value = loan.loanDate || '';
    document.getElementById('editLoanHasCharger').checked = !!loan.hasCharger;
    document.getElementById('editLoanNotes').value = loan.notes || '';

    const lenovoFields = document.querySelectorAll('.edit-loan-lenovo-field');
    const multiFields = document.querySelectorAll('.edit-loan-multi-field');
    const titleEl = document.getElementById('modalEditLoanTitle');

    if (isLenovo) {
      lenovoFields.forEach(el => el.style.display = '');
      multiFields.forEach(el => el.style.display = 'none');

      document.getElementById('editLoanBorrowerDoc').value = loan.borrowerDoc || '';
      document.getElementById('editLoanBorrowerEmail').value = loan.borrowerEmail || '';
      document.getElementById('editLoanBorrowerRole').value = loan.borrowerRole || '';

      const isFixed = loan.isFixed !== false;
      document.getElementById('editLoanReturnFixed').checked = isFixed;
      document.getElementById('editLoanReturnCustom').checked = !isFixed;
      const expGroup = document.getElementById('editLoanExpectedDateGroup');
      if (expGroup) {
        expGroup.style.display = isFixed ? 'none' : 'block';
      }
      document.getElementById('editLoanExpectedDate').value = loan.expectedReturnDate || '';

      if (titleEl) {
        titleEl.innerHTML = `<span class="badge-brand lenovo">Lenovo</span> <span>Editar Empréstimo Lenovo</span>`;
      }
    } else {
      lenovoFields.forEach(el => el.style.display = 'none');
      multiFields.forEach(el => el.style.display = '');

      document.getElementById('editLoanMultiRole').value = loan.borrowerRole || '';
      document.getElementById('editLoanMultiExpectedDate').value = loan.expectedReturnDate || '';

      if (titleEl) {
        titleEl.innerHTML = `<span class="badge-brand multi">Multilaser</span> <span>Editar Empréstimo Multilaser (Ultra)</span>`;
      }
    }

    const eqDisplay = document.getElementById('editLoanEquipmentsDisplay');
    if (eqDisplay) {
      if (loan.equipmentDetails && loan.equipmentDetails.length > 0) {
        eqDisplay.innerHTML = loan.equipmentDetails.map((e, idx) => 
          `<div><strong>${idx + 1}. ${e.patrimony}</strong> - ${e.model} <span style="color:#64748b;">(Série: ${e.serialNumber || '-'})</span></div>`
        ).join('');
      } else {
        eqDisplay.textContent = 'Nenhum equipamento registrado.';
      }
    }

    this.syncDatePickerFromText('editLoanDate', 'picker-editLoanDate');
    this.syncDatePickerFromText('editLoanMultiExpectedDate', 'picker-editLoanMultiExpectedDate');
    this.openModal('modalEditLoan');
  },

  submitEditLoan(e) {
    e.preventDefault();
    const loanId = document.getElementById('editLoanId').value;
    const loanType = document.getElementById('editLoanType').value;
    const borrowerName = document.getElementById('editLoanBorrowerName').value.trim();
    const loanDate = document.getElementById('editLoanDate').value.trim();
    const hasCharger = document.getElementById('editLoanHasCharger').checked;
    const notes = document.getElementById('editLoanNotes').value.trim();

    if (!borrowerName) {
      this.showToast('O nome do responsável é obrigatório.', 'error');
      return;
    }

    let updatedData = {
      borrowerName,
      loanDate,
      hasCharger,
      notes
    };

    if (loanType === 'lenovo') {
      const borrowerDoc = document.getElementById('editLoanBorrowerDoc').value.trim();
      const borrowerEmail = document.getElementById('editLoanBorrowerEmail').value.trim();
      const borrowerRole = document.getElementById('editLoanBorrowerRole').value.trim();
      const isFixed = document.getElementById('editLoanReturnFixed').checked;
      const expectedReturnDate = isFixed ? null : document.getElementById('editLoanExpectedDate').value;

      updatedData.borrowerDoc = borrowerDoc;
      updatedData.borrowerEmail = borrowerEmail;
      updatedData.borrowerRole = borrowerRole;
      updatedData.isFixed = isFixed;
      updatedData.expectedReturnDate = expectedReturnDate;
    } else {
      const borrowerRole = document.getElementById('editLoanMultiRole').value.trim();
      const expectedReturnDate = document.getElementById('editLoanMultiExpectedDate').value.trim();

      updatedData.borrowerRole = borrowerRole;
      updatedData.isFixed = false;
      updatedData.expectedReturnDate = expectedReturnDate;
    }

    const res = StorageService.updateLoan(loanId, updatedData);
    if (res) {
      this.closeModal('modalEditLoan');
      this.refreshAll();
      this.showToast('Dados do empréstimo atualizados com sucesso!', 'success');
    } else {
      this.showToast('Erro ao atualizar o empréstimo.', 'error');
    }
  },

  // Modal Devolução de Equipamento
  openReturnModal(loanId) {
    const loan = StorageService.getLoanById(loanId) || StorageService.getActiveLoanForEquipment(loanId);
    if (!loan) return;

    document.getElementById('returnLoanId').value = loan.id;
    document.getElementById('returnBorrowerDisplay').textContent = loan.borrowerName;
    document.getElementById('returnLoanDateDisplay').textContent = loan.loanDate;

    let itemsStr = '';
    if (loan.equipmentDetails) {
      itemsStr = loan.equipmentDetails.map(e => `• ${e.patrimony} - ${e.model} (Série: ${e.serialNumber || '-'})`).join('<br>');
    }
    document.getElementById('returnItemsDisplay').innerHTML = itemsStr;

    const today = new Date();
    const dStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    document.getElementById('returnDateInput').value = dStr;
    document.getElementById('returnNotesInput').value = 'Equipamento conferido e devolvido ao estoque em boas condições.';

    this.syncDatePickerFromText('returnDateInput', 'picker-returnDateInput');
    this.openModal('modalReturnConfirm');
  },

  submitReturnConfirm(e) {
    e.preventDefault();
    const loanId = document.getElementById('returnLoanId').value;
    const returnDate = document.getElementById('returnDateInput').value;
    const returnNotes = document.getElementById('returnNotesInput').value;

    StorageService.returnLoan(loanId, returnDate, returnNotes);
    this.closeModal('modalReturnConfirm');
    this.refreshAll();
    this.showToast('Devolução confirmada com sucesso! Equipamento(s) liberado(s) para o estoque.', 'success');
  },

  // Modal Cadastro e Edição de Equipamento
  getTodayFormattedDate() {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  },

  getTodayFormattedDateTime() {
    const today = new Date();
    const d = this.getTodayFormattedDate();
    return `${d} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  },

  handleEquipStatusChange() {
    const status = document.getElementById('equipStatusSelect')?.value;
    const loanSec = document.getElementById('newEquipLoanSection');
    if (!loanSec) return;

    if (status === 'emprestado') {
      loanSec.style.display = 'block';
      this.handleEquipBrandChange();
      // Se for edicao de equipamento que nao estava emprestado antes, zera os campos para um novo emprestimo limpo
      const id = document.getElementById('equipEditId')?.value;
      if (id) {
        const existing = StorageService.getEquipmentById(id);
        if (!existing || existing.status !== 'emprestado') {
          this.resetNewEquipLoanForm();
        }
      }
    } else {
      loanSec.style.display = 'none';
    }
  },

  resetNewEquipLoanForm() {
    const ids = [
      'newEquipLenovoBorrowerName',
      'newEquipLenovoBorrowerDoc',
      'newEquipLenovoBorrowerEmail',
      'newEquipLenovoBorrowerRole',
      'newEquipLenovoExpectedDate',
      'newEquipMultiBorrowerName',
      'newEquipMultiBorrowerRole',
      'newEquipMultiNotes'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const dBR = this.getTodayFormattedDate();
    const dtBR = this.getTodayFormattedDateTime();
    const lDate = document.getElementById('newEquipLenovoLoanDate');
    if (lDate) lDate.value = dBR;
    const mDate = document.getElementById('newEquipMultiLoanDate');
    if (mDate) mDate.value = dtBR;
    const mExp = document.getElementById('newEquipMultiExpectedDate');
    if (mExp) mExp.value = `${dBR} 18:00`;

    const fixRadio = document.getElementById('newEquipLenovoReturnFixed');
    if (fixRadio) fixRadio.checked = true;
    const customRadio = document.getElementById('newEquipLenovoReturnCustom');
    if (customRadio) customRadio.checked = false;
    const expGroup = document.getElementById('newEquipLenovoExpectedGroup');
    if (expGroup) expGroup.style.display = 'none';

    const chkL = document.getElementById('newEquipLenovoHasCharger');
    if (chkL) chkL.checked = true;
    const chkM = document.getElementById('newEquipMultiHasCharger');
    if (chkM) chkM.checked = true;
    const termL = document.getElementById('newEquipLenovoGenerateTerm');
    if (termL) termL.checked = false;
    const termM = document.getElementById('newEquipMultiGenerateTerm');
    if (termM) termM.checked = false;
  },

  handleEquipBrandChange() {
    const brand = document.getElementById('equipBrandSelect')?.value || 'Lenovo';
    const isLenovo = brand.toLowerCase().includes('lenovo');
    const badge = document.getElementById('newEquipLoanBrandBadge');
    const lenovoFields = document.getElementById('newEquipLenovoFields');
    const multiFields = document.getElementById('newEquipMultiFields');

    if (badge) {
      badge.className = isLenovo ? 'badge-brand lenovo' : 'badge-brand multi';
      badge.textContent = isLenovo ? 'Lenovo' : 'Multilaser Ultra';
    }

    if (lenovoFields) lenovoFields.style.display = isLenovo ? 'grid' : 'none';
    if (multiFields) multiFields.style.display = isLenovo ? 'none' : 'grid';

    // Sincroniza datas padrão
    const dBR = this.getTodayFormattedDate();
    const dtBR = this.getTodayFormattedDateTime();

    if (isLenovo) {
      const lDate = document.getElementById('newEquipLenovoLoanDate');
      if (lDate && !lDate.value) lDate.value = dBR;
      this.syncDatePickerFromText('newEquipLenovoLoanDate', 'picker-newEquipLenovoLoanDate');
    } else {
      const mDate = document.getElementById('newEquipMultiLoanDate');
      if (mDate && !mDate.value) mDate.value = dtBR;
      const mExp = document.getElementById('newEquipMultiExpectedDate');
      if (mExp && !mExp.value) mExp.value = `${dBR} 18:00`;
      this.syncDatePickerFromText('newEquipMultiLoanDate', 'picker-newEquipMultiLoanDate');
      this.syncDatePickerFromText('newEquipMultiExpectedDate', 'picker-newEquipMultiExpectedDate');
    }
  },

  openNewEquipModal(defaultBrand = 'Lenovo') {
    if (!this.currentUserCan('canManageEquipments')) {
      this.showToast('Ação bloqueada: seu perfil não tem permissão para cadastrar equipamentos.', 'error');
      return;
    }
    document.getElementById('formEquip').reset();
    this.resetNewEquipLoanForm();
    const serialInputNew = document.getElementById('equipSerialInput');
    const feedbackElNew = document.getElementById('equipSerialFeedback');
    if (serialInputNew) { serialInputNew.style.borderColor = ''; serialInputNew.style.boxShadow = ''; }
    if (feedbackElNew) { feedbackElNew.style.display = 'none'; feedbackElNew.textContent = ''; }
    document.getElementById('equipEditId').value = '';
    document.getElementById('modalEquipTitle').textContent = 'Cadastrar Novo Equipamento';
    const statusLabel = document.getElementById('modalEquipStatusLabel');
    if (statusLabel) statusLabel.textContent = 'Status Inicial';
    document.getElementById('equipBrandSelect').value = defaultBrand;
    document.getElementById('equipStatusSelect').value = 'disponivel';

    const banner = document.getElementById('equipEditLoanBanner');
    if (banner) banner.style.display = 'none';

    const loanSec = document.getElementById('newEquipLoanSection');
    if (loanSec) loanSec.style.display = 'none';

    this.openModal('modalEquip');
  },

  openEditEquipModal(equipId) {
    if (!this.currentUserCan('canManageEquipments')) {
      this.showToast('Ação bloqueada: seu perfil não tem permissão para editar equipamentos.', 'error');
      return;
    }
    const eq = StorageService.getEquipmentById(equipId);
    if (!eq) return;

    // Reseta totalmente o formulario e campos dinamicos para nao carregar dados residuais de outro emprestimo
    document.getElementById('formEquip').reset();
    this.resetNewEquipLoanForm();
    const serialInputEdit = document.getElementById('equipSerialInput');
    const feedbackElEdit = document.getElementById('equipSerialFeedback');
    if (serialInputEdit) { serialInputEdit.style.borderColor = ''; serialInputEdit.style.boxShadow = ''; }
    if (feedbackElEdit) { feedbackElEdit.style.display = 'none'; feedbackElEdit.textContent = ''; }

    document.getElementById('equipEditId').value = eq.id;
    document.getElementById('modalEquipTitle').textContent = 'Editar Equipamento';
    const statusLabel = document.getElementById('modalEquipStatusLabel');
    if (statusLabel) statusLabel.textContent = 'Status do Equipamento';
    document.getElementById('equipBrandSelect').value = eq.brand;
    document.getElementById('equipModelInput').value = eq.model;
    document.getElementById('equipPatrimonyInput').value = eq.patrimony;
    document.getElementById('equipSerialInput').value = eq.serialNumber || '';
    document.getElementById('equipStatusSelect').value = eq.status || 'disponivel';
    document.getElementById('equipNotesInput').value = eq.notes || '';

    const banner = document.getElementById('equipEditLoanBanner');
    const borrowerSpan = document.getElementById('equipEditLoanBorrower');
    const loanSec = document.getElementById('newEquipLoanSection');

    // Se este equipamento estiver emprestado, carrega os dados reais DESTE equipamento
    if (eq.status === 'emprestado') {
      let loan = StorageService.getActiveLoanForEquipment(eq) || StorageService.ensureActiveLoanForEquipment(eq);
      let bName = (loan && loan.borrowerName) ? loan.borrowerName : (eq.currentBorrower || '');
      if (loan) {
        bName = loan.borrowerName;
        const isLenovo = (eq.brand && eq.brand.toLowerCase().includes('lenovo')) || loan.type === 'lenovo';
        if (isLenovo) {
          const n = document.getElementById('newEquipLenovoBorrowerName');
          if (n) n.value = loan.borrowerName || '';
          const d = document.getElementById('newEquipLenovoBorrowerDoc');
          if (d) d.value = loan.borrowerDoc || '';
          const em = document.getElementById('newEquipLenovoBorrowerEmail');
          if (em) em.value = loan.borrowerEmail || '';
          const r = document.getElementById('newEquipLenovoBorrowerRole');
          if (r) r.value = loan.borrowerRole || '';
          const ld = document.getElementById('newEquipLenovoLoanDate');
          if (ld) ld.value = loan.loanDate || '';
          const chk = document.getElementById('newEquipLenovoHasCharger');
          if (chk) chk.checked = loan.hasCharger !== false;
          const isFixed = loan.isFixed !== false;
          const fixR = document.getElementById('newEquipLenovoReturnFixed');
          if (fixR) fixR.checked = isFixed;
          const custR = document.getElementById('newEquipLenovoReturnCustom');
          if (custR) custR.checked = !isFixed;
          const expG = document.getElementById('newEquipLenovoExpectedGroup');
          if (expG) expG.style.display = isFixed ? 'none' : 'block';
          const expD = document.getElementById('newEquipLenovoExpectedDate');
          if (expD) expD.value = loan.expectedReturnDate || '';
        } else {
          const n = document.getElementById('newEquipMultiBorrowerName');
          if (n) n.value = loan.borrowerName || '';
          const r = document.getElementById('newEquipMultiBorrowerRole');
          if (r) r.value = loan.borrowerRole || '';
          const ld = document.getElementById('newEquipMultiLoanDate');
          if (ld) ld.value = loan.loanDate || '';
          const expD = document.getElementById('newEquipMultiExpectedDate');
          if (expD) expD.value = loan.expectedReturnDate || '';
          const chk = document.getElementById('newEquipMultiHasCharger');
          if (chk) chk.checked = loan.hasCharger !== false;
          const nt = document.getElementById('newEquipMultiNotes');
          if (nt) nt.value = loan.notes || '';
        }
      }

      if (banner && borrowerSpan) {
        borrowerSpan.textContent = bName || 'Responsavel';
        banner.style.display = 'flex';
      }
      if (loanSec) loanSec.style.display = 'block';
      this.handleEquipBrandChange();
    } else {
      // Se nao estiver emprestado, mantem os campos limpos e a secao oculta
      if (banner) banner.style.display = 'none';
      if (loanSec) loanSec.style.display = 'none';
    }

    this.openModal('modalEquip');
  },

  submitEquipForm(e) {
    e.preventDefault();
    const id = document.getElementById('equipEditId').value;
    const brand = document.getElementById('equipBrandSelect').value;
    const model = document.getElementById('equipModelInput').value.trim();
    const patrimony = document.getElementById('equipPatrimonyInput').value.trim();
    const serialNumber = document.getElementById('equipSerialInput').value.trim();
    const status = document.getElementById('equipStatusSelect').value;
    const notes = document.getElementById('equipNotesInput').value.trim();

    if (!model || !patrimony) {
      this.showToast('Modelo e ID/Patrimônio são obrigatórios.', 'error');
      return;
    }

    // Validação de duplicidade de Número de Série
    if (serialNumber) {
      const duplicateSerial = StorageService.getEquipmentBySerial(serialNumber, id);
      if (duplicateSerial) {
        this.showToast(
          `Não é possível cadastrar: O número de série "${serialNumber}" já pertence a outro equipamento cadastrado (Patrimônio: ${duplicateSerial.patrimony || '-'}, Modelo: ${duplicateSerial.model || '-'}).`,
          'error'
        );
        const serialInput = document.getElementById('equipSerialInput');
        const feedbackEl = document.getElementById('equipSerialFeedback');
        if (serialInput) {
          serialInput.focus();
          serialInput.style.borderColor = '#ef4444';
          serialInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
        }
        if (feedbackEl) {
          feedbackEl.textContent = `Atenção: Número de série já cadastrado no patrimônio ${duplicateSerial.patrimony || '-'}.`;
          feedbackEl.style.display = 'block';
        }
        return;
      }
    }

    // ==========================================
    // CASO 1: EDICAO DE EQUIPAMENTO EXISTENTE
    // ==========================================
    if (id) {
      const existing = StorageService.getEquipmentById(id);
      let currentBorrower = existing ? existing.currentBorrower : undefined;
      let currentLoanId = existing ? existing.currentLoanId : undefined;
      let newlyCreatedLoan = null;
      let generateTerm = false;

      if (status === 'emprestado') {
        const isLenovo = brand.toLowerCase().includes('lenovo');
        let bName = '';
        let bDoc = '';
        let bEmail = '';
        let bRole = '';
        let loanDate = '';
        let isFixed = true;
        let expectedReturnDate = null;
        let hasCharger = true;
        let loanNotes = '';

        if (isLenovo) {
          bName = document.getElementById('newEquipLenovoBorrowerName')?.value.trim() || '';
          bDoc = document.getElementById('newEquipLenovoBorrowerDoc')?.value.trim() || '';
          bEmail = document.getElementById('newEquipLenovoBorrowerEmail')?.value.trim() || '';
          bRole = document.getElementById('newEquipLenovoBorrowerRole')?.value.trim() || '';
          loanDate = document.getElementById('newEquipLenovoLoanDate')?.value.trim() || this.getTodayFormattedDate();
          isFixed = document.getElementById('newEquipLenovoReturnFixed')?.checked !== false;
          expectedReturnDate = isFixed ? null : (document.getElementById('newEquipLenovoExpectedDate')?.value || null);
          hasCharger = document.getElementById('newEquipLenovoHasCharger')?.checked !== false;
          generateTerm = !!document.getElementById('newEquipLenovoGenerateTerm')?.checked;
        } else {
          bName = document.getElementById('newEquipMultiBorrowerName')?.value.trim() || '';
          bRole = document.getElementById('newEquipMultiBorrowerRole')?.value.trim() || '';
          loanDate = document.getElementById('newEquipMultiLoanDate')?.value.trim() || this.getTodayFormattedDateTime();
          expectedReturnDate = document.getElementById('newEquipMultiExpectedDate')?.value.trim() || `${this.getTodayFormattedDate()} 18:00`;
          hasCharger = document.getElementById('newEquipMultiHasCharger')?.checked !== false;
          loanNotes = document.getElementById('newEquipMultiNotes')?.value.trim() || '';
          generateTerm = !!document.getElementById('newEquipMultiGenerateTerm')?.checked;
        }

        let activeLoan = existing ? StorageService.getActiveLoanForEquipment(existing) : null;

        if (activeLoan) {
          // Atualiza os dados do emprestimo existente caso preenchidos
          const updatedLoanData = {};
          if (bName) updatedLoanData.borrowerName = bName;
          if (bDoc !== undefined) updatedLoanData.borrowerDoc = bDoc;
          if (bEmail !== undefined) updatedLoanData.borrowerEmail = bEmail;
          if (bRole !== undefined) updatedLoanData.borrowerRole = bRole;
          if (loanDate) updatedLoanData.loanDate = loanDate;
          if (expectedReturnDate !== undefined) updatedLoanData.expectedReturnDate = expectedReturnDate;
          updatedLoanData.isFixed = isFixed;
          updatedLoanData.hasCharger = hasCharger;
          if (loanNotes) updatedLoanData.notes = loanNotes;
          StorageService.updateLoan(activeLoan.id, updatedLoanData);
          currentBorrower = bName || activeLoan.borrowerName;
          currentLoanId = activeLoan.id;
        } else {
          // Nao existia emprestimo ativo registrado, cria um novo
          const borrowerFinalName = bName || (existing ? existing.currentBorrower : '') || 'Servidor Responsavel';
          const newLoanPayload = {
            type: isLenovo ? 'lenovo' : 'multilaser',
            borrowerName: borrowerFinalName,
            borrowerDoc: bDoc,
            borrowerEmail: bEmail,
            borrowerRole: bRole,
            loanDate,
            isFixed,
            expectedReturnDate,
            hasCharger,
            notes: loanNotes,
            equipmentIds: [id],
            equipmentDetails: [{
              id,
              brand,
              model,
              patrimony,
              serialNumber
            }]
          };
          newlyCreatedLoan = StorageService.createLoan(newLoanPayload);
          currentBorrower = borrowerFinalName;
          currentLoanId = newlyCreatedLoan.id;
        }
      } else if (status === 'disponivel' && existing && existing.status === 'emprestado') {
        const activeLoan = StorageService.getActiveLoanForEquipment(existing);
        if (activeLoan) {
          StorageService.returnLoan(activeLoan.id, this.getTodayFormattedDate(), 'Devolvido ao alterar status na edicao');
        }
        currentBorrower = undefined;
        currentLoanId = undefined;
      }

      const equipPayload = {
        id,
        brand,
        model,
        patrimony,
        serialNumber,
        status,
        notes
      };

      if (currentBorrower !== undefined) {
        equipPayload.currentBorrower = currentBorrower;
      }
      if (currentLoanId !== undefined) {
        equipPayload.currentLoanId = currentLoanId;
      }

      StorageService.saveEquipment(equipPayload);
      this.closeModal('modalEquip');
      this.refreshAll();

      if (newlyCreatedLoan) {
        this.showToast('Equipamento atualizado e novo emprestimo registrado com sucesso!', 'success');
        if (generateTerm) {
          this.openTermModal(newlyCreatedLoan.id);
        }
      } else {
        this.showToast('Equipamento atualizado com sucesso!', 'success');
      }
      return;
    }

    // ==========================================
    // CASO 2: NOVO CADASTRO DE EQUIPAMENTO
    // ==========================================
    const isLenovo = brand.toLowerCase().includes('lenovo');
    let borrowerName = '';
    let newLoanData = null;
    let generateTerm = false;

    if (status === 'emprestado') {
      if (isLenovo) {
        borrowerName = document.getElementById('newEquipLenovoBorrowerName')?.value.trim() || '';
        const borrowerDoc = document.getElementById('newEquipLenovoBorrowerDoc')?.value.trim() || '';
        const borrowerEmail = document.getElementById('newEquipLenovoBorrowerEmail')?.value.trim() || '';
        const borrowerRole = document.getElementById('newEquipLenovoBorrowerRole')?.value.trim() || '';
        const loanDate = document.getElementById('newEquipLenovoLoanDate')?.value.trim() || this.getTodayFormattedDate();
        const isFixed = document.getElementById('newEquipLenovoReturnFixed')?.checked !== false;
        const expectedReturnDate = isFixed ? null : (document.getElementById('newEquipLenovoExpectedDate')?.value || null);
        const hasCharger = document.getElementById('newEquipLenovoHasCharger')?.checked !== false;
        generateTerm = !!document.getElementById('newEquipLenovoGenerateTerm')?.checked;

        if (!borrowerName) {
          this.showToast('Informe o Nome do Responsavel pelo emprestimo Lenovo.', 'error');
          document.getElementById('newEquipLenovoBorrowerName')?.focus();
          return;
        }

        newLoanData = {
          type: 'lenovo',
          borrowerName,
          borrowerDoc,
          borrowerEmail,
          borrowerRole,
          loanDate,
          isFixed,
          expectedReturnDate,
          hasCharger,
          notes: ''
        };
      } else {
        borrowerName = document.getElementById('newEquipMultiBorrowerName')?.value.trim() || '';
        const borrowerRole = document.getElementById('newEquipMultiBorrowerRole')?.value.trim() || '';
        const loanDate = document.getElementById('newEquipMultiLoanDate')?.value.trim() || this.getTodayFormattedDateTime();
        const expectedReturnDate = document.getElementById('newEquipMultiExpectedDate')?.value.trim() || `${this.getTodayFormattedDate()} 18:00`;
        const hasCharger = document.getElementById('newEquipMultiHasCharger')?.checked !== false;
        const multiNotes = document.getElementById('newEquipMultiNotes')?.value.trim() || '';
        generateTerm = !!document.getElementById('newEquipMultiGenerateTerm')?.checked;

        if (!borrowerName) {
          this.showToast('Informe o Nome do Responsavel pelo emprestimo Multilaser.', 'error');
          document.getElementById('newEquipMultiBorrowerName')?.focus();
          return;
        }

        newLoanData = {
          type: 'multilaser',
          borrowerName,
          borrowerDoc: '',
          borrowerEmail: '',
          borrowerRole,
          loanDate,
          isFixed: false,
          expectedReturnDate,
          hasCharger,
          notes: multiNotes
        };
      }
    }

    const savedEq = StorageService.saveEquipment({
      brand,
      model,
      patrimony,
      serialNumber,
      status,
      currentBorrower: borrowerName || undefined,
      notes
    });

    let createdLoan = null;
    if (newLoanData && savedEq) {
      newLoanData.equipmentIds = [savedEq.id];
      newLoanData.equipmentDetails = [savedEq];
      createdLoan = StorageService.createLoan(newLoanData);
      savedEq.currentLoanId = createdLoan.id;
      savedEq.currentBorrower = createdLoan.borrowerName;
      StorageService.saveEquipment(savedEq);
    }

    this.closeModal('modalEquip');
    this.refreshAll();

    if (createdLoan) {
      this.showToast('Equipamento cadastrado e emprestimo registrado com sucesso!', 'success');
      if (generateTerm) {
        this.openTermModal(createdLoan.id);
      }
    } else {
      this.showToast('Equipamento cadastrado com sucesso!', 'success');
    }
  },

  confirmDeleteEquip(equipId) {
    if (!this.currentUserCan('canManageEquipments')) {
      this.showToast('Ação bloqueada: seu perfil não tem permissão para excluir equipamentos.', 'error');
      return;
    }
    const eq = StorageService.getEquipmentById(equipId);
    if (!eq) return;

    if (eq.status === 'emprestado') {
      this.showToast('Não é possível excluir um equipamento que está emprestado no momento.', 'error');
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o equipamento ${eq.patrimony} (${eq.model})?`)) {
      StorageService.deleteEquipment(equipId);
      this.refreshAll();
      this.showToast('Equipamento excluído com sucesso.', 'info');
    }
  },

  confirmDeleteLoan(loanId) {
    if (!this.currentUserCan('canDeleteHistory')) {
      this.showToast('Ação bloqueada: seu perfil não tem permissão para excluir histórico de empréstimos.', 'error');
      return;
    }
    const loan = StorageService.getLoanById(loanId);
    if (!loan) return;

    const borrower = loan.borrowerName || 'este empréstimo';
    if (confirm(`Tem certeza que deseja excluir o registro de empréstimo de "${borrower}"?`)) {
      StorageService.deleteLoan(loanId);
      this.refreshAll();
      this.showToast('Registro de empréstimo excluído com sucesso.', 'info');
    }
  },

  // Modal Termo Oficial & Comprovante
  openTermModal(loanId) {
    const loan = StorageService.getLoanById(loanId) || StorageService.getActiveLoanForEquipment(loanId);
    if (!loan) return;

    const container = document.getElementById('termModalDocument');
    if (!container) return;

    // Dados do servidor / responsável
    const borrowerName = loan.borrowerName ? this.escapeHtml(loan.borrowerName) : '________________________________________________________';
    
    const docDisplay = (loan.borrowerDoc && loan.borrowerDoc.trim()) 
      ? `<u>&nbsp;${this.escapeHtml(loan.borrowerDoc.trim())}&nbsp;</u>`
      : '______________________';

    const email = loan.borrowerEmail ? this.escapeHtml(loan.borrowerEmail) : '_______________________________________';
    const phone = loan.borrowerPhone ? this.escapeHtml(loan.borrowerPhone) : '________________';
    const role = loan.borrowerRole ? this.escapeHtml(loan.borrowerRole) : '_________________________';
    const school = (loan.borrowerSchool && loan.borrowerSchool.trim()) ? `<u>&nbsp;${this.escapeHtml(loan.borrowerSchool.trim())}&nbsp;</u>` : '________________________________________';

    // Datação
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let day = '', monthName = '', year = '';

    if (loan.loanDate) {
      const mBR = String(loan.loanDate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mBR) {
        day = mBR[1].padStart(2, '0');
        const mIdx = parseInt(mBR[2], 10) - 1;
        monthName = months[mIdx] || 'Janeiro';
        year = mBR[3];
      } else {
        const mISO = String(loan.loanDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (mISO) {
          year = mISO[1];
          const mIdx = parseInt(mISO[2], 10) - 1;
          monthName = months[mIdx] || 'Janeiro';
          day = mISO[3].padStart(2, '0');
        }
      }
    }

    if (!day || !monthName || !year) {
      const now = new Date();
      day = String(now.getDate()).padStart(2, '0');
      monthName = months[now.getMonth()];
      year = String(now.getFullYear());
    }

    // Itens da tabela
    const items = loan.equipmentDetails || [];
    let itemsHtml = '';
    if (items.length > 0) {
      itemsHtml = items.map(e => `
        <tr>
          <td><strong>${this.escapeHtml(e.patrimony || '-')}</strong></td>
          <td>${this.escapeHtml((e.brand ? e.brand + ' - ' : '') + (e.model || ''))}${loan.hasCharger ? ' (com carregador/fonte)' : ''}</td>
          <td><code>${this.escapeHtml(e.serialNumber || '-')}</code></td>
          <td style="text-align: center;">Bom (B)</td>
        </tr>
      `).join('');
    } else {
      itemsHtml = `
        <tr>
          <td><strong>-</strong></td>
          <td>${this.escapeHtml(loan.notes || 'Equipamento de TI')}${loan.hasCharger ? ' (com carregador/fonte)' : ''}</td>
          <td>-</td>
          <td style="text-align: center;">Bom (B)</td>
        </tr>
      `;
    }

    // Status da devolução
    const isReturned = loan.status === 'devolvido';
    const checkPerfeito = isReturned ? '(&nbsp;<strong>X</strong>&nbsp;)' : '(&nbsp;&nbsp;&nbsp;)';
    const checkDefeito = '(&nbsp;&nbsp;&nbsp;)';
    const checkFalta = '(&nbsp;&nbsp;&nbsp;)';

    container.innerHTML = `
      <div class="termo-document">
        
        <div class="termo-header">
          <img src="img/logo_ure.png" alt="Logo URE Sorocaba" class="termo-logo">
          <div class="termo-header-org">GOVERNO DO ESTADO DE SÃO PAULO</div>
          <div class="termo-header-sub">SECRETARIA DA EDUCAÇÃO</div>
          <div class="termo-header-sub">DIRETORIA DE ENSINO – REGIÃO SOROCABA</div>
          <div class="termo-header-nucleo">Centro de Administração, Finanças e Infraestrutura &bull; Núcleo de Administração</div>
          
          <div class="termo-title-box">
            <h1 class="termo-main-title">TERMO DE RESPONSABILIDADE</h1>
            <h2 class="termo-sub-title">GUARDA E USO DE EQUIPAMENTO</h2>
          </div>
        </div>

        <div class="termo-body">
          <p class="termo-p">
            Eu, <u>&nbsp;${borrowerName}&nbsp;</u>, RG / CPF Nº: ${docDisplay}, telefone/celular para contato <u>&nbsp;${phone}&nbsp;</u>, e-mail: <u>&nbsp;${email}&nbsp;</u> recebi do Núcleo de Administração, do Centro de Administração, Finanças e Infraestrutura, da Diretoria de Ensino – Região Sorocaba, os materiais/equipamentos listados abaixo, para uso exclusivo, conforme determinado em lei, comprometendo-me a mantê-los em perfeito estado de conservação, ficando ciente que:
          </p>

          <p class="termo-p">
            Se o equipamento for danificado, extraviado ou desaparecido por negligência, a Diretoria de Ensino – Região Sorocaba, por ordem do Dirigente Regional de Ensino, poderá instaurar processo de ressarcimento do valor do bem ou de reposição de equipamento com as mesmas especificações ou superior, ou Procedimento Averiguatório, de natureza simplesmente investigativa, nos casos de furto conforme artigo 264 da Lei Ordinária do Estado de São Paulo nº. 10.261, de 28 de outubro de 1968, com alterações dadas pela Lei Complementar do Estado de São Paulo nº. 942, de 06 de junho de 2003 para fins de apurar quais as circunstâncias;
          </p>

          <p class="termo-p">
            Em caso de dano, inutilização ou extravio do equipamento, deverei comunicar imediatamente o Diretor I do Núcleo de Administração, do Centro de Administração, Finanças e Infraestrutura, da Diretoria de Ensino – Região Sorocaba, ou o Diretor Técnico II do Centro de Administração, Finanças e Infraestrutura, da Diretoria de Ensino – Região Sorocaba, para as providências que o caso requer;
          </p>

          <p class="termo-p">
            Finalizando o uso/serviços, devolverei o equipamento completo e em perfeito estado de conservação, considerando-se o Tempo do uso do mesmo, ao Núcleo de Administração, do Centro de Administração, Finanças e Infraestrutura, da Diretoria de Ensino – Região Sorocaba;
          </p>

          <p class="termo-p">
            Estando os equipamentos em minha posse, estarei sujeito a inspeções sem prévio aviso.
          </p>

          <!-- TABELA DE MATERIAIS / EQUIPAMENTOS -->
          <table class="termo-tabela-itens">
            <thead>
              <tr>
                <th style="width: 25%;">Nº PATRIMÔNIO</th>
                <th style="width: 45%;">DESCRIÇÃO (marca/modelo)</th>
                <th style="width: 20%;">IMEI / SN</th>
                <th style="width: 10%; text-align: center;">E/C¹</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="termo-legenda-ec">
            ¹(E/C)= Estado do bem &nbsp;&nbsp;&nbsp;&nbsp; Novo (N) &nbsp;&nbsp;&nbsp;&nbsp; Bom (B) &nbsp;&nbsp;&nbsp;&nbsp; Regular (R) &nbsp;&nbsp;&nbsp;&nbsp; Outros(O) - especificar
          </div>

          <!-- DATAÇÃO -->
          <div class="termo-data-local">
            Sorocaba, ${day} de ${monthName} de ${year}.
          </div>

          <!-- ASSINATURA E DADOS DO SERVIDOR -->
          <div class="termo-identificacao-responsavel">
            <div class="termo-linha-dupla">
              <div style="flex: 1.2;">
                <strong>Assinatura:</strong> __________________________________________________
              </div>
              <div style="flex: 1;">
                <strong>Escola:</strong> ${school}
              </div>
            </div>
            <div class="termo-linha-dupla" style="margin-top: 8px;">
              <div style="flex: 1.2;">
                <strong>Cargo/ Função:</strong> <u>&nbsp;${role}&nbsp;</u>
              </div>
              <div style="flex: 1;">
                <strong>RG / CPF Nº:</strong> ${docDisplay}
              </div>
            </div>
          </div>

          <!-- QUADRO DE DEVOLUÇÃO -->
          <table class="termo-tabela-devolucao">
            <thead>
              <tr>
                <th colspan="2">DEVOLUÇÃO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="devolucao-col-check">
                  Atestamos que o(s) bem(ns) devolvidos estão:<br><br>
                  ${checkPerfeito} Em perfeito estado<br>
                  ${checkDefeito} Apresentando defeito &nbsp;&nbsp; Qual(is)? ______________________________________<br>
                  ${checkFalta} Faltando peças/ acessórios &nbsp;&nbsp; Qual(is)? ______________________________________
                  ${isReturned && loan.returnNotes ? `<div style="margin-top: 4px; font-weight: bold; color: #166534;">Obs devolução: ${this.escapeHtml(loan.returnNotes)}</div>` : ''}
                </td>
                <td class="devolucao-col-assinatura">
                  <div class="carimbo-space"></div>
                  <div class="linha-carimbo">
                    Assinatura / Carimbo / SIAPE do Responsável pelo Recebimento
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    `;

    this.openModal('modalTermView');
    document.body.classList.remove('printing-report');
    document.body.classList.add('printing-modal');
  },

  printCurrentDocument() {
    document.body.classList.remove('printing-report');
    document.body.classList.add('printing-modal');
    setTimeout(() => {
      window.print();
    }, 50);
  },

  // Backup & Restaurar
  openBackupModal() {
    this.openModal('modalBackup');
  },

  exportBackupFile() {
    const dataStr = StorageService.exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_ure_emprestimos_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('Backup exportado com sucesso!', 'success');
  },

  importBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const res = StorageService.importData(e.target.result);
      if (res.success) {
        this.closeModal('modalBackup');
        this.refreshAll();
        this.showToast(`Dados restaurados! ${res.countEquip} equipamentos e ${res.countLoans} empréstimos carregados.`, 'success');
      } else {
        this.showToast(`Erro ao importar: ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
  },

  resetDefaultSeed() {
    if (confirm('Deseja restaurar o banco de dados de demonstracao? Todas as alteracoes atuais serao redefinidas.')) {
      localStorage.clear();
      StorageService.seedDefaultData();
      this.closeModal('modalBackup');
      this.refreshAll();
      this.showToast('Banco de dados restaurado com dados de exemplo!', 'success');
    }
  },

  clearAllDatabase() {
    if (confirm('Atencao: Deseja realmente ZERAR todos os equipamentos e emprestimos cadastrados? Esta acao deixara o sistema completamente vazio para novos cadastros reais.')) {
      StorageService.clearAllData();
      this.closeModal('modalBackup');
      this.refreshAll();
      this.showToast('Sistema zerado com sucesso! Todos os equipamentos foram removidos.', 'info');
    }
  },

  // Utilitários de Modal
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
    if (modalId === 'modalTermView') {
      document.body.classList.remove('printing-modal');
    }
  },

  setupEventListeners() {
    // Validação em tempo real de número de série duplicado
    const equipSerialEl = document.getElementById('equipSerialInput');
    if (equipSerialEl) {
      equipSerialEl.addEventListener('input', () => {
        const id = document.getElementById('equipEditId')?.value;
        const val = equipSerialEl.value.trim();
        const feedbackEl = document.getElementById('equipSerialFeedback');
        if (val) {
          const dup = StorageService.getEquipmentBySerial(val, id);
          if (dup) {
            equipSerialEl.style.borderColor = '#ef4444';
            equipSerialEl.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
            if (feedbackEl) {
              feedbackEl.textContent = `Atenção: Número de série já cadastrado no patrimônio ${dup.patrimony || '-'}.`;
              feedbackEl.style.display = 'block';
            }
            return;
          }
        }
        equipSerialEl.style.borderColor = '';
        equipSerialEl.style.boxShadow = '';
        if (feedbackEl) {
          feedbackEl.style.display = 'none';
        }
      });
    }

    // Fechar modais ao clicar no X ou fora
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      const closeModalOverlay = () => {
        overlay.classList.remove('active');
        if (overlay.id === 'modalTermView') {
          document.body.classList.remove('printing-modal');
        }
      };
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModalOverlay();
        }
      });
      const closeBtn = overlay.querySelector('.modal-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          closeModalOverlay();
        });
      }
    });

    // Relatórios: atualizar dados ao alterar filtros e suporte a Ctrl+P
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    const reportBrandSelect = document.getElementById('reportBrandSelect');
    if (reportTypeSelect) {
      reportTypeSelect.addEventListener('change', () => {
        this.generateReportContent();
      });
    }
    if (reportBrandSelect) {
      reportBrandSelect.addEventListener('change', () => {
        this.generateReportContent();
      });
    }

    window.addEventListener('beforeprint', () => {
      const termModal = document.getElementById('modalTermView');
      if (termModal && termModal.classList.contains('active')) {
        document.body.classList.add('printing-modal');
        document.body.classList.remove('printing-report');
      } else {
        document.body.classList.remove('printing-modal');
        document.body.classList.add('printing-report');
        this.generateReportContent();
      }
    });

    window.addEventListener('afterprint', () => {
      document.body.classList.remove('printing-report');
    });

    // Toggle de prazo fixo ou data prevista em Lenovo
    const fixedRadio = document.getElementById('lenovoReturnFixed');
    const customRadio = document.getElementById('lenovoReturnCustom');
    const expectedGroup = document.getElementById('lenovoExpectedDateGroup');
    if (fixedRadio && customRadio && expectedGroup) {
      fixedRadio.addEventListener('change', () => {
        expectedGroup.style.display = 'none';
      });
      customRadio.addEventListener('change', () => {
        expectedGroup.style.display = 'block';
      });
    }

    // Auto-complete Lenovo por ID / Série
    const equipSelect = document.getElementById('lenovoEquipSelect');
    if (equipSelect) {
      equipSelect.addEventListener('change', (e) => {
        this.handleLenovoEquipSelect(e.target.value);
      });
    }

    const equipInputSearch = document.getElementById('lenovoEquipSearch');
    if (equipInputSearch) {
      equipInputSearch.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length >= 2) {
          const eq = StorageService.getEquipmentById(val);
          if (eq) {
            this.handleLenovoEquipSelect(eq.id);
            if (equipSelect) equipSelect.value = eq.id;
          }
        }
      });
    }

    // Pesquisa de Multilaser
    const multiSearch = document.getElementById('multiEquipSearch');
    if (multiSearch) {
      multiSearch.addEventListener('input', (e) => {
        this.renderMultiEquipSelectorList(e.target.value);
      });
    }

    // Toggle de retorno fixo no modal de edição
    const editFixedRadio = document.getElementById('editLoanReturnFixed');
    const editCustomRadio = document.getElementById('editLoanReturnCustom');
    const editExpGroup = document.getElementById('editLoanExpectedDateGroup');
    if (editFixedRadio && editCustomRadio && editExpGroup) {
      editFixedRadio.addEventListener('change', () => {
        editExpGroup.style.display = 'none';
      });
      editCustomRadio.addEventListener('change', () => {
        editExpGroup.style.display = 'block';
      });
    }

    document.getElementById('formEditLoan')?.addEventListener('submit', (e) => this.submitEditLoan(e));

    // Formulários
    document.getElementById('formLoanLenovo')?.addEventListener('submit', (e) => this.submitLoanLenovo(e));
    document.getElementById('formLoanMulti')?.addEventListener('submit', (e) => this.submitLoanMultilaser(e));
    document.getElementById('formReturnConfirm')?.addEventListener('submit', (e) => this.submitReturnConfirm(e));
    document.getElementById('formEquip')?.addEventListener('submit', (e) => this.submitEquipForm(e));

    // Filtros de Equipamentos
    document.getElementById('equipSearchInput')?.addEventListener('input', () => this.renderEquipmentsTable());
    document.getElementById('equipBrandFilter')?.addEventListener('change', () => this.renderEquipmentsTable());
    document.getElementById('equipStatusFilter')?.addEventListener('change', () => this.renderEquipmentsTable());

    // Filtros de Histórico
    document.getElementById('historySearchInput')?.addEventListener('input', () => this.renderHistoryTab());
    document.getElementById('historyTypeFilter')?.addEventListener('change', () => this.renderHistoryTab());
    document.getElementById('historyStatusFilter')?.addEventListener('change', () => this.renderHistoryTab());


  },

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-triangle-exclamation' : 'fa-info-circle');
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  formatDateBR(dateStr) {
    if (!dateStr) return '';
    let str = String(dateStr).trim();
    if (!str) return '';

    // Corrige formato invertido caso tenha sido salvo "DD HH:MM/MM/YYYY"
    const corruptMatch = str.match(/^(\d{1,2})\s+(\d{1,2}:\d{2})\/(\d{1,2})\/(\d{4})$/);
    if (corruptMatch) {
      const day = corruptMatch[1].padStart(2, '0');
      const time = corruptMatch[2];
      const month = corruptMatch[3].padStart(2, '0');
      const year = corruptMatch[4];
      return `${day}/${month}/${year} ${time}`;
    }

    // Se já for DD/MM/AAAA ou DD/MM/AAAA HH:MM
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
      return str;
    }

    // Se for formato ISO: AAAA-MM-DD ou AAAA-MM-DD HH:MM ou AAAA-MM-DDTHH:MM
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      const hour = isoMatch[4];
      const minute = isoMatch[5];

      if (hour !== undefined && minute !== undefined) {
        return `${day}/${month}/${year} ${hour.padStart(2, '0')}:${minute}`;
      }
      return `${day}/${month}/${year}`;
    }

    return str;
  }
};
