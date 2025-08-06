import { Readability } from "@mozilla/readability";

function cleanHTMLContent(html) {
    if (!html) return "";
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.querySelectorAll("img, svg, picture, iframe, video, object, embed, i[class*='icon']").forEach(el => el.remove());
    return wrapper.innerHTML;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "READABILITY") {
        const docClone = document.cloneNode(true);
        const reader = new Readability(docClone);
        const article = reader.parse();
        const cleanContent = cleanHTMLContent(article?.content || '');
        const newArticle = {...article, content: cleanContent};
        sendResponse({
            type: "READABILITY",
            data: newArticle
        });

        return true;
    }

    return true;
});
