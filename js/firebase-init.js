// ==========================================================================
// FIREBASE CONFIG & INTEGRATION (Auth + Cloud Firestore)
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCm7dWAj3dszhT5X3mM6HxroOur54cw4X8",
  authDomain: "gestao-de-agendamentos-3d19c.firebaseapp.com",
  projectId: "gestao-de-agendamentos-3d19c",
  storageBucket: "gestao-de-agendamentos-3d19c.firebasestorage.app",
  messagingSenderId: "332698863344",
  appId: "1:332698863344:web:53e6738d19aa110465e435"
};

// Inicialização do Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Mapeamento dos usuários conhecidos para perfis
const USER_ROLES = {
  "vinicius@agendamentos.com": { name: "Vinicius", role: "admin", label: "Administrador", isSuper: true },
  "ricardo@agendamentos.com": { name: "Ricardo", role: "analista", label: "Analista", isSuper: false },
  "tiago@agendamentos.com": { name: "Tiago", role: "analista", label: "Analista", isSuper: false },
  "angelo@agendamentos.com": { name: "Angelo", role: "analista", label: "Analista", isSuper: false }
};

const AuthService = {
  currentUser: null,
  userProfile: null,

  init(onAuthChange) {
    auth.onAuthStateChanged(user => {
      this.currentUser = user;
      if (user) {
        const emailLower = (user.email || "").toLowerCase();
        this.userProfile = USER_ROLES[emailLower] || {
          name: user.displayName || emailLower.split("@")[0],
          role: "analista",
          label: "Analista",
          isSuper: false
        };
        localStorage.setItem("app_current_user", JSON.stringify(this.userProfile));
      } else {
        this.userProfile = null;
        localStorage.removeItem("app_current_user");
      }
      if (onAuthChange) onAuthChange(this.userProfile);
    });
  },

  async login(loginInput, password) {
    let email = loginInput.trim().toLowerCase();
    if (!email.includes("@")) {
      email = email + "@agendamentos.com";
    }
    return await auth.signInWithEmailAndPassword(email, password);
  },

  async logout() {
    await auth.signOut();
  },

  isAdmin() {
    return this.userProfile && this.userProfile.role === "admin";
  }
};

