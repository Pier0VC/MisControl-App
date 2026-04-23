import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  query, where, deleteDoc, doc,
  serverTimestamp, onSnapshot, updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIrxc5PEbEvdmURAz81A_kdy84wm5_SXA",
  authDomain: "speeches-app.firebaseapp.com",
  projectId: "speeches-app",
  storageBucket: "speeches-app.firebasestorage.app",
  messagingSenderId: "351553442090",
  appId: "1:351553442090:web:c53b263236ec52de10ce53"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ========= ESTADO ========= */
let currentProject = null;
let dragged = null;
let unsubscribeProjects = null;
let unsubscribeComments = null;
let unsubscribeTasks = null;
let isSaving = false;

let currentUser = null;
let currentView = "all";
let usersMap = new Map();

/* ========= UTIL ========= */
function openModal(id) {
  const modal = document.getElementById(id);
  if (id === "taskModal") populateAssignees();
  modal.classList.remove("hidden");
}
function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
}
function formatDate(ts) {
  if (!ts) return "";
  return ts.toDate().toLocaleDateString();
}
function getRemainingTime(dueDate) {
  if (!dueDate) return "";
  const diff = new Date(dueDate) - new Date();
  if (diff <= 0) return "Vencida";
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}
function escapeHtml(str) {
  return str ? str.replace(/[&<>]/g, m => (
    m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;"
  )) : "";
}

/* ========= USUARIOS ========= */
async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  const select = document.getElementById("userSelect");
  select.innerHTML = "";
  usersMap.clear();

  snap.forEach(doc => {
    const d = doc.data();
    if (d.active !== false) {
      usersMap.set(doc.id, d.fullName);
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = d.fullName;
      select.appendChild(opt);
    }
  });

  const saved = localStorage.getItem("currentUserId");
  if (saved && usersMap.has(saved)) {
    currentUser = { id: saved, name: usersMap.get(saved) };
    select.value = saved;
  } else if (select.options.length > 0) {
    currentUser = {
      id: select.options[0].value,
      name: select.options[0].text
    };
  }
  if (currentUser) localStorage.setItem("currentUserId", currentUser.id);
}

function setupUserListener() {
  document.getElementById("userSelect").onchange = e => {
    const id = e.target.value;
    currentUser = { id, name: usersMap.get(id) };
    localStorage.setItem("currentUserId", id);
    if (currentView === "my" && currentProject) loadTasks();
  };
}

function setupViewButtons() {
  const all = document.getElementById("viewAllBtn");
  const my = document.getElementById("viewMyBtn");

  all.onclick = () => {
    currentView = "all";
    all.classList.add("active");
    my.classList.remove("active");
    if (currentProject) loadTasks();
  };

  my.onclick = () => {
    if (!currentUser) return alert("Selecciona usuario");
    currentView = "my";
    my.classList.add("active");
    all.classList.remove("active");
    if (currentProject) loadTasks();
  };
}

