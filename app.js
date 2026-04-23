import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  query, where, deleteDoc, doc
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

/* ========= UTIL ========= */
function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}
function closeModal() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
}

/* ========= PROYECTOS ========= */
btnAddProject.onclick = () => openModal("modalProject");

saveProject.onclick = async () => {
  if (!projectName.value) return;
  await addDoc(collection(db, "projects"), { name: projectName.value });
  projectName.value = "";
  closeModal();
  loadProjects();
};

async function loadProjects() {
  const list = document.getElementById("projectList");
  list.innerHTML = "";

  const snap = await getDocs(collection(db, "projects"));
  snap.forEach(d => {
    const div = document.createElement("div");
    div.className = "project-card";
    div.dataset.id = d.id;

    div.innerHTML = `
    <div class="project-title">${d.data().name}</div>
    <div class="project-meta">Proyecto</div>
    `;

    div.onclick = () => {
      document.querySelectorAll(".project-card").forEach(p => p.classList.remove("active"));
      div.classList.add("active");
      currentProject = d.id;
      loadComments();
      loadTasks();
    };
    list.appendChild(div);
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
  loadProjects();
  document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");
  commentList.innerHTML = "";
};

/* ========= COMENTARIOS ========= */
btnAddComment.onclick = () => openModal("modalComment");

saveComment.onclick = async () => {
  await addDoc(collection(db, "comments"), {
    projectId: currentProject,
    text: commentText.value
  });
  commentText.value = "";
  closeModal();
  loadComments();
};

async function loadComments() {
  commentList.innerHTML = "";
  const snap = await getDocs(query(collection(db, "comments"), where("projectId", "==", currentProject)));
  snap.forEach(d => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `
      ${d.data().text}
      <span class="delete-btn">🗑</span>`;
    div.querySelector(".delete-btn").onclick = async () => {
      await deleteDoc(doc(db, "comments", d.id));
      loadComments();
    };
    commentList.appendChild(div);
  });
}

/* ========= TAREAS ========= */
document.querySelector(".addTask").onclick = () => openModal("taskModal");

saveTask.onclick = async () => {
  await addDoc(collection(db, "tasks"), {
    projectId: currentProject,
    title: taskTitle.value,
    priority: taskPriority.value,
    dueDate: taskDue.value,
    status: "todo"
  });
  closeModal();
  loadTasks();
};

async function loadTasks() {
  document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");
  const snap = await getDocs(query(collection(db, "tasks"), where("projectId", "==", currentProject)));

  snap.forEach(d => {
    const t = d.data();
    const div = document.createElement("div");
    div.className = `task-card ${t.priority}`;
    div.draggable = true;
    div.dataset.id = d.id;

    div.innerHTML = `
    <div class="task-header">
        <span class="task-title">${t.title}</span>
        <div class="task-actions">
        <span class="delete-btn" title="Eliminar">🗑</span>
        </div>
    </div>

    <div class="task-footer">
        <span class="priority-badge ${t.priority}">
        ${t.priority.toUpperCase()}
        </span>
    </div>
    `;


    div.querySelector(".delete-btn").onclick = async () => {
      await deleteDoc(doc(db, "tasks", d.id));
      loadTasks();
    };

    div.ondragstart = () => dragged = div;
    document.querySelector(`.column[data-status="${t.status}"] .tasks`).appendChild(div);
  });
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
window.closeModal = closeModal;
loadProjects();
