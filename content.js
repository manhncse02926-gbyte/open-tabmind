/* global chrome */

// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//     console.log("Received message in content script:", msg.type);
//   if (msg.type === "GET_BODY") {
//     const bodyText = document.body.innerText || "";
//     sendResponse({ body: bodyText });
//   }
// });

// console.log("🔥 content.js is living!");

// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   console.log("📩 content.js got message:", msg);
//   sendResponse({ msg: "👋 Hello from content.js!" });
// });
