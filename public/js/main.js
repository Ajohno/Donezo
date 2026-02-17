// Auth and tasks behavior for Donezo

async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        try {
            return await response.json();
        } catch (error) {
            const fallbackText = await response.text().catch(() => "");
            return { error: fallbackText || "Unexpected server response" };
        }
    }

    const text = await response.text();
    return { error: text || "Unexpected server response" };
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Fully Loaded - JavaScript Running");

    // Page flags let us adjust behavior for standalone login/register views
    const isLoginPage = document.body.classList.contains("login-page");
    const isRegisterPage = document.body.classList.contains("register-page");
    const currentPath = window.location.pathname;
    const protectedPaths = new Set([
        "/dashboard.html",
        "/calendar-page.html",
        "/profile-page.html",
        "/settings-page.html",
        "/feedback-page.html"
    ]);
    const isProtectedPage = protectedPaths.has(currentPath);
    const isHomePage = currentPath === "/" || currentPath === "/index.html";

    // Registration handler (used on register.html)
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const firstName = document.getElementById("registerFirstName")?.value.trim();
            const lastName = document.getElementById("registerLastName")?.value.trim();
            const email = document.getElementById("registerEmail")?.value.trim();
            const password = document.getElementById("registerPassword").value;
            const confirmPassword = document.getElementById("registerConfirm").value;

            if (!firstName || !lastName || !email) {
                
                alert("Please fill in first name, last name, and email.");
                return;
            }


            // Simple client-side guard to match the confirm password box
            if (password !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }

           

            try {
                const response = await fetch("/register", {
                    credentials: "include",
                    method: "POST",
                    headers: { "Content-Type": "application/json"},
                    body: JSON.stringify({ firstName, lastName, email, password })
                });

                const data = await parseApiResponse(response);

                // Check if registration went alright
                if (response.ok) {
                    alert("Registration successful! Please log in.");
                    Toast.show({ message: "Registration Sucessful", type: "success", duration: 2000 });
                    window.location.href = "/login.html";
                } else {
                    alert("Registration failed: " + (data.error || "Unknown error"));
                }
            } catch (error) {
                console.error("Registration request failed:", error);
                alert("Registration failed due to a network/server issue.");
            }
        });
    }

    // Login handler (used on login.html)
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
        
            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            const rememberMe = document.getElementById("rememberMe")?.checked || false;

            try {
                const response = await fetch("/login", {
                    credentials: "include",
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, rememberMe })
                });
            
                
                const data = await parseApiResponse(response);
            
                if (response.ok) {
                    // alert("Login successful!");
                    Toast.show({ message: "Login Sucessful", type: "success", duration: 2000 });
                    // Auth pages should move you to the dashboard once logged in
                    window.location.href = "/dashboard.html";
                    
                } else {
                    alert("Login failed: " + (data.error || "Unknown error"));
                    Toast.show({ message: "Login failed: " + (data.error || "Unknown error"), type: "error", duration: 4000 });
                }
            } catch (error) {
                console.error("Login request failed:", error);
                alert("Login failed due to a network/server issue.");
                Toast.show({ message: "Login failed due to a network/server issue.", type: "error", duration: 2000 });
            }
        });
    }

    // Function to log out a user (dashboard only)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (event) => {
            event.preventDefault();

            try {
                const response = await fetch("/logout", {
                    credentials: "include",
                    method: "POST"
                });

                if (response.ok) {
                    Toast.show({ message: "Logged out successfully", type: "success", duration: 2000 });
                    // Send the user back to login after logout
                    window.location.href = "/login.html";
                } else {
                    const data = await parseApiResponse(response);
                    alert("Logout failed: " + (data.error || "Unknown error"));
                }
            } catch (error) {
                console.error("Logout request failed:", error);
                alert("Logout failed due to a network/server issue.");
            }
        });
    }

    // Task Submission Form
    // const submitBtn = document.getElementById("submitBtn");
    // if (submitBtn) {
    //     submitBtn.onclick = submit;
    // }
    const taskForm = document.getElementById("taskForm");
    if (taskForm) {
        taskForm.addEventListener("submit", submit);
    }

    checkAuthStatus({ isLoginPage, isRegisterPage, isProtectedPage, isHomePage }); // Check authentication status on page load
});


