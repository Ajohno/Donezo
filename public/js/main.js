// Auth and tasks behavior for Donezo
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Fully Loaded - JavaScript Running");

    // Page flags let us adjust behavior for standalone login/register views
    const isLoginPage = document.body.classList.contains("login-page");
    const isRegisterPage = document.body.classList.contains("register-page");

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

           

            const response = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({ firstName, lastName, email, password })
            });

            const data = await response.json();

            // Check if registration went alright
            if (response.ok) {
                alert("Registration successful! Please log in.");
                window.location.href = "/login.html";
            } else {
                alert("Registration failed: " + data.error);
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


            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
        
            const data = await response.json();
        
            if (response.ok) {
                alert("Login successful!");
                // Auth pages should move you to the dashboard once logged in
                window.location.href = "/";
            } else {
                alert("Login failed: " + data.error);
            }
        });
    }

    // Function to log out a user (dashboard only)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await fetch("/logout");
            alert("Logged out successfully!");
            checkAuthStatus(); // Refresh UI
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

    checkAuthStatus(); // Check authentication status on page load
});

// Function to check if a user is currently logged in
async function checkAuthStatus() {
    const response = await fetch("/auth-status");
    const data = await response.json();

    const authSection = document.getElementById("auth-section");
    const mainSection = document.getElementById("main-section");
    const authStatus = document.getElementById("authStatus");
    const logoutBtn = document.getElementById("logoutBtn");

    if (data.loggedIn) {
        // Keep login/register pages from showing when already authenticated
        if (document.body.classList.contains("login-page") || document.body.classList.contains("register-page")) {
            window.location.href = "/";
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
            authStatus.textContent += `${welcomeMessage} ${data.user.firstName}`;

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
    const response = await fetch("/tasks");
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
    event.preventDefault(); // Stop default form submission behavior

    const taskInput = document.querySelector("#taskDescription");
    const dateInput = document.querySelector("#dueDate");
    const effortInput = document.querySelector("#effortLevel");

    // Create JSON object with form data
    const json = {
    description: taskInput.value.trim(),
    dueDate: dateInput.value,     // "YYYY-MM-DD"
    effortLevel: effortInput ? parseInt(effortInput.value, 10) : 3
    };

    if (!json.description || !json.dueDate) {
    alert("Please enter a task and a due date.");
    return;
    }


    // Send task data to the server
    const response = await fetch("/tasks", {
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
    // const counter = document.querySelector(".item-counter");
    document.querySelectorAll(".item-counter").forEach((counter) => {
    const activeCount = tasks.filter(t => t.status === "active").length;
    counter.textContent = activeCount.toString();
    });
    if (counter) {
        const activeCount = tasks.filter(t => t.status === "active").length;
        counter.textContent = activeCount.toString();

    }

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




// /* Account dropdown behavior */


// Account dropdown behavior (guarded)
const dropdown = document.querySelector(".account-dropdown");
if (dropdown) {
  const trigger = dropdown.querySelector(".account-trigger");
  const logout = dropdown.querySelector(".logout");

  trigger?.addEventListener("click", () => {
    dropdown.classList.toggle("open");
    trigger.setAttribute("aria-expanded", dropdown.classList.contains("open"));
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger?.setAttribute("aria-expanded", "false");
    }
  });

  logout?.addEventListener("click", () => {
    console.log("Logging out...");
    window.location.href = "/logout";
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
