<?php
session_start();

if (isset($_GET["logout"])) {
    session_unset();
    session_destroy();
    header("Location: index.php");
    exit;
}

if (isset($_SESSION["user_name"])) {
    header("Location: ../../index.html");
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Login / Sign Up</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="../../assets/css/style.css">
</head>
<body>
  <main class="container py-4">
    <div class="form-card card border-0 p-4 mx-auto" style="max-width: 720px;">
      <h2 class="text-center text-white mb-1 fw-bold">Advanced Weather Dashboard</h2>
      <p class="text-center text-white mb-4">Login or create an account to continue</p>

      <div class="mb-3 border-bottom pb-2">
        <button id="showLoginBtn" type="button" class="btn btn-light me-2">Login</button>
        <button id="showSignupBtn" type="button" class="btn btn-outline-light">Register</button>
      </div>

      <form id="loginForm">
        <label for="liUser" class="form-label fw-bold text-dark">Username</label>
        <input id="liUser" class="form-control mb-3" placeholder="Username" required>

        <label for="liPass" class="form-label fw-bold text-dark">Password</label>
        <input id="liPass" type="password" class="form-control mb-4" placeholder="Password" required>

        <button class="btn btn-primary w-100" type="submit">Login</button>
      </form>

      <form id="signupForm" class="d-none">
        <label for="suUser" class="form-label fw-bold text-dark">Username</label>
        <input id="suUser" class="form-control mb-3" placeholder="Username" required>

        <label for="suDisplay" class="form-label fw-bold text-dark">Display Name</label>
        <input id="suDisplay" class="form-control mb-3" placeholder="Display name" required>

        <label for="suEmail" class="form-label fw-bold text-dark">Email</label>
        <input id="suEmail" type="email" class="form-control mb-3" placeholder="Email" required>

        <label for="suPass" class="form-label fw-bold text-dark">Password</label>
        <input id="suPass" type="password" class="form-control mb-4" placeholder="Password" required>

        <button class="btn btn-primary w-100" type="submit">Create Account</button>
      </form>

      <div id="authMsg" class="text-danger small mt-3"></div>
    </div>
  </main>

  <script>
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const showLoginBtn = document.getElementById("showLoginBtn");
    const showSignupBtn = document.getElementById("showSignupBtn");
    const msgEl = document.getElementById("authMsg");

    function showLogin() {
      loginForm.classList.remove("d-none");
      signupForm.classList.add("d-none");
      msgEl.textContent = "";
      showLoginBtn.className = "btn btn-primary me-2 text-white";
      showSignupBtn.className = "btn btn-outline-primary text-white";
      showLoginBtn.classList.add("active");
      showSignupBtn.classList.remove("active");
    }

    function showSignup() {
      signupForm.classList.remove("d-none");
      loginForm.classList.add("d-none");
      msgEl.textContent = "";
      showSignupBtn.className = "btn btn-primary text-white";
      showLoginBtn.className = "btn btn-outline-primary me-2 text-white";
      showSignupBtn.classList.add("active");
      showLoginBtn.classList.remove("active");
    }

    showLoginBtn.addEventListener("click", showLogin);
    showSignupBtn.addEventListener("click", showSignup);
    showLogin();

    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      msgEl.textContent = "";

      const res = await fetch("auth.php?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: document.getElementById("liUser").value.trim(),
          password: document.getElementById("liPass").value
        })
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        msgEl.textContent = j.error || "Login failed";
        return;
      }

      location.href = "../../index.html";
    });

    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      msgEl.textContent = "";

      const signRes = await fetch("auth.php?action=signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: document.getElementById("suUser").value.trim(),
          display_name: document.getElementById("suDisplay").value.trim(),
          email: document.getElementById("suEmail").value.trim(),
          password: document.getElementById("suPass").value
        })
      });

      const signJson = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        msgEl.textContent = signJson.error || "Signup failed";
        return;
      }

      // Auto-login immediately after successful signup
      const loginRes = await fetch("auth.php?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: document.getElementById("suUser").value.trim(),
          password: document.getElementById("suPass").value
        })
      });

      const loginJson = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        msgEl.textContent = loginJson.error || "Signup done, auto-login failed.";
        showLogin();
        return;
      }

      location.href = "../../index.html";
    });
  </script>
</body>
</html>

