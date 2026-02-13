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
        logoutBtn.addEventListener("click", async () => {
            const response = await fetch("/logout", {
                credentials: "include",
                method: "POST"
            });

            if (response.ok) {
                // alert("Logged out successfully!");
                Toast.show({ message: "Logged out successfully", type: "success", duration: 2000 });
                // Send the user back to login after logout
                window.location.href = "/login.html";
            } else {
                const data = await parseApiResponse(response);
                alert("Logout failed: " + (data.error || "Unknown error"));
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
        const taskCheck = clone.querySelector(".task-check");
        const dueText = clone.querySelector(".task-due");
        const effortDots = clone.querySelectorAll(".task-effort .dot");

        if (taskItem && taskText) {
            taskText.textContent = task.description;
        }
        if (taskCheck) {
            taskCheck.checked = task.status === "completed";

            taskCheck.addEventListener("change", async () => {
                const nextStatus = taskCheck.checked ? "completed" : "active";

                try {
                    const updateResponse = await fetch(`/tasks/${task._id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: nextStatus })
                    });

                    if (updateResponse.ok) {
                        task.status = nextStatus;
                        if (nextStatus === "completed") {
                            Toast.show({ message: "Task Completed! One step down, time for the next.", type: "success", duration: 4000 });
                        }
                        fetchTasks();
                    } else {
                        taskCheck.checked = !taskCheck.checked;
                        console.error("Error updating task status");
                    }
                } catch (error) {
                    taskCheck.checked = !taskCheck.checked;
                    console.error("Task status update failed:", error);
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
                    Toast.show({ message: "Task Updated", type: "success", duration: 2000 });
                } else {
                    console.error("Error updating task");
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
                    Toast.show({ message: "Task deleted", type: "success", duration: 2000 });
                    fetchTasks(); // Refresh task list after deletion
                } else {
                    console.error("Error deleting task");
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
