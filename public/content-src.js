// content-src.js
import { Readability } from "@mozilla/readability";

const docClone = document.cloneNode(true);
const article = new Readability(docClone).parse();
function cleanHTMLContent(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  // Remove unwanted elements
  wrapper.querySelectorAll("img, svg, picture, iframe, video, object, embed, i[class*='icon']").forEach(el => el.remove());

  return wrapper.innerHTML;
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "READABILITY") {
    const cleanContent = cleanHTMLContent(article?.content || "");
    const dataResonse = {
      title: article.title,
      content: cleanContent,
      textContent: article?.textContent,
      excerpt: article?.excerpt
    };
    sendResponse({ type: "READABILITY", data: dataResonse});
  }
});
