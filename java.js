
    // ========== STOCKAGE ==========
    let clients = [];
    let rdvs = [];

    function loadData() {
        clients = JSON.parse(localStorage.getItem("arnauld_clients") || "[]");
        rdvs = JSON.parse(localStorage.getItem("arnauld_rdvs") || "[]");
    }
    function saveClients() { localStorage.setItem("arnauld_clients", JSON.stringify(clients)); }
    function saveRdvs() { localStorage.setItem("arnauld_rdvs", JSON.stringify(rdvs)); }
    function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 6); }

    function notify(msg, isError = false) {
        const div = document.createElement('div');
        div.className = 'notification';
        div.innerText = msg;
        div.style.background = isError ? '#DC241F' : '#009543';
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }

    // ========== GESTION ADMIN ==========
    let currentFilter = "";

    function refreshAdminTables() {
        // Stats
        document.getElementById('statClients').innerText = clients.length;
        document.getElementById('statRdvs').innerText = rdvs.length;
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('statToday').innerText = rdvs.filter(r => r.date === today).length;

        // Liste clients
        const clientsTbody = document.getElementById('clientsList');
        if(clients.length === 0) {
            clientsTbody.innerHTML = '<tr><td colspan="5">Aucun client enregistré</td></tr>';
        } else {
            clientsTbody.innerHTML = clients.map(c => {
                const nbRdvs = rdvs.filter(r => r.clientId === c.id).length;
                return `<tr>
                    <td><strong>${escapeHtml(c.nom)}</strong></td>
                    <td>${escapeHtml(c.tel)}</td>
                    <td>${c.email ? escapeHtml(c.email) : '—'}</td>
                    <td><a class="whatsapp-btn" href="https://wa.me/${cleanTel(c.tel)}" target="_blank">💬 WhatsApp</a></td>
                    <td>${nbRdvs}</td>
                </tr>`;
            }).join('');
        }

        // Filtrer RDV
        let filteredRdvs = [...rdvs];
        if(currentFilter) filteredRdvs = rdvs.filter(r => r.date === currentFilter);
        
        const rdvsTbody = document.getElementById('rdvsList');
        if(filteredRdvs.length === 0) {
            rdvsTbody.innerHTML = '<tr><td colspan="6">Aucun rendez-vous</td></tr>';
        } else {
            rdvsTbody.innerHTML = filteredRdvs.map(rdv => {
                const client = clients.find(c => c.id === rdv.clientId) || { nom: rdv.clientNomFallback, tel: rdv.tel };
                return `<tr>
                    <td>${escapeHtml(client.nom || rdv.clientNomFallback)}</td>
                    <td>${escapeHtml(rdv.tel)}</td>
                    <td>${escapeHtml(rdv.date)}</td>
                    <td>${escapeHtml(rdv.heure)}</td>
                    <td>${escapeHtml(rdv.motif || '—')}</td>
                    <td>
                        <button class="btn-secondary btn-sm edit-rdv" data-id="${rdv.id}">✏️</button>
                        <button class="btn-danger btn-sm delete-rdv" data-id="${rdv.id}">🗑️</button>
                    </td>
                </tr>`;
            }).join('');
        }
        // Attacher événements
        document.querySelectorAll('.edit-rdv').forEach(btn => btn.onclick = () => openRdvModal(btn.dataset.id));
        document.querySelectorAll('.delete-rdv').forEach(btn => btn.onclick = () => deleteRdv(btn.dataset.id));
    }

    function deleteRdv(id) {
        if(confirm("Supprimer ce rendez-vous ?")) {
            rdvs = rdvs.filter(r => r.id !== id);
            saveRdvs();
            refreshAdminTables();
            notify("Rendez-vous supprimé");
        }
    }

    function openRdvModal(id = null) {
        const modal = document.getElementById('rdvModal');
        document.getElementById('rdvModalTitle').innerText = id ? "Modifier le rendez-vous" : "Ajouter un rendez-vous";
        document.getElementById('editRdvId').value = id || "";
        if(id) {
            const rdv = rdvs.find(r => r.id === id);
            if(rdv) {
                document.getElementById('modalNom').value = rdv.clientNomFallback || "";
                document.getElementById('modalTel').value = rdv.tel || "";
                document.getElementById('modalDate').value = rdv.date;
                document.getElementById('modalHeure').value = rdv.heure;
                document.getElementById('modalMotif').value = rdv.motif || "";
            }
        } else {
            document.getElementById('rdvModalForm').reset();
        }
        modal.classList.remove('hidden');
    }

    function closeRdvModal() {
        document.getElementById('rdvModal').classList.add('hidden');
    }

    function saveRdvFromModal() {
        const id = document.getElementById('editRdvId').value;
        const nom = document.getElementById('modalNom').value.trim();
        const tel = document.getElementById('modalTel').value.trim();
        const date = document.getElementById('modalDate').value;
        const heure = document.getElementById('modalHeure').value;
        const motif = document.getElementById('modalMotif').value;
        
        if(!nom || !tel || !date || !heure) {
            alert("Veuillez remplir tous les champs obligatoires");
            return false;
        }
        
        let client = clients.find(c => c.tel === tel);
        if(!client) {
            client = { id: generateId(), nom: nom, tel: tel, email: "" };
            clients.push(client);
            saveClients();
        } else if(client.nom !== nom) {
            client.nom = nom;
            saveClients();
        }
        
        if(id) {
            const index = rdvs.findIndex(r => r.id === id);
            if(index !== -1) {
                rdvs[index] = { ...rdvs[index], clientId: client.id, clientNomFallback: nom, tel: tel, date: date, heure: heure, motif: motif };
                saveRdvs();
                notify("Rendez-vous modifié");
            }
        } else {
            const newRdv = { id: generateId(), clientId: client.id, clientNomFallback: nom, tel: tel, date: date, heure: heure, motif: motif };
            rdvs.push(newRdv);
            saveRdvs();
            notify("Rendez-vous ajouté");
        }
        closeRdvModal();
        refreshAdminTables();
        return true;
    }

    // ========== CLIENT : PRISE DE RDV ==========
    document.getElementById('rdvForm').onsubmit = (e) => {
        e.preventDefault();
        const nom = document.getElementById('nom').value.trim();
        const tel = document.getElementById('tel').value.trim();
        const email = document.getElementById('email').value.trim();
        const date = document.getElementById('dateRdv').value;
        const heure = document.getElementById('heureRdv').value;
        const motif = document.getElementById('motif').value;
        
        if(!nom || !tel || !date || !heure) {
            showMsg("Veuillez remplir tous les champs obligatoires (*)", true);
            return;
        }
        
        if(rdvs.some(r => r.date === date && r.heure === heure)) {
            showMsg("Cet horaire est déjà réservé. Choisissez un autre créneau.", true);
            return;
        }
        
        let client = clients.find(c => c.tel === tel);
        if(client) {
            client.nom = nom;
            if(email) client.email = email;
            saveClients();
        } else {
            client = { id: generateId(), nom: nom, tel: tel, email: email || "" };
            clients.push(client);
            saveClients();
        }
        
        const newRdv = {
            id: generateId(),
            clientId: client.id,
            clientNomFallback: nom,
            tel: tel,
            date: date,
            heure: heure,
            motif: motif || ""
        };
        rdvs.push(newRdv);
        saveRdvs();
        
        showMsg("✅ Rendez-vous confirmé ! Nous vous contacterons sous 24h. Livraison gratuite dès 3 pièces.", false);
        document.getElementById('rdvForm').reset();
        notify(`Nouveau RDV: ${nom} le ${date} à ${heure}`);
    };
    
    function showMsg(msg, isError) {
        const div = document.getElementById('clientMsg');
        div.innerText = msg;
        div.className = isError ? "message error" : "message";
        setTimeout(() => div.innerText = "", 5000);
    }
    
    // ========== ADMIN AUTH (identifiants cachés) ==========
    function showAdminModal() {
        document.getElementById('adminModal').classList.remove('hidden');
        document.getElementById('adminLoginZone').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
    }
    
    document.getElementById('adminBtn').onclick = showAdminModal;
    document.getElementById('closeAdminModal').onclick = () => {
        document.getElementById('adminModal').classList.add('hidden');
        if(window.adminLogged) window.adminLogged = false;
    };
    
    document.getElementById('loginForm').onsubmit = (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value;
        const pwd = document.getElementById('loginPass').value;
        // Identifiants: ArnauldMAKITA / 2001 (cachés pour l'utilisateur)
        if(user === "ArnauldMAKITA" && pwd === "2001") {
            window.adminLogged = true;
            document.getElementById('adminLoginZone').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            refreshAdminTables();
            notify("Connexion réussie !");
            // Effacer les champs pour plus de sécurité
            document.getElementById('loginUser').value = '';
            document.getElementById('loginPass').value = '';
        } else {
            const errDiv = document.getElementById('loginError');
            errDiv.innerText = "Identifiant ou mot de passe incorrect";
            errDiv.classList.remove('hidden');
            setTimeout(() => errDiv.classList.add('hidden'), 3000);
        }
    };
    
    document.getElementById('logoutAdmin').onclick = () => {
        window.adminLogged = false;
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('adminLoginZone').classList.remove('hidden');
        document.getElementById('loginForm').reset();
        notify("Déconnexion effectuée");
    };
    
    // Filtre
    document.getElementById('filterDate').onchange = (e) => {
        currentFilter = e.target.value;
        refreshAdminTables();
    };
    document.getElementById('clearFilter').onclick = () => {
        document.getElementById('filterDate').value = "";
        currentFilter = "";
        refreshAdminTables();
    };
    document.getElementById('addRdvBtn').onclick = () => openRdvModal();
    document.getElementById('closeRdvModal').onclick = closeRdvModal;
    document.getElementById('rdvModalForm').onsubmit = (e) => {
        e.preventDefault();
        saveRdvFromModal();
    };
    
    // Helpers
    function escapeHtml(str) {
        if(!str) return '';
        return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m]);
    }
    function cleanTel(tel) {
        return tel.replace(/\s+/g, '').replace(/^\+/, '');
    }
    
    // Initialisation
    loadData();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateRdv').min = today;
    if(document.getElementById('modalDate')) document.getElementById('modalDate').min = today;

    if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log("Service Worker enregistré"));
}
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function installApp() {
  deferredPrompt.prompt();
}