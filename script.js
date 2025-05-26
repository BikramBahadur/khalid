 const correctUsername = "dr.khalid";
    const correctPassword = "khalid123";

    const loginBtn = document.getElementById("loginBtn");
    const errorMsg = document.getElementById("errorMsg");

    loginBtn.addEventListener("click", function(e) {
      e.preventDefault();

      const enteredUsername = document.getElementById("floatingInput").value.trim();
      const enteredPassword = document.getElementById("floatingPassword").value;

      if (enteredUsername === correctUsername && enteredPassword === correctPassword) {
        sessionStorage.setItem("isLoggedIn", "true");
        errorMsg.style.display = "none";
        window.location.href = "index.html"; // Redirect to index.html
      } else {
        sessionStorage.setItem("isLoggedIn", "false");
        errorMsg.style.display = "block";
      }
    });