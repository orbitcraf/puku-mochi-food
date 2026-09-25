"use strict";

const pages = [...document.querySelectorAll(".page")];
const viewport = document.getElementById("book-viewport");
const previousButton = document.getElementById("page-prev");
const nextButton = document.getElementById("page-next");
const pageStatus = document.getElementById("page-status");
const pageDots = document.getElementById("page-dots");
const pageAnnouncement = document.getElementById("page-announcement");
const pageIndexById = new Map(pages.map((page, index) => [page.dataset.pageId, index]));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let currentPage = 0;
let transitionTimer = 0;
let swipeStart = null;

function titleFor(page) {
  return page.querySelector("[data-page-title]")?.textContent.trim() || "ページ";
}

function pageFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#page-/, ""));
  return pageIndexById.has(id) ? pageIndexById.get(id) : 0;
}

function setActivePage(index, { updateHistory = true, focus = true } = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= pages.length || index === currentPage) return;
  const oldPage = pages[currentPage];
  const newPage = pages[index];
  const direction = index > currentPage ? "next" : "previous";

  window.clearTimeout(transitionTimer);
  oldPage.classList.remove("is-active", "is-entering-next", "is-entering-previous");
  oldPage.classList.add(`is-leaving-${direction}`);
  oldPage.setAttribute("aria-hidden", "true");
  oldPage.inert = true;

  newPage.classList.remove("is-leaving-next", "is-leaving-previous");
  newPage.classList.add("is-active", `is-entering-${direction}`);
  newPage.setAttribute("aria-hidden", "false");
  newPage.inert = false;
  currentPage = index;

  updateControls();
  preloadNearby(index);
  if (updateHistory) history.pushState({ page: newPage.dataset.pageId }, "", `#page-${newPage.dataset.pageId}`);
  pageAnnouncement.textContent = `${index + 1}ページ、${titleFor(newPage)}`;

  transitionTimer = window.setTimeout(() => {
    oldPage.classList.remove("is-leaving-next", "is-leaving-previous");
    newPage.classList.remove("is-entering-next", "is-entering-previous");
    if (focus) newPage.querySelector("[data-page-title]")?.focus({ preventScroll: true });
  }, reducedMotion.matches ? 20 : 480);
}

function updateControls() {
  previousButton.disabled = currentPage === 0;
  nextButton.disabled = currentPage === pages.length - 1;
  pageStatus.innerHTML = `<b>${currentPage + 1}</b> / ${pages.length}`;
  previousButton.setAttribute("aria-label", currentPage ? `前のページ、${titleFor(pages[currentPage - 1])}へ` : "前のページはありません");
  nextButton.setAttribute("aria-label", currentPage < pages.length - 1 ? `次のページ、${titleFor(pages[currentPage + 1])}へ` : "次のページはありません");
  [...pageDots.children].forEach((dot, index) => {
    const active = index === currentPage;
    dot.classList.toggle("is-current", active);
    dot.setAttribute("aria-current", active ? "page" : "false");
  });
}

function preloadNearby(index) {
  [index - 1, index, index + 1].forEach((nearby) => {
    const image = pages[nearby]?.querySelector("img");
    if (!image) return;
    image.loading = "eager";
    if (!image.complete) new Image().src = image.currentSrc || image.src;
  });
}

function initialize() {
  pageDots.replaceChildren(...pages.map((page, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${index + 1}ページ、${titleFor(page)}へ`);
    button.addEventListener("click", () => setActivePage(index));
    return button;
  }));

  currentPage = pageFromHash();
  pages.forEach((page, index) => {
    const active = index === currentPage;
    page.classList.toggle("is-active", active);
    page.setAttribute("aria-hidden", String(!active));
    page.inert = !active;
    page.querySelectorAll("img").forEach((image) => { image.draggable = false; });
  });
  updateControls();
  preloadNearby(currentPage);
  history.replaceState({ page: pages[currentPage].dataset.pageId }, "", `#page-${pages[currentPage].dataset.pageId}`);
}

previousButton.addEventListener("click", () => setActivePage(currentPage - 1));
nextButton.addEventListener("click", () => setActivePage(currentPage + 1));
document.querySelectorAll("[data-go-next]").forEach((button) => button.addEventListener("click", () => setActivePage(currentPage + 1)));
document.querySelectorAll("[data-go-page]").forEach((button) => button.addEventListener("click", () => setActivePage(pageIndexById.get(button.dataset.goPage))));

window.addEventListener("popstate", () => setActivePage(pageFromHash(), { updateHistory: false, focus: false }));
window.addEventListener("hashchange", () => setActivePage(pageFromHash(), { updateHistory: false, focus: false }));
document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowRight") { event.preventDefault(); setActivePage(currentPage + 1); }
  if (event.key === "ArrowLeft") { event.preventDefault(); setActivePage(currentPage - 1); }
  if (event.key === "Home") { event.preventDefault(); setActivePage(0); }
  if (event.key === "End") { event.preventDefault(); setActivePage(pages.length - 1); }
});

viewport.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0 || event.target.closest("button, a")) return;
  swipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
viewport.addEventListener("pointercancel", () => { swipeStart = null; });
viewport.addEventListener("pointerup", (event) => {
  if (!swipeStart || swipeStart.id !== event.pointerId) return;
  const deltaX = event.clientX - swipeStart.x;
  const deltaY = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
  setActivePage(currentPage + (deltaX < 0 ? 1 : -1));
});

initialize();
