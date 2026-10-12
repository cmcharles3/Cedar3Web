// --- DATA OBJECTS & ARRAYS ---
const companyServices = [
  {
    id: 1,
    title: "Multifunction Printer Repair",
    category: "printer",
    description: "Expert diagnostics and repairs for major printer brands including HP, Canon, Epson, and Brother."
  },
  {
    id: 2,
    title: "Printhead & Maintenance Servicing",
    category: "printer",
    description: "Cleaning, replacement, and troubleshooting of faulty printheads and maintenance boxes."
  },
  {
    id: 3,
    title: "Computer Hardware Support",
    category: "it",
    description: "Desktop and laptop component diagnostics, RAM/storage upgrades, and power supply checks."
  },
  {
    id: 4,
    title: "Office Equipment Consultancy",
    category: "it",
    description: "Professional advice on office printing fleets, cost optimization, and secure setup."
  }
];

// --- FUNCTION 1: Render Services with Array Methods & Template Literals ---
function displayServices(servicesToDisplay) {
  const container = document.querySelector("#services-container");
  if (!container) return;

  // Clear existing content safely
  container.innerHTML = "";

  // Use array method (.forEach) and EXCLUSIVE template literals (``)
  servicesToDisplay.forEach(service => {
    const cardHTML = `
      <div class="card">
        <h3>${service.title}</h3>
        <p>${service.description}</p>
        <p><strong>Category:</strong> ${service.category.toUpperCase()}</p>
      </div>
    `;
    container.innerHTML += cardHTML;
  });
}

// --- FUNCTION 2: Handle LocalStorage Visitor Greeting ---
function handleVisitorSession() {
  const welcomeMsg = document.querySelector("#welcome-message");
  if (!welcomeMsg) return;

  let visitorName = localStorage.getItem("cedar3_visitor");
  
  if (!visitorName) {
    visitorName = prompt("Welcome to Cedar3 Technology! Please enter your name:") || "Valued Client";
    localStorage.setItem("cedar3_visitor", visitorName);
  }

  // Conditional Branching based on name status
  if (visitorName === "Valued Client") {
    welcomeMsg.innerHTML = `Welcome back, guest! Reach out to us for all your office equipment needs.`;
  } else {
    welcomeMsg.innerHTML = `Welcome back, <strong>${visitorName}</strong>! Ready to service your office printers and IT hardware today.`;
  }
}

// --- FUNCTION 3: Setup Interactive Estimator (Conditional Branching & DOM) ---
function setupEstimator() {
  const selectElem = document.querySelector("#estimator-select");
  const resultElem = document.querySelector("#estimator-result");
  
  if (!selectElem || !resultElem) return;

  selectElem.addEventListener("change", (event) => {
    const selectedVal = event.target.value;
    let turnaroundTime = "";

    // Conditional Branching
    if (selectedVal === "printer") {
      turnaroundTime = "Estimated Turnaround: 24 to 48 hours for full diagnostic and repair quote.";
    } else if (selectedVal === "it") {
      turnaroundTime = "Estimated Turnaround: 1 to 3 business days depending on component availability.";
    } else if (selectedVal === "maintenance") {
      turnaroundTime = "Estimated Turnaround: Same-day booking or scheduled on-site maintenance.";
    } else {
      turnaroundTime = "Please select a service type above.";
    }

    // Template literals for output string building
    resultElem.innerHTML = `${turnaroundTime}`;
  });
}

// --- FUNCTION 4: Handle Form Submission & LocalStorage Persistence ---
function setupContactForm() {
  const form = document.querySelector("#contact-form");
  const feedback = document.querySelector("#form-feedback");

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = {
      name: document.querySelector("#fullname").value,
      email: document.querySelector("#email").value,
      device: document.querySelector("#device").value,
      message: document.querySelector("#message").value,
      date: new Date().toLocaleDateString()
    };

    // Save submission to localStorage
    let existingRequests = JSON.parse(localStorage.getItem("cedar3_requests")) || [];
    existingRequests.push(formData);
    localStorage.setItem("cedar3_requests", JSON.stringify(existingRequests));

    // DOM Interaction & Template Literals
    feedback.innerHTML = `Thank you, <strong>${formData.name}</strong>! Your request regarding your <em>${formData.device}</em> has been successfully logged. We will contact you at ${formData.email}.`;
    
    form.reset();
  });
}

// --- INITIALIZATION & EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  handleVisitorSession();
  
  // Initialize service page rendering if container exists
  if (document.querySelector("#services-container")) {
    displayServices(companyServices);

    // Filter button event listeners with Array .filter() method
    document.querySelector("#filter-all")?.addEventListener("click", () => {
      displayServices(companyServices);
    });
    document.querySelector("#filter-printer")?.addEventListener("click", () => {
      const printerServices = companyServices.filter(s => s.category === "printer");
      displayServices(printerServices);
    });
    document.querySelector("#filter-it")?.addEventListener("click", () => {
      const itServices = companyServices.filter(s => s.category === "it");
      displayServices(itServices);
    });
  }

  setupEstimator();
  setupContactForm();
});