async function updateNavTaskCounter() {
    const counters = document.querySelectorAll(".item-counter");
    if (!counters.length) return;

    try {
        const response = await fetch("/tasks", { credentials: "include" });
        if (!response.ok) return;

        const tasks = await response.json();
        const activeCount = Array.isArray(tasks)
            ? tasks.filter((task) => task.status === "active").length
            : 0;

        counters.forEach((el) => {
            el.textContent = String(activeCount);
        });
    } catch (error) {
        console.error("Error updating nav task counter:", error);
    }
}

// Function to check if a user is currently logged in
async function checkAuthStatus({ isLoginPage, isRegisterPage, isProtectedPage, isHomePage }) {
    const authSection = document.getElementById("auth-section");
    const mainSection = document.getElementById("main-section");
    const authStatus = document.getElementById("authStatus");
    const logoutBtn = document.getElementById("logoutBtn");

    let data = { loggedIn: false };

    try {
        const response = await fetch("/auth-status", {
            credentials: "include",
            cache: "no-store"
        });

        data = await parseApiResponse(response);
    } catch (error) {
        console.error("Auth status check failed:", error);
    }

    if (data.loggedIn) {
        if (isHomePage) {
            window.location.href = "/dashboard.html";
            return;
        }

        // Keep login/register pages from showing when already authenticated
        if (isLoginPage || isRegisterPage) {
            window.location.href = "/dashboard.html";
            return;
        }

        if (authStatus) {
            //Choose randomly from a set of welcome back messages

            // const messages = [
            //     "Ready when you are",
            //     "Time to tackle your tasks",
            //     "Ready to be productive",
            //     "Your tasks await",
            //     "Let's make today productive"
            // ];
            // const randomIndex = Math.floor(Math.random() * messages.length);
            // const welcomeMessage = messages[randomIndex];
            // authStatus.textContent += `${welcomeMessage} ${data.user.firstName}`;

            const rawName = String(data?.user?.firstName || data?.user?.name || "").trim();
            const firstName = rawName.split(/\s+/)[0] || "there";
            authStatus.textContent = `Welcome back, ${firstName}`;

        }
        authSection?.classList.add("hidden"); // Hide login/register CTA on dashboard
        mainSection?.classList.remove("hidden"); // Show main task page
        if (logoutBtn) {
            logoutBtn.style.display = "block";
        }
        if (mainSection) {
            fetchTasks(); // Automatically load tasks if user is logged in
        }

        updateNavTaskCounter();
    } else {
        // Protected pages should send logged-out users to login instead of showing a blank shell.
        if (isProtectedPage) {
            window.location.href = "/login.html";
            return;
        }

        // Only toggle dashboard sections if they are present on the page
        if (authStatus) {
            authStatus.textContent = "Not logged in";
        }
        authSection?.classList.remove("hidden"); // Show login/register CTA
        mainSection?.classList.add("hidden"); // Hide main task page
        if (logoutBtn) {
            logoutBtn.style.display = "none";
        }
        const taskList = document.querySelector(".task-list");
        if (taskList) {
            taskList.innerHTML = ""; // Clear tasks when logged out
        }
    }
}


// Function to get the tasks for the logged in user
async function fetchTasks() {
    const response = await fetch("/tasks", { credentials: "include" });
    const tasks = await response.json();

    if (response.ok) {
        updateTaskList(tasks);
    } else {
        console.error("Error fetching tasks:", tasks.error);
        alert("Please log in to see your tasks.");
    }
}

// Function to submit a task (User must be logged in)
const submit = async function(event) {
    Toast.show({ message: "Task Submitted", type: "success", duration: 2000 });
    event.preventDefault(); // Stop default form submission behavior

    const taskInput = document.querySelector("#taskDescription");
    const dateInput = document.querySelector("#dueDate");
    const effortInput = document.querySelector('input[name="effortLevel"]:checked');

    // Create JSON object with form data
    const dueDateValue = dateInput.value.trim();
    const json = {
    description: taskInput.value.trim(),
    dueDate: dueDateValue || null,
    effortLevel: effortInput ? parseInt(effortInput.value, 10) : 3
    };

    if (!json.description) {
    alert("Please enter a task description.");
    return;
    }


    // Send task data to the server
    const response = await fetch("/tasks", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json)
    });

    const data = await response.json();

    if (response.ok) {
        console.log("Task added successfully:", data);
        updateTaskList(data); // Refresh task list
    } else {
        console.error("Task Submission Error:", data.error);
        alert("You must be logged in to submit tasks.");
    }

    // Clear input fields after submission
    taskInput.value = "";
    dateInput.value = "";
};

