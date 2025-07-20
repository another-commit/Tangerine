if (!window.__replenishInjected) {
  window.__replenishInjected = true;

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("XMLHttpRequest.js");
  console.log(script.src);
  document.head.appendChild(script);

  window.addEventListener("message", (e) => {
    if (typeof e.data === "string" && e.data === "LOGOUT") {
      chrome.runtime.sendMessage("LOGOUT");
    }
  });
}
