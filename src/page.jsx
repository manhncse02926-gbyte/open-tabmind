/* global chrome */

import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import Modal from "./component/modal.jsx";

import { db } from "./firebase";

import { collection, getDocs, addDoc } from "firebase/firestore";

function App() {
  const [scrape, setScrape] = useState({ data: [], question: "" });
  const [role, setRole] = useState("");
  const [copy, setCopied] = useState(false);
  const [show, setShow] = useState(false);
  const [isPro, setPro] = useState(false);
  const [calc, setCalc] = useState(0);
  const [stored, setStored] = useState({});
  const [valuesTabs, setValuesTabs] = useState([]);
  const [changeName, setChangeName] = useState({ isEdit: false });
  const [checks, setChecks] = useState(0);
  const [showRight, setShowRight] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [isAddTitle, setAddTitle] = useState(false);
  const [enableDrop, setDropdown] = useState(false);
  const [view, setView] = useState({});
  const [leftItems, setLeftItems] = useState([]);
  const [pinLeft, setPinLeft] = useState(false);
  const [token, setToken] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [sitesAdd, setSitesAdd] = useState([]);
  const [addUrls, setAddUrls] = useState([]);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let total = 0;
    if (stored?.contents) {
      Object.entries(stored.contents).map(
        ([key, value]) => (total = total + value.content?.length)
      );
      setToken(total);
    }
  }, [stored]);

  useEffect(() => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      console.log("Used: " + bytesInUse + " bytes");
    });
  }, []);
  const hideSidebar = () => {
    setShowLeft(false);
  };
  const showSidebar = () => {
    setPinLeft(!pinLeft);
  };

  const handleCheckboxTabs = (event) => {
    const checkbox = event.target;
    const value = checkbox.value;
    const checked = checkbox.checked;
    setValuesTabs((prev) => {
      if (checked) {
        return [...prev, value];
      } else {
        return prev.filter((v) => v !== value);
      }
    });
  };

  const handleShow = () => {
    setChangeName({ isEdit: false });
    setShow(!show);
  };

  const getHtmlFromTab = async (tabId) => {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const clone = document.body.cloneNode(true);

          clone
            .querySelectorAll(
              "script, style, img, a, button, footer, nav, header, svg, video, input"
            )
            .forEach((el) => el.remove());

          clone.querySelectorAll("div").forEach((el) => {
            const style = el.getAttribute("style");
            const hasMinHeight = style && style.includes("min-height");
            const isEmpty =
              el?.textContent.trim() === "" && el.children.length === 0;

            if (hasMinHeight && isEmpty) {
              el.remove();
            }
          });

          // const removeEmpty = (el) => {
          //   el.querySelectorAll("*").forEach((child) => {
          //     if (
          //       child.children.length === 0 &&
          //       child.textContent.trim() === "" &&
          //       getComputedStyle(child).display !== "inline"
          //     ) {
          //       child.remove();
          //     }
          //   });
          // };
          // removeEmpty(clone);
          return {
            html: clone.innerHTML.trim(),
            title: document?.title,
          };
        },
      });

      if (!results || !results[0]) return { html: "", title: "" };
      const { html, title } = results[0].result;
      minifyHTML(html);
      return { html, title };
    } catch (err) {
      console.error("Failed to get clean HTML:", err);
      return { html: "", title: "" };
    }
  };

  function minifyHTML(html) {
    const newHtml = html
      .replace(/\n/g, "") // Remove line breaks
      .replace(/\s{2,}/g, " ") // Collapse multiple spaces
      .replace(/>\s+</g, "><") // Remove space between tags
      .trim();
  }

  const handleGetAllTabs = async (url) => {
    if (url && !url?.includes("chrome://")) {
      const tabs = await chrome.tabs.query({ url });
      const { html, title } = await getHtmlFromTab(tabs[0]?.id);
      return { html, title };
    }
  };

  const getContent = async (url) => {
    // giải thích một chút đoạn này là do valuesTabs không hề lưu tabId nên phải call lại để lấy TabsId
    const tabs = await chrome.tabs.query({ url });

    if (!tabs[0]) return null;

    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["content-src.js"],
    });

    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: "READABILITY",
          payload: "read ability from moz lib",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Error:", chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
          } else {
            resolve(response.data);
          }
        }
      );
    });
  };

  const handleScrape = async () => {
    try {
      setErr(null);
      if (valuesTabs.length === 0) {
        setRole("missTab");
        setShow(true);
        return;
      }
      const time = Date.now().toString();
      const todayT = new Date().toISOString().split("T");
      const keyVal = `${todayT[1]} at ${todayT[0]}`;

      chrome.storage.local.get("tabContents", async (result) => {
        let existingData = result.tabContents || {};

        if (Array.isArray(existingData)) {
          existingData = {};
        } else if (
          typeof existingData === "object" &&
          existingData.hasOwnProperty("0")
        ) {
          delete existingData["0"];
        }

        if (!keyVal || typeof keyVal !== "string" || keyVal.trim() === "")
          return;

        let todayContents = {};
        let uniqueValues = new Set();
        let hasError = false;

        await Promise.all(
          valuesTabs.map(async (value) => {
            const result = await getContent(value);
            if (!result) {
              hasError = true;
              return;
            }
            let domain = new URL(value).hostname;
            domain = domain.replace("www.", "");
            let rootDomain = "";
            const domains = domain.split(".");

            if (domains.length >= 2) {
              domains.map((item, index) => {
                if (index < domains.length - 1) {
                  rootDomain = rootDomain + (index !== 0 ? "." : "") + item;
                }
              });
            } else {
              rootDomain = domain;
            }
            if (!uniqueValues.has(rootDomain)) {
              uniqueValues.add(rootDomain);
            }

            todayContents[value] = {
              storedUrl: value,
              title: result?.title,
              rootDomain: rootDomain,
              content: result?.content,
              textContent: result?.textContent,
              time,
            };
          })
        );
        if (hasError) {
          setErr("Please double check your browser options.");
          setShowRight(true);
          return;
        }
        const name =
          uniqueValues.size > 5
            ? [...uniqueValues].slice(0, 5).join(" - ") + "..."
            : [...uniqueValues].join(" - ");

        const newEntry = {
          date: todayT[0],
          name: name,
          contents: todayContents,
          keyVal: keyVal,
        };
        existingData[keyVal] = newEntry;
        // console.log("chrome.storage.local.setL ", existingData);
        chrome.storage.local.set({ tabContents: existingData }, () => {
          leftClick(keyVal);
          setCalc((prev) => prev + 1);
        });
      });
    } catch (err) {
      console.error("Scrape error:", err);
    }
  };

  const fetchAISuggest = async () => {
    if (!isPro) {
      return;
    }
    try {
      setView({});
      setShowRight(false);
      const snapshot = await getDocs(collection(db, "mcp-browser"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const quest = document.getElementById("input-txt").value;
      setScrape({ data, question: quest });
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const pushEmail = async (email) => {
    try {
      await addDoc(collection(db, "pro-beta-list"), {
        email: email,
        timestamp: new Date(), // optional
      });
    } catch (err) {
      console.error("Error adding email: ", err);
    }
  };

  const closeRightContent = () => {
    setShowRight(false);
    setScrape([]);
  };

  const upgradePro = async () => {
    setRole("upgrade");
    setShow(true);
  };

  const handleCopy = async () => {
    const content = document.getElementById("sitesUrl")?.innerText;
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 3000);
      });
    }
  };

  const formatTime = (timeVal) => {
    try {
      const timeNum = Number(timeVal);
      const dateObject = new Date(timeNum);
      return dateObject.toLocaleString();
    } catch (err) {
      console.log("format time er: ", err);
    }
  };

  const downloadCSV = () => {
    const headers = ["Time", "Url", "Text Content"];
    const rows = Object.entries(stored?.contents).map(([key, value]) => [
      formatTime(value.time),
      value.storedUrl,
      value.textContent
        .replace(/\n/g, "\\n") // Replace line breaks with literal \n
        .replace(/\r/g, "") // Remove carriage returns if any
        .replace(/"/g, '""') // Escape double quotes
        .trim(),
    ]);

    const csvContent = [headers, ...rows]
      .map(
        (row) => row.map((cell) => `"${cell}"`).join(",") // Wrap everything in quotes
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const nowTime = new Date().valueOf();
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `browerMCP-${nowTime}.csv`);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const jsonString = JSON.stringify(stored?.contents, null, 2); // pretty-print with 2-space indent
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "contents.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  useEffect(() => {
    chrome.storage.local.get("tabContents", async function (result) {
      const data = result.tabContents || {};
      const sortedData = Object.entries(data)
        .sort(([, a], [, b]) => {
          const dateA = new Date(formatToISO(a.keyVal));
          const dateB = new Date(formatToISO(b.keyVal));
          return dateB - dateA;
        })
        .map(([key, value]) => ({
          key,
          ...value,
        }));
      setLeftItems(sortedData);
    });
  }, [calc]);

  function formatToISO(str) {
    if (str?.includes("at")) {
      const [time, date] = str?.split(" at ");
      return `${date}T${time}`;
    }
  }

  useEffect(() => {
    if (view.content) {
      const wrapper = document.querySelector(".content-wrapper");
      if (!wrapper) return;

      const links = wrapper.querySelectorAll("a");
      links.forEach((link) => {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });
    }
  }, [view.content]);

  const leftClick = (keyVal) => {
    setErr(null);
    chrome.storage.local.get("tabContents", async function (result) {
      const existingData = result.tabContents || {};
      const existItem = existingData[keyVal];
      if (existItem) {
        setStored({ key: keyVal, ...existItem });
      }
    });

    setScrape([]);
    setView({});
    setShowRight(true);
  };

  const openTabs = () => {
    show ? setRole("") : setRole("openTab");
    setShow(!show);
  };

  useEffect(() => {
    const bodyItems = document.getElementById("history");
    bodyItems.innerHTML = "";
    chrome.windows.getAll({ populate: true }, (windows) => {
      const otherTabs = [];
      windows.forEach((win) => {
        win.tabs
          ?.slice()
          ?.reverse()
          .forEach((tab) => {
            if (
              !tab.url.startsWith("chrome-extension://") &&
              !tab.url.startsWith("chrome://") &&
              !sitesAdd.includes(tab.id)
            ) {
              otherTabs.push(tab);
            }
          });
      });
      bodyItems.classList.remove("history-none");
      if (otherTabs.length > 0) {
        const urls = otherTabs
          .map(
            (tab) =>
              `<label class="site-box"><input type="checkbox" class="check-url" name="siteUrl" value="${
                tab.url
              }">${
                tab?.favIconUrl
                  ? `<img class="favicon" src=${tab.favIconUrl} />`
                  : `<img class="favicon" src="icons/favicon.png" />`
              }<span class="site-item">${tab?.title}</span></label>`
          )
          .join("");

        bodyItems.insertAdjacentHTML(
          "afterbegin",
          `<div class="title-parent"><h2 class="tab-title">Tabs You're Reviewing</h2>
            <button id="refresh-btn" class="ic-btn"><img src="icons/refresh-ic.png" class="refresh-ic" /></button>
            </div><div id="sites">${urls}</div>`
        );
        document
          .getElementById("refresh-btn")
          .addEventListener("click", refreshReview);

        document
          .querySelectorAll('input[type="checkbox"][name="siteUrl"]')
          .forEach((checkbox) => {
            checkbox.addEventListener("change", handleCheckboxTabs);
          });
      }
    });
  }, [refresh]);

  const refreshReview = () => {
    setValuesTabs(addUrls);
    setRefresh((prev) => {
      return prev + 1;
    });
  };

  const handleChecked = (site, totalSite, sites, urls) => {
    setAddUrls((prevUrls) => [...prevUrls, ...urls]);
    let userAdd = document.getElementById("userAdd");
    let current = sitesAdd.concat(sites);
    setSitesAdd(current);
    const wrappedSite = `<div class="just-added">${site}</div>`;

    if (!isAddTitle || !userAdd) {
      userAdd.insertAdjacentHTML("afterbegin", `${wrappedSite}`);
      userAdd = document.getElementById("userAdd");
      const noneAdd = document.getElementById("empty-add");
      if (noneAdd) {
        noneAdd.remove();
      }
    } else {
      userAdd.insertAdjacentHTML("beforeend", wrappedSite);
    }

    const newCheckboxes = userAdd.querySelectorAll(
      ".just-added .site-box input[type='checkbox']"
    );

    newCheckboxes.forEach((cb) => {
      cb.addEventListener("change", handleCheckboxTabs);
      handleCheckboxTabs({ target: cb });
    });

    const justAddedWrapper = userAdd.querySelector(".just-added");
    if (justAddedWrapper) justAddedWrapper.classList.remove("just-added");

    setAddTitle(true);
    updateCheckedView();
    setChecks(checks + totalSite);
  };

  const updateCheckedView = () => {
    const tabViews = document.querySelectorAll('input[name="siteUrl"]');
    tabViews.forEach((cb) => {
      if (valuesTabs.includes(cb.defaultValue)) {
        cb.checked = true;
      }
    });
  };

  useEffect(() => {
    const checkboxes = document.querySelectorAll('input[name="siteUrl"]');

    const updateCheckedCount = () => {
      const checkedCount = document.querySelectorAll(
        'input[name="siteUrl"]:checked'
      ).length;
      setChecks(checkedCount || 0);
    };

    checkboxes.forEach((cb) =>
      cb.addEventListener("change", updateCheckedCount)
    );
    updateCheckedCount();

    return () => {
      checkboxes.forEach((cb) =>
        cb.removeEventListener("change", updateCheckedCount)
      );
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const calTotal =
        Math.floor(window.innerWidth / 300) >= 4
          ? 4
          : Math.floor(window.innerWidth / 300);
      if (calTotal < 4 && !enableDrop) {
        setDropdown(true);
      }
    };

    handleResize(); // Run on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showChangeNameModal = (editItem) => {
    setRole("editName");
    setChangeName({ isEdit: true, content: editItem });
    setShow(true);
  };

  const deleteContent = (content) => {
    const keyDelete = content.keyVal;
    chrome.storage.local.get("tabContents", async function (result) {
      const updatedData = structuredClone(result.tabContents || {});
      delete updatedData[keyDelete];
      chrome.storage.local.set({ tabContents: updatedData }, async () => {
        if (showRight) {
          setShowRight(false);
        }
        setCalc(calc + 1);
      });
    });
  };

  const updateName = (name, keyVal) => {
    try {
      if (role === "upgrade") {
        setPro(true);
        return;
      }

      chrome.storage.local.get("tabContents", function (result) {
        const tabContents = result.tabContents || {};
        const updatedContents = { ...tabContents };

        Object.keys(updatedContents).forEach((key) => {
          if (updatedContents[key].keyVal === keyVal) {
            updatedContents[key] = { ...updatedContents[key], name };
          }
        });

        chrome.storage.local.set({ tabContents: updatedContents }, () => {
          setCalc(calc + 1);
        });

        handleShow();
      });
    } catch (e) {
      console.log("updateName error: ", e);
    }
  };

  return (
    <div class="screen">
      {show && (
        <Modal
          role={role}
          changeName={changeName}
          handleShow={handleShow}
          handleChecked={handleChecked}
          updateName={updateName}
          pushEmail={pushEmail}
        />
      )}
      <div className="navbar">
        <div className="navbar-left">
          <div className="logo">
            <img src="/icons/logo.png" alt="logo" className="logo-img" />
            <p className="logo-txt">TabMind</p>
          </div>
        </div>
        <div className="sologant">
          Instantly turn your browsing history into powerful AI prompts
        </div>
        {!isPro && (
          <button className="be-powerful" onClick={() => upgradePro()}>
            Join Pro Beta
          </button>
        )}
      </div>
      <div className="body-content">
        <div
          className={
            "left-bar " +
            `${pinLeft ? "pin-left" : showLeft ? "open" : "hide-left"}` +
            `${showRight ? " hide-sm" : ""}`
          }
          onMouseLeave={() => hideSidebar()}
          onMouseEnter={() => setShowLeft(true)}
        >
          <div className="left-top">
            <img
              src="icons/sidebar.png"
              className="left-icon left-menu"
              title={showLeft ? "Hide Left Bar" : "Pin Left Bar"}
              onClick={() => showSidebar()}
            />
          </div>
          {showLeft || pinLeft ? (
            <div className="list-sites" id="left-content">
              <div className="tab-title">Sessions</div>
              {leftItems.length < 1 ? (
                <div className="list-none">
                  <p className="left-miss">
                    No sessions yet — select URLs and “Just Scrape” to get
                    started.
                  </p>
                </div>
              ) : (
                leftItems.map((itemLeft, stt) => {
                  return (
                    <div className="item-box">
                      <button
                        className={`left-item${
                          itemLeft.keyVal === stored.keyVal ? " view-item" : ""
                        }`}
                        title={itemLeft.keyVal}
                        onClick={() => leftClick(itemLeft.keyVal)}
                        onDoubleClick={() => showChangeNameModal(itemLeft)}
                      >
                        {itemLeft.name}
                      </button>
                      {/* <img
                      src="icons/ic-delete.png"
                      class="left-icon"
                      onClick={() => deleteContent(itemLeft)}
                    /> */}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="none" />
          )}
        </div>
        <div
          className={`main-content ${showRight ? "show-right" : ""} ${
            pinLeft ? "reduce-mg hide-sm" : ""
          } ${showLeft && !pinLeft ? "open-left" : ""}`}
        >
          <div className="main-body">
            <div className="main-top">
              <img
                src="icons/window-ic.png"
                className="left-icon-sm"
                title={showLeft ? "Hide Left Bar" : "Pin Left Bar"}
                onClick={() => showSidebar()}
              />
              <div
                role="button"
                className="main-item"
                onClick={() => openTabs()}
              >
                <img
                  src="/icons/add.png"
                  alt="add"
                  className="add-ic"
                  title="Add New Tab"
                />
                Add Tabs
              </div>
            </div>
            <h2 class="tab-title user-add-title">User-added URLs</h2>
            <div id="userAdd" class="user-add">
              <p className="user-none-add" id="empty-add">
                No URLs added yet — click “Add tabs” to paste in your first URL.
              </p>
            </div>
            <div id="history" className="history history-none none"></div>
            <div class="site-box"></div>
          </div>
        </div>
        {(showRight || scrape?.data?.length > 0) && (
          <div className={`right-bar`}>
            <div className="right-top">
              <img
                src="/icons/ic-close.png"
                alt="close"
                className="ic-btn"
                onClick={() => closeRightContent()}
              />
              <div className="top-title">
                Here's your context-copy it directly into your favorite AI
                assistant
              </div>
            </div>
            <div className="right-content" id="right-content">
              {!err && (
                <div className="right-btns">
                  <div className="token">TOKEN: {token}</div>
                  <button className="right-btn" onClick={() => downloadCSV()}>
                    <img src="icons/download.png" className="right-ic" />
                    CSV
                  </button>
                  <button className="right-btn" onClick={() => downloadJSON()}>
                    <img src="icons/download.png" className="right-ic" />
                    JSON
                  </button>
                  <button className="right-btn" onClick={handleCopy}>
                    {copy ? (
                      <img src="icons/coppied.png" className="right-ic" />
                    ) : (
                      <img src="icons/copy.png" className="right-ic" />
                    )}
                    Copy
                  </button>
                </div>
              )}
              <div
                className={`right-sites ${
                  scrape?.data?.length > 0 ? "" : "full-height"
                } ${err ? "err-right" :""}`}
              >
                {err ? (
                  <div className="err-txt">{err}</div>
                ) : (
                  <div className="content-title">
                    📚 Use the content below as your sole source of knowledge.
                    Treat it as background information for answering questions
                    in this conversation—do not introduce facts or opinions not
                    included here.
                  </div>
                )}
                {err === null && scrape?.data?.length > 0 ? (
                  <div className="scrape-box">
                    <div className="scrape-name">{scrape.question}</div>
                    {scrape?.data?.map((value) => (
                      <div key={value.name || Math.random()}>
                        <div className="scrape-name">
                          from{" "}
                          {value.name +
                            " at " +
                            new Date().toLocaleDateString("vi-VN")}
                        </div>
                        {value.answer}
                        <br />
                        <div className="scrape-br">
                          ````````````````````````````````````````````
                        </div>
                        <br />
                      </div>
                    ))}
                  </div>
                ) : (
                 err === null && stored?.contents &&
                  Object.values(stored?.contents).map((value, index) => {
                    return (
                      <div
                        className={`sites  ${
                          value.storedUrl === view?.storedUrl ? "viewing" : ""
                        }`}
                        id="sitesUrl"
                      >
                        <p className="site-url">URL: {value?.storedUrl}</p>
                        <div className="site-title">TITLE: {value?.title}</div>
                        <div
                          className="content-wrapper"
                          dangerouslySetInnerHTML={{ __html: value?.content }}
                        ></div>
                        <div className="site-end">
                          - - - - - - - - - - - - - - - -
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {view?.content && (
                <div
                  className="content-wrapper"
                  dangerouslySetInnerHTML={{ __html: view.content }}
                ></div>
              )}
            </div>
          </div>
        )}
        <div
          className={`input-wrapper ${pinLeft ? "left-show" : ""} ${
            scrape?.data?.length > 0 || showRight ? "right-show" : ""
          }`}
        >
          <div className="input-title">
            Great prompts make great results. Turn your browsing into expert AI
            prompts instantly!
          </div>
          <input
            className="input-txt"
            id="input-txt"
            placeholder="Tell us what you're createing (e.g., Blog, LinkedIn Post, Summary)"
          ></input>
          <div className="btns">
            <button
              className={`${isPro ? "btn btn-right" : "btn-inactive"}`}
              onClick={() => fetchAISuggest()}
            >
              Generate Prompts {isPro ? "" : "(Pro)"}
            </button>
            <button className="btn btn-right" onClick={() => handleScrape()}>
              Just Scrape Content for Me{" "}
              {showRight && (
                <img
                  src="https://img.icons8.com/ios-filled/50/visible--v1.png"
                  class="icon-view"
                />
              )}
            </button>
          </div>
        </div>
        <div
          className={`input-wrapper-sm ${pinLeft ? "left-show" : ""} ${
            scrape?.data?.length > 0 || showRight ? "right-show" : ""
          }  ${pinLeft ? " hide-sm" : ""} 
          `}
        >
          <div className="input-title">
            Turn your browsing into expert AI prompts instantly!
          </div>
          <input
            className="input-txt"
            id="input-txt"
            placeholder="Tell us what you're createing"
          ></input>
          <div className="btns">
            <button
              className={`${isPro ? "btn btn-right" : "btn-inactive"}`}
              onClick={() => fetchAISuggest()}
            >
              Pro Prompts
            </button>
            <button className="btn btn-right" onClick={() => handleScrape()}>
              Scrape Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