function setBigThreeButtonState(button, isBigThree) {
    if (!button) return;

    const icon = button.querySelector("i");
    const active = Boolean(isBigThree);

    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.title = active ? "Remove from Big 3" : "Add to Big 3";

    if (icon) {
        icon.classList.toggle("fa-solid", active);
        icon.classList.toggle("fa-regular", !active);
        icon.style.color = "rgba(237, 28, 28, 1.00)";
    }
}

function updateBigThreeWidget(tasks) {
    const bigThreeList = document.getElementById("big-three-list");
    const emptyState = document.querySelector("#big-3-tasks .big-three-empty");
    if (!bigThreeList || !emptyState) return;

    const bigThreeTasks = tasks.filter((task) => task.isBigThree).slice(0, 3);
    bigThreeList.innerHTML = "";

    if (bigThreeTasks.length === 0) {
        emptyState.hidden = false;
        bigThreeList.hidden = true;
        return;
    }

    emptyState.hidden = true;
    bigThreeList.hidden = false;

    bigThreeTasks.forEach((task, index) => {
        const item = document.createElement("li");
        item.className = "big-three-item task-text";
        item.textContent = `${index + 1}. ${task.description}`;
        bigThreeList.appendChild(item);
    });
}



let activeTaskInPanel = null;

function formatTaskDueDate(dueDate) {
    if (!dueDate) return "No due date";
    const date = new Date(dueDate);
    return `Due: ${date.toLocaleDateString()}`;
}

function formatTaskEffortLevel(effortLevel) {
    const safeEffort = Math.max(1, Math.min(5, parseInt(effortLevel, 10) || 3));
    return `${safeEffort} / 5`;
}

