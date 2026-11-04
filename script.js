
const STORAGE_KEY = "sariSariProData";

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return {
        products: Array.isArray(data.products) ? data.products : [],
        sales: Array.isArray(data.sales)
          ? data.sales.map(sale => ({ ...sale, date: new Date(sale.date) }))
          : []
      };
    }
  } catch (error) {
    console.error("Could not load saved data:", error);
  }
  return { products: [], sales: [] };
}

const savedData = loadData();
let products = savedData.products;
let sales = savedData.sales;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, sales }));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    alert("Unable to save data. Check your browser storage.");
    return false;
  }
}

function formatMoney(amount) {
  return "₱" + Number(amount || 0).toFixed(2);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showPage(pageId) {
  const page = document.getElementById(pageId);
  if (!page) return;

  document.querySelectorAll(".page").forEach(section => {
    section.hidden = section.id !== pageId;
  });

  if (pageId === "products") renderProducts();
  if (pageId === "sales") renderSales();
  if (pageId === "home") updateDashboard();
  if (pageId === "expiration") renderExpirationPage();
}

function navigateTo(pageId) {
  showPage(pageId);

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.remove("active");
  });

  const activeButton = document.querySelector(
    `.nav-btn[onclick*="'${pageId}'"]`
  );

  if (activeButton) activeButton.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// DASHBOARD
function updateDashboard() {
  const totalProducts = document.getElementById("totalProducts");
  const totalSalesElement = document.getElementById("totalSales");
  const todaySalesElement = document.getElementById("todaySales");

  if (totalProducts) totalProducts.textContent = products.length;

  const total = sales.reduce(
    (sum, sale) => sum + Number(sale.total || 0), 0
  );

  if (totalSalesElement) totalSalesElement.textContent = formatMoney(total);

  const today = new Date().toDateString();
  const todayTotal = sales
    .filter(sale => new Date(sale.date).toDateString() === today)
    .reduce((sum, sale) => sum + Number(sale.total || 0), 0);

  if (todaySalesElement) todaySalesElement.textContent = formatMoney(todayTotal);

  renderRecentSales();
  renderLowStock();
  renderExpirationAlerts();
}

