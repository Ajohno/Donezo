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

            // Pull values from the illustrated fields
            const name = document.getElementById("registerName")?.value.trim();
            const email = document.getElementById("registerEmail")?.value.trim();
            const password = document.getElementById("registerPassword").value;
            const confirmPassword = document.getElementById("registerConfirm").value;

            // Simple client-side guard to match the confirm password box
            if (password !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }

            // Backend expects a username; keep it aligned to the email field
            const usernameFallback = document.getElementById("registerUsername")?.value?.trim();
            const username = email || usernameFallback || name;
            if (!username) {
                alert("Please enter an email.");
                return;
            }

            const response = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({ username, password })
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
        
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;
        
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
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
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.onclick = submit;
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
            authStatus.textContent = `Logged in as: ${data.user.username}`;
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

    // Create JSON object with form data
    const json = {
        taskDescription: taskInput.value,
        taskDate: dateInput.value
    };

    // Send task data to the server
    const response = await fetch("/submit", {
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
    if (!listOfTasks) {
        return; // Avoid errors on pages without the dashboard
    }
    listOfTasks.innerHTML = ""; // Clear existing task list

    const taskTemplate = document.querySelector("#task-template");

    tasks.forEach((task) => {
        const clone = taskTemplate.content.cloneNode(true);
        const taskItem = clone.querySelector(".task-item");
        taskItem.innerHTML = task.taskDescription;

        // Create an Edit button
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.classList.add("edit-btn");

        // Add event listener for editing a task
        editButton.addEventListener("click", async () => {
            const newDescription = prompt("Edit task description:", task.taskDescription);
            if (newDescription !== null && newDescription.trim() !== "") {
                console.log("New Description:", newDescription);
        
                //Send updated task to the server
                const updateResponse = await fetch(`/tasks/${task._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ taskDescription: newDescription })
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
    const counter = document.querySelector(".item-counter");
    if (counter) {
        counter.innerHTML = tasks.length.toString();
    }
}
