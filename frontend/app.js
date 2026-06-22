const API_BASE = "https://products-list-5zgd.onrender.com";

const state = {
  limit: 12,
  category: "",
  pageStack: [{ cursor: null, nextCursor: null }],
  pageIndex: 0,
  isLoading: false,
  requestId: 0,
};

const elements = {
  categorySelect: document.getElementById("categorySelect"),
  productGrid: document.getElementById("productGrid"),
  prevButton: document.getElementById("prevButton"),
  nextButton: document.getElementById("nextButton"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  resultCount: document.getElementById("resultCount"),
  pageNumber: document.getElementById("pageNumber"),
  pageHint: document.getElementById("pageHint"),
};

function formatMoney(value) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return null;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  elements.loadingState.hidden = !isLoading;
  elements.prevButton.disabled = isLoading || state.pageIndex === 0;
  elements.nextButton.disabled =
    isLoading || !state.pageStack[state.pageIndex]?.nextCursor;
  elements.categorySelect.disabled = isLoading;
}

function setError(message) {
  elements.errorState.textContent = message;
  elements.errorState.hidden = !message;
}

function updateSummary(count) {
  elements.resultCount.textContent = `${count} product${count === 1 ? "" : "s"}`;
  elements.pageNumber.textContent = `Page ${state.pageIndex + 1}`;
  elements.pageHint.textContent = state.pageStack[state.pageIndex]?.nextCursor
    ? "More products available"
    : "End of results";
}

function getCardMarkup(product) {
  const name =
    product.name || product.title || `Product ${product.id ?? ""}`.trim();
  const category = product.category || "Uncategorized";
  const price = formatMoney(product.price);
  const description =
    product.description ||
    `ID ${product.id ?? "unknown"} | Updated ${product.updated_at ? new Date(product.updated_at).toLocaleDateString() : "recently"}`;

  return `
    <article class="card">
      <div class="card__top">
        <div>
          <h2>${name}</h2>
          <div class="meta">${price ? `<span>${price}</span>` : ""}</div>
        </div>
        <span class="badge">${category}</span>
      </div>
      <p class="description">${description}</p>
    </article>
  `;
}

function renderProducts(products, replace = true) {
  const markup = products.map(getCardMarkup).join("");

  if (replace) {
    elements.productGrid.innerHTML = markup;
  } else {
    elements.productGrid.insertAdjacentHTML("beforeend", markup);
  }

  updateSummary(elements.productGrid.children.length);
}

async function loadProducts({ reset = false } = {}) {
  const requestId = ++state.requestId;
  const category = elements.categorySelect.value;
  const currentPage = state.pageStack[state.pageIndex];

  if (reset) {
    state.pageStack = [{ cursor: null, nextCursor: null }];
    state.pageIndex = 0;
    elements.productGrid.innerHTML = "";
    setError("");
  }

  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(state.limit));

  if (category) {
    searchParams.set("category", category);
  }

  if (!reset && currentPage?.cursor) {
    searchParams.set("cursorUpdatedAt", currentPage.cursor.cursorUpdatedAt);
    searchParams.set("cursorId", String(currentPage.cursor.cursorId));
  }

  try {
    setLoading(true);
    setError("");

    const response = await fetch(
      `${API_BASE}/products?${searchParams.toString()}`,
    );

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || "Unable to load products.");
    }

    const payload = await response.json();

    if (requestId !== state.requestId) {
      return;
    }

    const products = Array.isArray(payload.data) ? payload.data : [];
    state.pageStack[state.pageIndex] = {
      cursor: currentPage?.cursor || null,
      nextCursor: payload.meta?.nextCursor || null,
    };

    renderProducts(products, true);
    elements.prevButton.disabled = state.pageIndex === 0;
    elements.nextButton.disabled = !state.pageStack[state.pageIndex].nextCursor;
    updateSummary(elements.productGrid.children.length);
  } catch (error) {
    if (requestId !== state.requestId) {
      return;
    }

    setError(error.message || "Something went wrong.");
    elements.nextButton.disabled = true;
    if (!elements.productGrid.children.length) {
      elements.pageHint.textContent = "No products loaded";
    }
  } finally {
    if (requestId === state.requestId) {
      setLoading(false);
    }
  }
}

elements.categorySelect.addEventListener("change", () => {
  loadProducts({ reset: true });
});

elements.prevButton.addEventListener("click", () => {
  if (state.isLoading || state.pageIndex === 0) {
    return;
  }

  state.pageIndex -= 1;
  elements.productGrid.innerHTML = "";
  loadProducts();
});

elements.nextButton.addEventListener("click", () => {
  const currentPage = state.pageStack[state.pageIndex];

  if (currentPage?.nextCursor && !state.isLoading) {
    state.pageIndex += 1;
    state.pageStack[state.pageIndex] = {
      cursor: currentPage.nextCursor,
      nextCursor: null,
    };
    elements.productGrid.innerHTML = "";
    loadProducts();
  }
});

loadProducts({ reset: true });