// PRODUCTS
function renderProducts() {
  const list = document.getElementById("productList");
  if (!list) return;

  if (!products.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🛍️</div>
      <h4>No products yet</h4>
      <p>Add your first product using the Home dashboard.</p>
    </div>`;
    return;
  }

  list.innerHTML = "";

  products.forEach((product, index) => {
    const item = document.createElement("div");
    item.className = "product-item";

    item.innerHTML = `
      <div class="item-main">
        <div class="item-avatar">🛒</div>
        <div>
          <h3>${escapeHTML(product.name)}</h3>
          <p>Price: ${formatMoney(product.price)}</p>
          <p>Stock: ${Number(product.stock)}</p>
          <p>Expiration: ${product.expiryDate
            ? escapeHTML(product.expiryDate) : "No expiration date set"}</p>
        </div>
      </div>
      <div class="item-actions">
        <button class="action-btn record-btn" onclick="recordSale(${index})">Record Sale</button>
        <button class="action-btn edit-btn" onclick="editProduct(${index})">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteProduct(${index})">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

// SALES HISTORY
function renderSales() {
  const list = document.getElementById("salesList");
  if (!list) return;

  updatePOS();

  const count = document.getElementById("transactionCount");
  const totalElement = document.getElementById("salesPageTotal");

  if (count) count.textContent = sales.length;

  const total = sales.reduce(
    (sum, sale) => sum + Number(sale.total || 0), 0
  );
  if (totalElement) totalElement.textContent = formatMoney(total);

  if (!sales.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🧾</div>
      <h4>No sales recorded yet</h4>
      <p>Your recorded transactions will appear here.</p>
    </div>`;
    return;
  }

  list.innerHTML = "";
  [...sales].reverse().forEach(sale => {
    const item = document.createElement("div");
    item.className = "sale-item";
    item.innerHTML = `
      <div class="item-main">
        <div class="item-avatar">🧾</div>
        <div>
          <h3>${escapeHTML(sale.name)}</h3>
          <p>Quantity sold: ${Number(sale.quantity)}</p>
          <p>Date: ${escapeHTML(new Date(sale.date).toLocaleString())}</p>
        </div>
      </div>
      <strong class="sale-total">${formatMoney(sale.total)}</strong>
    `;
    list.appendChild(item);
  });
}

// RECENT SALES
function renderRecentSales() {
  const list = document.getElementById("recentSalesList");
  if (!list) return;

  if (!sales.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🧾</div>
      <h4>Your sales will appear here</h4>
      <p>Record a sale from your Products page to get started.</p>
      <button class="outline-btn" onclick="navigateTo('products')">
        Go to Products
      </button>
    </div>`;
    return;
  }

  list.innerHTML = "";
  sales.slice(-5).reverse().forEach(sale => {
    const item = document.createElement("div");
    item.className = "sale-item";
    item.innerHTML = `
      <div>
        <h3>${escapeHTML(sale.name)}</h3>
        <p>Quantity sold: ${Number(sale.quantity)}</p>
        <p>${escapeHTML(new Date(sale.date).toLocaleString())}</p>
      </div>
      <strong class="sale-total">${formatMoney(sale.total)}</strong>
    `;
    list.appendChild(item);
  });
}

// LOW STOCK
function renderLowStock() {
  const list = document.getElementById("lowStockList");
  const count = document.getElementById("lowStockCount");
  if (!list || !count) return;

  const lowStock = products.filter(product => Number(product.stock) <= 5);
  count.textContent = `${lowStock.length} item${lowStock.length === 1 ? "" : "s"}`;

  if (!lowStock.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🌱</div>
      <h4>All stocked up!</h4>
      <p>No products need restocking right now.</p>
    </div>`;
    return;
  }

  list.innerHTML = "";
  lowStock.forEach(product => {
    const item = document.createElement("div");
    item.className = "low-stock-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHTML(product.name)}</strong>
        <p>Only ${Number(product.stock)} left</p>
      </div>
      <span class="stock-warning">Low Stock</span>
    `;
    list.appendChild(item);
  });
}

// EXPIRATION HELPERS
function getExpirationStatus(dateString) {
  if (!dateString) return "No date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(dateString + "T00:00:00");
  if (Number.isNaN(expiry.getTime())) return "No date";

  const days = Math.ceil((expiry - today) / 86400000);

  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days <= 30) return "Expiring soon";
  return "Safe";
}

function getExpirationProducts() {
  return products.filter(product => {
    const status = getExpirationStatus(product.expiryDate);
    return status === "Expired" ||
      status === "Expires today" ||
      status === "Expiring soon";
  }).sort((a, b) =>
    new Date(a.expiryDate) - new Date(b.expiryDate)
  );
}

function expirationRow(product) {
  const status = getExpirationStatus(product.expiryDate);
  const className = status === "Expired" ? "expired" :
    status === "Safe" ? "safe" : "expiring";

  return `
    <div class="expiration-item">
      <div>
        <strong>${escapeHTML(product.name)}</strong>
        <p>Expiration date: ${escapeHTML(product.expiryDate || "Not set")}</p>
      </div>
      <span class="expiration-status ${className}">${status}</span>
    </div>
  `;
}

function renderExpirationAlerts() {
  const list = document.getElementById("expirationAlerts");
  const count = document.getElementById("expirationCount");
  if (!list || !count) return;

  const alerts = getExpirationProducts();
  count.textContent = `${alerts.length} item${alerts.length === 1 ? "" : "s"}`;

  if (!alerts.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🌿</div>
      <h4>No expiration alerts</h4>
      <p>No products are expired or nearing expiration within 30 days.</p>
    </div>`;
    return;
  }

  list.innerHTML = alerts.map(expirationRow).join("");
}

function renderExpirationPage() {
  const list = document.getElementById("expirationList");
  if (!list) return;

  const datedProducts = products.filter(product => product.expiryDate);

  if (!datedProducts.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📅</div>
      <h4>No expiration dates yet</h4>
      <p>Add an expiration date when adding or editing a product.</p>
    </div>`;
    return;
  }

  list.innerHTML = datedProducts
    .slice()
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    .map(expirationRow).join("");
}

