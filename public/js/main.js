// Ensure JavaScript runs only after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Fully Loaded - JavaScript Running");

    // Function for registering a new user
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
    
            // Get username and password 
            const username = document.getElementById("registerUsername").value;
            const password = document.getElementById("registerPassword").value;
    
            const response = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({ username, password })
            });
    
            const data = await response.json();
    
            // Check if registration went alright
            if (response.ok) {
                alert("Registration successful! Please log in.");
            } else {
                alert("Registration failed: " + data.error);
            }
        });
    }

    // Function to log in a user
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        document.getElementById("loginForm").addEventListener("submit", async (event) => {
            event.preventDefault();
        
            const username = document.getElementById("loginUsername").value;
            const password = document.getElementById("loginPassword").value;
        
            const response = await fetch("/login", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
        
            const data = await response.json();
        
            if (response.ok) {
                alert("✅ Login successful!");
                //checkAuthStatus(); // Refresh UI
                //fetchTasks(); //Show tasks immediately after login
                checkAuthStatus(); // Refresh UI
            } else {
                alert("❌ Login failed: " + data.error);
            }
        });
    }


    // Function to log out a user
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            //await fetch("/logout");
            await fetch("/logout", { credentials: "include" });
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
    //const response = await fetch("/auth-status");
    // Says "checkAuthStatus() called" in the console
    console.log("checkAuthStatus() called");
    const response = await fetch("/auth-status", { credentials: "include" });
    const data = await response.json();

    const authSection = document.getElementById("auth-section");
    const mainSection = document.getElementById("main-section");
    const authStatus = document.getElementById("authStatus");
    const logoutBtn = document.getElementById("logoutBtn");

    if (data.loggedIn) {
        authStatus.textContent = `Logged in as: ${data.user.username}`;
        authSection.style.display = "none"; // Hide login/register section
        mainSection.style.display = "block"; // Show main task page
        logoutBtn.style.display = "block";
        fetchTasks(); // Automatically load tasks if user is logged in
    } else {
        authStatus.textContent = "Not logged in";
        authSection.style.display = "block"; // Show login/register section
        mainSection.style.display = "none"; // Hide main task page
        logoutBtn.style.display = "none";
        document.querySelector(".task-list").innerHTML = ""; // Clear tasks when logged out
    }

    
}


// Function to get the tasks for the logged in user
async function fetchTasks() {
    //const response = await fetch("/tasks");
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
        credentials: "include",
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
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ taskDescription: newDescription })
                });
        
                if (updateResponse.ok) {
                    console.log("✅ Task updated successfully");
                    fetchTasks(); // Automatically reload the task list after editing
                } else {
                    console.error("❌ Error updating task");
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
                    method: "DELETE",
                    credentials: "include"
                });

                if (deleteResponse.ok) {
                    console.log("🗑️ Task deleted successfully");
                    fetchTasks(); // Refresh task list after deletion
                } else {
                    console.error("❌ Error deleting task");
                }
            }
        });

        // Append Edit and Delete button to the task
        clone.prepend(deleteButton);
        clone.prepend(editButton);
        listOfTasks.appendChild(clone);
    });

    // Update the task counter
    document.querySelector(".item-counter").innerHTML = tasks.length.toString();
}