// Gerenciador de sincronização em tempo real do Firestore
const FirestoreSync = {
  unsubscribers: [],
  isSyncing: false,

  startSync(onDataUpdated) {
    this.stopSync();

    // 1. Escolas (com auto-seed das 80 escolas se Firestore estiver vazio)
    const unsubSchools = db.collection("escolas").onSnapshot(snapshot => {
      if (!snapshot.empty && snapshot.size >= 10) {
        const schools = [];
        snapshot.forEach(doc => schools.push(doc.data()));
        localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
        if (onDataUpdated) onDataUpdated("schools");
      } else {
        // Se Firestore estiver vazio ou com menos escolas, sincroniza as 80 escolas oficiais
        const initialSchools = typeof SEED_SCHOOLS !== 'undefined' ? SEED_SCHOOLS : [];
        if (initialSchools.length > 0) {
          localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(initialSchools));
          if (onDataUpdated) onDataUpdated("schools");
          // Subir para o Firestore em batches
          initialSchools.forEach(sc => {
            db.collection("escolas").doc(String(sc.cie)).set(sc, { merge: true }).catch(() => {});
          });
        }
      }
    }, err => console.warn("Erro ao sincronizar escolas:", err));
    this.unsubscribers.push(unsubSchools);

            // 2. Analistas (com auto-seeding historico se Firestore estiver vazio)
    const unsubAnalysts = db.collection("analistas").onSnapshot(snapshot => {
      if (!snapshot.empty) {
        const analysts = [];
        snapshot.forEach(doc => analysts.push(doc.data()));
        localStorage.setItem(STORAGE_KEYS.ANALYSTS, JSON.stringify(analysts));
        if (onDataUpdated) onDataUpdated("analysts");
      } else {
        const initialAnalysts = (typeof window !== 'undefined' && window.HISTORICAL_SEED_DATA && window.HISTORICAL_SEED_DATA.analysts) ? window.HISTORICAL_SEED_DATA.analysts : (typeof SEED_ANALYSTS !== 'undefined' ? SEED_ANALYSTS : []);
        if (initialAnalysts.length > 0) {
          localStorage.setItem(STORAGE_KEYS.ANALYSTS, JSON.stringify(initialAnalysts));
          if (onDataUpdated) onDataUpdated("analysts");
          initialAnalysts.forEach(a => {
            db.collection("analistas").doc(String(a.id)).set(a, { merge: true }).catch(() => {});
          });
        }
      }
    }, err => console.warn("Erro ao sincronizar analistas:", err));
    this.unsubscribers.push(unsubAnalysts);

    // 3. Agendamentos (com auto-seeding historico em batches se Firestore estiver vazio)
    const unsubSchedules = db.collection("agendamentos").onSnapshot(snapshot => {
      const schedules = [];
      if (!snapshot.empty) {
        snapshot.forEach(doc => schedules.push(doc.data()));
      }
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
      if (onDataUpdated) onDataUpdated("schedules");
    }, err => console.warn("Erro ao sincronizar agendamentos:", err));
    this.unsubscribers.push(unsubSchedules);

    // 4. Fila
    const unsubQueue = db.collection("fila").onSnapshot(snapshot => {
      const queue = [];
      snapshot.forEach(doc => queue.push(doc.data()));
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      if (onDataUpdated) onDataUpdated("queue");
    }, err => console.warn("Erro ao sincronizar fila:", err));
    this.unsubscribers.push(unsubQueue);
    // 4.1 Atendimentos URE (Interno)
    const unsubUre = db.collection("ure_atendimentos").onSnapshot(snapshot => {
      const ureList = [];
      snapshot.forEach(doc => ureList.push(doc.data()));
      localStorage.setItem(STORAGE_KEYS.URE_ATTENDANCES, JSON.stringify(ureList));
      if (onDataUpdated) onDataUpdated("ure");
    }, err => console.warn("Erro ao sincronizar URE:", err));
    this.unsubscribers.push(unsubUre);

    // 4.2 Ausências dos Analistas (Day Off, Atestado, Ausente)
    const unsubAbsences = db.collection("ausencias_analistas").onSnapshot(snapshot => {
      const absencesList = [];
      snapshot.forEach(doc => absencesList.push(doc.data()));
      localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(absencesList));
      if (onDataUpdated) onDataUpdated("absences");
    }, err => console.warn("Erro ao sincronizar ausências:", err));
    this.unsubscribers.push(unsubAbsences);

    // 5. Configurações gerais (WhatsApp template, etc.)
    const unsubConfig = db.collection("config").doc("geral").onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.whatsappTemplate) {
          localStorage.setItem(STORAGE_KEYS.WHATSAPP_TEMPLATE, data.whatsappTemplate);
          if (onDataUpdated) onDataUpdated("config");
        }
      }
    }, err => console.warn("Erro ao sincronizar configs:", err));
    this.unsubscribers.push(unsubConfig);
  },

  stopSync() {
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === "function") unsub();
    });
    this.unsubscribers = [];
  },

  // Operações de Escrita Direta no Firestore (com fallback local transparente)
  async saveSchool(school) {
    try {
      await db.collection("escolas").doc(String(school.cie)).set(school);
    } catch (e) {
      console.warn("Falha ao salvar escola no Firestore:", e);
    }
  },

  async deleteSchool(cie) {
    try {
      await db.collection("escolas").doc(String(cie)).delete();
    } catch (e) {
      console.warn("Falha ao excluir escola no Firestore:", e);
    }
  },

  async saveAnalyst(analyst) {
    try {
      await db.collection("analistas").doc(String(analyst.id)).set(analyst);
    } catch (e) {
      console.warn("Falha ao salvar analista no Firestore:", e);
    }
  },

  async deleteAnalyst(id) {
    try {
      await db.collection("analistas").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir analista no Firestore:", e);
    }
  },

  async saveSchedule(sched) {
    try {
      await db.collection("agendamentos").doc(String(sched.id)).set(sched);
    } catch (e) {
      console.warn("Falha ao salvar agendamento no Firestore:", e);
    }
  },

  async deleteSchedule(id) {
    try {
      await db.collection("agendamentos").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir agendamento no Firestore:", e);
    }
  },

  async saveQueueItem(item) {
    try {
      await db.collection("fila").doc(String(item.id)).set(item);
    } catch (e) {
      console.warn("Falha ao salvar item da fila no Firestore:", e);
    }
  },

  async deleteQueueItem(id) {
    try {
      await db.collection("fila").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir item da fila no Firestore:", e);
    }
  },

  async saveAbsence(absence) {
    try {
      await db.collection("ausencias_analistas").doc(String(absence.id)).set(absence);
    } catch (e) {
      console.warn("Falha ao salvar ausência no Firestore:", e);
    }
  },

  async deleteAbsence(id) {
    try {
      await db.collection("ausencias_analistas").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir ausência no Firestore:", e);
    }
  },

  async saveUreAttendance(attendance) {
    try {
      await db.collection("ure_atendimentos").doc(String(attendance.id)).set(attendance);
    } catch (e) {
      console.warn("Falha ao salvar atendimento URE no Firestore:", e);
    }
  },

  async deleteUreAttendance(id) {
    try {
      await db.collection("ure_atendimentos").doc(String(id)).delete();
    } catch (e) {
      console.warn("Falha ao excluir atendimento URE no Firestore:", e);
    }
  },

    async saveWhatsappTemplate(template) {
    try {
      await db.collection("config").doc("geral").set({ whatsappTemplate: template }, { merge: true });
    } catch (e) {
      console.warn("Falha ao salvar config no Firestore:", e);
    }
  },  async clearAllSchedules() {
    try {
      const snap = await db.collection("agendamentos").get();
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = db.batch();
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      return true;
    } catch (e) {
      console.warn("Falha ao zerar agendamentos no Firestore:", e);
      throw e;
    }
  },



  async wipeAll() {
    try {
      const collections = ["escolas", "analistas", "agendamentos", "fila"];
      for (const col of collections) {
        const snap = await db.collection(col).get();
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const chunk = docs.slice(i, i + 400);
          const batch = db.batch();
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
    } catch (e) {
      console.warn("Falha ao zerar Firestore:", e);
    }
  }
};