// ADD PRODUCT
const productForm = document.getElementById("productForm");

if (productForm) {
  productForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const expiryDate = document.getElementById("productExpiry").value;
    const price = Number(document.getElementById("productPrice").value);
    const stock = Number(document.getElementById("productStock").value);

    if (!name || !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(stock) || stock < 0) {
      alert("Enter a valid name, price, and stock quantity.");
      return;
    }

    const newProduct = { name, price, stock, expiryDate };
    products.push(newProduct);

    if (!saveData()) {
      products.pop();
      return;
    }

    this.reset();
    renderProducts();
    updateDashboard();
    renderExpirationPage();
    alert("Product added successfully!");
  });
}

// EDIT PRODUCT
function editProduct(index) {
  const product = products[index];
  if (!product) return;

  const nameInput = prompt("Product name:", product.name);
  if (nameInput === null) return;
  const name = nameInput.trim();
  if (!name) return alert("Product name cannot be empty.");

  const priceInput = prompt("Price:", String(product.price));
  if (priceInput === null) return;
  const price = Number(priceInput);
  if (!Number.isFinite(price) || price <= 0)
    return alert("Price must be greater than zero.");

  const stockInput = prompt("Stock quantity:", String(product.stock));
  if (stockInput === null) return;
  const stock = Number(stockInput);
  if (!Number.isInteger(stock) || stock < 0)
    return alert("Stock must be a whole number, zero or higher.");

  const expiryInput = prompt(
    "Expiration date (YYYY-MM-DD). Leave blank if none:",
    product.expiryDate || ""
  );
  if (expiryInput === null) return;

  if (expiryInput.trim() &&
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryInput.trim())) {
    return alert("Use the date format YYYY-MM-DD.");
  }

  const oldProduct = { ...product };
  Object.assign(product, {
    name,
    price,
    stock,
    expiryDate: expiryInput.trim()
  });

  if (!saveData()) {
    Object.assign(product, oldProduct);
    return;
  }

  renderProducts();
  updateDashboard();
  renderExpirationPage();
  alert("Product updated successfully!");
}

// DELETE PRODUCT
function deleteProduct(index) {
  if (!products[index] || !confirm("Delete this product?")) return;

  const deleted = products.splice(index, 1)[0];
  if (!saveData()) {
    products.splice(index, 0, deleted);
    return;
  }

  renderProducts();
  updateDashboard();
  renderExpirationPage();
  alert("Product deleted.");
}


// POINT OF SALE - CASHIER SYSTEM

function updatePOS() {
  const productSelect = document.getElementById("posProduct");
  if (!productSelect) return;

  const previousValue = productSelect.value;

  productSelect.innerHTML =
    '<option value="">Choose a product</option>';

  products.forEach((product, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent =
  `${product.name} - ${formatMoney(product.price)} (${Number(product.stock)} left)`;
    productSelect.appendChild(option);
  });

  if (
    previousValue !== "" &&
    products[Number(previousValue)]
  ) {
    productSelect.value = previousValue;
  }

  updatePOSDetails();
}

function updatePOSDetails() {
  const productSelect = document.getElementById("posProduct");
  const quantitySelect = document.getElementById("posQuantity");
  const unitPrice = document.getElementById("posUnitPrice");
  const totalDisplay = document.getElementById("posTotal");

  if (!productSelect || !quantitySelect ||
      !unitPrice || !totalDisplay) return;

  const index = productSelect.value;
  const product = index === "" ? null : products[Number(index)];

  quantitySelect.innerHTML =
    '<option value="">Select quantity</option>';

  unitPrice.textContent = formatMoney(product?.price || 0);
  totalDisplay.textContent = formatMoney(0);

  if (!product || Number(product.stock) <= 0) {
    quantitySelect.disabled = true;

    if (product) {
      quantitySelect.innerHTML =
        '<option value="">Out of stock</option>';
    }

    return;
  }

  quantitySelect.disabled = false;

  for (let i = 1; i <= Number(product.stock); i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    quantitySelect.appendChild(option);
  }
}

const posProduct = document.getElementById("posProduct");
const posQuantity = document.getElementById("posQuantity");
const posForm = document.getElementById("posForm");

