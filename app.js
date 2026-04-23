import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  query, where, updateDoc, doc, serverTimestamp
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

/* ========= PROYECTOS ========= */
async function loadProjects() {
  const list = document.getElementById("projectList");
  list.innerHTML = "";

  const snap = await getDocs(collection(db, "projects"));
  snap.forEach(d => {
    const div = document.createElement("div");
    div.className = "project";
    div.textContent = d.data().name;

    div.onclick = () => {
      document.querySelectorAll(".project").forEach(p => p.classList.remove("active"));
      div.classList.add("active");
      currentProject = d.id;
      loadComments();
      loadTasks();
    };
    list.appendChild(div);
  });
}

document.getElementById("btnAddProject").onclick = async () => {
  const name = window.prompt("Nombre del proyecto");
  if (!name) return;
  await addDoc(collection(db, "projects"), { name });
  loadProjects();
};

/* ========= HISTORIAL ========= */
async function loadComments() {
  const list = document.getElementById("commentList");
  list.innerHTML = "";

  const q = query(collection(db, "comments"), where("projectId", "==", currentProject));
  const snap = await getDocs(q);

  snap.forEach(d => {
    const div = document.createElement("div");
    div.className = "comment";
    div.textContent = d.data().text;
    list.appendChild(div);
  });
}

document.getElementById("btnAddComment").onclick = async () => {
  if (!currentProject) return alert("Selecciona un proyecto");
  const text = window.prompt("Comentario semanal");
  if (!text) return;

  await addDoc(collection(db, "comments"), {
    projectId: currentProject,
    text,
    createdAt: serverTimestamp()
  });

  loadComments();
};

/* ========= TAREAS ========= */
const modal = document.getElementById("taskModal");
document.querySelector(".addTask").onclick = () => modal.classList.remove("hidden");

document.getElementById("cancelTask").onclick = () => modal.classList.add("hidden");

document.getElementById("saveTask").onclick = async () => {
  const title = taskTitle.value;
  const priority = taskPriority.value;
  const due = taskDue.value;

  if (!title || !currentProject) return alert("Datos incompletos");

  await addDoc(collection(db, "tasks"), {
    projectId: currentProject,
    title,
    priority,
    dueDate: due,
    status: "todo"
  });

  modal.classList.add("hidden");
  taskTitle.value = "";
  taskDue.value = "";
  loadTasks();
};

async function loadTasks() {
  document.querySelectorAll(".tasks").forEach(t => t.innerHTML = "");

  const q = query(collection(db, "tasks"), where("projectId", "==", currentProject));
  const snap = await getDocs(q);

  snap.forEach(d => {
    const t = d.data();
    const div = document.createElement("div");
    div.className = "task";
    div.draggable = true;
    div.dataset.id = d.id;

    div.innerHTML = `
      <span class="due-dot"></span>
      <strong>${t.title}</strong>
      <div class="tags"><span class="tag ${t.priority}">${t.priority}</span></div>
    `;

    div.ondragstart = () => dragged = div;
    setDot(div.querySelector(".due-dot"), t.dueDate);

    document.querySelector(`.column[data-status="${t.status}"] .tasks`).appendChild(div);
  });
}

function setDot(dot, due) {
  const diff = new Date(due) - new Date();
  dot.style.background = diff < 0 ? "red" : diff < 86400000 ? "orange" : "gray";
}

/* ========= DRAG ========= */
document.querySelectorAll(".column").forEach(col => {
  col.ondragover = e => e.preventDefault();
  col.ondrop = async () => {
    await updateDoc(doc(db, "tasks", dragged.dataset.id), {
      status: col.dataset.status
    });
    loadTasks();
  };
});

loadProjects();
