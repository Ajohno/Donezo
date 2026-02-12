// Auth and tasks behavior for Donezo

async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json();
    }

    const text = await response.text();
    return { error: text || "Unexpected server response" };
}

const PENDING_TOAST_KEY = "donezo:pending-toast";

function showToast({ message = "", type = "default", title = "", duration = 3000 } = {}) {
    if (typeof Toast !== "undefined" && Toast && typeof Toast.show === "function") {
        Toast.show({ message, type, title, duration });
        return;
    }

    console.warn("Toast unavailable:", message);
}

function queueToastForNextPage(opts) {
    try {
        sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify(opts));
    } catch (error) {
        console.error("Failed to queue toast:", error);
    }
}

function flushQueuedToast() {
    try {
        const raw = sessionStorage.getItem(PENDING_TOAST_KEY);
        if (!raw) return;

        sessionStorage.removeItem(PENDING_TOAST_KEY);
        showToast(JSON.parse(raw));
    } catch (error) {
        console.error("Failed to read queued toast:", error);
        sessionStorage.removeItem(PENDING_TOAST_KEY);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Fully Loaded - JavaScript Running");
    flushQueuedToast();

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
                showToast({ message: "Please fill in first name, last name, and email.", type: "warning", duration: 2500 });
                return;
            }


            // Simple client-side guard to match the confirm password box
            if (password !== confirmPassword) {
                showToast({ message: "Passwords do not match.", type: "warning", duration: 2500 });
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
                    queueToastForNextPage({ message: "Registration successful! Please log in.", type: "success", duration: 2500 });
                    window.location.href = "/login.html";
                } else {
                    showToast({ message: "Registration failed: " + (data.error || "Unknown error"), type: "error", duration: 4000 });
                }
            } catch (error) {
                console.error("Registration request failed:", error);
                showToast({ message: "Registration failed due to a network/server issue.", type: "error", duration: 4000 });
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
                    queueToastForNextPage({ message: "Login successful!", type: "success", duration: 2000 });
                    // Auth pages should move you to the dashboard once logged in
                    window.location.href = "/dashboard.html";
                    
                } else {
                    showToast({ message: "Login failed: " + (data.error || "Unknown error"), type: "error", duration: 4000 });
                }
            } catch (error) {
                console.error("Login request failed:", error);
                showToast({ message: "Login failed due to a network/server issue.", type: "error", duration: 3000 });
            }
        });
    }

    // Function to log out a user (dashboard only)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await fetch("/logout", { credentials: "include" });
            queueToastForNextPage({ message: "Logged out successfully!", type: "success", duration: 2000 });
            // Send the user back to login after logout
            window.location.href = "/login.html";
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

    checkAuthStatus({ isLoginPage, isRegisterPage, isProtectedPage }); // Check authentication status on page load
});

// Function to check if a user is currently logged in
async function checkAuthStatus({ isLoginPage = false, isRegisterPage = false, isProtectedPage = false } = {}) {
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

            const welcomeMessage = "Welcome back,";
            authStatus.textContent = `${welcomeMessage} ${data.user.firstName}`;

        }
        authSection?.classList.add("hidden"); // Hide login/register CTA on dashboard
        mainSection?.classList.remove("hidden"); // Show main task page
        if (logoutBtn) {
            logoutBtn.style.display = "block";
        }
        if (mainSection) {
            fetchTasks(); // Automatically load tasks if user is logged in
        }
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
        showToast({ message: "Please log in to see your tasks.", type: "warning", duration: 2500 });
    }
}

