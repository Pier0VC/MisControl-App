import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  query, where,orderBy, deleteDoc, doc,
  serverTimestamp, onSnapshot,
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

let currentProject = null;
let dragged = null;
let unsubscribeProjects = null;


/* ========= UTIL ========= */
function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}
function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate();
  return d.toLocaleDateString();
}


/* ========= PROYECTOS ========= */
btnAddProject.onclick = () => openModal("modalProject");

saveProject.onclick = async () => {
  if (!projectName.value) return;
  await addDoc(collection(db, "projects"), {
  name: projectName.value,
  createdAt: serverTimestamp()
  });
  projectName.value = "";
  closeModal();
};

function loadProjects() {
  const list = document.getElementById("projectList");

  // ✅ Evitar listeners duplicados
  if (unsubscribeProjects) return;

  unsubscribeProjects = onSnapshot(collection(db, "projects"), async snap => {
    list.innerHTML = "";

    for (const d of snap.docs) {
      const projectId = d.id;

      const tasksSnap = await getDocs(
        query(collection(db, "tasks"), where("projectId", "==", projectId))
      );

      const div = document.createElement("div");
      div.className = "project-card";
      div.dataset.id = projectId;

      div.innerHTML = `
        <div class="card-date">${formatDate(d.data().createdAt)}</div>
        <div class="project-title">${d.data().name}</div>
        <div class="project-meta">Tareas: ${tasksSnap.size}</div>
      `;

      div.onclick = () => {
        document.querySelectorAll(".project-card")
          .forEach(p => p.classList.remove("active"));

        div.classList.add("active");
        currentProject = projectId;
        loadComments();
        loadTasks();
      };

      list.appendChild(div);
    }
  });
}


btnDeleteProject.onclick = async () => {
  if (!currentProject) return;
  const key = prompt('Escribe "admin" para eliminar');
  if (key !== "admin") return alert("Cancelado");

  await deleteDoc(doc(db, "projects", currentProject));

  const t = await getDocs(query(collection(db, "tasks"), where("projectId", "==", currentProject)));
  t.forEach(d => deleteDoc(doc(db, "tasks", d.id)));

  const c = await getDocs(query(collection(db, "comments"), where("projectId", "==", currentProject)));
  c.forEach(d => deleteDoc(doc(db, "comments", d.id)));

  currentProject = null;
  document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");
  commentList.innerHTML = "";
};

/* ========= COMENTARIOS ========= */
btnAddComment.onclick = () => openModal("modalComment");

saveComment.onclick = async () => {
  await addDoc(collection(db, "comments"), {
    projectId: currentProject,
    text: commentText.value,
    createdAt: serverTimestamp()
  });
  commentText.value = "";
  closeModal();
  loadComments();
};

function loadComments() {
  if (!currentProject) return;

  onSnapshot(
    query(
      collection(db, "comments"),
      where("projectId", "==", currentProject),
      orderBy("createdAt", "desc") // ✅ ahora sí existe
    ),
    snap => {
      commentList.innerHTML = "";

      snap.forEach(d => {
        const div = document.createElement("div");
        div.className = "comment";

        div.innerHTML = `
          <div class="card-date">${formatDate(d.data().createdAt)}</div>
          <div class="comment-text">${d.data().text}</div>
          <span class="delete-btn">🗑</span>
        `;

        div.querySelector(".delete-btn").onclick = async () => {
          await deleteDoc(doc(db, "comments", d.id));
        };

        commentList.appendChild(div);
      });
    }
  );
}
``


/* ========= TAREAS ========= */
document.querySelector(".addTask").onclick = () => openModal("taskModal");

saveTask.onclick = async () => {
  await addDoc(collection(db, "tasks"), {
    projectId: currentProject,
    title: taskTitle.value,
    description: taskDescription.value,
    priority: taskPriority.value,
    dueDate: taskDue.value,
    status: "todo",
    createdAt: serverTimestamp()
  });
  closeModal();
  loadTasks();
};

function loadTasks() {
  if (!currentProject) return;

  document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");

  onSnapshot(
    query(collection(db, "tasks"), where("projectId", "==", currentProject)),
    snap => {
      document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");

      snap.forEach(d => {
        const t = d.data();
        const div = document.createElement("div");
        div.className = `task-card ${t.priority}`;
        div.draggable = true;
        div.dataset.id = d.id;

        div.innerHTML = `
          <div class="card-date">${formatDate(t.createdAt)}</div>
          <div class="task-deadline">${getRemainingTime(t.dueDate)}</div>

          <div class="task-header">
            <span class="task-title">${t.title}</span>
            <div class="task-actions">
              <span class="delete-btn">🗑</span>
            </div>
          </div>

          <div class="task-desc">${t.description || ""}</div>

          <div class="task-footer">
            <span class="priority-badge ${t.priority}">
              ${t.priority.toUpperCase()}
            </span>
          </div>
        `;

        div.querySelector(".delete-btn").onclick = async () => {
          await deleteDoc(doc(db, "tasks", d.id));
        };

        div.ondragstart = () => dragged = div;

        document
          .querySelector(`.column[data-status="${t.status}"] .tasks`)
          .appendChild(div);
      });
    }
  );
}

document.querySelectorAll(".column").forEach(col => {
  col.ondragover = e => e.preventDefault();

  col.ondrop = async () => {
    if (!dragged) return;

    const newStatus = col.dataset.status;

    await addDoc; // ← NO usamos addDoc para esto
    await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js")
      .then(({ updateDoc }) =>
        updateDoc(doc(db, "tasks", dragged.dataset.id), {
          status: newStatus
        })
      );

    dragged = null;
    loadTasks();
  };
});
``

function getRemainingTime(dueDate) {
  if (!dueDate) return "";

  const now = new Date();
  const due = new Date(dueDate);
  const diff = due - now;

  if (diff <= 0) return "Vencida";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

window.closeModal = closeModal;
loadProjects();
