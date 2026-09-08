const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    loginError.textContent = "";

    try {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            loginError.textContent = data.error || "Login failed.";
            return;
        }

        window.location.href = "/admin.html";
    } catch (error) {
        console.error("Login error:", error);
        loginError.textContent = "Unable to connect to the server.";
    }
});