function populateAssignees() {
  const select = document.getElementById("taskAssignedTo");
  select.innerHTML = '<option value="">-- Responsable --</option>';
  usersMap.forEach((name, id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

/* ========= PROYECTOS ========= */
document.getElementById("btnAddProject").onclick = () => openModal("modalProject");

document.getElementById("saveProject").onclick = async (e) => {
  e.preventDefault();
  if (isSaving) return;
  const name = document.getElementById("projectName").value.trim();
  if (!name) return;

  isSaving = true;
  e.target.disabled = true;

  await addDoc(collection(db, "projects"), {
    name,
    createdAt: serverTimestamp(),
    tasksCount: 0
  });

  document.getElementById("projectName").value = "";
  closeModal();

  isSaving = false;
  e.target.disabled = false;
};

function loadProjects() {
  if (unsubscribeProjects) unsubscribeProjects();

  unsubscribeProjects = onSnapshot(collection(db, "projects"), (snap) => {
    const list = document.getElementById("projectList");
    list.innerHTML = "";

    snap.forEach(docItem => {
      const data = docItem.data();

      const div = document.createElement("div");
      div.className = "project-card";
      div.dataset.id = docItem.id;

      div.innerHTML = `
        <div class="card-date">${formatDate(data.createdAt)}</div>
        <div class="project-title">${escapeHtml(data.name)}</div>
        <div class="project-meta">Tareas: ${data.tasksCount || 0}</div>
      `;

      div.onclick = () => {
        document.querySelectorAll(".project-card").forEach(p => p.classList.remove("active"));
        div.classList.add("active");
        currentProject = docItem.id;
        loadComments();
        loadTasks();
      };

      if (currentProject === docItem.id) {
        div.classList.add("active");
      }

      list.appendChild(div);
    });
  });
}

document.getElementById("btnDeleteProject").onclick = async () => {
  if (!currentProject) return;
  if (prompt('Escribe "admin"') !== "admin") return;

  await deleteDoc(doc(db, "projects", currentProject));

  const t = await getDocs(query(collection(db, "tasks"), where("projectId", "==", currentProject)));
  t.forEach(d => deleteDoc(doc(db, "tasks", d.id)));

  const c = await getDocs(query(collection(db, "comments"), where("projectId", "==", currentProject)));
  c.forEach(d => deleteDoc(doc(db, "comments", d.id)));
};

/* ========= COMENTARIOS ========= */
document.getElementById("btnAddComment").onclick = () => openModal("modalComment");

document.getElementById("saveComment").onclick = async () => {
  if (!currentProject) return alert("Selecciona proyecto");

  await addDoc(collection(db, "comments"), {
    projectId: currentProject,
    text: document.getElementById("commentText").value,
    createdAt: serverTimestamp()
  });

  document.getElementById("commentText").value = "";
  closeModal();
};

function loadComments() {
  if (!currentProject) return;
  if (unsubscribeComments) unsubscribeComments();

  unsubscribeComments = onSnapshot(
    query(collection(db, "comments"), where("projectId", "==", currentProject)),
    snap => {
      const list = document.getElementById("commentList");
      list.innerHTML = "";

      snap.forEach(d => {
        const div = document.createElement("div");
        div.className = "comment";
        div.innerHTML = `
          <div class="comment-header">
            <span class="card-date">${formatDate(d.data().createdAt)}</span>
            <span class="delete-btn">🗑</span>
          </div>

          <div class="comment-text">
            ${escapeHtml(d.data().text)}
          </div>
        `;
        div.querySelector(".delete-btn").onclick = () =>
          deleteDoc(doc(db, "comments", d.id));
        list.appendChild(div);
      });
    }
  );
}

/* ========= TAREAS ========= */
document.querySelector(".addTask").onclick = () => openModal("taskModal");

document.getElementById("saveTask").onclick = async () => {
  const title = document.getElementById("taskTitle").value;
  const assignedTo = document.getElementById("taskAssignedTo").value;

  if (!title || !assignedTo) {
    alert("Faltan datos");
    return;
  }

  try {
    await addDoc(collection(db, "tasks"), {
      projectId: currentProject,
      title,
      description: document.getElementById("taskDescription").value,
      priority: document.getElementById("taskPriority").value,
      dueDate: document.getElementById("taskDue").value,
      assignedTo,
      status: "todo",
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "projects", currentProject), {
      tasksCount: increment(1)
    });

    // limpiar inputs
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDescription").value = "";
    document.getElementById("taskPriority").value = "medium";
    document.getElementById("taskDue").value = "";
    document.getElementById("taskAssignedTo").value = "";

    closeModal(); // 🔥 ahora sí seguro

  } catch (error) {
    console.error("Error guardando tarea:", error);
    alert("Error al guardar");
  }
};

function loadTasks() {
  if (!currentProject) return;
  if (unsubscribeTasks) unsubscribeTasks();

  let q = query(collection(db, "tasks"), where("projectId", "==", currentProject));
  if (currentView === "my" && currentUser) {
    q = query(
      collection(db, "tasks"),
      where("projectId", "==", currentProject),
      where("assignedTo", "==", currentUser.id)
    );
  }

  unsubscribeTasks = onSnapshot(q, snap => {
    document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");

    snap.forEach(docTask => {
      const t = docTask.data();

      const div = document.createElement("div");
      div.className = `task-card ${t.priority}`;
      div.draggable = true;
      div.dataset.id = docTask.id;

      div.innerHTML = `
        <div class="card-date">${formatDate(t.createdAt)}</div>
        <div class="task-deadline">${getRemainingTime(t.dueDate)}</div>

        <div class="task-header">
          <span class="task-title">${escapeHtml(t.title)}</span>
          <div class="task-actions">
            <span class="delete-btn">🗑</span>
          </div>
        </div>

        <div class="task-desc">${escapeHtml(t.description || "")}</div>

        <div class="task-footer">
          <span class="priority-badge ${t.priority}">
            ${t.priority?.toUpperCase()}
          </span>
          <span class="assignee-badge">
            👤 ${escapeHtml(usersMap.get(t.assignedTo) || "Sin asignar")}
          </span>
        </div>
      `;

      div.querySelector(".delete-btn").onclick = async () => {
        await deleteDoc(doc(db, "tasks", docTask.id));

        // 🔥 decrementar contador
        await updateDoc(doc(db, "projects", t.projectId), {
          tasksCount: increment(-1)
        });
      };

      div.ondragstart = () => dragged = div;

      document.querySelector(`.column[data-status="${t.status}"] .tasks`)
        ?.appendChild(div);
    });
  });
}

/* ========= DRAG ========= */
document.querySelectorAll(".column").forEach(col => {
  col.ondragover = e => e.preventDefault();
  col.ondrop = async () => {
    if (!dragged) return;
    await updateDoc(doc(db, "tasks", dragged.dataset.id), {
      status: col.dataset.status
    });
    dragged = null;
  };
});

/* ========= INIT ========= */
(async function () {
  await loadUsers();
  setupUserListener();
  setupViewButtons();
  loadProjects();
})();



window.closeModal = closeModal;
