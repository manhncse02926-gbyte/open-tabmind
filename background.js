/* global chrome */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('page.html')
  });
});
//  function  getCleanHTMLBody(url) {

//   const clonedBody = document.body.cloneNode(true);

//   // keep style and header instead of remove
//   clonedBody.querySelectorAll('footer, nav, script, iframe, img, image, noscript, [autofocus], video, fencedframe, input, svg')
//     .forEach(el => el.remove());


//   clonedBody.querySelectorAll('*').forEach(el => el.removeAttribute('style'));

//   clonedBody.querySelectorAll('button').forEach(button => {
//     const text = button.textContent;
//     const div = document.createElement('div');
//     div.textContent = text;
//     button.replaceWith(div);
//   });
//   clonedBody.querySelectorAll('textarea').forEach(el => {
//     if (!el.value.trim() && !el.textContent.trim()) {
//       el.remove();
//     }
//   });

//   clonedBody.style.position = 'absolute';
//   clonedBody.style.left = '-9999px';
//   document.body.appendChild(clonedBody);

//   const isHidden = el => {
//     const style = window.getComputedStyle(el);
//     return (
//       style.display === 'none' ||
//       style.visibility === 'hidden' ||
//       style.opacity === '0'
//     );
//   };

//   Array.from(clonedBody.querySelectorAll('*')).forEach(el => {
//     if (isHidden(el)) {
//       el.remove();
//     }
//   });

//   clonedBody.remove();

//   const finalClone = clonedBody.cloneNode(true);
//   return finalClone.innerHTML.trim();
// }

async function getCleanHTMLBody(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return "";
    let bodyContent = bodyMatch[1];
    bodyContent = bodyContent.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, "");
    return bodyContent;
  } catch (err) {
    console.error("Error fetching or cleaning body:", err);
    return null;
  }
}



chrome.runtime.onMessage.addListener(async (message, tabs) => {
  if (message.type === "OPEN_TAB") {
    chrome.tabs.create({
      url: message.url
    });
    return;
  }
  if (message.type === "STORE_DATA") {
    // console.log("tabstabstabstabstabs: ", tabs.url);
      
    const {
      today,
      rootDomain,
      url,
    } = message;
    if(!url || url.startsWith("chrome-extension://") || url.startsWith("chrome://")){
      console.log("ignore: ", url);
      return;
    }
    console.log("action store data on background.js for url: ", url);
    const visibleContent = await getCleanHTMLBody(message.url);

    //  chrome.storage.local.get(["tabContents", "dateList", "sitesData"], (result) => {
    //    const existing = result.tabContents || {};
    //    console.log("result.sitesData: ", result.sitesData);
    //    console.log("result.dateList: ", result.dateList);
    //    const dropdownDate = new Set();
    //    const sitesData =  new Set();
    //    const timestamp = Date.now().toString();
    //    const today = new Date().toISOString().split('T')[0];
    //    sitesData.add(rootDomain);
    //    dropdownDate.add(today);

    //    existing[url + "/date-"+today] = {
    //      time: timestamp,
    //      rootDomain,
    //      url,
    //      content: visibleContent
    //    };
    //    chrome.storage.local.set({
    //      tabContents: existing,
    //      dateList: Array.from(dropdownDate),
    //      sitesData: Array.from(sitesData),
    //    }, () => {
    //      console.log(`Stored content for ${url}`);
    //    });
    //  });

    const timestamp = Date.now().toString();
    const existing = {};
    existing[url + "/date-" + today] = {
      time: timestamp,
      rootDomain,
      url,
      content: visibleContent
    };
    chrome.storage.local.set({
      tabContents: existing,
    }, () => {
      console.log(`Stored content for ${url}`);
    });
    // chrome.storage.local.set({
    //   viewed: {
    //     date: today,
    //     rootDomain
    //   },
    // }, () => {
    //   console.log(`Viewed already stored for ${rootDomain} at ${selectedDate}`);
    // });
    return;
  }
  if (message.type === "save_url") {
    const {
      date,
      url
    } = message;

    // Get existing list
    chrome.storage.local.get([date], (result) => {
      const urls = result[date] || [];

      // Avoid duplicate
      if (!urls.includes(url)) {
        urls.push(url);
        chrome.storage.local.set({
          [date]: urls
        });
        console.log(`Saved ${url} on ${date}`);
      }
    });
  }
});