if (posProduct) {
  posProduct.addEventListener("change", updatePOSDetails);
}

if (posQuantity) {
  posQuantity.addEventListener("change", function() {
    const product = products[Number(posProduct.value)];
    const quantity = Number(this.value);

    const total = product && quantity > 0
      ? Number(product.price) * quantity
      : 0;

    document.getElementById("posTotal").textContent =
      formatMoney(total);
  });
}

if (posForm) {
  posForm.addEventListener("submit", function(event) {
    event.preventDefault();

        const selectedValue = posProduct.value;

    if (selectedValue === "") {
      alert("Please select a product first.");
      return;
    }

    const productIndex = Number(selectedValue);
    const product = products[productIndex];
    const quantity = Number(posQuantity.value);
    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > Number(product.stock)
    ) {
      alert("Please select a valid product and quantity.");
      return;
    }

    const previousStock = product.stock;
    const total = Number(product.price) * quantity;

    product.stock = Number(product.stock) - quantity;

    sales.push({
      name: product.name,
      quantity: quantity,
      total: total,
      date: new Date()
    });

    if (!saveData()) {
      product.stock = previousStock;
      sales.pop();
      return;
    }

    this.reset();

    updatePOS();
    renderProducts();
    renderSales();
    updateDashboard();
    renderExpirationPage();

    alert("Sale recorded successfully! Total: " + formatMoney(total));
  });
}

// RECORD SALE BUTTON IN PRODUCTS
function recordSale(index) {
  const product = products[index];

  if (!product || Number(product.stock) <= 0) {
    alert("This product is out of stock!");
    return;
  }

  navigateTo("sales");

  const productSelect = document.getElementById("posProduct");

  if (productSelect) {
    productSelect.value = String(index);
    updatePOSDetails();
  }
}


// =============================================
// NEW FEATURES: LOANS, REPORTS, SUPPLIERS
// =============================================

// LOAD NEW RECORDS WITHOUT AFFECTING OLD DATA
function loadExtraRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

    return {
      loans: Array.isArray(saved.loans) ? saved.loans : [],
      expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
      suppliers: Array.isArray(saved.suppliers) ? saved.suppliers : [],
      purchases: Array.isArray(saved.purchases) ? saved.purchases : []
    };
  } catch (error) {
    console.error("Could not load additional records:", error);
    return {
      loans: [],
      expenses: [],
      suppliers: [],
      purchases: []
    };
  }
}

const extraRecords = loadExtraRecords();

let loans = extraRecords.loans;
let expenses = extraRecords.expenses;
let suppliers = extraRecords.suppliers;
let purchases = extraRecords.purchases;


// SAVE ALL OLD AND NEW RECORDS
// This keeps the original sariSariProData storage key.
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products,
      sales,
      loans,
      expenses,
      suppliers,
      purchases
    }));

    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    alert("Unable to save data. Check your browser storage.");
    return false;
  }
}


// EXTEND PAGE NAVIGATION
function showPage(pageId) {
  const page = document.getElementById(pageId);
  if (!page) return;

  document.querySelectorAll(".page").forEach(section => {
    section.hidden = section.id !== pageId;
  });

  if (pageId === "products") renderProducts();
  if (pageId === "sales") renderSales();
  if (pageId === "home") updateDashboard();
  if (pageId === "expiration") renderExpirationPage();

  if (pageId === "loans") renderLoans();
  if (pageId === "reports") renderFinancialReport();
  if (pageId === "suppliers") renderSuppliers();
}


// =============================================
// AUTOMATIC RESTOCK REMINDER
// =============================================