// Function to submit a task (User must be logged in)
const submit = async function(event) {
    event.preventDefault(); // Stop default form submission behavior

    const taskInput = document.querySelector("#taskDescription");
    const dateInput = document.querySelector("#dueDate");
    const effortInput = document.querySelector('input[name="effortLevel"]:checked');

    // Create JSON object with form data
    const json = {
    description: taskInput.value.trim(),
    dueDate: dateInput.value,     // "YYYY-MM-DD"
    effortLevel: effortInput ? parseInt(effortInput.value, 10) : 3
    };

    if (!json.description || !json.dueDate) {
        showToast({ message: "Please enter a task and a due date.", type: "warning", duration: 2500 });
        return;
    }


    try {
        // Send task data to the server
        const response = await fetch("/tasks", {
            credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(json)
        });

        const data = await parseApiResponse(response);

        if (response.ok) {
            console.log("Task added successfully:", data);
            showToast({ message: "Task submitted", type: "success", duration: 2000 });
            updateTaskList(data); // Refresh task list
            // Clear input fields after submission
            taskInput.value = "";
            dateInput.value = "";
        } else {
            console.error("Task Submission Error:", data.error);
            showToast({ message: data.error || "You must be logged in to submit tasks.", type: "error", duration: 3000 });
        }
    } catch (error) {
        console.error("Task submission request failed:", error);
        showToast({ message: "Task submission failed due to a network/server issue.", type: "error", duration: 3000 });
    }
};

// Function to update the UI with fetched tasks
function updateTaskList(tasks) {
    const listOfTasks = document.querySelector(".task-list");
    const taskTemplate = document.querySelector("#task-template");
    tasks = Array.isArray(tasks) ? tasks : [];

    if (!listOfTasks) {
        return; // Avoid errors on pages without the dashboard
    }
    if (!taskTemplate) {
        console.error("Task template not found in DOM");
        return;
    }

    listOfTasks.innerHTML = ""; // Clear existing task list

    tasks.forEach((task) => {
        const clone = taskTemplate.content.cloneNode(true);
        const taskItem = clone.querySelector(".task-item");
        const taskText = clone.querySelector(".task-text");
        const dueText = clone.querySelector(".task-due");

        if (taskItem && taskText) {
            taskText.textContent = task.description;
        }
        if (dueText && task.dueDate) {
            const date = new Date(task.dueDate);
            dueText.textContent = `Due: ${date.toLocaleDateString()}`;
        }

        // Create an Edit button
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.classList.add("edit-btn");

        // Add event listener for editing a task
        editButton.addEventListener("click", async () => {
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
                    showToast({ message: "Task updated", type: "success", duration: 2000 });
                } else {
                    console.error("Error updating task");
                    showToast({ message: "Error updating task", type: "error", duration: 2500 });
                }
            }
        });
        
        // Create a Delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("delete-btn");

        // Add event listener for deleting a task
        deleteButton.addEventListener("click", async () => {
            const confirmDelete = confirm("Are you sure you want to delete this task?");
            if (confirmDelete) {
                const deleteResponse = await fetch(`/tasks/${task._id}`, {
                    method: "DELETE"
                });

                if (deleteResponse.ok) {
                    console.log("Task deleted successfully");
                    showToast({ message: "Task deleted", type: "success", duration: 2000 });
                    fetchTasks(); // Refresh task list after deletion
                } else {
                    console.error("Error deleting task");
                    showToast({ message: "Error deleting task", type: "error", duration: 2500 });
                }
            }
        });

        // Append Edit and Delete buttons beside each other
        const actionsContainer = document.createElement("div");
        actionsContainer.classList.add("task-actions");
        actionsContainer.appendChild(editButton);
        actionsContainer.appendChild(deleteButton);
        clone.prepend(actionsContainer);
        listOfTasks.appendChild(clone);
    });

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
    checkAuthStatus();
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

  if (toggle && drawer && backdrop) {
    const openDrawer = () => {
      drawer.hidden = false;
      backdrop.hidden = false;

      // allow CSS transition to kick in
      requestAnimationFrame(() => drawer.classList.add("is-open"));

      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    };

    const closeDrawer = () => {
      drawer.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";

      // wait for animation to finish before hiding
      setTimeout(() => {
        drawer.hidden = true;
        backdrop.hidden = true;
      }, 230);
    };

    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      expanded ? closeDrawer() : openDrawer();
    });

    backdrop.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !drawer.hidden) closeDrawer();
    });

    drawer.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeDrawer);
    });
  }
});
