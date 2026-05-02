// ✅ SAFE API DECLARATION (prevents duplicate error)
if (!window.API) {
  window.API = "https://mingle31.onrender.com/api";
}

document.addEventListener("DOMContentLoaded", () => {

  const joinBtn = document.getElementById("joinBtn");
  const emailSection = document.getElementById("emailSection");
  const continueBtn = document.getElementById("continueBtn");
  const formSection = document.getElementById("formSection");
  const submitForm = document.getElementById("submitForm");
  const dashboard = document.getElementById("dashboard");

  // ✅ FIX 1: Remove inline onclick attributes from HTML to prevent conflicts
  joinBtn?.removeAttribute("onclick");
  continueBtn?.removeAttribute("onclick");
  submitForm?.removeAttribute("onclick");

  // 🚀 STEP 1: JOIN CLICK
  joinBtn.onclick = () => {
    emailSection.style.display = "block";
  };

  // 🚀 STEP 2: CHECK USER
  continueBtn.onclick = async () => {
    const email = document.getElementById("emailInput").value.trim();

    if (!email) {
      alert("Enter email");
      return;
    }

    localStorage.setItem("email", email);

    try {
      const res = await fetch(`${window.API}/users/${email}`);

      if (res.status === 404) {
        console.log("❌ User not found → show form");
        formSection.style.display = "block";
        return;
      }

      const data = await res.json();
      console.log("✅ User found:", data);

      loadDashboard(email);

    } catch (err) {
      console.error("❌ Error:", err);
      alert("Server error");
    }
  };

  // 🚀 STEP 3: CREATE USER
  // ✅ FIX 2: Wait for POST to fully resolve before loading dashboard + safety delay
  submitForm.onclick = async () => {
    console.log("🔥 Submit clicked");

    const email = localStorage.getItem("email");

    const body = {
      name: document.getElementById("name").value,
      email,
      intent: document.getElementById("intent").value,
      personality_score: parseInt(document.getElementById("personality").value),
      ambition_score: parseInt(document.getElementById("ambition").value),
      interests: document.getElementById("interests").value.split(",").map(i => i.trim())
    };

    // ✅ Disable button to prevent double submit
    submitForm.disabled = true;
    submitForm.textContent = "Creating...";

    try {
      const res = await fetch(`${window.API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        alert("User creation failed: " + (data.message || "Unknown error"));
        submitForm.disabled = false;
        submitForm.textContent = "Submit";
        return;
      }

      console.log("✅ User created:", data);

      // ✅ Small delay so DB write is fully committed before match fetch
      await new Promise(resolve => setTimeout(resolve, 300));

      formSection.style.display = "none";
      loadDashboardDirect(data.user);

    } catch (err) {
      console.error("❌ Error:", err);
      alert("Server error");
      submitForm.disabled = false;
      submitForm.textContent = "Submit";
    }
  };

  // 🚀 DASHBOARD LOADER (for existing users)
  // ✅ FIX 3: Guard against 404 — redirect to form instead of crashing
  async function loadDashboard(email) {
    emailSection.style.display = "none";
    formSection.style.display = "none";
    dashboard.style.display = "block";

    try {
      const userRes = await fetch(`${window.API}/users/${email}`);

      // ✅ Guard: if user somehow not found, send back to form
      if (!userRes.ok) {
        console.warn("⚠️ User not found during dashboard load");
        dashboard.style.display = "none";
        formSection.style.display = "block";
        return;
      }

      const userData = await userRes.json();

      document.getElementById("profile").innerHTML = `
        <h3>${userData.user?.name || "N/A"}</h3>
        <p>Intent: ${userData.user?.intent || "N/A"}</p>
        <p>Personality: ${userData.user?.personality_score || "N/A"}</p>
        <p>Ambition: ${userData.user?.ambition_score || "N/A"}</p>
        <p>Interests: ${(userData.user?.interests || []).join(", ")}</p>
      `;

      loadMatches(email);

    } catch (err) {
      console.error("❌ Dashboard error:", err);
    }
  }

  // 🔥 DASHBOARD LOADER (for newly created users — no refetch needed)
  function loadDashboardDirect(user) {
    emailSection.style.display = "none";
    formSection.style.display = "none";
    dashboard.style.display = "block";

    document.getElementById("profile").innerHTML = `
      <h3>${user.name}</h3>
      <p>Intent: ${user.intent}</p>
      <p>Personality: ${user.personality_score}</p>
      <p>Ambition: ${user.ambition_score}</p>
      <p>Interests: ${(user.interests || []).join(", ")}</p>
    `;

    // Now safely fetch matches (user exists now)
    loadMatches(user.email);
  }

  // 🔥 MATCH LOADER (shared by both loadDashboard and loadDashboardDirect)
  async function loadMatches(email) {
    try {
      const matchRes = await fetch(`${window.API}/matches/${email}`);
      const matchData = await matchRes.json();

      document.getElementById("networking").innerHTML = `
        <h3>Networking Matches</h3>
        ${(matchData.matches || []).map(m => `
          <p>${m.name} - Score: ${m.score}%</p>
        `).join("")}
      `;

      const datingRes = await fetch(`${window.API}/matches/dating/${email}`);
      const datingData = await datingRes.json();

      const match = datingData.match;

      document.getElementById("dating").innerHTML = `
        <h3>Dating Match</h3>
        ${match
          ? `<p>${match.name} (${match.score}%)</p><p>${match.reason}</p>`
          : `<p>No match found</p>`
        }
      `;

    } catch (err) {
      console.error("❌ Match load error:", err);
    }
  }

});