function renderLowStock() {
  const list = document.getElementById("lowStockList");
  const count = document.getElementById("lowStockCount");

  if (!list || !count) return;

  const lowStock = products.filter(product =>
    Number(product.stock) <= 5
  );

  count.textContent =
    `${lowStock.length} item${lowStock.length === 1 ? "" : "s"}`;

  if (!lowStock.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <h4>All stocked up!</h4>
        <p>No products need restocking right now.</p>
      </div>`;
    return;
  }

  list.innerHTML = "";

  lowStock.forEach(product => {
    const item = document.createElement("div");
    item.className = "low-stock-item";

    item.innerHTML = `
      <div>
        <strong>${escapeHTML(product.name)}</strong>
        <p>Only ${Number(product.stock)} left</p>
        <p>Suggested restock: ${Math.max(0, 20 - Number(product.stock))} units</p>
      </div>

      <div class="feature-record-actions">
        <span class="stock-warning">Low Stock</span>
        <button class="action-btn restock-btn"
          onclick="startRestock('${escapeHTML(product.name).replace(/'/g, '&#39;')}')">
          Restock
        </button>
      </div>
    `;

    list.appendChild(item);
  });
}

function startRestock(productName) {
  navigateTo("suppliers");

  const productInput = document.getElementById("purchaseProduct");

  if (productInput) {
    productInput.value = productName;
    productInput.focus();
  }
}


// =============================================
// LOAN / PAUTANG
// =============================================

const loanForm = document.getElementById("loanForm");

if (loanForm) {
  loanForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const customer = document.getElementById("loanCustomer").value.trim();
    const amount = Number(document.getElementById("loanAmount").value);
    const dueDate = document.getElementById("loanDue").value;

    if (!customer || !Number.isFinite(amount) ||
        amount <= 0 || !dueDate) {
      alert("Please enter valid loan information.");
      return;
    }

    const loan = {
      id: Date.now(),
      customer,
      amount,
      dueDate,
      status: "Unpaid",
      date: new Date().toISOString()
    };

    loans.push(loan);

    if (!saveData()) {
      loans.pop();
      return;
    }

    this.reset();
    renderLoans();

    alert("Loan record saved successfully!");
  });
}

function renderLoans() {
  const list = document.getElementById("loanList");
  if (!list) return;

  if (!loans.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💳</div>
        <h4>No loan records yet</h4>
        <p>Customer loans will appear here.</p>
      </div>`;
    return;
  }

  list.innerHTML = "";

  [...loans].reverse().forEach(loan => {
    const item = document.createElement("div");
    item.className = "feature-record";

    item.innerHTML = `
      <div class="feature-record-info">
        <h3>${escapeHTML(loan.customer)}</h3>
        <p>Amount: ${formatMoney(loan.amount)}</p>
        <p>Due date: ${escapeHTML(loan.dueDate)}</p>
        <span class="payment-status ${
          loan.status === "Paid" ? "payment-paid" : "payment-unpaid"
        }">${escapeHTML(loan.status)}</span>
      </div>

      <div class="feature-record-actions">
        ${loan.status === "Unpaid" ? `
          <button class="action-btn record-btn"
            onclick="markLoanPaid(${Number(loan.id)})">
            Mark Paid
          </button>
        ` : ""}

        <button class="action-btn delete-btn"
          onclick="deleteLoan(${Number(loan.id)})">
          Delete
        </button>
      </div>
    `;

    list.appendChild(item);
  });
}

function markLoanPaid(id) {
  const loan = loans.find(item => item.id === id);
  if (!loan || loan.status === "Paid") return;

  loan.status = "Paid";

  if (!saveData()) {
    loan.status = "Unpaid";
    return;
  }

  renderLoans();
  alert("Loan marked as paid!");
}

function deleteLoan(id) {
  const index = loans.findIndex(item => item.id === id);
  if (index < 0 || !confirm("Delete this loan record?")) return;

  const deleted = loans.splice(index, 1)[0];

  if (!saveData()) {
    loans.splice(index, 0, deleted);
    return;
  }

  renderLoans();
}


// =============================================
// EXPENSES AND FINANCIAL REPORT
// =============================================

const expenseForm = document.getElementById("expenseForm");

if (expenseForm) {
  expenseForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const description =
      document.getElementById("expenseDescription").value.trim();

    const amount =
      Number(document.getElementById("expenseAmount").value);

    const date =
      document.getElementById("expenseDate").value;

    if (!description || !Number.isFinite(amount) ||
        amount <= 0 || !date) {
      alert("Please enter valid expense information.");
      return;
    }

    const expense = {
      id: Date.now(),
      description,
      amount,
      date
    };

    expenses.push(expense);

    if (!saveData()) {
      expenses.pop();
      return;
    }

    this.reset();
    renderFinancialReport();

    alert("Expense recorded successfully!");
  });
}