async function updateTaskCompletionStatus(task, isCompleted, taskCheck, taskItem, controls = {}) {
    const nextStatus = isCompleted ? "completed" : "active";
    const shouldRemoveBigThree = isCompleted && Boolean(task.isBigThree);

    try {
        const payload = { status: nextStatus };
        if (shouldRemoveBigThree) {
            payload.isBigThree = false;
        }

        const updateResponse = await fetch(`/tasks/${task._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!updateResponse.ok) {
            console.error("Error updating task status");
            return false;
        }

        task.status = nextStatus;

        if (shouldRemoveBigThree) {
            task.isBigThree = false;
            setBigThreeButtonState(controls.bigThreeButton, false);
            setBigThreeButtonState(controls.panelBigThreeButton, false);
        }

        if (taskCheck) {
            taskCheck.checked = isCompleted;
        }
        taskItem?.classList.toggle("is-completed", isCompleted);

        if (nextStatus === "completed") {
            Toast.show({ message: "Task Completed! One step down, time for the next.", type: "success", duration: 4000 });
        }

        fetchTasks();
        return true;
    } catch (error) {
        console.error("Task status update failed:", error);
        return false;
    }
}

function closeTaskDetailPanel() {
    const panel = document.getElementById("task-detail-panel");
    const backdrop = document.getElementById("task-detail-backdrop");
    if (!panel || !backdrop) return;

    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-visible");
    backdrop.setAttribute("aria-hidden", "true");
    document.body.classList.remove("task-panel-open");
    activeTaskInPanel = null;
}

function wireTaskDetailPanel() {
    const panel = document.getElementById("task-detail-panel");
    const backdrop = document.getElementById("task-detail-backdrop");
    const closeButton = document.getElementById("taskDetailClose");
    if (!panel || !backdrop || !closeButton || panel.dataset.ready === "true") return;

    const panelBigThreeButton = document.getElementById("panelBigThreeBtn");
    const panelEditButton = document.getElementById("panelEditBtn");
    const panelDeleteButton = document.getElementById("panelDeleteBtn");
    const panelTaskComplete = document.getElementById("panelTaskComplete");

    closeButton.addEventListener("click", closeTaskDetailPanel);
    backdrop.addEventListener("click", closeTaskDetailPanel);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && panel.classList.contains("is-open")) {
            closeTaskDetailPanel();
        }
    });

    panelBigThreeButton?.addEventListener("click", () => activeTaskInPanel?.toggleBigThree?.());
    panelEditButton?.addEventListener("click", () => activeTaskInPanel?.editTask?.());
    panelDeleteButton?.addEventListener("click", () => activeTaskInPanel?.deleteTask?.());
    panelTaskComplete?.addEventListener("change", () => activeTaskInPanel?.toggleComplete?.());

    panel.dataset.ready = "true";
}

function openTaskDetailPanel(task, handlers) {
    const panel = document.getElementById("task-detail-panel");
    const backdrop = document.getElementById("task-detail-backdrop");
    const descriptionEl = document.getElementById("panelTaskDescription");
    const dueDateEl = document.getElementById("panelTaskDueDate");
    const effortEl = document.getElementById("panelTaskEffort");
    const panelBigThreeButton = document.getElementById("panelBigThreeBtn");
    const panelTaskComplete = document.getElementById("panelTaskComplete");
    if (!panel || !backdrop || !descriptionEl || !dueDateEl || !effortEl || !panelBigThreeButton || !panelTaskComplete) return;

    wireTaskDetailPanel();

    descriptionEl.textContent = task.description || "No description";
    dueDateEl.textContent = formatTaskDueDate(task.dueDate);
    effortEl.textContent = formatTaskEffortLevel(task.effortLevel);

    setBigThreeButtonState(panelBigThreeButton, task.isBigThree);
    panelBigThreeButton.disabled = false;
    panelTaskComplete.checked = task.status === "completed";

    activeTaskInPanel = {
        ...handlers,
        syncBigThree(nextValue) {
            task.isBigThree = nextValue;
            setBigThreeButtonState(panelBigThreeButton, nextValue);
        },
        syncCompletion(nextStatus) {
            task.status = nextStatus;
            panelTaskComplete.checked = nextStatus === "completed";
        }
    };

    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    backdrop.classList.add("is-visible");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.classList.add("task-panel-open");
}

// Function to update the UI with fetched tasks
function updateTaskList(tasks) {
    const listOfTasks = document.querySelector(".task-list");
    const taskTemplate = document.querySelector("#task-template");
    tasks = Array.isArray(tasks) ? tasks : [];

    const sortedTasks = tasks.slice().sort((a, b) => {
        const aCompleted = a.status === "completed";
        const bCompleted = b.status === "completed";

        if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1;
        }

        const aCreated = new Date(a.createdAt || 0).getTime();
        const bCreated = new Date(b.createdAt || 0).getTime();
        return bCreated - aCreated;
    });

    if (!listOfTasks) {
        return; // Avoid errors on pages without the dashboard
    }
    if (!taskTemplate) {
        console.error("Task template not found in DOM");
        return;
    }

    listOfTasks.innerHTML = ""; // Clear existing task list

    sortedTasks.forEach((task) => {
        const clone = taskTemplate.content.cloneNode(true);
        const taskItem = clone.querySelector(".task-item");
        const taskText = clone.querySelector(".task-text");
        const taskDetailsTrigger = clone.querySelector(".task-details-trigger");
        const taskCheck = clone.querySelector(".task-check");
        const dueText = clone.querySelector(".task-due");
        const effortDots = clone.querySelectorAll(".task-effort .dot");
        const bigThreeButton = clone.querySelector(".big-three-btn");
        const panelBigThreeButton = document.getElementById("panelBigThreeBtn");

        if (taskItem && taskText) {
            taskText.textContent = task.description;
            taskText.title = "Open task details";
        }
        if (taskCheck) {
            taskCheck.checked = task.status === "completed";
            taskItem?.classList.toggle("is-completed", taskCheck.checked);

            taskCheck.addEventListener("change", async () => {
                const isCompleted = taskCheck.checked;
                const updated = await updateTaskCompletionStatus(task, isCompleted, taskCheck, taskItem, {
                    bigThreeButton,
                    panelBigThreeButton
                });

                if (!updated) {
                    taskCheck.checked = !isCompleted;
                    taskItem?.classList.toggle("is-completed", taskCheck.checked);
                }
            });
        }
        if (dueText) {
            if (task.dueDate) {
                const date = new Date(task.dueDate);
                dueText.textContent = `Due: ${date.toLocaleDateString()}`;
                dueText.hidden = false;
            } else {
                dueText.textContent = "";
                dueText.hidden = true;
            }
        }
        if (effortDots.length > 0) {
            const effortLevel = Math.max(1, Math.min(5, parseInt(task.effortLevel, 10) || 3));
            effortDots.forEach((dot, index) => {
                dot.classList.toggle("on", index < effortLevel);
            });
        }
        setBigThreeButtonState(bigThreeButton, task.isBigThree);

        const toggleBigThree = async () => {
            if (task.status === "completed") {
                Toast.show({ message: "Completed tasks can't be added to Big 3.", type: "error", duration: 3200 });
                return;
            }

            const nextIsBigThree = !task.isBigThree;
            if (bigThreeButton) bigThreeButton.disabled = true;

            try {
                const updateResponse = await fetch(`/tasks/${task._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isBigThree: nextIsBigThree })
                });

                const updatedTask = await parseApiResponse(updateResponse);
                if (updateResponse.ok) {
                    task.isBigThree = Boolean(updatedTask.isBigThree);
                    setBigThreeButtonState(bigThreeButton, task.isBigThree);
                    if (task.isBigThree) {
                        Toast.show({ message: "Task added to your Big 3", type: "success", duration: 2200 });
                    }
                    fetchTasks();
                } else {
                    Toast.show({ message: updatedTask.error || "Could not update Big 3 status.", type: "error", duration: 3500 });
                    setBigThreeButtonState(bigThreeButton, task.isBigThree);
                }
            } catch (error) {
                console.error("Task Big 3 toggle failed:", error);
                Toast.show({ message: "Could not update Big 3 status.", type: "error", duration: 3000 });
                setBigThreeButtonState(bigThreeButton, task.isBigThree);
            } finally {
                if (bigThreeButton) bigThreeButton.disabled = false;
            }
        };

        bigThreeButton?.addEventListener("click", toggleBigThree);

        // Add event listener for editing a task
        const editTask = async () => {
            const newDescription = prompt("Edit task description:", task.description);
            if (newDescription !== null && newDescription.trim() !== "") {
                console.log("New Description:", newDescription);
        
                //Send updated task to the server
                const updateResponse = await fetch(`/tasks/${task._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ description: newDescription })

                });
        
                if (updateResponse.ok) {
                    console.log("Task updated successfully");
                    fetchTasks(); // Automatically reload the task list after editing
                    Toast.show({ message: "Task Updated", type: "success", duration: 2000 });
                } else {
                    console.error("Error updating task");
                }
            }
        };

        // Add event listener for deleting a task
        const deleteTask = async () => {
            const confirmDelete = confirm("Are you sure you want to delete this task?");
            if (confirmDelete) {
                const deleteResponse = await fetch(`/tasks/${task._id}`, {
                    method: "DELETE"
                });

                if (deleteResponse.ok) {
                    console.log("Task deleted successfully");
                    Toast.show({ message: "Task deleted", type: "success", duration: 2000 });
                    fetchTasks(); // Refresh task list after deletion
                } else {
                    console.error("Error deleting task");
                }
            }
        };

        const rowBigThreeButton = clone.querySelector(".big-three-btn");
        const rowEditButton = clone.querySelector(".edit-btn");
        const rowDeleteButton = clone.querySelector(".delete-btn");

        rowBigThreeButton?.addEventListener("click", toggleBigThree);
        rowEditButton?.addEventListener("click", editTask);
        rowDeleteButton?.addEventListener("click", deleteTask);

        taskDetailsTrigger?.addEventListener("click", () => {
            openTaskDetailPanel(task, {
                toggleBigThree: async () => {
                    panelBigThreeButton.disabled = true;
                    await toggleBigThree();
                    if (activeTaskInPanel) {
                        activeTaskInPanel.syncBigThree(Boolean(task.isBigThree));
                    }
                    panelBigThreeButton.disabled = false;
                },
                editTask: async () => {
                    await editTask();
                },
                deleteTask: async () => {
                    await deleteTask();
                    closeTaskDetailPanel();
                },
                toggleComplete: async () => {
                    const panelTaskComplete = document.getElementById("panelTaskComplete");
                    if (!panelTaskComplete) return;

                    panelTaskComplete.disabled = true;
                    const isCompleted = panelTaskComplete.checked;
                    const updated = await updateTaskCompletionStatus(task, isCompleted, taskCheck, taskItem, {
                    bigThreeButton,
                    panelBigThreeButton
                });

                    if (updated) {
                        activeTaskInPanel?.syncCompletion(task.status);
                    } else {
                        panelTaskComplete.checked = !isCompleted;
                    }

                    panelTaskComplete.disabled = false;
                }
            });
        });

        listOfTasks.appendChild(clone);
    });

    updateBigThreeWidget(sortedTasks);

    // Update the task counter
    document.querySelectorAll(".item-counter").forEach((el) => {
    const activeCount = Array.isArray(tasks)
        ? tasks.filter(t => t.status === "active").length
        : 0;

    el.textContent = String(activeCount);
    });

    // If no tasks, show a friendly message
    if (tasks.length === 0) {
        listOfTasks.innerHTML = "<p>No tasks found. Add a new task to get started!</p>";
    }
}

// Only enable periodic refresh on pages that actually have the dashboard
const hasDashboard = document.getElementById("main-section");

if (hasDashboard) {
  const REFRESH_MS = 30000;

  function refreshDashboard() {
    checkAuthStatus( );
  }

  setInterval(refreshDashboard, REFRESH_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshDashboard();
    }
  });
}







// ----------------------------
// Responsive Nav (drawer + view select)
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav__toggle");
  const drawer = document.getElementById("nav-drawer");
  const backdrop = document.getElementById("nav-backdrop");
  const compactNav = window.matchMedia("(max-width: 1023px), (hover: none) and (pointer: coarse)");

  if (toggle && drawer && backdrop) {
    const openDrawer = () => {
      closeTaskDetailPanel();
      drawer.classList.add("is-open");
      backdrop.classList.add("is-visible");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };

    const closeDrawer = () => {
      drawer.classList.remove("is-open");
      backdrop.classList.remove("is-visible");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };

    toggle.addEventListener("click", () => {
      if (!compactNav.matches) return;
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      expanded ? closeDrawer() : openDrawer();
    });

    backdrop.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer();
    });

    drawer.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeDrawer);
    });

    compactNav.addEventListener("change", (event) => {
      if (!event.matches) {
        closeDrawer();
      }
    });
  }
});

// ----------------------------
// Mobile/tablet sticky-note center activation
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const compactView = window.matchMedia("(max-width: 1023px), (hover: none) and (pointer: coarse)");
  const stickyNotes = Array.from(document.querySelectorAll(".board-grid .sticky-note"));
  if (stickyNotes.length === 0) return;

  let rafId = null;

  const clearActiveNotes = () => {
    stickyNotes.forEach((note) => note.classList.remove("in-view-hover"));
  };

  const updateStickyNoteStates = () => {
    rafId = null;

    if (!compactView.matches) {
      clearActiveNotes();
      return;
    }

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const centerY = viewportHeight * 0.5;
    const activeHalfBand = viewportHeight * 0.18; // ~36% total active zone around center
    const upperBound = centerY - activeHalfBand;
    const lowerBound = centerY + activeHalfBand;

    stickyNotes.forEach((note) => {
      const rect = note.getBoundingClientRect();
      const noteCenter = rect.top + rect.height / 2;
      const isVisible = rect.bottom > 0 && rect.top < viewportHeight;
      const inCenterBand = noteCenter >= upperBound && noteCenter <= lowerBound;

      note.classList.toggle("in-view-hover", isVisible && inCenterBand);
    });
  };

  const requestUpdate = () => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(updateStickyNoteStates);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  compactView.addEventListener("change", requestUpdate);

  updateStickyNoteStates();
});