function renderFinancialReport() {
  const revenueDisplay = document.getElementById("reportRevenue");
  const expensesDisplay = document.getElementById("reportExpenses");
  const profitDisplay = document.getElementById("reportProfit");
  const expenseList = document.getElementById("expenseList");
  const notice = document.getElementById("profitNotice");

  const revenue = sales.reduce(
    (sum, sale) => sum + Number(sale.total || 0), 0
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0), 0
  );

  // This is revenue minus recorded expenses.
  // Product purchase costs are not fully included in this estimate.
  const estimatedProfit = revenue - totalExpenses;

  if (revenueDisplay) {
    revenueDisplay.textContent = formatMoney(revenue);
  }

  if (expensesDisplay) {
    expensesDisplay.textContent = formatMoney(totalExpenses);
  }

  if (profitDisplay) {
    profitDisplay.textContent = formatMoney(estimatedProfit);
    profitDisplay.classList.toggle(
      "report-profit-negative",
      estimatedProfit < 0
    );
    profitDisplay.classList.toggle(
      "report-profit-positive",
      estimatedProfit >= 0
    );
  }

  if (notice) {
    notice.textContent =
      "Note: This is an estimate based on recorded sales and expenses. " +
      "It does not yet deduct the full cost of products sold.";
  }

  if (!expenseList) return;

  if (!expenses.length) {
    expenseList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <h4>No expenses recorded</h4>
        <p>Your store expenses will appear here.</p>
      </div>`;
    return;
  }

  expenseList.innerHTML = "";

  [...expenses].reverse().forEach(expense => {
    const item = document.createElement("div");
    item.className = "feature-record";

    item.innerHTML = `
      <div class="feature-record-info">
        <h3>${escapeHTML(expense.description)}</h3>
        <p>Date: ${escapeHTML(expense.date)}</p>
      </div>

      <div class="feature-record-actions">
        <strong class="sale-total">${formatMoney(expense.amount)}</strong>
        <button class="action-btn delete-btn"
          onclick="deleteExpense(${Number(expense.id)})">
          Delete
        </button>
      </div>
    `;

    expenseList.appendChild(item);
  });
}

function deleteExpense(id) {
  const index = expenses.findIndex(item => item.id === id);
  if (index < 0 || !confirm("Delete this expense?")) return;

  const deleted = expenses.splice(index, 1)[0];

  if (!saveData()) {
    expenses.splice(index, 0, deleted);
    return;
  }

  renderFinancialReport();
}


// =============================================
// SUPPLIER ACCOUNTS
// =============================================

const supplierForm = document.getElementById("supplierForm");

if (supplierForm) {
  supplierForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("supplierName").value.trim();
    const contact = document.getElementById("supplierContact").value.trim();

    if (!name) {
      alert("Please enter a supplier name.");
      return;
    }

    const supplier = {
      id: Date.now(),
      name,
      contact
    };

    suppliers.push(supplier);

    if (!saveData()) {
      suppliers.pop();
      return;
    }

    this.reset();
    renderSuppliers();

    alert("Supplier added successfully!");
  });
}


// UPDATE SUPPLIER DROPDOWN
function updateSupplierDropdown() {
  const select = document.getElementById("purchaseSupplier");
  if (!select) return;

  const previousValue = select.value;

  select.innerHTML = '<option value="">Choose supplier</option>';

  suppliers.forEach(supplier => {
    const option = document.createElement("option");
    option.value = supplier.id;
    option.textContent = supplier.name;
    select.appendChild(option);
  });

  if (suppliers.some(supplier =>
    String(supplier.id) === previousValue
  )) {
    select.value = previousValue;
  }
}


// RECORD PURCHASE
const purchaseForm = document.getElementById("purchaseForm");

if (purchaseForm) {
  purchaseForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const supplierId =
      Number(document.getElementById("purchaseSupplier").value);

    const supplier = suppliers.find(item => item.id === supplierId);

    const productName =
      document.getElementById("purchaseProduct").value.trim();

    const quantity =
      Number(document.getElementById("purchaseQuantity").value);

    const unitCost =
      Number(document.getElementById("purchaseCost").value);

    const status =
      document.getElementById("purchaseStatus").value;

    if (!supplier || !productName ||
        !Number.isInteger(quantity) || quantity <= 0 ||
        !Number.isFinite(unitCost) || unitCost <= 0 ||
        !["Paid", "Unpaid"].includes(status)) {
      alert("Please complete all purchase details correctly.");
      return;
    }

    const purchase = {
      id: Date.now(),
      supplierId,
      supplierName: supplier.name,
      productName,
      quantity,
      unitCost,
      total: quantity * unitCost,
      status,
      date: new Date().toISOString()
    };

    // Add stock to an existing matching product.
    const matchingProduct = products.find(product =>
      product.name.trim().toLowerCase() === productName.toLowerCase()
    );

    let oldStock;
    let oldCost;

    if (matchingProduct) {
      oldStock = matchingProduct.stock;
      oldCost = matchingProduct.costPrice;

      matchingProduct.stock =
        Number(matchingProduct.stock) + quantity;

      matchingProduct.costPrice = unitCost;
    }

    purchases.push(purchase);

    if (!saveData()) {
      purchases.pop();

      if (matchingProduct) {
        matchingProduct.stock = oldStock;

        if (oldCost === undefined) {
          delete matchingProduct.costPrice;
        } else {
          matchingProduct.costPrice = oldCost;
        }
      }

      return;
    }

    this.reset();

    renderSuppliers();
    renderProducts();
    updateDashboard();

    alert(
      matchingProduct
        ? "Purchase saved and existing product stock updated!"
        : "Purchase saved! Add the product to your inventory separately if it is a new item."
    );
  });
}


// DISPLAY SUPPLIERS AND PURCHASES
function renderSuppliers() {
  const supplierList = document.getElementById("supplierList");
  const purchaseList = document.getElementById("purchaseList");

  updateSupplierDropdown();

  if (supplierList) {
    if (!suppliers.length) {
      supplierList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏪</div>
          <h4>No suppliers yet</h4>
          <p>Add your supplier information above.</p>
        </div>`;
    } else {
      supplierList.innerHTML = "";

      suppliers.forEach(supplier => {
        const supplierPurchases = purchases.filter(
          purchase => purchase.supplierId === supplier.id
        );

        const unpaid = supplierPurchases
          .filter(purchase => purchase.status === "Unpaid")
          .reduce((sum, purchase) => sum + Number(purchase.total), 0);

        const item = document.createElement("div");
        item.className = "feature-record";

        item.innerHTML = `
          <div class="feature-record-info">
            <h3>${escapeHTML(supplier.name)}</h3>
            <p>Contact: ${escapeHTML(supplier.contact || "Not provided")}</p>
            <p>Total purchases: ${supplierPurchases.length}</p>
            <p>Unpaid balance: ${formatMoney(unpaid)}</p>
          </div>
        `;

        supplierList.appendChild(item);
      });
    }
  }

  if (purchaseList) {
    if (!purchases.length) {
      purchaseList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <h4>No purchases yet</h4>
          <p>Your supplier purchases will appear here.</p>
        </div>`;
    } else {
      purchaseList.innerHTML = "";

      [...purchases].reverse().forEach(purchase => {
        const item = document.createElement("div");
        item.className = "feature-record";

        item.innerHTML = `
          <div class="feature-record-info">
            <h3>${escapeHTML(purchase.productName)}</h3>
            <p>Supplier: ${escapeHTML(purchase.supplierName)}</p>
            <p>Quantity: ${Number(purchase.quantity)}</p>
            <p>Unit cost: ${formatMoney(purchase.unitCost)}</p>
            <p>Total: ${formatMoney(purchase.total)}</p>
            <p>Date: ${escapeHTML(new Date(purchase.date).toLocaleString())}</p>
            <span class="payment-status ${
              purchase.status === "Paid"
                ? "payment-paid"
                : "payment-unpaid"
            }">${escapeHTML(purchase.status)}</span>
          </div>

          <div class="feature-record-actions">
            ${purchase.status === "Unpaid" ? `
              <button class="action-btn record-btn"
                onclick="markPurchasePaid(${Number(purchase.id)})">
                Mark Paid
              </button>
            ` : ""}
          </div>
        `;

        purchaseList.appendChild(item);
      });
    }
  }
}


// MARK SUPPLIER PURCHASE AS PAID
function markPurchasePaid(id) {
  const purchase = purchases.find(item => item.id === id);

  if (!purchase || purchase.status === "Paid") return;

  purchase.status = "Paid";

  if (!saveData()) {
    purchase.status = "Unpaid";
    return;
  }

  renderSuppliers();
  alert("Supplier payment marked as paid!");
}


// INITIALIZE NEW FEATURES
renderLoans();
renderFinancialReport();
renderSuppliers();

// =============================================
// DASHBOARD CHARTS
// =============================================

function getChartDateKey(value) {
  if (!value) return null;

  const dateText = String(value);

  // Date-only values are kept in their original local date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return dateText;
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getLastSevenDays() {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i
    );

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    days.push({
      key: `${year}-${month}-${day}`,
      label: date.toLocaleDateString("en-US", {
        weekday: "short"
      })
    });
  }

  return days;
}


function createChartBars(containerId, items, formatter) {
  const container = document.getElementById(containerId);

  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="chart-empty">
        No records available yet.
      </div>`;
    return;
  }

  const maximum = Math.max(
    ...items.map(item => Number(item.value) || 0),
    1
  );

  container.innerHTML = items.map(item => {
    const value = Number(item.value) || 0;

    const percentage = Math.max(
      0,
      Math.min(100, (value / maximum) * 100)
    );

    return `
      <div class="chart-bar-row">

        <span class="chart-bar-label"
          title="${escapeHTML(item.label)}">
          ${escapeHTML(item.label)}
        </span>

        <div class="chart-bar-track">
          <div class="chart-bar-fill"
            style="width: ${percentage}%">
          </div>
        </div>

        <span class="chart-bar-value">
          ${formatter(value)}
        </span>

      </div>
    `;
  }).join("");
}


// SALES OVERVIEW
function renderSalesChart() {
  const days = getLastSevenDays();

  const totals = {};

  days.forEach(day => {
    totals[day.key] = 0;
  });

  sales.forEach(sale => {
    const dateKey = getChartDateKey(sale.date);

    if (dateKey && Object.prototype.hasOwnProperty.call(totals, dateKey)) {
      totals[dateKey] += Number(sale.total) || 0;
    }
  });

  const items = days.map(day => ({
    label: day.label,
    value: totals[day.key]
  }));

  createChartBars(
    "salesChart",
    items,
    value => formatMoney(value)
  );
}


// TOP-SELLING PRODUCTS
function renderTopProductsChart() {
  const productTotals = {};

  sales.forEach(sale => {
    const name = sale.name || sale.productName || "Unknown Product";
    const quantity = Number(sale.quantity) || 0;

    productTotals[name] =
      (productTotals[name] || 0) + quantity;
  });

  const items = Object.entries(productTotals)
    .map(([name, quantity]) => ({
      label: name,
      value: quantity
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  createChartBars(
    "topProductsChart",
    items,
    value => `${value} sold`
  );
}


// EXPENSE OVERVIEW
function renderExpenseChart() {
  const days = getLastSevenDays();

  const totals = {};

  days.forEach(day => {
    totals[day.key] = 0;
  });

  expenses.forEach(expense => {
    const dateKey = getChartDateKey(expense.date);

    if (dateKey && Object.prototype.hasOwnProperty.call(totals, dateKey)) {
      totals[dateKey] += Number(expense.amount) || 0;
    }
  });

  const items = days.map(day => ({
    label: day.label,
    value: totals[day.key]
  }));

  createChartBars(
    "expenseChart",
    items,
    value => formatMoney(value)
  );
}


// REFRESH ALL DASHBOARD CHARTS
function renderDashboardCharts() {
  renderSalesChart();
  renderTopProductsChart();
  renderExpenseChart();
}


// AUTOMATICALLY REFRESH CHARTS AFTER SAVING DATA
const originalSaveDataForCharts = saveData;

saveData = function() {
  const result = originalSaveDataForCharts();

  if (result !== false) {
    renderDashboardCharts();
  }

  return result;
};


// INITIAL CHART DISPLAY
renderDashboardCharts();